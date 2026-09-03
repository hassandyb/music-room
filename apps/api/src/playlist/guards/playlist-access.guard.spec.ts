import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PlaylistAccessGuard } from './playlist-access.guard';
import { PrismaService } from '../../prisma/prisma.service';

describe('PlaylistAccessGuard', () => {
    let guard: PlaylistAccessGuard;
    const mockPrismaService = { playlist: { findUnique: jest.fn() } };

    const makeContext = (user: any, playlistId = 'playlist-1'): { context: ExecutionContext; req: any } => {
        const req: any = { user, params: { id: playlistId } };
        const context = {
            switchToHttp: () => ({ getRequest: () => req }),
        } as unknown as ExecutionContext;
        return { context, req };
    };

    beforeEach(() => {
        guard = new PlaylistAccessGuard(mockPrismaService as unknown as PrismaService);
        jest.clearAllMocks();
    });

    it('throws NotFoundException when the playlist does not exist', async () => {
        mockPrismaService.playlist.findUnique.mockResolvedValue(null);
        const { context } = makeContext({ id: 'user-1' });
        await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
    });

    it('allows the owner to access a private playlist', async () => {
        mockPrismaService.playlist.findUnique.mockResolvedValue({
            ownerId: 'owner-1',
            visibility: 'PRIVATE',
            members: [],
        });
        const { context, req } = makeContext({ id: 'owner-1' });
        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(req.isOwner).toBe(true);
        expect(req.isMember).toBe(true);
    });

    it('allows a member to access a private playlist', async () => {
        mockPrismaService.playlist.findUnique.mockResolvedValue({
            ownerId: 'owner-1',
            visibility: 'PRIVATE',
            members: [{ userId: 'member-1' }],
        });
        const { context, req } = makeContext({ id: 'member-1' });
        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(req.isOwner).toBe(false);
        expect(req.isMember).toBe(true);
    });

    it('rejects a non-member from a private playlist', async () => {
        mockPrismaService.playlist.findUnique.mockResolvedValue({
            ownerId: 'owner-1',
            visibility: 'PRIVATE',
            members: [],
        });
        const { context } = makeContext({ id: 'stranger-1' });
        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('allows any authenticated user to view a public playlist', async () => {
        mockPrismaService.playlist.findUnique.mockResolvedValue({
            ownerId: 'owner-1',
            visibility: 'PUBLIC',
            members: [],
        });
        const { context, req } = makeContext({ id: 'stranger-1' });
        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(req.isOwner).toBe(false);
        expect(req.isMember).toBe(false);
    });
});
