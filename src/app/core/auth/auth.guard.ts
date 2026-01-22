import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Wait for auth to finish loading
 */
async function waitForAuth(authService: AuthService, maxWaitMs = 3000): Promise<void> {
  const startTime = Date.now();
  while (authService.isLoading() && (Date.now() - startTime) < maxWaitMs) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

/**
 * Guard for protected routes (requires session AND business)
 */
export const AuthGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await waitForAuth(authService);

  // Must have session AND business
  if (authService.isAuthenticated()) {
    return true;
  }

  // Has session but no business - go to claim page
  if (authService.hasSession() && !authService.business()) {
    router.navigate(['/claim']);
    return false;
  }

  // No session - go to login
  router.navigate(['/login']);
  return false;
};

/**
 * Guard for guest routes (no session)
 */
export const GuestGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await waitForAuth(authService);

  // No session - allow access
  if (!authService.hasSession()) {
    return true;
  }

  // Has session AND business - go to dashboard
  if (authService.isAuthenticated()) {
    router.navigate(['/dashboard']);
    return false;
  }

  // Has session but no business - go to claim page
  router.navigate(['/claim']);
  return false;
};

/**
 * Guard for claim page (session but no business)
 */
export const NeedsBusinessGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await waitForAuth(authService);

  // Has session but no business - allow access to claim page
  if (authService.hasSession() && !authService.business()) {
    return true;
  }

  // Has session AND business - go to dashboard
  if (authService.isAuthenticated()) {
    router.navigate(['/dashboard']);
    return false;
  }

  // No session - go to login
  router.navigate(['/login']);
  return false;
};
