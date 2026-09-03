import { ApiProperty } from '@nestjs/swagger';
import { PlaylistVisibility } from '@repo/types';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePlaylistDto {
    @ApiProperty({ example: 'Friday Night Mix', description: 'Playlist name (1-100 chars, unique per owner)' })
    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    name: string;

    @ApiProperty({ example: 'Chill tracks for the weekend', required: false })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    description?: string;

    @ApiProperty({ enum: PlaylistVisibility, default: PlaylistVisibility.PUBLIC, required: false })
    @IsOptional()
    @IsEnum(PlaylistVisibility)
    visibility?: PlaylistVisibility;
}
