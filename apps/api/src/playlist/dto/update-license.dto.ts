import { ApiProperty } from '@nestjs/swagger';
import { PlaylistEditPolicy } from '@repo/types';
import { IsBoolean, IsEnum } from 'class-validator';

export class UpdateLicenseDto {
    @ApiProperty({ enum: PlaylistEditPolicy, example: PlaylistEditPolicy.EVERYONE })
    @IsEnum(PlaylistEditPolicy)
    editPolicy: PlaylistEditPolicy;

    @ApiProperty({ example: true, description: 'Kill switch - false means only the owner can edit, regardless of editPolicy' })
    @IsBoolean()
    isEnabled: boolean;
}
