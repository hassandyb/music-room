import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SendFriendRequestDto {
    @ApiProperty({ description: 'User id to send a friend request to' })
    @IsNotEmpty()
    @IsString()
    userId: string;
}
