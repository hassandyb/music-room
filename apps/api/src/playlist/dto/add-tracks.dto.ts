import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, ArrayUnique, IsArray, IsInt, IsString, Min } from 'class-validator';

export class AddTracksDto {
    @ApiProperty({ type: [String], description: 'Track ids to append, in order' })
    @IsArray()
    @ArrayMinSize(1)
    @ArrayUnique()
    @IsString({ each: true })
    trackIds: string[];

    @ApiProperty({ example: 1, description: 'Version last seen by the client, for optimistic concurrency' })
    @IsInt()
    @Min(1)
    currentVersion: number;
}
