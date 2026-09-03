import { ApiProperty } from '@nestjs/swagger';
import { Subscription } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateSubscriptionDto {
  @ApiProperty({ enum: Subscription, example: Subscription.PREMIUM })
  @IsEnum(Subscription)
  subscription: Subscription;
}
