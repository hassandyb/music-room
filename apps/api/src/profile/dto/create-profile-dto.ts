import { ApiProperty } from '@nestjs/swagger';
import { CreateProfile } from '@repo/types';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateProfileDto implements CreateProfile {
  @IsOptional()
  avatar: string;

  @ApiProperty({
    example: 'Jonathan',
    description: "User's first name",
    minLength: 2,
    maxLength: 50,
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  @MinLength(2, { message: 'First name must be at least 2 characters' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  @Transform(({ value }) => value?.trim())
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: "User's last name",
    minLength: 2,
    maxLength: 50,
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  @MinLength(2, { message: 'Last name must be at least 2 characters' })
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  @Transform(({ value }) => value?.trim())
  lastName: string;

  @ApiProperty({
    example: '{}',
    description: 'JSON string of music preferences',
    required: false,
    default: '{}',
  })
  @IsOptional()
  searchPreferences: string;
}
