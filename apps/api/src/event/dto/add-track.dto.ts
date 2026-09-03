import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";


export class AddTrackToEventDto {
    @ApiProperty({ type: 'string', description: 'Track ID', example: '123456789' })
    @IsNotEmpty()
    @IsString()
    trackId: string;
}