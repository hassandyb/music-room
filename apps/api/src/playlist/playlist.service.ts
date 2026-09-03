import { ConflictException, ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Subscription } from '@prisma/client';
import { PlaylistEditPolicy, PlaylistVisibility, User } from '@repo/types';
import { PrismaService } from '../prisma/prisma.service';
import { FriendshipService } from '../friendship/friendship.service';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { AddTracksDto } from './dto/add-tracks.dto';
import { ReorderTrackDto } from './dto/reorder-track.dto';
import { UpdateLicenseDto } from './dto/update-license.dto';

const MAX_PLAYLISTS_PER_OWNER = 100;
const FREE_TIER_PLAYLIST_LIMIT = 1;

const playlistInclude = {
    owner: {
        select: {
            id: true,
            username: true,
            profile: { select: { subscription: true } },
        },
    },
    _count: { select: { members: true, tracks: true } },
} satisfies Prisma.PlaylistInclude;

type PlaylistWithMeta = Prisma.PlaylistGetPayload<{ include: typeof playlistInclude }>;

@Injectable()
export class PlaylistService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly friendshipService: FriendshipService,
    ) { }

    private toPlaylistDto(playlist: PlaylistWithMeta) {
        return {
            id: playlist.id,
            name: playlist.name,
            description: playlist.description,
            coverUrl: playlist.coverUrl,
            visibility: playlist.visibility as PlaylistVisibility,
            ownerId: playlist.ownerId,
            owner: { id: playlist.owner.id, username: playlist.owner.username },
            version: playlist.version,
            memberCount: playlist._count.members,
            trackCount: playlist._count.tracks,
            isCollaborative: playlist.owner.profile?.subscription === Subscription.PREMIUM,
            createdAt: playlist.createdAt,
            updatedAt: playlist.updatedAt,
        };
    }

    /**
     * Atomic compare-and-swap on Playlist.version: the UPDATE's WHERE clause
     * matches id+version in a single statement, so the DB - not a
     * read-then-write race - decides whether the caller's version is still
     * current. `count === 0` means either the playlist doesn't exist or
     * (far more likely) someone else's mutation already bumped the version.
     * Must run first inside the same transaction as the actual mutation.
     */
    private async guardVersion(tx: Prisma.TransactionClient, playlistId: string, currentVersion: number) {
        const result = await tx.playlist.updateMany({
            where: { id: playlistId, version: currentVersion },
            data: { version: { increment: 1 } },
        });

        if (result.count === 0) {
            const current = await tx.playlist.findUnique({ where: { id: playlistId } });
            if (!current) {
                throw new NotFoundException('Playlist not found');
            }
            throw new ConflictException({
                message: 'Playlist has changed since you last loaded it, refresh and retry',
                currentVersion: current.version,
            });
        }
    }

    async createPlaylist(dto: CreatePlaylistDto, user: User) {
        const profile = await this.prisma.profile.findUnique({ where: { userId: user.id } });
        const isPaid = profile?.subscription === Subscription.PREMIUM;

        const ownedCount = await this.prisma.playlist.count({ where: { ownerId: user.id } });
        if (ownedCount >= MAX_PLAYLISTS_PER_OWNER) {
            throw new HttpException('Playlist limit reached', HttpStatus.BAD_REQUEST);
        }
        if (!isPaid && ownedCount >= FREE_TIER_PLAYLIST_LIMIT) {
            throw new HttpException(
                'Free accounts are limited to a single playlist - upgrade to create more',
                HttpStatus.PAYMENT_REQUIRED,
            );
        }

        const playlist = await this.prisma.playlist.create({
            data: {
                name: dto.name,
                description: dto.description,
                visibility: dto.visibility ?? PlaylistVisibility.PUBLIC,
                ownerId: user.id,
                members: { create: { userId: user.id } },
                license: { create: {} },
            },
            include: playlistInclude,
        });

        return this.toPlaylistDto(playlist);
    }

    async getMyPlaylists(user: User) {
        const playlists = await this.prisma.playlist.findMany({
            where: { members: { some: { userId: user.id } } },
            include: playlistInclude,
            orderBy: { updatedAt: 'desc' },
        });
        return playlists.map((p) => this.toPlaylistDto(p));
    }

    async getPublicPlaylists() {
        const playlists = await this.prisma.playlist.findMany({
            where: { visibility: PlaylistVisibility.PUBLIC },
            include: playlistInclude,
            orderBy: { updatedAt: 'desc' },
        });
        return playlists.map((p) => this.toPlaylistDto(p));
    }

    async getMyInvitations(user: User) {
        const invitations = await this.prisma.playlistInvitation.findMany({
            where: { userId: user.id },
            include: { playlist: { select: { name: true, owner: { select: { username: true } } } } },
            orderBy: { createdAt: 'desc' },
        });

        return invitations.map((inv) => ({
            id: inv.id,
            playlistId: inv.playlistId,
            userId: inv.userId,
            createdAt: inv.createdAt,
            playlistName: inv.playlist.name,
            ownerUsername: inv.playlist.owner.username,
        }));
    }

    async getPlaylistById(id: string) {
        const playlist = await this.prisma.playlist.findUnique({ where: { id }, include: playlistInclude });
        if (!playlist) {
            throw new NotFoundException('Playlist not found');
        }
        return this.toPlaylistDto(playlist);
    }

    async getPlaylistPreview(id: string, isOwner: boolean, isMember: boolean) {
        const playlist = await this.prisma.playlist.findUnique({
            where: { id },
            include: {
                ...playlistInclude,
                tracks: { orderBy: { position: 'asc' }, include: { track: true } },
            },
        });
        if (!playlist) {
            throw new NotFoundException('Playlist not found');
        }
        return {
            ...this.toPlaylistDto(playlist),
            isOwner,
            isMember,
            tracks: playlist.tracks,
        };
    }

    async updatePlaylist(id: string, dto: UpdatePlaylistDto) {
        const updated = await this.prisma.$transaction(async (tx) => {
            await this.guardVersion(tx, id, dto.currentVersion);
            return tx.playlist.update({
                where: { id },
                data: { name: dto.name, description: dto.description, visibility: dto.visibility },
                include: playlistInclude,
            });
        });
        return this.toPlaylistDto(updated);
    }

    async updateCover(id: string, coverUrl: string) {
        const updated = await this.prisma.playlist.update({
            where: { id },
            data: { coverUrl },
            include: playlistInclude,
        });
        return this.toPlaylistDto(updated);
    }

    async joinPlaylist(id: string, user: User) {
        const playlist = await this.prisma.playlist.findUnique({
            where: { id },
            include: { owner: { select: { profile: { select: { subscription: true } } } } },
        });
        if (!playlist) {
            throw new NotFoundException('Playlist not found');
        }

        const existingMember = await this.prisma.playlistMember.findUnique({
            where: { playlistId_userId: { playlistId: id, userId: user.id } },
        });
        if (existingMember) {
            return this.getPlaylistById(id);
        }

        if (playlist.ownerId === user.id) {
            throw new ForbiddenException('You already own this playlist');
        }

        if (playlist.owner.profile?.subscription !== Subscription.PREMIUM) {
            throw new HttpException(
                "This playlist's owner is on the free tier - free playlists can't have other members",
                HttpStatus.PAYMENT_REQUIRED,
            );
        }

        if (playlist.visibility === PlaylistVisibility.PRIVATE) {
            const invitation = await this.prisma.playlistInvitation.findUnique({
                where: { playlistId_userId: { playlistId: id, userId: user.id } },
            });
            if (!invitation) {
                throw new ForbiddenException('This playlist is private - you need an invitation to join');
            }
            await this.prisma.$transaction([
                this.prisma.playlistMember.create({ data: { playlistId: id, userId: user.id } }),
                this.prisma.playlistInvitation.delete({ where: { id: invitation.id } }),
            ]);
        } else {
            await this.prisma.playlistMember.create({ data: { playlistId: id, userId: user.id } });
        }

        return this.getPlaylistById(id);
    }

    async leavePlaylist(id: string, user: User) {
        const playlist = await this.prisma.playlist.findUnique({ where: { id } });
        if (!playlist) {
            throw new NotFoundException('Playlist not found');
        }
        if (playlist.ownerId === user.id) {
            throw new ForbiddenException('The owner cannot leave their own playlist - delete it instead');
        }
        await this.prisma.playlistMember.deleteMany({ where: { playlistId: id, userId: user.id } });
    }

    async getLicense(id: string) {
        const license = await this.prisma.playlistLicense.findUnique({ where: { playlistId: id } });
        if (!license) {
            throw new NotFoundException('License not found');
        }
        return license;
    }

    async updateLicense(id: string, dto: UpdateLicenseDto) {
        const license = await this.prisma.playlistLicense.update({
            where: { playlistId: id },
            data: { editPolicy: dto.editPolicy, isEnabled: dto.isEnabled },
        });
        return { ...license, editPolicy: license.editPolicy as PlaylistEditPolicy };
    }

    async inviteUser(id: string, invitedUserId: string, owner: User) {
        const [playlist, invitee, ownerProfile] = await Promise.all([
            this.prisma.playlist.findUnique({ where: { id } }),
            this.prisma.user.findUnique({ where: { id: invitedUserId } }),
            this.prisma.profile.findUnique({ where: { userId: owner.id } }),
        ]);

        if (!playlist) {
            throw new NotFoundException('Playlist not found');
        }
        if (!invitee) {
            throw new NotFoundException('User not found');
        }
        if (invitedUserId === owner.id) {
            throw new HttpException('You cannot invite yourself', HttpStatus.BAD_REQUEST);
        }

        if (ownerProfile?.subscription !== Subscription.PREMIUM) {
            throw new HttpException(
                'Inviting collaborators requires a paid subscription',
                HttpStatus.PAYMENT_REQUIRED,
            );
        }

        const isFriend = await this.friendshipService.isFriend(owner.id, invitedUserId);
        if (!isFriend) {
            throw new HttpException(
                'You can only invite friends to collaborate on a playlist',
                HttpStatus.BAD_REQUEST,
            );
        }

        const existingMember = await this.prisma.playlistMember.findUnique({
            where: { playlistId_userId: { playlistId: id, userId: invitedUserId } },
        });
        if (existingMember) {
            throw new HttpException('User is already a member of this playlist', HttpStatus.BAD_REQUEST);
        }

        const existingInvite = await this.prisma.playlistInvitation.findUnique({
            where: { playlistId_userId: { playlistId: id, userId: invitedUserId } },
        });
        if (existingInvite) {
            throw new HttpException('User has already been invited', HttpStatus.BAD_REQUEST);
        }

        return this.prisma.playlistInvitation.create({
            data: { playlistId: id, userId: invitedUserId },
            include: { playlist: { select: { name: true } } },
        });
    }

    async deletePlaylist(id: string) {
        await this.prisma.playlist.delete({ where: { id } });
    }

    async acceptInvitation(invitationId: string, user: User) {
        const invitation = await this.prisma.playlistInvitation.findUnique({ where: { id: invitationId } });
        if (!invitation || invitation.userId !== user.id) {
            throw new NotFoundException('Invitation not found');
        }

        const playlist = await this.prisma.playlist.findUnique({ where: { id: invitation.playlistId } });
        if (!playlist) {
            throw new NotFoundException('Playlist not found');
        }

        await this.prisma.$transaction([
            this.prisma.playlistMember.create({ data: { playlistId: invitation.playlistId, userId: user.id } }),
            this.prisma.playlistInvitation.delete({ where: { id: invitationId } }),
        ]);

        return invitation.playlistId;
    }

    async rejectInvitation(invitationId: string, user: User) {
        const invitation = await this.prisma.playlistInvitation.findUnique({ where: { id: invitationId } });
        if (!invitation || invitation.userId !== user.id) {
            throw new NotFoundException('Invitation not found');
        }
        await this.prisma.playlistInvitation.delete({ where: { id: invitationId } });
    }

    async getMembers(id: string) {
        const members = await this.prisma.playlistMember.findMany({
            where: { playlistId: id },
            include: { user: { select: { id: true, username: true, profile: true } } },
            orderBy: { joinedAt: 'asc' },
        });
        return members.map((m) => ({ id: m.user.id, username: m.user.username, profile: m.user.profile }));
    }

    async kickMember(id: string, userId: string, owner: User) {
        if (userId === owner.id) {
            throw new HttpException('The owner cannot be removed', HttpStatus.BAD_REQUEST);
        }
        const member = await this.prisma.playlistMember.findUnique({
            where: { playlistId_userId: { playlistId: id, userId } },
            include: { user: { select: { username: true } } },
        });
        if (!member) {
            throw new NotFoundException('Member not found');
        }
        await this.prisma.playlistMember.delete({ where: { id: member.id } });
        return { userId, username: member.user.username };
    }

    async getTracks(id: string) {
        return this.prisma.playlistTrack.findMany({
            where: { playlistId: id },
            orderBy: { position: 'asc' },
            include: { track: true },
        });
    }

    async addTracks(id: string, dto: AddTracksDto) {
        return this.prisma.$transaction(async (tx) => {
            await this.guardVersion(tx, id, dto.currentVersion);

            const existing = await tx.playlistTrack.findMany({
                where: { playlistId: id, trackId: { in: dto.trackIds } },
                select: { trackId: true },
            });
            if (existing.length > 0) {
                throw new ConflictException(`Track(s) already in playlist: ${existing.map((t) => t.trackId).join(', ')}`);
            }

            const catalogTracks = await tx.track.findMany({ where: { id: { in: dto.trackIds } } });
            if (catalogTracks.length !== dto.trackIds.length) {
                throw new HttpException('One or more track ids do not exist', HttpStatus.BAD_REQUEST);
            }

            const maxAgg = await tx.playlistTrack.aggregate({ where: { playlistId: id }, _max: { position: true } });
            let nextPosition = (maxAgg._max.position ?? 0) + 1;

            const rows = dto.trackIds.map((trackId) => ({ playlistId: id, trackId, position: nextPosition++ }));
            await tx.playlistTrack.createMany({ data: rows });

            const playlist = await tx.playlist.findUniqueOrThrow({ where: { id } });
            const created = await tx.playlistTrack.findMany({
                where: { playlistId: id, trackId: { in: dto.trackIds } },
                include: { track: true },
                orderBy: { position: 'asc' },
            });

            return { count: created.length, tracks: created, version: playlist.version };
        });
    }

    async removeTrack(id: string, trackId: string, currentVersion: number) {
        return this.prisma.$transaction(async (tx) => {
            await this.guardVersion(tx, id, currentVersion);

            const track = await tx.playlistTrack.findUnique({
                where: { playlistId_trackId: { playlistId: id, trackId } },
            });
            if (!track) {
                throw new NotFoundException('Track not in playlist');
            }

            await tx.playlistTrack.delete({ where: { id: track.id } });
            await tx.playlistTrack.updateMany({
                where: { playlistId: id, position: { gt: track.position } },
                data: { position: { decrement: 1 } },
            });

            const playlist = await tx.playlist.findUniqueOrThrow({ where: { id } });
            return { trackId, version: playlist.version };
        });
    }

    async reorderTrack(id: string, dto: ReorderTrackDto) {
        return this.prisma.$transaction(async (tx) => {
            await this.guardVersion(tx, id, dto.currentVersion);

            const trackCount = await tx.playlistTrack.count({ where: { playlistId: id } });
            if (dto.newPosition < 1 || dto.newPosition > trackCount) {
                throw new HttpException(`newPosition must be between 1 and ${trackCount}`, HttpStatus.BAD_REQUEST);
            }

            const track = await tx.playlistTrack.findUnique({
                where: { playlistId_trackId: { playlistId: id, trackId: dto.trackId } },
            });
            if (!track) {
                throw new NotFoundException('Track not in playlist');
            }

            if (track.position !== dto.newPosition) {
                if (dto.newPosition > track.position) {
                    await tx.playlistTrack.updateMany({
                        where: { playlistId: id, position: { gt: track.position, lte: dto.newPosition } },
                        data: { position: { decrement: 1 } },
                    });
                } else {
                    await tx.playlistTrack.updateMany({
                        where: { playlistId: id, position: { gte: dto.newPosition, lt: track.position } },
                        data: { position: { increment: 1 } },
                    });
                }
                await tx.playlistTrack.update({ where: { id: track.id }, data: { position: dto.newPosition } });
            }

            const playlist = await tx.playlist.findUniqueOrThrow({ where: { id } });
            const tracks = await tx.playlistTrack.findMany({
                where: { playlistId: id },
                orderBy: { position: 'asc' },
                select: { trackId: true, position: true },
            });

            return { tracks, version: playlist.version };
        });
    }
}
