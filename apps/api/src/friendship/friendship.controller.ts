import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '@repo/types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { FriendshipService } from './friendship.service';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { AuditAction } from '../../common/decorators/audit-log.decorator';

@ApiTags('friendship')
@Controller('friendship')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }))
export class FriendshipController {
    constructor(
        private readonly friendshipService: FriendshipService,
        private readonly notificationsGateway: NotificationsGateway,
    ) { }

    @Get()
    @ApiOperation({ summary: 'List my friends' })
    getFriends(@CurrentUser() user: User) {
        return this.friendshipService.listFriends(user.id);
    }

    @Get('requests')
    @ApiOperation({ summary: 'List friend requests sent to me' })
    getIncomingRequests(@CurrentUser() user: User) {
        return this.friendshipService.listIncomingRequests(user.id);
    }

    @Get('requests/sent')
    @ApiOperation({ summary: 'List friend requests I sent' })
    getSentRequests(@CurrentUser() user: User) {
        return this.friendshipService.listSentRequests(user.id);
    }

    @Post('requests')
    @AuditAction('FRIEND_REQUEST_SENT')
    @ApiOperation({ summary: 'Send a friend request' })
    async sendRequest(@Body() dto: SendFriendRequestDto, @CurrentUser() user: User) {
        const request = await this.friendshipService.sendRequest(user, dto.userId);
        this.notificationsGateway.notifyFriendRequest(dto.userId, {
            id: request.id,
            senderId: user.id,
            senderUsername: user.username,
        });
        return request;
    }

    @Post('requests/:id/accept')
    @HttpCode(HttpStatus.OK)
    @AuditAction('FRIEND_REQUEST_ACCEPTED')
    @ApiOperation({ summary: 'Accept a friend request' })
    acceptRequest(@Param('id') id: string, @CurrentUser() user: User) {
        return this.friendshipService.acceptRequest(id, user);
    }

    @Post('requests/:id/reject')
    @HttpCode(HttpStatus.NO_CONTENT)
    @AuditAction('FRIEND_REQUEST_REJECTED')
    @ApiOperation({ summary: 'Reject or cancel a friend request' })
    rejectRequest(@Param('id') id: string, @CurrentUser() user: User) {
        return this.friendshipService.rejectRequest(id, user);
    }

    @Delete(':userId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @AuditAction('FRIEND_REMOVED')
    @ApiOperation({ summary: 'Remove a friend' })
    removeFriend(@Param('userId') userId: string, @CurrentUser() user: User) {
        return this.friendshipService.removeFriend(user, userId);
    }
}
