import { CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * The §3.2 edit-license matrix, run on every track mutation (add/remove/reorder):
 *
 *                        | isEnabled=false | EVERYONE+enabled | INVITED_ONLY+enabled
 * Owner                  | allowed         | allowed          | allowed
 * Member (non-owner)     | denied          | allowed          | denied
 * Non-member             | denied          | denied           | denied
 *
 * Being a member already implies "was invited or joined a public playlist",
 * so INVITED_ONLY collapses to owner-only in this permission matrix.
 */
@Injectable()
export class PlaylistEditLicenseGuard implements CanActivate {
    constructor(private readonly prisma: PrismaService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();
        const user = req.user;
        const playlistId = req.params.id;

        const playlist = await this.prisma.playlist.findUnique({
            where: { id: playlistId },
            include: {
                license: true,
                members: { where: { userId: user.id } },
            },
        });

        if (!playlist) {
            throw new NotFoundException('Playlist not found');
        }

        req.playlist = playlist;

        if (playlist.ownerId === user.id) {
            return true;
        }

        const license = playlist.license;
        const isMember = playlist.members.length > 0;

        if (license?.isEnabled && license.editPolicy === 'EVERYONE' && isMember) {
            return true;
        }

        throw new ForbiddenException('You are not allowed to edit this playlist');
    }
}
