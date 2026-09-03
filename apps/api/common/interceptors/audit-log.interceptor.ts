import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AUDIT_ACTION_KEY } from '../decorators/audit-log.decorator';

// Header names the mobile client actually sends (apps/mobile/lib/device-metadata.ts).
// Express lowercases all incoming header names regardless of how the client
// capitalized them, so these lookups are lowercase. A couple of generic
// aliases are accepted too, for any future client that doesn't use the
// mobile app's `X-Client-*` convention.
function firstHeader(req: any, ...names: string[]): string | null {
    for (const name of names) {
        const value = req.headers[name];
        if (typeof value === 'string' && value.length > 0) {
            return value;
        }
    }
    return null;
}

/**
 * Writes an ActionLog row for routes decorated with @AuditAction, once the
 * handler has actually succeeded (a throw skips the tap). Fulfills subject
 * §V.6: every mobile action needs to be traceable back to actor, platform,
 * device, and app version. A logging failure must never fail the user's
 * real request (§7 of the playlist spec makes this explicit) - the write is
 * fire-and-forget with its own .catch. Registered globally in app.module.ts
 * (APP_INTERCEPTOR) so any controller can opt an endpoint in with
 * @AuditAction, without needing its own @UseInterceptors.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
    constructor(
        private readonly reflector: Reflector,
        private readonly prisma: PrismaService,
    ) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const action = this.reflector.get<string | undefined>(AUDIT_ACTION_KEY, context.getHandler());
        if (!action) {
            return next.handle();
        }

        const req = context.switchToHttp().getRequest();

        return next.handle().pipe(
            tap(() => {
                this.prisma.actionLog
                    .create({
                        data: {
                            userId: req.user?.id ?? null,
                            action,
                            method: req.method,
                            path: req.originalUrl ?? req.url,
                            ip: req.ip ?? req.socket?.remoteAddress ?? null,
                            platform: firstHeader(req, 'x-client-platform', 'x-platform'),
                            deviceName: firstHeader(req, 'x-client-device-model', 'x-device-name'),
                            appVersion: firstHeader(req, 'x-client-app-version', 'x-app-version'),
                        },
                    })
                    .catch(() => { });
            }),
        );
    }
}
