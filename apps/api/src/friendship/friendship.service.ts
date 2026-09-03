import { ConflictException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { FriendRequestStatus } from '@prisma/client';
import { User } from '@repo/types';
import { PrismaService } from '../prisma/prisma.service';

const userSelect = {
    id: true,
    username: true,
    email: true,
    createdAt: true,
    profile: true,
} as const;

@Injectable()
export class FriendshipService {
    constructor(private readonly prisma: PrismaService) { }

    async sendRequest(sender: User, receiverId: string) {
        if (receiverId === sender.id) {
            throw new HttpException('You cannot friend yourself', HttpStatus.BAD_REQUEST);
        }

        const receiver = await this.prisma.user.findUnique({ where: { id: receiverId } });
        if (!receiver) {
            throw new NotFoundException('User not found');
        }

        const existing = await this.prisma.friendRequest.findFirst({
            where: {
                OR: [
                    { senderId: sender.id, receiverId },
                    { senderId: receiverId, receiverId: sender.id },
                ],
            },
        });

        if (existing?.status === FriendRequestStatus.ACCEPTED) {
            throw new HttpException('You are already friends', HttpStatus.BAD_REQUEST);
        }

        // Mutual request (they already asked us first) - accept instead of
        // creating a second pending row, same "already implies consent" logic
        // as a playlist join consuming a pending invitation.
        if (existing && existing.senderId === receiverId && existing.status === FriendRequestStatus.PENDING) {
            return this.prisma.friendRequest.update({
                where: { id: existing.id },
                data: { status: FriendRequestStatus.ACCEPTED },
            });
        }

        if (existing?.status === FriendRequestStatus.PENDING) {
            throw new HttpException('Friend request already sent', HttpStatus.BAD_REQUEST);
        }

        return this.prisma.friendRequest.create({
            data: { senderId: sender.id, receiverId },
        });
    }

    async acceptRequest(requestId: string, user: User) {
        const request = await this.prisma.friendRequest.findUnique({ where: { id: requestId } });
        if (!request || request.receiverId !== user.id) {
            throw new NotFoundException('Friend request not found');
        }
        if (request.status !== FriendRequestStatus.PENDING) {
            throw new ConflictException('Friend request is not pending');
        }

        return this.prisma.friendRequest.update({
            where: { id: requestId },
            data: { status: FriendRequestStatus.ACCEPTED },
        });
    }

    async rejectRequest(requestId: string, user: User) {
        const request = await this.prisma.friendRequest.findUnique({ where: { id: requestId } });
        if (!request || (request.senderId !== user.id && request.receiverId !== user.id)) {
            throw new NotFoundException('Friend request not found');
        }
        await this.prisma.friendRequest.delete({ where: { id: requestId } });
    }

    async removeFriend(user: User, friendId: string) {
        const friendship = await this.prisma.friendRequest.findFirst({
            where: {
                status: FriendRequestStatus.ACCEPTED,
                OR: [
                    { senderId: user.id, receiverId: friendId },
                    { senderId: friendId, receiverId: user.id },
                ],
            },
        });
        if (!friendship) {
            throw new NotFoundException('You are not friends with this user');
        }
        await this.prisma.friendRequest.delete({ where: { id: friendship.id } });
    }

    async listFriends(userId: string) {
        const rows = await this.prisma.friendRequest.findMany({
            where: {
                status: FriendRequestStatus.ACCEPTED,
                OR: [{ senderId: userId }, { receiverId: userId }],
            },
            include: {
                sender: { select: userSelect },
                receiver: { select: userSelect },
            },
        });

        return rows.map((r) => (r.senderId === userId ? r.receiver : r.sender));
    }

    async listIncomingRequests(userId: string) {
        const requests = await this.prisma.friendRequest.findMany({
            where: { receiverId: userId, status: FriendRequestStatus.PENDING },
            include: { sender: { select: userSelect } },
            orderBy: { createdAt: 'desc' },
        });
        return requests.map((r) => ({
            id: r.id,
            senderId: r.senderId,
            receiverId: r.receiverId,
            status: r.status,
            createdAt: r.createdAt,
            senderUsername: r.sender.username,
            receiverUsername: '',
        }));
    }

    async listSentRequests(userId: string) {
        const requests = await this.prisma.friendRequest.findMany({
            where: { senderId: userId, status: FriendRequestStatus.PENDING },
            include: { receiver: { select: userSelect } },
            orderBy: { createdAt: 'desc' },
        });
        return requests.map((r) => ({
            id: r.id,
            senderId: r.senderId,
            receiverId: r.receiverId,
            status: r.status,
            createdAt: r.createdAt,
            senderUsername: '',
            receiverUsername: r.receiver.username,
        }));
    }

    async isFriend(userIdA: string, userIdB: string): Promise<boolean> {
        const friendship = await this.prisma.friendRequest.findFirst({
            where: {
                status: FriendRequestStatus.ACCEPTED,
                OR: [
                    { senderId: userIdA, receiverId: userIdB },
                    { senderId: userIdB, receiverId: userIdA },
                ],
            },
        });
        return !!friendship;
    }
}
