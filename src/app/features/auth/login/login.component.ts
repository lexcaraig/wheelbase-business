import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="card">
      <h2 class="text-2xl font-bold text-text-primary mb-2 text-center">
        Business Portal
      </h2>
      <p class="text-text-secondary text-center mb-6">
        Sign in with your Wheelbase account
      </p>

      @if (authService.error()) {
        <div class="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
          {{ authService.error() }}
        </div>
      }

      <!-- Google Sign-In (Primary) -->
      <button
        (click)="signInWithGoogle()"
        class="w-full py-3 px-4 rounded-lg border border-border-color bg-white hover:bg-gray-50 text-gray-800 font-medium flex items-center justify-center gap-3 transition-colors"
        [disabled]="isSubmitting()"
      >
        @if (isSubmitting()) {
          <i class="pi pi-spinner pi-spin"></i>
          <span>Signing in...</span>
        } @else {
          <svg class="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>Continue with Google</span>
        }
      </button>

      <div class="relative my-6">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-border-color"></div>
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-4 bg-background-secondary text-text-muted">or sign in with email</span>
        </div>
      </div>

      <!-- Email/Password (Secondary) -->
      <form (ngSubmit)="onSubmit()" class="space-y-4">
        <div>
          <label for="email" class="block text-text-secondary mb-2">Email</label>
          <input
            type="email"
            id="email"
            [(ngModel)]="email"
            name="email"
            class="input-field"
            placeholder="you&#64;example.com"
            required
            [disabled]="isSubmitting()"
          />
        </div>

        <div>
          <label for="password" class="block text-text-secondary mb-2">Password</label>
          <input
            type="password"
            id="password"
            [(ngModel)]="password"
            name="password"
            class="input-field"
            placeholder="Enter your password"
            required
            [disabled]="isSubmitting()"
          />
        </div>

        <button
          type="submit"
          class="w-full btn-secondary py-3 flex items-center justify-center gap-2"
          [disabled]="isSubmitting() || !email || !password"
        >
          @if (isSubmitting()) {
            <i class="pi pi-spinner pi-spin"></i>
            <span>Signing in...</span>
          } @else {
            <span>Sign In with Email</span>
          }
        </button>
      </form>

      <div class="mt-6 pt-4 border-t border-border-color text-center">
        <p class="text-text-muted text-sm">
          Have an invite code?
          <a routerLink="/register" class="text-primary hover:underline ml-1">
            Register your business
          </a>
        </p>
      </div>
    </div>
  `,
  styles: []
})
export class LoginComponent {
  authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  isSubmitting = signal(false);

  async signInWithGoogle(): Promise<void> {
    this.isSubmitting.set(true);
    this.authService.clearError();

    try {
      await this.authService.signInWithGoogle();
      // OAuth redirect will happen automatically
    } catch (error) {
      console.error('Google sign-in error:', error);
      this.isSubmitting.set(false);
    }
  }

  async onSubmit(): Promise<void> {
    if (!this.email || !this.password) return;

    this.isSubmitting.set(true);
    this.authService.clearError();

    try {
      await this.authService.login({
        email: this.email,
        password: this.password
      });
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
