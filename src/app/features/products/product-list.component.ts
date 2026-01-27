import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../core/services/product.service';
import {
  Product,
  ProductCategory,
  PRODUCT_CATEGORIES,
  formatPrice,
} from '../../core/models/product.model';
import { ProductFormComponent } from './product-form.component';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductFormComponent],
  template: `
    <div class="p-6">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold">Products</h1>
          <p class="text-secondary text-sm mt-1">
            Manage your product catalog
          </p>
        </div>
        <button
          (click)="openCreateModal()"
          class="btn btn-primary"
        >
          <i class="pi pi-plus mr-2"></i>
          Add Product
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
                  placeholder="Search products..."
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
      @if (productService.error()) {
        <div class="alert alert-error mb-4">
          <i class="pi pi-exclamation-circle"></i>
          <span>{{ productService.error() }}</span>
          <button class="btn btn-ghost btn-sm" (click)="productService.clearError()">
            <i class="pi pi-times"></i>
          </button>
        </div>
      }

      <!-- Loading State -->
      @if (productService.isLoading()) {
        <div class="flex justify-center py-12">
          <span class="loading loading-spinner loading-lg text-primary"></span>
        </div>
      }

      <!-- Empty State -->
      @else if (productService.products().length === 0) {
        <div class="card bg-base-200 border border-neutral">
          <div class="card-body text-center py-12">
            <div class="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <i class="pi pi-box text-primary text-3xl"></i>
            </div>
            <h2 class="text-xl font-bold mb-2">No Products Yet</h2>
            <p class="text-secondary mb-6">
              Start adding products to your catalog to showcase them to Wheelbase users.
            </p>
            <button (click)="openCreateModal()" class="btn btn-primary mx-auto">
              <i class="pi pi-plus mr-2"></i>
              Add Your First Product
            </button>
          </div>
        </div>
      }

      <!-- Products Table -->
      @else {
        <div class="card bg-base-200 border border-neutral overflow-hidden">
          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr class="bg-base-300">
                  <th class="w-16">Image</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th class="text-right">Price</th>
                  <th class="text-center">Stock</th>
                  <th class="text-center">Status</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (product of productService.products(); track product.id) {
                  <tr class="hover:bg-base-100">
                    <!-- Image -->
                    <td>
                      @if (product.images && product.images.length > 0) {
                        <img
                          [src]="product.images[0]"
                          [alt]="product.title"
                          class="w-12 h-12 rounded-lg object-cover"
                        />
                      } @else {
                        <div class="w-12 h-12 rounded-lg bg-base-300 flex items-center justify-center">
                          <i class="pi pi-image text-secondary"></i>
                        </div>
                      }
                    </td>

                    <!-- Title & Description -->
                    <td>
                      <div class="font-semibold">{{ product.title }}</div>
                      @if (product.description) {
                        <div class="text-sm text-secondary truncate max-w-xs">
                          {{ product.description }}
                        </div>
                      }
                    </td>

                    <!-- Category -->
                    <td>
                      <span class="badge badge-outline">
                        {{ getCategoryLabel(product.category) }}
                      </span>
                      @if (product.subcategory) {
                        <span class="text-sm text-secondary ml-1">
                          / {{ product.subcategory }}
                        </span>
                      }
                    </td>

                    <!-- Price -->
                    <td class="text-right font-mono">
                      {{ formatPrice(product.priceCents, product.currency) }}
                    </td>

                    <!-- Stock -->
                    <td class="text-center">
                      <div class="flex flex-col items-center gap-1">
                        <span
                          [class]="product.stockQuantity > 0 ? 'text-success' : (product.allowPreorder ? 'text-warning' : 'text-error')"
                        >
                          {{ product.stockQuantity }}
                        </span>
                        @if (product.allowPreorder) {
                          <span class="badge badge-warning badge-xs">Pre-order</span>
                        }
                      </div>
                    </td>

                    <!-- Status -->
                    <td class="text-center">
                      <button
                        (click)="toggleAvailability(product)"
                        [class]="product.isAvailable ? 'badge badge-success gap-1' : 'badge badge-error gap-1'"
                        [disabled]="togglingId() === product.id"
                      >
                        @if (togglingId() === product.id) {
                          <span class="loading loading-spinner loading-xs"></span>
                        } @else {
                          <i [class]="product.isAvailable ? 'pi pi-check' : 'pi pi-times'"></i>
                        }
                        {{ product.isAvailable ? 'Available' : 'Unavailable' }}
                      </button>
                    </td>

                    <!-- Actions -->
                    <td class="text-right">
                      <div class="flex justify-end gap-1">
                        <button
                          (click)="duplicateProduct(product)"
                          class="btn btn-ghost btn-sm btn-square"
                          title="Duplicate"
                        >
                          <i class="pi pi-copy"></i>
                        </button>
                        <button
                          (click)="openEditModal(product)"
                          class="btn btn-ghost btn-sm btn-square"
                          title="Edit"
                        >
                          <i class="pi pi-pencil"></i>
                        </button>
                        <button
                          (click)="confirmDelete(product)"
                          class="btn btn-ghost btn-sm btn-square text-error"
                          title="Delete"
                        >
                          <i class="pi pi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Table Footer -->
          <div class="p-4 border-t border-neutral flex justify-between items-center">
            <span class="text-sm text-secondary">
              Showing {{ productService.products().length }} of {{ productService.total() }} products
            </span>
          </div>
        </div>
      }

      <!-- Product Form Modal -->
      @if (showModal()) {
        <app-product-form
          [product]="editingProduct()"
          (save)="onProductSaved($event)"
          (close)="closeModal()"
        />
      }

      <!-- Delete Confirmation Modal -->
      @if (deletingProduct()) {
        <div class="modal modal-open">
          <div class="modal-box bg-base-200 border border-neutral">
            <h3 class="font-bold text-lg mb-4">Delete Product</h3>
            <p class="text-secondary">
              Are you sure you want to delete <span class="font-semibold">{{ deletingProduct()?.title }}</span>?
              This action cannot be undone.
            </p>
            <div class="modal-action">
              <button
                (click)="deletingProduct.set(null)"
                class="btn btn-ghost"
                [disabled]="productService.isSaving()"
              >
                Cancel
              </button>
              <button
                (click)="deleteProduct()"
                class="btn btn-error"
                [disabled]="productService.isSaving()"
              >
                @if (productService.isSaving()) {
                  <span class="loading loading-spinner loading-sm"></span>
                }
                Delete
              </button>
            </div>
          </div>
          <div class="modal-backdrop bg-black/50" (click)="deletingProduct.set(null)"></div>
        </div>
      }
    </div>
  `,
  styles: []
})
export class ProductListComponent implements OnInit, OnDestroy {
  productService = inject(ProductService);

