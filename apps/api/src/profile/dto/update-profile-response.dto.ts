import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileResposeDto {
  @ApiProperty({
    description: 'The message of the response',
    example: 'Profile updated successfully',
  })
  message: string;

  @ApiProperty({
    description: 'The status code of the response',
    example: 200,
  })
  status: number;
}
