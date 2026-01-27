import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServiceService } from '../../core/services/service.service';
import {
  Service,
  ServiceCategory,
  SERVICE_CATEGORIES,
  formatServicePrice,
  formatDuration,
} from '../../core/models/service.model';
import { ServiceFormComponent } from './service-form.component';

@Component({
  selector: 'app-service-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ServiceFormComponent],
  template: `
    <div class="p-6">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold">Services</h1>
          <p class="text-secondary text-sm mt-1">
            Manage your service offerings
          </p>
        </div>
        <button
          (click)="openCreateModal()"
          class="btn btn-primary"
        >
          <i class="pi pi-plus mr-2"></i>
          Add Service
        </button>
      </div>

      <!-- Filters -->
      <div class="card bg-base-200 border border-neutral mb-6">
        <div class="card-body p-4">
          <div class="flex flex-wrap gap-4">
            <!-- Search -->
            <div class="form-control flex-1 min-w-[200px]">
              <div class="join w-full">
                <input
                  type="text"
                  [(ngModel)]="searchQuery"
                  class="input input-bordered join-item flex-1 bg-base-300"
                  placeholder="Search services..."
                  (keyup.enter)="applyFilters()"
                />
                <button
                  (click)="applyFilters()"
                  class="btn btn-primary join-item"
                >
                  <i class="pi pi-search"></i>
                </button>
              </div>
            </div>

            <!-- Category Filter -->
            <div class="form-control min-w-[150px]">
              <select
                [(ngModel)]="selectedCategory"
                (change)="applyFilters()"
                class="select select-bordered bg-base-300"
              >
                <option [value]="null">All Categories</option>
                @for (cat of categories; track cat.value) {
                  <option [value]="cat.value">{{ cat.label }}</option>
                }
              </select>
            </div>

            <!-- Availability Filter -->
            <div class="form-control min-w-[150px]">
              <select
                [(ngModel)]="selectedAvailability"
                (change)="applyFilters()"
                class="select select-bordered bg-base-300"
              >
                <option [value]="null">All Status</option>
                <option [value]="true">Available</option>
                <option [value]="false">Unavailable</option>
              </select>
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
      @if (serviceService.error()) {
        <div class="alert alert-error mb-4">
          <i class="pi pi-exclamation-circle"></i>
          <span>{{ serviceService.error() }}</span>
          <button class="btn btn-ghost btn-sm" (click)="serviceService.clearError()">
            <i class="pi pi-times"></i>
          </button>
        </div>
      }

      <!-- Loading State -->
      @if (serviceService.isLoading()) {
        <div class="flex justify-center py-12">
          <span class="loading loading-spinner loading-lg text-primary"></span>
        </div>
      }

      <!-- Empty State -->
      @else if (serviceService.services().length === 0) {
        <div class="card bg-base-200 border border-neutral">
          <div class="card-body text-center py-12">
            <div class="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <i class="pi pi-wrench text-primary text-3xl"></i>
            </div>
            <h2 class="text-xl font-bold mb-2">No Services Yet</h2>
            <p class="text-secondary mb-6">
              Start adding services to showcase what you offer to Wheelbase users.
            </p>
            <button (click)="openCreateModal()" class="btn btn-primary mx-auto">
              <i class="pi pi-plus mr-2"></i>
              Add Your First Service
            </button>
          </div>
        </div>
      }

      <!-- Services Grid -->
      @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (service of serviceService.services(); track service.id) {
            <div class="card bg-base-200 border border-neutral hover:border-primary/50 transition-colors">
              <div class="card-body p-4">
                <div class="flex justify-between items-start mb-2">
                  <span class="badge badge-outline text-xs">
                    {{ getCategoryLabel(service.category) }}
                  </span>
                  <button
                    (click)="toggleAvailability(service)"
                    [class]="service.isAvailable ? 'badge badge-success gap-1' : 'badge badge-error gap-1'"
                    [disabled]="togglingId() === service.id"
                  >
                    @if (togglingId() === service.id) {
                      <span class="loading loading-spinner loading-xs"></span>
                    } @else {
                      <i [class]="service.isAvailable ? 'pi pi-check text-xs' : 'pi pi-times text-xs'"></i>
                    }
                    {{ service.isAvailable ? 'Available' : 'Unavailable' }}
                  </button>
                </div>

                <h3 class="font-bold text-lg">{{ service.title }}</h3>

                @if (service.description) {
                  <p class="text-secondary text-sm line-clamp-2 mt-1">
                    {{ service.description }}
                  </p>
                }

                <div class="flex items-center gap-4 mt-3 text-sm">
                  <span class="font-semibold text-primary">
                    {{ formatPrice(service.priceCents, service.priceType) }}
                  </span>
                  @if (service.durationMinutes) {
                    <span class="text-secondary">
                      <i class="pi pi-clock mr-1"></i>
                      {{ formatDuration(service.durationMinutes) }}
                    </span>
                  }
                </div>

                <div class="card-actions justify-end mt-4 pt-4 border-t border-neutral">
                  <button
                    (click)="openEditModal(service)"
                    class="btn btn-ghost btn-sm"
                  >
                    <i class="pi pi-pencil mr-1"></i>
                    Edit
                  </button>
                  <button
                    (click)="confirmDelete(service)"
                    class="btn btn-ghost btn-sm text-error"
                  >
                    <i class="pi pi-trash mr-1"></i>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Service Form Modal -->
      @if (showModal()) {
        <app-service-form
          [service]="editingService()"
          (save)="onServiceSaved($event)"
          (close)="closeModal()"
        />
      }

      <!-- Delete Confirmation Modal -->
      @if (deletingService()) {
        <div class="modal modal-open">
          <div class="modal-box bg-base-200 border border-neutral">
            <h3 class="font-bold text-lg mb-4">Delete Service</h3>
            <p class="text-secondary">
              Are you sure you want to delete <span class="font-semibold">{{ deletingService()?.title }}</span>?
              This action cannot be undone.
            </p>
            <div class="modal-action">
              <button
                (click)="deletingService.set(null)"
                class="btn btn-ghost"
                [disabled]="serviceService.isSaving()"
              >
                Cancel
              </button>
              <button
                (click)="deleteService()"
                class="btn btn-error"
                [disabled]="serviceService.isSaving()"
              >
                @if (serviceService.isSaving()) {
                  <span class="loading loading-spinner loading-sm"></span>
                }
                Delete
              </button>
            </div>
          </div>
          <div class="modal-backdrop bg-black/50" (click)="deletingService.set(null)"></div>
        </div>
      }
    </div>
  `,
  styles: []
})
export class ServiceListComponent implements OnInit, OnDestroy {
  serviceService = inject(ServiceService);

