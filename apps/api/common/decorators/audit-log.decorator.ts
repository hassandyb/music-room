import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'auditAction';

/**
 * Marks a route as auditable (subject §V.6: every mobile action must
 * generate a back-end log entry). Pair with AuditLogInterceptor, which reads
 * this metadata to know what to write once the handler succeeds - routes
 * without this decorator are left alone by the interceptor.
 */
export const AuditAction = (action: string) => SetMetadata(AUDIT_ACTION_KEY, action);
