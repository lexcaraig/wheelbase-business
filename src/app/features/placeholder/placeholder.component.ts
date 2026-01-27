import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-placeholder',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center justify-center min-h-[60vh]">
      <div class="text-center">
        <div class="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <i [class]="'pi ' + getIcon() + ' text-primary text-5xl'"></i>
        </div>
        <h1 class="text-3xl font-bold mb-2">{{ getTitle() }}</h1>
        <p class="text-secondary text-lg mb-6">This feature is coming soon!</p>
        <div class="badge badge-primary badge-lg">Phase 2</div>
      </div>
    </div>
  `,
  styles: []
})
export class PlaceholderComponent {
  private route = inject(ActivatedRoute);

  private pageConfig: Record<string, { title: string; icon: string }> = {
    'products': { title: 'Products', icon: 'pi-box' },
    'services': { title: 'Services', icon: 'pi-wrench' },
    'appointments': { title: 'Appointments', icon: 'pi-calendar' },
    'analytics': { title: 'Analytics', icon: 'pi-chart-bar' },
    'settings': { title: 'Settings', icon: 'pi-cog' },
  };

  getTitle(): string {
    const path = this.route.snapshot.routeConfig?.path || '';
    return this.pageConfig[path]?.title || 'Coming Soon';
  }

  getIcon(): string {
    const path = this.route.snapshot.routeConfig?.path || '';
    return this.pageConfig[path]?.icon || 'pi-info-circle';
  }
}
