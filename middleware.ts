import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionCookie } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/'];
const API_ROUTES_PREFIX = '/api';

// Initializing rate limiters
const globalLimiter = rateLimit({ interval: 15 * 60 * 1000, uniqueTokenPerInterval: 500 });
const authLimiter = rateLimit({ interval: 15 * 60 * 1000, uniqueTokenPerInterval: 200 });
const apiLimiter = rateLimit({ interval: 15 * 60 * 1000, uniqueTokenPerInterval: 500 });

export async function middleware(req: NextRequest) {
    const path = req.nextUrl.pathname;
    // Get IP address from headers or request object with a fallback
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = (forwarded ? forwarded.split(',')[0] : (req as any).ip) || '127.0.0.1';


    const isPublicRoute = PUBLIC_ROUTES.includes(path);
    const isApiRoute = path.startsWith(API_ROUTES_PREFIX);

    // Skip auth checks for completely public assets
    if (path.startsWith('/_next') || path.includes('.')) {
        return NextResponse.next();
    }

    // 1. Rate Limiting Logic (Tiered)
    try {
        if (path === '/login' || path === '/register') {
            await authLimiter.check(req, 10, `auth_${ip}`); // 10 attempts per 15min
        } else if (isApiRoute) {
            await apiLimiter.check(req, 100, `api_${ip}`); // 100 API calls per ip per 15min
        } else {
            await globalLimiter.check(req, 1000, `global_${ip}`); // 1000 total reqs per ip per 15min
        }
    } catch {
        return NextResponse.json({ error: 'Too Many Requests', retryAfter: '15m' }, { status: 429 });
    }

    // 2. Verify Session
    const session = await verifySessionCookie();

    // 3. Route Guarding Logic
    if (!session && !isPublicRoute) {
        // Redirect unauthenticated users to login
        if (isApiRoute) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.redirect(new URL('/login', req.nextUrl));
    }

    if (session && isPublicRoute && path !== '/') {
        // Authenticated users shouldn't see the login page
        return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
    }

    // 4. Security Headers
    const response = NextResponse.next();
    
    // Security Best Practices
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    
    // Content Security Policy
    const cspHeader = `
        default-src 'self';
        script-src 'self' 'unsafe-inline';
        style-src 'self' 'unsafe-inline';
        img-src 'self' blob: data:;
        font-src 'self';
        object-src 'none';
        base-uri 'self';
        form-action 'self';
        frame-ancestors 'none';
        block-all-mixed-content;
        upgrade-insecure-requests;
    `.replace(/\s{2,}/g, ' ').trim();
    
    response.headers.set('Content-Security-Policy', cspHeader);

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
