import { ApiProperty } from '@nestjs/swagger';
import { LoginRequestBody } from '@repo/types';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto implements LoginRequestBody {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'User password',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
