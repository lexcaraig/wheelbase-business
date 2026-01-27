import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentService } from '../../core/services/appointment.service';
import {
  Appointment,
  AppointmentStatus,
  APPOINTMENT_STATUSES,
  TIME_PREFERENCES,
  getStatusBadgeClass,
  getStatusLabel,
  formatTimePreference,
} from '../../core/models/appointment.model';

@Component({
  selector: 'app-appointment-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold">Appointments</h1>
          <p class="text-secondary text-sm mt-1">
            Manage customer appointment requests
          </p>
        </div>
      </div>

      <!-- Stats Cards -->
      @if (appointmentService.stats()) {
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div class="stat bg-base-200 border border-neutral rounded-box p-4">
            <div class="stat-title text-xs">Total</div>
            <div class="stat-value text-2xl">{{ appointmentService.stats()?.total || 0 }}</div>
          </div>
          <div class="stat bg-base-200 border border-neutral rounded-box p-4">
            <div class="stat-title text-xs">Pending</div>
            <div class="stat-value text-2xl text-warning">{{ appointmentService.stats()?.pending || 0 }}</div>
          </div>
          <div class="stat bg-base-200 border border-neutral rounded-box p-4">
            <div class="stat-title text-xs">Confirmed</div>
            <div class="stat-value text-2xl text-info">{{ appointmentService.stats()?.confirmed || 0 }}</div>
          </div>
          <div class="stat bg-base-200 border border-neutral rounded-box p-4">
            <div class="stat-title text-xs">Completed</div>
            <div class="stat-value text-2xl text-success">{{ appointmentService.stats()?.completed || 0 }}</div>
          </div>
          <div class="stat bg-base-200 border border-neutral rounded-box p-4">
            <div class="stat-title text-xs">Completion Rate</div>
            <div class="stat-value text-2xl">{{ (appointmentService.stats()?.completionRate || 0).toFixed(0) }}%</div>
          </div>
          <div class="stat bg-base-200 border border-neutral rounded-box p-4">
            <div class="stat-title text-xs">No-Show Rate</div>
            <div class="stat-value text-2xl text-error">{{ (appointmentService.stats()?.noShowRate || 0).toFixed(0) }}%</div>
          </div>
        </div>
      }

      <!-- Filters -->
      <div class="card bg-base-200 border border-neutral mb-6">
        <div class="card-body p-4">
          <div class="flex flex-wrap gap-4">
            <!-- Status Filter -->
            <div class="form-control min-w-[150px]">
              <select
                [(ngModel)]="selectedStatus"
                (change)="applyFilters()"
                class="select select-bordered bg-base-300"
              >
                <option [value]="null">All Statuses</option>
                @for (status of statuses; track status.value) {
                  <option [value]="status.value">{{ status.label }}</option>
                }
              </select>
            </div>

            <!-- Date From -->
            <div class="form-control min-w-[150px]">
              <input
                type="date"
                [(ngModel)]="dateFrom"
                (change)="applyFilters()"
                class="input input-bordered bg-base-300"
                placeholder="From date"
              />
            </div>

            <!-- Date To -->
            <div class="form-control min-w-[150px]">
              <input
                type="date"
                [(ngModel)]="dateTo"
                (change)="applyFilters()"
                class="input input-bordered bg-base-300"
                placeholder="To date"
              />
            </div>

            @if (hasActiveFilters()) {
              <button (click)="clearFilters()" class="btn btn-ghost btn-sm">
                <i class="pi pi-times mr-1"></i>
                Clear
              </button>
            }
          </div>
        </div>
      </div>

      <!-- Error Alert -->
      @if (appointmentService.error()) {
        <div class="alert alert-error mb-4">
          <i class="pi pi-exclamation-circle"></i>
          <span>{{ appointmentService.error() }}</span>
          <button class="btn btn-ghost btn-sm" (click)="appointmentService.clearError()">
            <i class="pi pi-times"></i>
          </button>
        </div>
      }

      <!-- Loading State -->
      @if (appointmentService.isLoading()) {
        <div class="flex justify-center py-12">
          <span class="loading loading-spinner loading-lg text-primary"></span>
        </div>
      }

      <!-- Empty State -->
      @else if (appointmentService.appointments().length === 0) {
        <div class="card bg-base-200 border border-neutral">
          <div class="card-body text-center py-12">
            <div class="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <i class="pi pi-calendar text-primary text-3xl"></i>
            </div>
            <h2 class="text-xl font-bold mb-2">No Appointments Yet</h2>
            <p class="text-secondary">
              When customers request appointments, they'll appear here.
            </p>
          </div>
        </div>
      }

      <!-- Appointments List -->
      @else {
        <div class="space-y-4">
          @for (appointment of appointmentService.appointments(); track appointment.id) {
            <div class="card bg-base-200 border border-neutral">
              <div class="card-body p-4">
                <div class="flex flex-col lg:flex-row lg:items-center gap-4">
                  <!-- User Info -->
                  <div class="flex items-center gap-3 flex-1">
                    <div class="avatar placeholder">
                      <div class="w-12 h-12 rounded-full bg-primary/20">
                        @if (appointment.user?.avatar_url) {
                          <img [src]="appointment.user?.avatar_url" [alt]="appointment.user?.display_name" />
                        } @else {
                          <span class="text-lg">{{ getInitials(appointment.user?.display_name || 'U') }}</span>
                        }
                      </div>
                    </div>
                    <div>
                      <h3 class="font-semibold">{{ appointment.user?.display_name || 'Unknown User' }}</h3>
                      @if (appointment.service) {
                        <p class="text-secondary text-sm">{{ appointment.service.title }}</p>
                      }
                    </div>
                  </div>

                  <!-- Date & Time -->
                  <div class="text-sm">
                    <div class="font-medium">
                      <i class="pi pi-calendar mr-1"></i>
                      {{ formatDate(appointment.requestedDate) }}
                    </div>
                    <div class="text-secondary">
                      <i class="pi pi-clock mr-1"></i>
                      {{ formatTimePreference(appointment.requestedTimePreference) }}
                    </div>
                    @if (appointment.confirmedDatetime) {
                      <div class="text-success mt-1">
                        <i class="pi pi-check-circle mr-1"></i>
                        Confirmed: {{ formatDateTime(appointment.confirmedDatetime) }}
                      </div>
                    }
                  </div>

                  <!-- Status Badge -->
                  <div>
                    <span [class]="'badge ' + getStatusBadgeClass(appointment.status)">
                      {{ getStatusLabel(appointment.status) }}
                    </span>
                  </div>

                  <!-- Actions -->
                  <div class="flex gap-2">
                    @if (appointment.status === 'pending') {
                      <button
                        (click)="openConfirmModal(appointment)"
                        class="btn btn-success btn-sm"
                        [disabled]="appointmentService.isUpdating()"
                      >
                        <i class="pi pi-check mr-1"></i>
                        Confirm
                      </button>
                      <button
                        (click)="openDeclineModal(appointment)"
                        class="btn btn-error btn-sm"
                        [disabled]="appointmentService.isUpdating()"
                      >
                        <i class="pi pi-times mr-1"></i>
                        Decline
                      </button>
                    }
                    @if (appointment.status === 'confirmed') {
                      <button
                        (click)="markCompleted(appointment)"
                        class="btn btn-success btn-sm"
                        [disabled]="appointmentService.isUpdating()"
                      >
                        <i class="pi pi-check-circle mr-1"></i>
                        Complete
                      </button>
                      <button
                        (click)="markNoShow(appointment)"
                        class="btn btn-warning btn-sm"
                        [disabled]="appointmentService.isUpdating()"
                      >
                        <i class="pi pi-user-minus mr-1"></i>
                        No Show
                      </button>
                    }
                  </div>
                </div>

                <!-- Notes -->
                @if (appointment.notes) {
                  <div class="mt-3 pt-3 border-t border-neutral">
                    <p class="text-sm text-secondary">
                      <i class="pi pi-comment mr-1"></i>
                      {{ appointment.notes }}
                    </p>
                  </div>
                }

                <!-- Decline Reason -->
                @if (appointment.declineReason && appointment.status === 'declined') {
                  <div class="mt-3 pt-3 border-t border-neutral">
                    <p class="text-sm text-error">
                      <i class="pi pi-info-circle mr-1"></i>
                      Decline reason: {{ appointment.declineReason }}
                    </p>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Confirm Modal -->
      @if (confirmingAppointment()) {
        <div class="modal modal-open">
          <div class="modal-box bg-base-200 border border-neutral">
            <h3 class="font-bold text-lg mb-4">Confirm Appointment</h3>
            <p class="text-secondary mb-4">
              Set the confirmed date and time for this appointment.
            </p>
            <div class="form-control">
              <label class="label">
                <span class="label-text">Confirmed Date & Time *</span>
              </label>
              <input
                type="datetime-local"
                [(ngModel)]="confirmedDatetime"
                class="input input-bordered bg-base-300"
                required
              />
            </div>
            <div class="modal-action">
              <button
                (click)="confirmingAppointment.set(null)"
                class="btn btn-ghost"
                [disabled]="appointmentService.isUpdating()"
              >
                Cancel
              </button>
              <button
                (click)="confirmAppointment()"
                class="btn btn-success"
                [disabled]="appointmentService.isUpdating() || !confirmedDatetime"
              >
                @if (appointmentService.isUpdating()) {
                  <span class="loading loading-spinner loading-sm"></span>
                }
                Confirm
              </button>
            </div>
          </div>
          <div class="modal-backdrop bg-black/50" (click)="confirmingAppointment.set(null)"></div>
        </div>
      }

      <!-- Decline Modal -->
      @if (decliningAppointment()) {
        <div class="modal modal-open">
          <div class="modal-box bg-base-200 border border-neutral">
            <h3 class="font-bold text-lg mb-4">Decline Appointment</h3>
            <p class="text-secondary mb-4">
              Provide a reason for declining this appointment.
            </p>
            <div class="form-control">
              <label class="label">
                <span class="label-text">Reason (optional)</span>
              </label>
              <textarea
                [(ngModel)]="declineReason"
                class="textarea textarea-bordered bg-base-300 h-24"
                placeholder="e.g., Fully booked on this date..."
              ></textarea>
            </div>
            <div class="modal-action">
              <button
                (click)="decliningAppointment.set(null)"
                class="btn btn-ghost"
                [disabled]="appointmentService.isUpdating()"
              >
                Cancel
              </button>
              <button
                (click)="declineAppointment()"
                class="btn btn-error"
                [disabled]="appointmentService.isUpdating()"
              >
                @if (appointmentService.isUpdating()) {
                  <span class="loading loading-spinner loading-sm"></span>
                }
                Decline
              </button>
            </div>
          </div>
          <div class="modal-backdrop bg-black/50" (click)="decliningAppointment.set(null)"></div>
        </div>
      }
    </div>
  `,
  styles: []
})
export class AppointmentListComponent implements OnInit, OnDestroy {
  appointmentService = inject(AppointmentService);

  // Filter state
  selectedStatus: AppointmentStatus | null = null;
  dateFrom = '';
  dateTo = '';

  // Constants
  statuses = APPOINTMENT_STATUSES;

  // Modal state
  confirmingAppointment = signal<Appointment | null>(null);
  decliningAppointment = signal<Appointment | null>(null);
  confirmedDatetime = '';
  declineReason = '';

  // Helpers
  getStatusBadgeClass = getStatusBadgeClass;
  getStatusLabel = getStatusLabel;
  formatTimePreference = formatTimePreference;

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.loadAppointments(),
      this.appointmentService.loadStats(),
    ]);
  }

  ngOnDestroy(): void {
    this.appointmentService.reset();
  }

  async loadAppointments(): Promise<void> {
    await this.appointmentService.loadAppointments({
      status: this.selectedStatus || undefined,
      dateFrom: this.dateFrom || undefined,
      dateTo: this.dateTo || undefined,
      limit: 50,
      offset: 0,
    });
  }

  applyFilters(): void {
    this.loadAppointments();
  }

  clearFilters(): void {
    this.selectedStatus = null;
    this.dateFrom = '';
    this.dateTo = '';
    this.loadAppointments();
  }

  hasActiveFilters(): boolean {
    return !!(this.selectedStatus || this.dateFrom || this.dateTo);
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatDateTime(dateTimeStr: string): string {
    const date = new Date(dateTimeStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  openConfirmModal(appointment: Appointment): void {
    this.confirmedDatetime = '';
    this.confirmingAppointment.set(appointment);
  }

  openDeclineModal(appointment: Appointment): void {
    this.declineReason = '';
    this.decliningAppointment.set(appointment);
  }

  async confirmAppointment(): Promise<void> {
    const appointment = this.confirmingAppointment();
    if (!appointment || !this.confirmedDatetime) return;

    const result = await this.appointmentService.updateStatus({
      appointmentId: appointment.id,
      status: 'confirmed',
      confirmedDatetime: new Date(this.confirmedDatetime).toISOString(),
    });

    if (result) {
      this.confirmingAppointment.set(null);
      await this.appointmentService.loadStats();
    }
  }

  async declineAppointment(): Promise<void> {
    const appointment = this.decliningAppointment();
    if (!appointment) return;

    const result = await this.appointmentService.updateStatus({
      appointmentId: appointment.id,
      status: 'declined',
      declineReason: this.declineReason || undefined,
    });

    if (result) {
      this.decliningAppointment.set(null);
      await this.appointmentService.loadStats();
    }
  }

  async markCompleted(appointment: Appointment): Promise<void> {
    await this.appointmentService.updateStatus({
      appointmentId: appointment.id,
      status: 'completed',
    });
    await this.appointmentService.loadStats();
  }

  async markNoShow(appointment: Appointment): Promise<void> {
    await this.appointmentService.updateStatus({
      appointmentId: appointment.id,
      status: 'no_show',
    });
    await this.appointmentService.loadStats();
  }
}
