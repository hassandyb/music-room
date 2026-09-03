import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';
import { CreateUserDto } from '../auth/dto/create-user.dto';
import * as bcrypt from 'bcryptjs';
import { generateToken } from '../../common/utils/utils';
import type { OAuthProvider } from '../auth/types/oauth';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) { }

  async createUser(createUserDto: CreateUserDto) {
    const { email, password, username } = createUserDto;

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      throw new ConflictException(
        'User with this email/username already exists',
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await this.prisma.user.create({
      data: {
        email,
        username: username,
        password: hashedPassword,
        isActivated: false,
        emailVerificationToken: generateToken(),
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }



  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new Error('Invalid or expired verification token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isActivated: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });
  }

  async findUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
      },
    });
    if (!user) return null;

    return {
      id: user?.id,
      email: user?.email,
      username: user?.username,
      isActivated: user?.isActivated,
      googleId: user?.googleId,
      facebookId: user?.facebookId,
      createdAt: user?.createdAt,
      profile: user?.profile,
    };
  }

  async updateUser(id: string, data: any) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async findUserByToken(token: string) {
    return this.prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordTokenExpires: {
          gt: new Date(),
        },
      },
    });
  }

  // Looks up by provider id first (returning user), then falls back to
  // matching by email (Google/Facebook only grant the email scope for
  // verified addresses, so this is a safe auto-link), then creates a brand
  // new account. New OAuth accounts get a random, never-typed-in password
  // hash — the schema's `password` column stays required/non-null, and this
  // account simply has no usable password until the user sets one.
  async findOrCreateOAuthUser(provider: OAuthProvider, providerId: string, email: string) {
    const existingByProviderId =
      provider === 'google'
        ? await this.prisma.user.findUnique({ where: { googleId: providerId }, include: { profile: true } })
        : await this.prisma.user.findUnique({ where: { facebookId: providerId }, include: { profile: true } });

    if (existingByProviderId) {
      const { password: _password, ...user } = existingByProviderId;
      return user;
    }

    const existingByEmail = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (existingByEmail) {
      const linked = await this.prisma.user.update({
        where: { id: existingByEmail.id },
        data: provider === 'google' ? { googleId: providerId } : { facebookId: providerId },
        include: { profile: true },
      });
      const { password: _password, ...user } = linked;
      return user;
    }

    const randomPassword = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
    const username = await this.generateUniqueUsernameFromEmail(email);

    const created = await this.prisma.user.create({
      data: {
        email,
        username,
        password: randomPassword,
        isActivated: true,
        ...(provider === 'google' ? { googleId: providerId } : { facebookId: providerId }),
      },
      include: { profile: true },
    });

    const { password: _password, ...user } = created;
    return user;
  }

  // Attaches a provider account to an already-authenticated user (the
  // "Linked accounts" flow). Refuses to steal a provider id that's already
  // attached to a different account.
  async linkOAuthAccount(userId: string, provider: OAuthProvider, providerId: string) {
    const owner =
      provider === 'google'
        ? await this.prisma.user.findUnique({ where: { googleId: providerId } })
        : await this.prisma.user.findUnique({ where: { facebookId: providerId } });

    if (owner && owner.id !== userId) {
      throw new ConflictException(`This ${provider} account is already linked to another user`);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: provider === 'google' ? { googleId: providerId } : { facebookId: providerId },
      include: { profile: true },
    });

    const { password: _password, ...user } = updated;
    return user;
  }

  private async generateUniqueUsernameFromEmail(email: string): Promise<string> {
    const base = (email.split('@')[0] || 'user').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 15) || 'user';
    let candidate = base.length >= 3 ? base : `${base}user`;

    while (await this.prisma.user.findUnique({ where: { username: candidate } })) {
      candidate = `${base}${Math.floor(1000 + Math.random() * 9000)}`.slice(0, 20);
    }

    return candidate;
  }

  async searchUsers(query: string) {
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query } },
          { email: { contains: query } },
        ],
      },
      select: {
        id: true,
        username: true,
        email: true,
        profile: true,
      },
    });

    return users;
  }
}
