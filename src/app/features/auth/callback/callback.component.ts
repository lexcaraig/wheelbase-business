import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-background-primary">
      <div class="card text-center">
        <div class="flex justify-center mb-4">
          <i class="pi pi-spinner pi-spin text-4xl text-primary"></i>
        </div>
        <h2 class="text-xl font-semibold text-text-primary mb-2">
          Signing you in...
        </h2>
        <p class="text-text-secondary">
          Please wait while we verify your account.
        </p>
      </div>
    </div>
  `,
  styles: []
})
export class CallbackComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  async ngOnInit(): Promise<void> {
    // Wait for auth state to settle
    await this.waitForAuthState();

    // Check auth state and redirect appropriately
    if (this.authService.isAuthenticated()) {
      // User has a business, go to dashboard
      await this.router.navigate(['/dashboard']);
    } else if (this.authService.hasSession()) {
      // User is logged in but has no business, go to claim page
      await this.router.navigate(['/claim']);
    } else {
      // No session, go to login
      await this.router.navigate(['/login']);
    }
  }

  private waitForAuthState(): Promise<void> {
    return new Promise((resolve) => {
      // Check every 100ms for up to 5 seconds
      let attempts = 0;
      const maxAttempts = 50;

      const checkAuth = () => {
        attempts++;
        if (!this.authService.isLoading() || attempts >= maxAttempts) {
          resolve();
        } else {
          setTimeout(checkAuth, 100);
        }
      };

      checkAuth();
    });
  }
}
