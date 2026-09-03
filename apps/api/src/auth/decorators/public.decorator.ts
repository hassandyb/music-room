import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route (or an entire controller) as exempt from the global
 * JwtAuthGuard (see app.module.ts). Everything is authenticated by default;
 * this is the explicit opt-out for the handful of routes that must work
 * without a session (login, registration, email verification links, ...).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
