import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
    catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        switch (exception.code) {
            case 'P2002':
                return response.status(HttpStatus.CONFLICT).json({
                    message: `Duplicate value for ${exception.meta?.modelName}`,
                });
            case 'P2003':
                return response.status(HttpStatus.NOT_FOUND).json({
                    message: `Related record not found (${exception.meta?.field_name})`,
                });
            case 'P2025':
                return response.status(HttpStatus.NOT_FOUND).json({
                    message: 'Record not found',
                });
            default:
                return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                    message: exception.message,
                });
        }
    }
}