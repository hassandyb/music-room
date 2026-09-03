import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    MaxFileSizeValidator,
    Param,
    ParseFilePipe,
    ParseIntPipe,
    Patch,
    Post,
    Put,
    Query,
    Req,
    UploadedFile,
    UseGuards,
    UseInterceptors,
    UsePipes,
    ValidationPipe,
    FileTypeValidator,
    Inject,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlaylistVisibility, type User } from '@repo/types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { type IStorageService, STORAGE_SERVICE } from '../storage/storage.interface';
import { PlaylistService } from './playlist.service';
import { PlaylistGateway } from './playlist.gateway';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { PlaylistAccessGuard } from './guards/playlist-access.guard';
import { PlaylistOwnerGuard } from './guards/playlist-owner.guard';
import { PlaylistEditLicenseGuard } from './guards/playlist-edit-license.guard';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { AddTracksDto } from './dto/add-tracks.dto';
import { ReorderTrackDto } from './dto/reorder-track.dto';
import { UpdateLicenseDto } from './dto/update-license.dto';
import { InviteToPlaylistDto } from './dto/invite-to-playlist.dto';
import { AuditAction } from '../../common/decorators/audit-log.decorator';

@ApiTags('playlists')
@Controller('playlists')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }))
export class PlaylistController {
    constructor(
        private readonly playlistService: PlaylistService,
        private readonly gateway: PlaylistGateway,
        private readonly notificationsGateway: NotificationsGateway,
        @Inject(STORAGE_SERVICE) private readonly storage: IStorageService,
    ) { }

    @Post()
    @AuditAction('PLAYLIST_CREATE')
    @ApiOperation({ summary: 'Create a playlist' })
    async create(@Body() dto: CreatePlaylistDto, @CurrentUser() user: User) {
        const playlist = await this.playlistService.createPlaylist(dto, user);
        if (playlist.visibility === PlaylistVisibility.PUBLIC) {
            // createdAt/updatedAt are Date objects here but serialize to ISO
            // strings over socket.io same as everywhere else (see addTracks).
            this.gateway.broadcastPlaylistListCreated(playlist as any);
        }
        return playlist;
    }

