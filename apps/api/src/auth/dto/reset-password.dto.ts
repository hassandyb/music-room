import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MinLength } from "class-validator";


export class ResetPasswordDto {


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
    confirmPassword: string;

    @ApiProperty({
        example: 'token123',
        description: 'The token of the user',
        required: true,
    })
    @IsNotEmpty({ message: 'Token is required' })
    @IsString({ message: 'Token must be a string' })
    token: string;
}