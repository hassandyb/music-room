import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class InviteToEventDto {
    @ApiProperty({ description: 'User id of the invitee' })
    @IsNotEmpty()
    @IsString()
    userId: string;
}
