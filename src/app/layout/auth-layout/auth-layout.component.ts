import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-background-DEFAULT p-4">
      <div class="w-full max-w-md">
        <!-- Logo -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-primary">Wheelbase</h1>
          <p class="text-text-secondary mt-2">Business Portal</p>
        </div>

        <!-- Content -->
        <router-outlet></router-outlet>

        <!-- Footer -->
        <div class="text-center mt-8 text-text-muted text-sm">
          <p>&copy; {{ currentYear }} Wheelbase. All rights reserved.</p>
          <div class="mt-2 space-x-4">
            <a href="https://ridewheelbase.app/terms" target="_blank" class="hover:text-text-secondary">
              Terms of Service
            </a>
            <a href="https://ridewheelbase.app/privacy" target="_blank" class="hover:text-text-secondary">
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
