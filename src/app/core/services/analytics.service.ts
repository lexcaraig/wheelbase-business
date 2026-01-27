import { Injectable, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface AnalyticsOverview {
  totalEvents: number;
  profileViews: number;
  productViews: number;
  serviceViews: number;
  contactClicks: number;
  directionClicks: number;
  productCount: number;
  serviceCount: number;
  appointments: {
    total: number;
    pending: number;
    confirmed: number;
    completed: number;
  };
}

export interface AnalyticsEvent {
  id: string;
  businessId: string;
  eventType: string;
  productId?: string;
  serviceId?: string;
  userId?: string;
  devicePlatform?: string;
  countryCode?: string;
  createdAt: string;
}

export interface TrendData {
  date: string;
  total: number;
  profileViews: number;
  productViews: number;
  serviceViews: number;
  contactClicks: number;
  directionClicks: number;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private overviewSignal = signal<AnalyticsOverview | null>(null);
  private trendsSignal = signal<TrendData[]>([]);
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);

  readonly overview = computed(() => this.overviewSignal());
  readonly trends = computed(() => this.trendsSignal());
  readonly isLoading = computed(() => this.loadingSignal());
  readonly error = computed(() => this.errorSignal());

  constructor(private supabase: SupabaseService) {}

  clearError(): void {
    this.errorSignal.set(null);
  }

  async loadOverview(dateFrom?: string, dateTo?: string): Promise<AnalyticsOverview | null> {
    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);

      const response = await this.supabase.callFunctionWithAuth<AnalyticsOverview>(
        'get-business-analytics',
        {
          action: 'overview',
          dateFrom,
          dateTo,
        }
      );

      this.overviewSignal.set(response);
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load analytics';
      this.errorSignal.set(message);
      return null;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async loadTrends(dateFrom?: string, dateTo?: string, groupBy: 'day' | 'week' | 'month' = 'day'): Promise<TrendData[]> {
    try {
      this.errorSignal.set(null);

      const response = await this.supabase.callFunctionWithAuth<TrendData[]>(
        'get-business-analytics',
        {
          action: 'trends',
          dateFrom,
          dateTo,
          groupBy,
        }
      );

      this.trendsSignal.set(response || []);
      return response || [];
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load trends';
      this.errorSignal.set(message);
      return [];
    }
  }

  reset(): void {
    this.overviewSignal.set(null);
    this.trendsSignal.set([]);
    this.errorSignal.set(null);
  }
}
