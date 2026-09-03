import { CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * View-level access: owner, member, or (if the playlist is public) anyone.
 * Stashes the loaded playlist + isOwner/isMember on the request so handlers
 * and downstream guards don't have to refetch it.
 */
@Injectable()
export class PlaylistAccessGuard implements CanActivate {
    constructor(private readonly prisma: PrismaService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();
        const user = req.user;
        const playlistId = req.params.id;

        const playlist = await this.prisma.playlist.findUnique({
            where: { id: playlistId },
            include: { members: { where: { userId: user.id } } },
        });

        if (!playlist) {
            throw new NotFoundException('Playlist not found');
        }

        const isOwner = playlist.ownerId === user.id;
        const isMember = isOwner || playlist.members.length > 0;

        if (playlist.visibility === 'PRIVATE' && !isMember) {
            throw new ForbiddenException('This playlist is private');
        }

        req.playlist = playlist;
        req.isOwner = isOwner;
        req.isMember = isMember;
        return true;
    }
}
