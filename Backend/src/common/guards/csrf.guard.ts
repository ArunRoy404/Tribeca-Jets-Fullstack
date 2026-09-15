import { timingSafeEqual } from 'node:crypto';
import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import {
  CSRF_COOKIE,
  CSRF_HEADER,
  IS_PUBLIC_KEY,
} from '../constants/auth.constants.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit CSRF protection.
 *
 * Session cookies are attached by the browser automatically, including on
 * requests a malicious site triggers — the one attack bearer tokens are immune
 * to and cookie sessions are not. SameSite=Lax blocks most of it; this closes
 * the rest by requiring a header that only same-origin JavaScript can set,
 * since cross-origin pages cannot read our CSRF cookie.
 *
 * Only state-changing methods are checked.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (SAFE_METHODS.has(request.method)) return true;

    // Public routes (login, password reset) have no session to protect yet.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const cookieToken = request.cookies?.[CSRF_COOKIE] as string | undefined;
    const headerToken = request.headers[CSRF_HEADER] as string | undefined;

    if (!cookieToken || !headerToken || !safeEquals(cookieToken, headerToken)) {
      throw new ForbiddenException('Invalid or missing CSRF token');
    }

    return true;
  }
}

/** Constant-time comparison; avoids leaking the token through timing. */
function safeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
