import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PlaylistEditLicenseGuard } from './playlist-edit-license.guard';
import { PrismaService } from '../../prisma/prisma.service';

describe('PlaylistEditLicenseGuard', () => {
    let guard: PlaylistEditLicenseGuard;
    const mockPrismaService = { playlist: { findUnique: jest.fn() } };

    const makeContext = (userId: string, playlistId = 'playlist-1'): ExecutionContext => {
        const req: any = { user: { id: userId }, params: { id: playlistId } };
        return { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
    };

    beforeEach(() => {
        guard = new PlaylistEditLicenseGuard(mockPrismaService as unknown as PrismaService);
        jest.clearAllMocks();
    });

    it('throws NotFoundException when the playlist does not exist', async () => {
        mockPrismaService.playlist.findUnique.mockResolvedValue(null);
        await expect(guard.canActivate(makeContext('user-1'))).rejects.toThrow(NotFoundException);
    });

    // The §3.2 matrix, verified cell by cell.
    it('owner is always allowed, even with isEnabled=false', async () => {
        mockPrismaService.playlist.findUnique.mockResolvedValue({
            ownerId: 'owner-1',
            license: { isEnabled: false, editPolicy: 'INVITED_ONLY' },
            members: [],
        });
        await expect(guard.canActivate(makeContext('owner-1'))).resolves.toBe(true);
    });

    it('member is allowed under EVERYONE + enabled', async () => {
        mockPrismaService.playlist.findUnique.mockResolvedValue({
            ownerId: 'owner-1',
            license: { isEnabled: true, editPolicy: 'EVERYONE' },
            members: [{ userId: 'member-1' }],
        });
        await expect(guard.canActivate(makeContext('member-1'))).resolves.toBe(true);
    });

    it('member is denied under INVITED_ONLY, even enabled', async () => {
        mockPrismaService.playlist.findUnique.mockResolvedValue({
            ownerId: 'owner-1',
            license: { isEnabled: true, editPolicy: 'INVITED_ONLY' },
            members: [{ userId: 'member-1' }],
        });
        await expect(guard.canActivate(makeContext('member-1'))).rejects.toThrow(ForbiddenException);
    });

    it('member is denied when isEnabled=false, regardless of editPolicy', async () => {
        mockPrismaService.playlist.findUnique.mockResolvedValue({
            ownerId: 'owner-1',
            license: { isEnabled: false, editPolicy: 'EVERYONE' },
            members: [{ userId: 'member-1' }],
        });
        await expect(guard.canActivate(makeContext('member-1'))).rejects.toThrow(ForbiddenException);
    });

    it('non-member is always denied, even under EVERYONE + enabled', async () => {
        mockPrismaService.playlist.findUnique.mockResolvedValue({
            ownerId: 'owner-1',
            license: { isEnabled: true, editPolicy: 'EVERYONE' },
            members: [],
        });
        await expect(guard.canActivate(makeContext('stranger-1'))).rejects.toThrow(ForbiddenException);
    });
});
