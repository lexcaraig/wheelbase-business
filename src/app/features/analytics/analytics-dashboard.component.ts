import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnalyticsService, AnalyticsOverview, TrendData } from '../../core/services/analytics.service';

@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6">
      <!-- Header -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold">Analytics</h1>
          <p class="text-secondary text-sm mt-1">
            Track your business performance
          </p>
        </div>

        <!-- Date Range Selector -->
        <div class="flex flex-wrap gap-2">
          <button
            (click)="setDateRange('7d')"
            [class]="'btn btn-sm ' + (selectedRange === '7d' ? 'btn-primary' : 'btn-ghost')"
          >
            7 Days
          </button>
          <button
            (click)="setDateRange('30d')"
            [class]="'btn btn-sm ' + (selectedRange === '30d' ? 'btn-primary' : 'btn-ghost')"
          >
            30 Days
          </button>
          <button
            (click)="setDateRange('90d')"
            [class]="'btn btn-sm ' + (selectedRange === '90d' ? 'btn-primary' : 'btn-ghost')"
          >
            90 Days
          </button>
          <button
            (click)="setDateRange('custom')"
            [class]="'btn btn-sm ' + (selectedRange === 'custom' ? 'btn-primary' : 'btn-ghost')"
          >
            Custom
          </button>
        </div>
      </div>

      <!-- Custom Date Range -->
      @if (selectedRange === 'custom') {
        <div class="card bg-base-200 border border-neutral mb-6">
          <div class="card-body p-4">
            <div class="flex flex-wrap gap-4 items-end">
              <div class="form-control">
                <label class="label">
                  <span class="label-text">From</span>
                </label>
                <input
                  type="date"
                  [(ngModel)]="customDateFrom"
                  class="input input-bordered bg-base-300"
                />
              </div>
              <div class="form-control">
                <label class="label">
                  <span class="label-text">To</span>
                </label>
                <input
                  type="date"
                  [(ngModel)]="customDateTo"
                  class="input input-bordered bg-base-300"
                />
              </div>
              <button
                (click)="applyCustomRange()"
                class="btn btn-primary"
                [disabled]="!customDateFrom || !customDateTo"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Error Alert -->
      @if (analyticsService.error()) {
        <div class="alert alert-error mb-4">
          <i class="pi pi-exclamation-circle"></i>
          <span>{{ analyticsService.error() }}</span>
          <button class="btn btn-ghost btn-sm" (click)="analyticsService.clearError()">
            <i class="pi pi-times"></i>
          </button>
        </div>
      }

      <!-- Loading State -->
      @if (analyticsService.isLoading()) {
        <div class="flex justify-center py-12">
          <span class="loading loading-spinner loading-lg text-primary"></span>
        </div>
      }

      @else if (analyticsService.overview()) {
        <!-- Overview Stats -->
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <!-- Total Events -->
          <div class="card bg-base-200 border border-neutral">
            <div class="card-body p-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <i class="pi pi-chart-line text-primary"></i>
                </div>
                <div>
                  <p class="text-xs text-secondary">Total Events</p>
                  <p class="text-xl font-bold">{{ analyticsService.overview()?.totalEvents | number }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Profile Views -->
          <div class="card bg-base-200 border border-neutral">
            <div class="card-body p-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-info/20 flex items-center justify-center">
                  <i class="pi pi-user text-info"></i>
                </div>
                <div>
                  <p class="text-xs text-secondary">Profile Views</p>
                  <p class="text-xl font-bold">{{ analyticsService.overview()?.profileViews | number }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Product Views -->
          <div class="card bg-base-200 border border-neutral">
            <div class="card-body p-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                  <i class="pi pi-box text-success"></i>
                </div>
                <div>
                  <p class="text-xs text-secondary">Product Views</p>
                  <p class="text-xl font-bold">{{ analyticsService.overview()?.productViews | number }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Service Views -->
          <div class="card bg-base-200 border border-neutral">
            <div class="card-body p-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
                  <i class="pi pi-wrench text-warning"></i>
                </div>
                <div>
                  <p class="text-xs text-secondary">Service Views</p>
                  <p class="text-xl font-bold">{{ analyticsService.overview()?.serviceViews | number }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Contact Clicks -->
          <div class="card bg-base-200 border border-neutral">
            <div class="card-body p-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                  <i class="pi pi-phone text-secondary"></i>
                </div>
                <div>
                  <p class="text-xs text-secondary">Contact Clicks</p>
                  <p class="text-xl font-bold">{{ analyticsService.overview()?.contactClicks | number }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Direction Clicks -->
          <div class="card bg-base-200 border border-neutral">
            <div class="card-body p-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-error/20 flex items-center justify-center">
                  <i class="pi pi-map-marker text-error"></i>
                </div>
                <div>
                  <p class="text-xs text-secondary">Direction Clicks</p>
                  <p class="text-xl font-bold">{{ analyticsService.overview()?.directionClicks | number }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Second Row Stats -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <!-- Product Count -->
          <div class="card bg-base-200 border border-neutral">
            <div class="card-body p-4">
              <h3 class="text-sm text-secondary mb-2">Products Listed</h3>
              <p class="text-3xl font-bold">{{ analyticsService.overview()?.productCount }}</p>
            </div>
          </div>

          <!-- Service Count -->
          <div class="card bg-base-200 border border-neutral">
            <div class="card-body p-4">
              <h3 class="text-sm text-secondary mb-2">Services Listed</h3>
              <p class="text-3xl font-bold">{{ analyticsService.overview()?.serviceCount }}</p>
            </div>
          </div>

          <!-- Appointments -->
          <div class="card bg-base-200 border border-neutral col-span-2">
            <div class="card-body p-4">
              <h3 class="text-sm text-secondary mb-3">Appointments</h3>
              <div class="grid grid-cols-4 gap-4">
                <div class="text-center">
                  <p class="text-2xl font-bold">{{ analyticsService.overview()?.appointments?.total || 0 }}</p>
                  <p class="text-xs text-secondary">Total</p>
                </div>
                <div class="text-center">
                  <p class="text-2xl font-bold text-warning">{{ analyticsService.overview()?.appointments?.pending || 0 }}</p>
                  <p class="text-xs text-secondary">Pending</p>
                </div>
                <div class="text-center">
                  <p class="text-2xl font-bold text-info">{{ analyticsService.overview()?.appointments?.confirmed || 0 }}</p>
                  <p class="text-xs text-secondary">Confirmed</p>
                </div>
                <div class="text-center">
                  <p class="text-2xl font-bold text-success">{{ analyticsService.overview()?.appointments?.completed || 0 }}</p>
                  <p class="text-xs text-secondary">Completed</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Trends Chart (Simple Bar Chart) -->
        @if (analyticsService.trends().length > 0) {
          <div class="card bg-base-200 border border-neutral">
            <div class="card-body">
              <div class="flex justify-between items-center mb-4">
                <h3 class="font-bold">Activity Trends</h3>
                <div class="flex gap-2">
                  <button
                    (click)="setGroupBy('day')"
                    [class]="'btn btn-xs ' + (groupBy === 'day' ? 'btn-primary' : 'btn-ghost')"
                  >
                    Daily
                  </button>
                  <button
                    (click)="setGroupBy('week')"
                    [class]="'btn btn-xs ' + (groupBy === 'week' ? 'btn-primary' : 'btn-ghost')"
                  >
                    Weekly
                  </button>
                  <button
                    (click)="setGroupBy('month')"
                    [class]="'btn btn-xs ' + (groupBy === 'month' ? 'btn-primary' : 'btn-ghost')"
                  >
                    Monthly
                  </button>
                </div>
              </div>

              <!-- Simple Bar Chart -->
              <div class="overflow-x-auto">
                <div class="flex items-end gap-1 h-48 min-w-fit">
                  @for (trend of analyticsService.trends(); track trend.date) {
                    <div class="flex flex-col items-center min-w-[40px]">
                      <div
                        class="w-8 bg-primary rounded-t transition-all"
                        [style.height.px]="getBarHeight(trend.total)"
                        [title]="trend.total + ' events'"
                      ></div>
                      <span class="text-xs text-secondary mt-1 transform -rotate-45 origin-top-left whitespace-nowrap">
                        {{ formatTrendDate(trend.date) }}
                      </span>
                    </div>
                  }
                </div>
              </div>

              <!-- Legend -->
              <div class="flex flex-wrap gap-4 mt-6 pt-4 border-t border-neutral text-sm">
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 bg-info rounded"></span>
                  <span class="text-secondary">Profile Views: {{ getTotalByType('profileViews') }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 bg-success rounded"></span>
                  <span class="text-secondary">Product Views: {{ getTotalByType('productViews') }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 bg-warning rounded"></span>
                  <span class="text-secondary">Service Views: {{ getTotalByType('serviceViews') }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 bg-secondary rounded"></span>
                  <span class="text-secondary">Contact Clicks: {{ getTotalByType('contactClicks') }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 bg-error rounded"></span>
                  <span class="text-secondary">Direction Clicks: {{ getTotalByType('directionClicks') }}</span>
                </div>
              </div>
            </div>
          </div>
        }
      }

      @else {
        <!-- No Data State -->
        <div class="card bg-base-200 border border-neutral">
          <div class="card-body text-center py-12">
            <div class="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <i class="pi pi-chart-bar text-primary text-3xl"></i>
            </div>
            <h2 class="text-xl font-bold mb-2">No Analytics Data Yet</h2>
            <p class="text-secondary">
              As users interact with your business profile, analytics data will appear here.
            </p>
          </div>
        </div>
      }
    </div>
  `,
  styles: []
})
export class AnalyticsDashboardComponent implements OnInit, OnDestroy {
  analyticsService = inject(AnalyticsService);

  // Date range state
  selectedRange: '7d' | '30d' | '90d' | 'custom' = '30d';
  customDateFrom = '';
  customDateTo = '';
  dateFrom = '';
  dateTo = '';

  // Grouping
  groupBy: 'day' | 'week' | 'month' = 'day';

  async ngOnInit(): Promise<void> {
    this.setDateRange('30d');
  }

  ngOnDestroy(): void {
    this.analyticsService.reset();
  }

  setDateRange(range: '7d' | '30d' | '90d' | 'custom'): void {
    this.selectedRange = range;

    if (range === 'custom') {
      return;
    }

    const now = new Date();
    this.dateTo = now.toISOString().split('T')[0];

    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const from = new Date(now);
    from.setDate(from.getDate() - days);
    this.dateFrom = from.toISOString().split('T')[0];

    this.loadAnalytics();
  }

  applyCustomRange(): void {
    if (this.customDateFrom && this.customDateTo) {
      this.dateFrom = this.customDateFrom;
      this.dateTo = this.customDateTo;
      this.loadAnalytics();
    }
  }

  setGroupBy(group: 'day' | 'week' | 'month'): void {
    this.groupBy = group;
    this.loadTrends();
  }

  async loadAnalytics(): Promise<void> {
    await Promise.all([
      this.analyticsService.loadOverview(this.dateFrom, this.dateTo),
      this.loadTrends(),
    ]);
  }

  async loadTrends(): Promise<void> {
    await this.analyticsService.loadTrends(this.dateFrom, this.dateTo, this.groupBy);
  }

  getBarHeight(value: number): number {
    const trends = this.analyticsService.trends();
    if (trends.length === 0) return 0;

    const maxValue = Math.max(...trends.map(t => t.total), 1);
    const maxHeight = 160;
    return Math.max((value / maxValue) * maxHeight, 4);
  }

  formatTrendDate(dateStr: string): string {
    const date = new Date(dateStr);
    if (this.groupBy === 'month') {
      return date.toLocaleDateString('en-US', { month: 'short' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  getTotalByType(type: keyof TrendData): number {
    return this.analyticsService.trends().reduce((sum, t) => {
      const value = t[type];
      return sum + (typeof value === 'number' ? value : 0);
    }, 0);
  }
}
