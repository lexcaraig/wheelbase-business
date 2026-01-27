import { Injectable, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import {
  Appointment,
  AppointmentStats,
  ListAppointmentsRequest,
  UpdateStatusRequest,
  AppointmentStatus,
} from '../models/appointment.model';

interface AppointmentListMeta {
  total: number;
  limit: number;
  offset: number;
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private appointmentsSignal = signal<Appointment[]>([]);
  private statsSignal = signal<AppointmentStats | null>(null);
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);
  private metaSignal = signal<AppointmentListMeta>({ total: 0, limit: 50, offset: 0 });
  private updatingSignal = signal<boolean>(false);

  readonly appointments = computed(() => this.appointmentsSignal());
  readonly stats = computed(() => this.statsSignal());
  readonly isLoading = computed(() => this.loadingSignal());
  readonly isUpdating = computed(() => this.updatingSignal());
  readonly error = computed(() => this.errorSignal());
  readonly total = computed(() => this.metaSignal().total);
  readonly meta = computed(() => this.metaSignal());

  constructor(private supabase: SupabaseService) {}

  clearError(): void {
    this.errorSignal.set(null);
  }

  async loadAppointments(request: ListAppointmentsRequest = {}): Promise<Appointment[]> {
    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);

      const response = await this.supabase.callFunctionWithAuth<Appointment[]>(
        'manage-business-appointments',
        {
          action: 'list',
          ...request,
        }
      );

      this.appointmentsSignal.set(response || []);
      return response || [];
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load appointments';
      this.errorSignal.set(message);
      return [];
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async updateStatus(request: UpdateStatusRequest): Promise<Appointment | null> {
    try {
      this.updatingSignal.set(true);
      this.errorSignal.set(null);

      const appointment = await this.supabase.callFunctionWithAuth<Appointment>(
        'manage-business-appointments',
        {
          action: 'update_status',
          ...request,
        }
      );

      if (appointment) {
        this.appointmentsSignal.update(appointments =>
          appointments.map(a => a.id === appointment.id ? appointment : a)
        );
      }

      return appointment;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update appointment';
      this.errorSignal.set(message);
      return null;
    } finally {
      this.updatingSignal.set(false);
    }
  }

  async loadStats(dateFrom?: string, dateTo?: string): Promise<AppointmentStats | null> {
    try {
      this.errorSignal.set(null);

      const stats = await this.supabase.callFunctionWithAuth<AppointmentStats>(
        'manage-business-appointments',
        {
          action: 'get_stats',
          dateFrom,
          dateTo,
        }
      );

      this.statsSignal.set(stats);
      return stats;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load stats';
      this.errorSignal.set(message);
      return null;
    }
  }

  // Helper methods for filtering
  getPendingAppointments(): Appointment[] {
    return this.appointmentsSignal().filter(a => a.status === 'pending');
  }

  getUpcomingAppointments(): Appointment[] {
    const today = new Date().toISOString().split('T')[0];
    return this.appointmentsSignal().filter(a =>
      (a.status === 'confirmed' || a.status === 'pending') &&
      a.requestedDate >= today
    );
  }

  reset(): void {
    this.appointmentsSignal.set([]);
    this.statsSignal.set(null);
    this.errorSignal.set(null);
    this.metaSignal.set({ total: 0, limit: 50, offset: 0 });
  }
}
