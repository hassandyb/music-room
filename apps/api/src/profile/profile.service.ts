import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Prisma, Subscription } from '@prisma/client';
import type { UserWithProfile } from '@repo/types';
import { PrismaService } from '../prisma/prisma.service';
import {
  type IStorageService,
  STORAGE_SERVICE,
} from '../storage/storage.interface';
import { CreateProfileDto } from './dto/create-profile-dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    @Inject(STORAGE_SERVICE) private readonly storage: IStorageService,
    private readonly prisma: PrismaService,
  ) { }

  async createProfile(
    createUserProfileDto: CreateProfileDto,
    user: UserWithProfile,
    avatar?: Express.Multer.File,
  ) {

    if (user.profile) {
      throw new HttpException('profile already exist', HttpStatus.BAD_REQUEST);
    }

    let avatarKey: string | undefined;
    let avatarUrl: string | undefined;

    if (avatar) {
      const result = await this.storage.upload(avatar);
      avatarKey = result.key;
      avatarUrl = result.url;
    }

    const profile = await this.prisma.profile.create({
      data: {
        avatarUrl: avatarUrl,
        firstName: createUserProfileDto.firstName,
        lastName: createUserProfileDto.lastName,
        searchPreference: createUserProfileDto.searchPreferences,
        userId: user.id,
      },
    });

    return {
      ...user,
      profile,
    };
  }

  async updateProfile(
    updateProfileDto: UpdateProfileDto,
    user: UserWithProfile,
    avatar?: Express.Multer.File,
  ) {
    let avatarUrl: string | undefined;
    if (avatar) {
      const result = await this.storage.upload(avatar);
      avatarUrl = result.url;
    }

    if (updateProfileDto.username && updateProfileDto.username !== user.username) {
      try {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { username: updateProfileDto.username },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new HttpException('Username is already taken', HttpStatus.CONFLICT);
        }
        throw err;
      }
    }

    // upsert (not update): mirrors updateSubscription above -- a user can
    // reach this route before their Profile row exists.
    const profile = await this.prisma.profile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        firstName: updateProfileDto.firstName,
        lastName: updateProfileDto.lastName,
        avatarUrl,
        searchPreference: updateProfileDto.searchPreferences,
      },
      update: {
        ...(updateProfileDto.firstName !== undefined && { firstName: updateProfileDto.firstName }),
        ...(updateProfileDto.lastName !== undefined && { lastName: updateProfileDto.lastName }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(updateProfileDto.searchPreferences !== undefined && { searchPreference: updateProfileDto.searchPreferences }),
      },
    });

    return {
      ...user,
      username: updateProfileDto.username || user.username,
      profile,
    };
  }

  async getProfileStats(userId: string) {
    const [events, playlists, votes] = await Promise.all([
      this.prisma.eventMember.count({ where: { userId } }),
      this.prisma.playlistMember.count({ where: { userId } }),
      this.prisma.trackVote.count({ where: { userId } }),
    ]);
    return { events, playlists, votes };
  }

  async getRecentEvents(userId: string, take: number = 5) {
    const memberships = await this.prisma.eventMember.findMany({
      where: { userId },
      orderBy: { joinedAt: 'desc' },
      take,
      include: { event: true },
    });
    return memberships.map(({ event }) => ({
      id: event.id,
      title: event.title,
      status: event.status,
      createdAt: event.createdAt,
      live: event.status === 'PLAYING',
    }));
  }

  async getRecentPlaylists(userId: string, take: number = 5) {
    const memberships = await this.prisma.playlistMember.findMany({
      where: { userId },
      orderBy: { joinedAt: 'desc' },
      take,
      include: { playlist: true },
    });
    return memberships.map(({ playlist }) => ({
      id: playlist.id,
      name: playlist.name,
      createdAt: playlist.createdAt,
      visibility: playlist.visibility,
    }));
  }

  // A mock upgrade/downgrade switch (subject bonus §VI.3) — no real billing,
  // just flips the tier that the playlist tier gates read from. Downgrading
  // doesn't retroactively touch playlists/members the user already has; it
  // only changes what's allowed going forward (new joins/invites/playlists).
  async updateSubscription(userId: string, subscription: Subscription) {
    // upsert, not update: a user can reach this route (direct API call, or
    // the frontend's onboarding redirect being only a soft client-side nudge)
    // before their Profile row exists - update() would 404 on them otherwise.
    return this.prisma.profile.upsert({
      where: { userId },
      create: { userId, subscription },
      update: { subscription },
    });
  }
}
