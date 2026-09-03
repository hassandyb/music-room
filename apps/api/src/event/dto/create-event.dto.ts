import { ApiProperty } from '@nestjs/swagger';
import { Event, Licence, Privacy } from '@repo/types'
import { IsDate, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Validate } from 'class-validator';
import { IsGeoRequired } from '../custom-validators';

export class CreateEventDto implements Omit<Event, 'id' | 'round' | 'status' | "createdBy" | "currentTrackStartTime" | "currentTrackId" | "currentTrack" | 'tracks' | 'createdById'> {

    @ApiProperty({
        example: 'Event Title',
        description: 'The title of the event',
    })
    @IsNotEmpty()
    @IsString()
    title: string;

    @ApiProperty({
        enum: Privacy,
        example: Privacy.PUBLIC,
        description: 'The privacy of the event',
    })
    @IsEnum(Privacy)
    @IsNotEmpty()
    privacy: Privacy;

    @ApiProperty({
        enum: Licence,
        example: Licence.FREE,
        description: 'The licence of the event',
    })
    @IsEnum(Licence)
    @IsNotEmpty()
    licence: Licence;


    @ApiProperty({
        example: 36.77541848062567,
        description: 'The latitude of the event',
        required: false
    })
    @IsNumber()
    @Validate(IsGeoRequired, { message: 'Latitude is required when licence is GEOTIME' })
    @IsOptional()
    latitude: number;

    @ApiProperty({
        example: 10.180193556179227,
        description: 'The longitude of the event',
        required: false
    })
    @IsNumber()
    @Validate(IsGeoRequired, { message: 'Longitude is required when licence is GEOTIME' })
    @IsOptional()
    longitude: number;


    @ApiProperty({
        example: 100,
        description: 'The radius of the event',
        required: false
    })
    @IsNumber()
    @Validate(IsGeoRequired, { message: 'Radius is required when licence is GEOTIME' })
    @IsOptional()
    radius: number;


    @ApiProperty({
        example: new Date(),
        description: 'The start time of the event',
        required: false
    })
    @IsDate()
    @Validate(IsGeoRequired, { message: 'geoVotingStart is required when licence is GEOTIME' })
    @IsOptional()
    geoVotingStart?: Date


    @ApiProperty({
        example: new Date(),
        description: 'The end time of the event',
        required: false
    })
    @IsDate()
    @Validate(IsGeoRequired, { message: 'geoVotingEnd is required when licence is GEOTIME' })
    @IsOptional()
    geoVotingEnd?: Date
}