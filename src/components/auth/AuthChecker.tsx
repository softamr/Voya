
"use client";

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { USER_ROLES, PROTECTED_ROUTES_CONFIG } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Pages that don't require authentication
const PUBLIC_PATHS = ['/login', '/reset-password', '/setup-admin', '/signup'];
// Pages that require user to be unauthenticated
const UNAUTH_ONLY_PATHS = ['/login', '/setup-admin', '/signup'];

export default function AuthChecker({ children }: { children: ReactNode }) {
  const { user, loading, isSuperAdminSetup } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) {
      return;
    }

    // Handle Super Admin Setup
    if (!isSuperAdminSetup && pathname !== '/setup-admin' && pathname !== '/login' && pathname !== '/') {
      router.replace('/setup-admin');
      return;
    }
    if (isSuperAdminSetup && pathname === '/setup-admin') {
      router.replace('/'); // Already set up, redirect from setup page
      return;
    }

    // Handle Authenticated User trying to access unauth-only pages
    if (user && UNAUTH_ONLY_PATHS.includes(pathname)) {
      if (user.role === USER_ROLES.SUPER_ADMIN || user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.SALES) {
        router.replace('/admin');
      } else {
        router.replace('/');
      }
      return;
    }

    // Handle Unauthenticated User trying to access protected pages
    // Any page not in PUBLIC_PATHS and not the homepage is considered protected for unauthenticated users.
    if (!user && !PUBLIC_PATHS.includes(pathname) && pathname !== '/') {
        // Check if the path is genuinely protected based on any role definition
        const isActuallyProtected = Object.values(PROTECTED_ROUTES_CONFIG)
                                        .flat()
                                        .some(protectedPath => pathname.startsWith(protectedPath));
        
        // If it is, and it's not one of the general public pages, redirect to login.
        // Pages like destination details might be public, but reservation actions on them would be protected by component logic.
        if (isActuallyProtected) {
            router.replace('/login');
            return;
        }
    }

    // Role-Based Access Control for authenticated users
    if (user) {
      const userAllowedRoutes = PROTECTED_ROUTES_CONFIG[user.role] || [];
      const isAccessingAllowedRoute = userAllowedRoutes.some(allowedPath => pathname.startsWith(allowedPath));
      
      // Check if trying to access a route specifically defined for *other* roles
      const isAccessingOtherRolesRoute = Object.entries(PROTECTED_ROUTES_CONFIG)
        .filter(([roleKey, _]) => roleKey !== user.role) // Routes of other roles
        .some(([_, otherRoutes]) => otherRoutes.some(otherRoute => pathname.startsWith(otherRoute)));

      // If it's a route for other roles AND not allowed for current user, and not homepage/profile (which GUESTs might access)
      if (isAccessingOtherRolesRoute && !isAccessingAllowedRoute && pathname !== '/' && pathname !== '/profile') {
         router.replace('/'); 
         return;
      }
    }

  }, [user, loading, router, pathname, isSuperAdminSetup]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="space-y-4 w-full max-w-md p-8">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-10 w-1/2 mt-4" />
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
}