    @Post(':id/cover')
    @UseGuards(PlaylistOwnerGuard)
    @AuditAction('PLAYLIST_COVER_UPDATED')
    @ApiOperation({ summary: 'Replace a playlist cover image' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
    @UseInterceptors(FileInterceptor('file'))
    async uploadCover(
        @Param('id') id: string,
        @Req() req: any,
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 1 * 1024 * 1024 }),
                    new FileTypeValidator({ fileType: /(jpg|jpeg|png)$/ }),
                ],
            }),
        )
        file: Express.Multer.File,
    ) {
        const previousCoverUrl: string | null = req.playlist.coverUrl;
        const { url } = await this.storage.upload(file);
        const playlist = await this.playlistService.updateCover(id, url);

        if (previousCoverUrl?.startsWith('/files/')) {
            this.storage.delete(previousCoverUrl.replace('/files/', '')).catch(() => { });
        }

        this.gateway.broadcastPlaylistUpdated(id, {
            name: playlist.name,
            description: playlist.description,
            coverUrl: playlist.coverUrl,
            visibility: playlist.visibility,
            version: playlist.version,
        });

        return playlist;
    }

    @Get()
    @ApiOperation({ summary: 'List playlists I own or am a member of' })
    getMine(@CurrentUser() user: User) {
        return this.playlistService.getMyPlaylists(user);
    }

    @Get('public')
    @ApiOperation({ summary: 'Discover every public playlist' })
    getPublic() {
        return this.playlistService.getPublicPlaylists();
    }

    @Get('invitations')
    @ApiOperation({ summary: 'List my pending playlist invitations' })
    getMyInvitations(@CurrentUser() user: User) {
        return this.playlistService.getMyInvitations(user);
    }

    @Post('invitations/:invitationId/accept')
    @HttpCode(HttpStatus.NO_CONTENT)
    @AuditAction('PLAYLIST_INVITE_ACCEPTED')
    @ApiOperation({ summary: 'Accept a playlist invitation' })
    async acceptInvitation(@Param('invitationId') invitationId: string, @CurrentUser() user: User) {
        const playlistId = await this.playlistService.acceptInvitation(invitationId, user);
        this.gateway.broadcastUserJoined(playlistId, user.username);
    }

    @Post('invitations/:invitationId/reject')
    @HttpCode(HttpStatus.NO_CONTENT)
    @AuditAction('PLAYLIST_INVITE_REJECTED')
    @ApiOperation({ summary: 'Reject a playlist invitation' })
    rejectInvitation(@Param('invitationId') invitationId: string, @CurrentUser() user: User) {
        return this.playlistService.rejectInvitation(invitationId, user);
    }

    @Get(':id')
    @UseGuards(PlaylistAccessGuard)
    @ApiOperation({ summary: 'Get a playlist' })
    getOne(@Param('id') id: string) {
        return this.playlistService.getPlaylistById(id);
    }

    @Get(':id/preview')
    @UseGuards(PlaylistAccessGuard)
    @ApiOperation({ summary: 'Preview a playlist (owner info + full track list) without opening the socket' })
    getPreview(@Param('id') id: string, @Req() req: any) {
        return this.playlistService.getPlaylistPreview(id, req.isOwner, req.isMember);
    }

    @Put(':id')
    @UseGuards(PlaylistOwnerGuard)
    @AuditAction('PLAYLIST_UPDATE')
    @ApiOperation({ summary: 'Update playlist metadata' })
    async update(@Param('id') id: string, @Body() dto: UpdatePlaylistDto) {
        const playlist = await this.playlistService.updatePlaylist(id, dto);
        this.gateway.broadcastPlaylistUpdated(id, {
            name: playlist.name,
            description: playlist.description,
            coverUrl: playlist.coverUrl,
            visibility: playlist.visibility,
            version: playlist.version,
        });
        return playlist;
    }

    @Post(':id/join')
    @AuditAction('PLAYLIST_JOIN')
    @ApiOperation({ summary: 'Join a playlist' })
    async join(@Param('id') id: string, @CurrentUser() user: User) {
        const playlist = await this.playlistService.joinPlaylist(id, user);
        this.gateway.broadcastUserJoined(id, user.username);
        return playlist;
    }

    @Post(':id/leave')
    @HttpCode(HttpStatus.OK)
    @AuditAction('PLAYLIST_LEAVE')
    @ApiOperation({ summary: 'Leave a playlist' })
    async leave(@Param('id') id: string, @CurrentUser() user: User) {
        await this.playlistService.leavePlaylist(id, user);
        this.gateway.broadcastUserLeft(id, user.username);
        return { message: 'Left playlist' };
    }

    @Get(':id/license')
    @UseGuards(PlaylistOwnerGuard)
    @ApiOperation({ summary: 'Get the playlist edit license' })
    getLicense(@Param('id') id: string) {
        return this.playlistService.getLicense(id);
    }

    @Put(':id/license')
    @UseGuards(PlaylistOwnerGuard)
    @AuditAction('PLAYLIST_LICENSE_UPDATE')
    @ApiOperation({ summary: 'Update the playlist edit license' })
    async updateLicense(@Param('id') id: string, @Body() dto: UpdateLicenseDto) {
        const license = await this.playlistService.updateLicense(id, dto);
        this.gateway.broadcastEditPolicyChanged(id, { editPolicy: license.editPolicy, isEnabled: license.isEnabled });
        return license;
    }

    @Post(':id/invitations')
    @UseGuards(PlaylistOwnerGuard)
    @AuditAction('PLAYLIST_INVITE_SENT')
    @ApiOperation({ summary: 'Invite a user to a private/collaborative playlist' })
    async invite(@Param('id') id: string, @Body() dto: InviteToPlaylistDto, @CurrentUser() user: User) {
        const invitation = await this.playlistService.inviteUser(id, dto.userId, user);
        this.notificationsGateway.notifyPlaylistInvitation(dto.userId, {
            id: invitation.id,
            playlistId: invitation.playlistId,
            playlistName: (invitation as any).playlist.name,
            ownerUsername: user.username,
        });
        return invitation;
    }

    @Delete(':id')
    @UseGuards(PlaylistOwnerGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    @AuditAction('PLAYLIST_DELETE')
    @ApiOperation({ summary: 'Delete a playlist' })
    async remove(@Param('id') id: string, @Req() req: any) {
        const playlistName = req.playlist.name;
        await this.playlistService.deletePlaylist(id);
        this.gateway.broadcastPlaylistDeleted(id, playlistName);
        this.gateway.broadcastPlaylistListDeleted(id);
    }

    @Get(':id/members')
    @UseGuards(PlaylistAccessGuard)
    @ApiOperation({ summary: 'List playlist members' })
    getMembers(@Param('id') id: string) {
        return this.playlistService.getMembers(id);
    }

    @Delete(':id/members/:userId')
    @UseGuards(PlaylistOwnerGuard)
    @AuditAction('PLAYLIST_MEMBER_KICKED')
    @ApiOperation({ summary: 'Kick a member' })
    async kickMember(@Param('id') id: string, @Param('userId') userId: string, @CurrentUser() user: User) {
        const result = await this.playlistService.kickMember(id, userId, user);
        this.gateway.broadcastMemberRemoved(id, result);
        return result;
    }

    @Get(':id/tracks')
    @UseGuards(PlaylistAccessGuard)
    @ApiOperation({ summary: 'Get the ordered track list' })
    getTracks(@Param('id') id: string) {
        return this.playlistService.getTracks(id);
    }

    @Post(':id/tracks')
    @UseGuards(PlaylistEditLicenseGuard)
    @AuditAction('PLAYLIST_TRACKS_ADDED')
    @ApiOperation({ summary: 'Append tracks to a playlist' })
    async addTracks(@Param('id') id: string, @Body() dto: AddTracksDto) {
        const result = await this.playlistService.addTracks(id, dto);
        // Prisma returns Date objects for createdAt; both res.json() and
        // socket.io's emit() serialize them to ISO strings on the wire same
        // as everywhere else in this codebase, so the payload matches
        // TracksAddedPayload by the time a client actually sees it.
        this.gateway.broadcastTracksAdded(id, result as any);
        return result;
    }

    @Delete(':id/tracks/:trackId')
    @UseGuards(PlaylistEditLicenseGuard)
    @AuditAction('PLAYLIST_TRACK_REMOVED')
    @ApiOperation({ summary: 'Remove a track from a playlist' })
    async removeTrack(
        @Param('id') id: string,
        @Param('trackId') trackId: string,
        @Query('currentVersion', ParseIntPipe) currentVersion: number,
    ) {
        const result = await this.playlistService.removeTrack(id, trackId, currentVersion);
        this.gateway.broadcastTrackRemoved(id, result);
        return result;
    }

    @Patch(':id/reorder')
    @UseGuards(PlaylistEditLicenseGuard)
    @AuditAction('PLAYLIST_TRACK_REORDERED')
    @ApiOperation({ summary: 'Move a track to a new position' })
    async reorder(@Param('id') id: string, @Body() dto: ReorderTrackDto) {
        const result = await this.playlistService.reorderTrack(id, dto);
        this.gateway.broadcastPlaylistSync(id, result);
        return result;
    }
}
