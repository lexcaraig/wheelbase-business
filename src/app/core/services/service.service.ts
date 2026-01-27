import { Injectable, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import {
  Service,
  CreateServiceRequest,
  UpdateServiceRequest,
  ListServicesRequest,
} from '../models/service.model';

interface ServiceListMeta {
  total: number;
  limit: number;
  offset: number;
}

@Injectable({
  providedIn: 'root'
})
export class ServiceService {
  private servicesSignal = signal<Service[]>([]);
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);
  private metaSignal = signal<ServiceListMeta>({ total: 0, limit: 50, offset: 0 });
  private savingSignal = signal<boolean>(false);

  readonly services = computed(() => this.servicesSignal());
  readonly isLoading = computed(() => this.loadingSignal());
  readonly isSaving = computed(() => this.savingSignal());
  readonly error = computed(() => this.errorSignal());
  readonly total = computed(() => this.metaSignal().total);
  readonly meta = computed(() => this.metaSignal());

  constructor(private supabase: SupabaseService) {}

  clearError(): void {
    this.errorSignal.set(null);
  }

  async loadServices(request: ListServicesRequest = {}): Promise<Service[]> {
    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);

      const response = await this.supabase.callFunctionWithAuth<Service[]>(
        'manage-business-services',
        {
          action: 'list',
          ...request,
        }
      );

      this.servicesSignal.set(response || []);
      return response || [];
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load services';
      this.errorSignal.set(message);
      return [];
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async createService(request: CreateServiceRequest): Promise<Service | null> {
    try {
      this.savingSignal.set(true);
      this.errorSignal.set(null);

      const service = await this.supabase.callFunctionWithAuth<Service>(
        'manage-business-services',
        {
          action: 'create',
          ...request,
        }
      );

      if (service) {
        this.servicesSignal.update(services => [service, ...services]);
        this.metaSignal.update(meta => ({ ...meta, total: meta.total + 1 }));
      }

      return service;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create service';
      this.errorSignal.set(message);
      return null;
    } finally {
      this.savingSignal.set(false);
    }
  }

  async updateService(request: UpdateServiceRequest): Promise<Service | null> {
    try {
      this.savingSignal.set(true);
      this.errorSignal.set(null);

      const service = await this.supabase.callFunctionWithAuth<Service>(
        'manage-business-services',
        {
          action: 'update',
          ...request,
        }
      );

      if (service) {
        this.servicesSignal.update(services =>
          services.map(s => s.id === service.id ? service : s)
        );
      }

      return service;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update service';
      this.errorSignal.set(message);
      return null;
    } finally {
      this.savingSignal.set(false);
    }
  }

  async deleteService(serviceId: string): Promise<boolean> {
    try {
      this.savingSignal.set(true);
      this.errorSignal.set(null);

      await this.supabase.callFunctionWithAuth<{ deleted: boolean }>(
        'manage-business-services',
        {
          action: 'delete',
          serviceId,
        }
      );

      this.servicesSignal.update(services =>
        services.filter(s => s.id !== serviceId)
      );
      this.metaSignal.update(meta => ({ ...meta, total: Math.max(0, meta.total - 1) }));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete service';
      this.errorSignal.set(message);
      return false;
    } finally {
      this.savingSignal.set(false);
    }
  }

  async toggleAvailability(serviceId: string): Promise<Service | null> {
    try {
      this.errorSignal.set(null);

      const service = await this.supabase.callFunctionWithAuth<Service>(
        'manage-business-services',
        {
          action: 'toggle_availability',
          serviceId,
        }
      );

      if (service) {
        this.servicesSignal.update(services =>
          services.map(s => s.id === service.id ? service : s)
        );
      }

      return service;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to toggle availability';
      this.errorSignal.set(message);
      return null;
    }
  }

  reset(): void {
    this.servicesSignal.set([]);
    this.errorSignal.set(null);
    this.metaSignal.set({ total: 0, limit: 50, offset: 0 });
  }
}
