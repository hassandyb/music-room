import { ApiProperty } from '@nestjs/swagger';
import { RegisterRequestBody } from '@repo/types';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto implements RegisterRequestBody {
  @ApiProperty({
    example: 'user@example.com',
    description: 'The email of the user',
    required: true,
  })
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    example: 'username123',
    description: 'The username of the user',
    required: true,
    minLength: 3,
    maxLength: 20,
  })
  @IsString({ message: 'Username must be a string' })
  @IsNotEmpty({ message: 'Username is required' })
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(20, { message: 'Username must be at most 20 characters long' })
  username: string;

  @ApiProperty({
    example: 'password123',
    description: 'The password of the user',
    required: true,
    minLength: 8,
  })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  password: string;

  @ApiProperty({
    example: 'password123',
    description: 'The password confirmation of the user',
    required: true,
    minLength: 8,
  })
  @IsNotEmpty({ message: 'Password confirmation is required' })
  @IsString({ message: 'Password confirmation must be a string' })
  passwordConfirmation: string;
}
