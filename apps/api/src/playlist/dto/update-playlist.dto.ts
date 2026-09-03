import { ApiProperty } from '@nestjs/swagger';
import { PlaylistVisibility } from '@repo/types';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdatePlaylistDto {
    @ApiProperty({ example: 'Friday Night Mix' })
    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    name: string;

    @ApiProperty({ example: 'Chill tracks for the weekend', required: false })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    description?: string;

    @ApiProperty({ enum: PlaylistVisibility })
    @IsEnum(PlaylistVisibility)
    visibility: PlaylistVisibility;

    @ApiProperty({ example: 1, description: 'Version last seen by the client, for optimistic concurrency' })
    @IsInt()
    @Min(1)
    currentVersion: number;
}
