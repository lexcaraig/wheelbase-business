import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-base-100 p-4">
      <div class="w-full max-w-full">
        <!-- Logo -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-primary">Wheelbase</h1>
          <p class="text-secondary mt-2">Business Portal</p>
        </div>

        <!-- Content -->
        <router-outlet></router-outlet>

        <!-- Footer -->
        <div class="text-center mt-8 text-sm opacity-70">
          <p>&copy; {{ currentYear }} Wheelbase. All rights reserved.</p>
          <div class="mt-2 space-x-4">
            <a href="https://ridewheelbase.app/terms" target="_blank" class="link link-hover">
              Terms of Service
            </a>
            <a href="https://ridewheelbase.app/privacy" target="_blank" class="link link-hover">
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class AuthLayoutComponent {
  currentYear = new Date().getFullYear();
}