  // Filter state
  searchQuery = '';
  selectedCategory: ProductCategory | null = null;
  selectedAvailability: boolean | null = null;

  // Categories for dropdown
  categories = PRODUCT_CATEGORIES;

  // Modal state
  showModal = signal(false);
  editingProduct = signal<Product | null>(null);

  // Delete state
  deletingProduct = signal<Product | null>(null);

  // Toggle loading state
  togglingId = signal<string | null>(null);

  // Format helper
  formatPrice = formatPrice;

  async ngOnInit(): Promise<void> {
    await this.loadProducts();
  }

  ngOnDestroy(): void {
    this.productService.reset();
  }

  async loadProducts(): Promise<void> {
    await this.productService.loadProducts({
      search: this.searchQuery || undefined,
      category: this.selectedCategory || undefined,
      isAvailable: this.selectedAvailability ?? undefined,
      limit: 50,
      offset: 0,
    });
  }

  applyFilters(): void {
    this.loadProducts();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedCategory = null;
    this.selectedAvailability = null;
    this.loadProducts();
  }

  hasActiveFilters(): boolean {
    return !!(this.searchQuery || this.selectedCategory !== null || this.selectedAvailability !== null);
  }

  getCategoryLabel(category: ProductCategory): string {
    const cat = PRODUCT_CATEGORIES.find(c => c.value === category);
    return cat?.label || category;
  }

  openCreateModal(): void {
    this.editingProduct.set(null);
    this.showModal.set(true);
  }

  openEditModal(product: Product): void {
    this.editingProduct.set(product);
    this.showModal.set(true);
  }

  duplicateProduct(product: Product): void {
    // Create a copy without ID so it's treated as a new product
    const duplicate: Product = {
      ...product,
      id: '', // Clear ID to create new product
      title: `${product.title} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Clear variant IDs so they're regenerated
      variants: product.variants?.map(v => ({
        ...v,
        id: crypto.randomUUID(),
      })),
    };
    this.editingProduct.set(duplicate);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingProduct.set(null);
  }

  async onProductSaved(saved: boolean): Promise<void> {
    if (saved) {
      this.closeModal();
      // Reload to get fresh data
      await this.loadProducts();
    }
  }

  confirmDelete(product: Product): void {
    this.deletingProduct.set(product);
  }

  async deleteProduct(): Promise<void> {
    const product = this.deletingProduct();
    if (!product) return;

    const success = await this.productService.deleteProduct(product.id);
    if (success) {
      this.deletingProduct.set(null);
    }
  }

  async toggleAvailability(product: Product): Promise<void> {
    this.togglingId.set(product.id);
    await this.productService.toggleAvailability(product.id);
    this.togglingId.set(null);
  }
}
