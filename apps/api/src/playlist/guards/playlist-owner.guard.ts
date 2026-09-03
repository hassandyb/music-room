import { CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Metadata, license, cover, invitations and member removal are always
 * owner-only, independent of the edit license (see PlaylistEditLicenseGuard).
 */
@Injectable()
export class PlaylistOwnerGuard implements CanActivate {
    constructor(private readonly prisma: PrismaService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();
        const user = req.user;
        const playlistId = req.params.id;

        const playlist = await this.prisma.playlist.findUnique({ where: { id: playlistId } });

        if (!playlist) {
            throw new NotFoundException('Playlist not found');
        }

        if (playlist.ownerId !== user.id) {
            throw new ForbiddenException('Only the playlist owner can do this');
        }

        req.playlist = playlist;
        return true;
    }
}