  // Filter state
  searchQuery = '';
  selectedCategory: ServiceCategory | null = null;
  selectedAvailability: boolean | null = null;

  // Categories for dropdown
  categories = SERVICE_CATEGORIES;

  // Modal state
  showModal = signal(false);
  editingService = signal<Service | null>(null);

  // Delete state
  deletingService = signal<Service | null>(null);

  // Toggle loading state
  togglingId = signal<string | null>(null);

  // Format helpers
  formatPrice = formatServicePrice;
  formatDuration = formatDuration;

  async ngOnInit(): Promise<void> {
    await this.loadServices();
  }

  ngOnDestroy(): void {
    this.serviceService.reset();
  }

  async loadServices(): Promise<void> {
    await this.serviceService.loadServices({
      search: this.searchQuery || undefined,
      category: this.selectedCategory || undefined,
      isAvailable: this.selectedAvailability ?? undefined,
      limit: 50,
      offset: 0,
    });
  }

  applyFilters(): void {
    this.loadServices();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedCategory = null;
    this.selectedAvailability = null;
    this.loadServices();
  }

  hasActiveFilters(): boolean {
    return !!(this.searchQuery || this.selectedCategory !== null || this.selectedAvailability !== null);
  }

  getCategoryLabel(category: ServiceCategory): string {
    const cat = SERVICE_CATEGORIES.find(c => c.value === category);
    return cat?.label || category;
  }

  openCreateModal(): void {
    this.editingService.set(null);
    this.showModal.set(true);
  }

  openEditModal(service: Service): void {
    this.editingService.set(service);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingService.set(null);
  }

  async onServiceSaved(saved: boolean): Promise<void> {
    if (saved) {
      this.closeModal();
      await this.loadServices();
    }
  }

  confirmDelete(service: Service): void {
    this.deletingService.set(service);
  }

  async deleteService(): Promise<void> {
    const service = this.deletingService();
    if (!service) return;

    const success = await this.serviceService.deleteService(service.id);
    if (success) {
      this.deletingService.set(null);
    }
  }

  async toggleAvailability(service: Service): Promise<void> {
    this.togglingId.set(service.id);
    await this.serviceService.toggleAvailability(service.id);
    this.togglingId.set(null);
  }
}
