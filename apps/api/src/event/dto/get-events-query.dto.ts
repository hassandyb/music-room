import { ApiPropertyOptional } from '@nestjs/swagger';
import { EventStatus, Licence, Privacy } from '@repo/types';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

const toArray = ({ value }: { value: unknown }) =>
  value === undefined ? undefined : Array.isArray(value) ? value : [value];

export class GetEventsQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number (1-indexed)' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 12, description: 'Items per page' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 12;

  @ApiPropertyOptional({ description: 'Search by event title' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: EventStatus, isArray: true })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(EventStatus, { each: true })
  status?: EventStatus[];

  @ApiPropertyOptional({ enum: Privacy, isArray: true })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(Privacy, { each: true })
  privacy?: Privacy[];

  @ApiPropertyOptional({ enum: Licence, isArray: true })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(Licence, { each: true })
  licence?: Licence[];

  @ApiPropertyOptional({ description: 'Only events restricted to a location' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hasGeoVoting?: boolean;
}
