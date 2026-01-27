export type AppointmentStatus = 'pending' | 'confirmed' | 'declined' | 'completed' | 'cancelled' | 'no_show';
export type TimePreference = 'morning' | 'afternoon' | 'evening' | 'any';

export interface AppointmentUser {
  id: string;
  display_name: string;
  avatar_url?: string;
}

export interface AppointmentService {
  id: string;
  title: string;
  category: string;
}

export interface Appointment {
  id: string;
  businessId: string;
  userId: string;
  serviceId?: string;
  requestedDate: string;
  requestedTimePreference?: TimePreference;
  notes?: string;
  status: AppointmentStatus;
  confirmedDatetime?: string;
  declineReason?: string;
  createdAt: string;
  updatedAt: string;
  user?: AppointmentUser;
  service?: AppointmentService;
}

export interface ListAppointmentsRequest {
  status?: AppointmentStatus | AppointmentStatus[];
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface UpdateStatusRequest {
  appointmentId: string;
  status: AppointmentStatus;
  confirmedDatetime?: string;
  declineReason?: string;
}

export interface AppointmentStats {
  total: number;
  pending: number;
  confirmed: number;
  declined: number;
  completed: number;
  cancelled: number;
  no_show: number;
  completionRate: number;
  noShowRate: number;
}

export const APPOINTMENT_STATUSES: { value: AppointmentStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pending', color: 'badge-warning' },
  { value: 'confirmed', label: 'Confirmed', color: 'badge-info' },
  { value: 'declined', label: 'Declined', color: 'badge-error' },
  { value: 'completed', label: 'Completed', color: 'badge-success' },
  { value: 'cancelled', label: 'Cancelled', color: 'badge-neutral' },
  { value: 'no_show', label: 'No Show', color: 'badge-error' },
];

export const TIME_PREFERENCES: { value: TimePreference; label: string }[] = [
  { value: 'morning', label: 'Morning (8AM - 12PM)' },
  { value: 'afternoon', label: 'Afternoon (12PM - 5PM)' },
  { value: 'evening', label: 'Evening (5PM - 8PM)' },
  { value: 'any', label: 'Any Time' },
];

export function getStatusBadgeClass(status: AppointmentStatus): string {
  return APPOINTMENT_STATUSES.find(s => s.value === status)?.color || 'badge-neutral';
}

export function getStatusLabel(status: AppointmentStatus): string {
  return APPOINTMENT_STATUSES.find(s => s.value === status)?.label || status;
}

export function formatTimePreference(pref?: TimePreference): string {
  if (!pref) return 'Any time';
  return TIME_PREFERENCES.find(t => t.value === pref)?.label || pref;
}
