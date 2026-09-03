import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class ReorderTrackDto {
    @ApiProperty({ description: 'Track id to move' })
    @IsNotEmpty()
    @IsString()
    trackId: string;

    @ApiProperty({ example: 3, description: '1-indexed target position' })
    @IsInt()
    @Min(1)
    newPosition: number;

    @ApiProperty({ example: 1, description: 'Version last seen by the client, for optimistic concurrency' })
    @IsInt()
    @Min(1)
    currentVersion: number;
}
