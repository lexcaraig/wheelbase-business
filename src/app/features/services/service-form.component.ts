import { Component, Input, Output, EventEmitter, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServiceService } from '../../core/services/service.service';
import {
  Service,
  ServiceCategory,
  PriceType,
  SERVICE_CATEGORIES,
  PRICE_TYPES,
} from '../../core/models/service.model';

@Component({
  selector: 'app-service-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal modal-open">
      <div class="modal-box bg-base-200 border border-neutral max-w-2xl">
        <h3 class="font-bold text-lg mb-4">
          {{ service ? 'Edit Service' : 'Add New Service' }}
        </h3>

        <form (ngSubmit)="onSubmit()">
          <div class="space-y-4">
            <!-- Title -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Service Title *</span>
              </label>
              <input
                type="text"
                [(ngModel)]="form.title"
                name="title"
                class="input input-bordered bg-base-300"
                placeholder="e.g., Oil Change, Tire Replacement"
                required
                minlength="3"
                maxlength="200"
              />
            </div>

            <!-- Category -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Category *</span>
              </label>
              <select
                [(ngModel)]="form.category"
                name="category"
                class="select select-bordered bg-base-300"
                required
              >
                <option value="">Select a category</option>
                @for (cat of categories; track cat.value) {
                  <option [value]="cat.value">{{ cat.label }}</option>
                }
              </select>
            </div>

            <!-- Description -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Description</span>
              </label>
              <textarea
                [(ngModel)]="form.description"
                name="description"
                class="textarea textarea-bordered bg-base-300 h-24"
                placeholder="Describe what this service includes..."
                maxlength="2000"
              ></textarea>
            </div>

            <!-- Price Type -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Pricing Type *</span>
              </label>
              <select
                [(ngModel)]="form.priceType"
                name="priceType"
                class="select select-bordered bg-base-300"
              >
                @for (pt of priceTypes; track pt.value) {
                  <option [value]="pt.value">{{ pt.label }}</option>
                }
              </select>
            </div>

            <!-- Price (only if not quote) -->
            @if (form.priceType !== 'quote') {
              <div class="form-control">
                <label class="label">
                  <span class="label-text">
                    Price (PHP) {{ form.priceType === 'hourly' ? 'per hour' : '' }}
                  </span>
                </label>
                <input
                  type="number"
                  [(ngModel)]="form.price"
                  name="price"
                  class="input input-bordered bg-base-300"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            }

            <!-- Duration -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Estimated Duration (minutes)</span>
              </label>
              <input
                type="number"
                [(ngModel)]="form.durationMinutes"
                name="durationMinutes"
                class="input input-bordered bg-base-300"
                placeholder="e.g., 60"
                min="0"
              />
            </div>

            <!-- Availability -->
            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  [(ngModel)]="form.isAvailable"
                  name="isAvailable"
                  class="checkbox checkbox-primary"
                />
                <span class="label-text">Available for booking</span>
              </label>
            </div>
          </div>

          <!-- Error -->
          @if (serviceService.error()) {
            <div class="alert alert-error mt-4">
              <i class="pi pi-exclamation-circle"></i>
              <span>{{ serviceService.error() }}</span>
            </div>
          }

          <!-- Actions -->
          <div class="modal-action">
            <button
              type="button"
              (click)="close.emit()"
              class="btn btn-ghost"
              [disabled]="serviceService.isSaving()"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              [disabled]="serviceService.isSaving() || !isFormValid()"
            >
              @if (serviceService.isSaving()) {
                <span class="loading loading-spinner loading-sm"></span>
              }
              {{ service ? 'Update' : 'Create' }} Service
            </button>
          </div>
        </form>
      </div>
      <div class="modal-backdrop bg-black/50" (click)="close.emit()"></div>
    </div>
  `,
  styles: []
})
export class ServiceFormComponent implements OnInit {
  @Input() service: Service | null = null;
  @Output() save = new EventEmitter<boolean>();
  @Output() close = new EventEmitter<void>();

  serviceService = inject(ServiceService);

  categories = SERVICE_CATEGORIES;
  priceTypes = PRICE_TYPES;

  form = {
    title: '',
    description: '',
    category: '' as ServiceCategory | '',
    priceType: 'fixed' as PriceType,
    price: null as number | null,
    durationMinutes: null as number | null,
    isAvailable: true,
  };

  ngOnInit(): void {
    if (this.service) {
      this.form = {
        title: this.service.title,
        description: this.service.description || '',
        category: this.service.category,
        priceType: this.service.priceType,
        price: this.service.priceCents ? this.service.priceCents / 100 : null,
        durationMinutes: this.service.durationMinutes || null,
        isAvailable: this.service.isAvailable,
      };
    }
  }

  isFormValid(): boolean {
    return !!(
      this.form.title.trim().length >= 3 &&
      this.form.category
    );
  }

  async onSubmit(): Promise<void> {
    if (!this.isFormValid()) return;

    const priceCents = this.form.priceType !== 'quote' && this.form.price
      ? Math.round(this.form.price * 100)
      : undefined;

    if (this.service) {
      // Update
      const result = await this.serviceService.updateService({
        serviceId: this.service.id,
        title: this.form.title.trim(),
        description: this.form.description.trim() || undefined,
        category: this.form.category as ServiceCategory,
        priceType: this.form.priceType,
        priceCents,
        durationMinutes: this.form.durationMinutes || undefined,
        isAvailable: this.form.isAvailable,
      });

      this.save.emit(!!result);
    } else {
      // Create
      const result = await this.serviceService.createService({
        title: this.form.title.trim(),
        description: this.form.description.trim() || undefined,
        category: this.form.category as ServiceCategory,
        priceType: this.form.priceType,
        priceCents,
        durationMinutes: this.form.durationMinutes || undefined,
        isAvailable: this.form.isAvailable,
      });

      this.save.emit(!!result);
    }
  }
}
