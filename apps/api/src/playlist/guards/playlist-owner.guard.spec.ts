import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PlaylistOwnerGuard } from './playlist-owner.guard';
import { PrismaService } from '../../prisma/prisma.service';

describe('PlaylistOwnerGuard', () => {
    let guard: PlaylistOwnerGuard;
    const mockPrismaService = { playlist: { findUnique: jest.fn() } };

    const makeContext = (userId: string, playlistId = 'playlist-1'): { context: ExecutionContext; req: any } => {
        const req: any = { user: { id: userId }, params: { id: playlistId } };
        const context = {
            switchToHttp: () => ({ getRequest: () => req }),
        } as unknown as ExecutionContext;
        return { context, req };
    };

    beforeEach(() => {
        guard = new PlaylistOwnerGuard(mockPrismaService as unknown as PrismaService);
        jest.clearAllMocks();
    });

    it('throws NotFoundException when the playlist does not exist', async () => {
        mockPrismaService.playlist.findUnique.mockResolvedValue(null);
        const { context } = makeContext('user-1');
        await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
    });

    it('rejects a non-owner, including an existing member', async () => {
        mockPrismaService.playlist.findUnique.mockResolvedValue({ ownerId: 'owner-1' });
        const { context } = makeContext('member-1');
        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('allows the owner and stashes the playlist on the request', async () => {
        const playlist = { ownerId: 'owner-1', name: 'My Playlist' };
        mockPrismaService.playlist.findUnique.mockResolvedValue(playlist);
        const { context, req } = makeContext('owner-1');
        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(req.playlist).toBe(playlist);
    });
});
