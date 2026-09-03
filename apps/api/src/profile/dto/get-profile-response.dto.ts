import { ApiProperty } from '@nestjs/swagger';

export class GetProfileResponseDto {
  @ApiProperty({
    description: 'The avatar of the user',
    example: 'https://example.com/avatar.jpg',
  })
  avatar: string;

  @ApiProperty({
    description: 'The first name of the user',
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    description: 'The last name of the user',
    example: 'Doe',
  })
  lastName: string;
}
