import { Type } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { ApiResponse } from '@repo/types';

export class ApiResponseDto<T> implements ApiResponse<T> {
  @ApiProperty({ example: 'Operation successful' })
  message: string;

  data?: T;

  constructor(partial: Partial<ApiResponseDto<T>>) {
    Object.assign(this, partial);
  }
}

export function ApiResponseOf<T>(model: Type<T>) {
  class ApiResponseOfClass extends ApiResponseDto<T> {
    @ApiProperty({ type: model })
    declare data: T;
  }
  Object.defineProperty(ApiResponseOfClass, 'name', {
    value: `ApiResponseOf${model.name}`,
  });
  return ApiResponseOfClass;
}
