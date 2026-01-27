import { Component, inject, signal, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../core/services/product.service';
import {
  Product,
  ProductCategory,
  PRODUCT_CATEGORIES,
  CURRENCY_OPTIONS,
  CreateProductRequest,
  UpdateProductRequest,
  getCurrencySymbol,
  VariantOption,
  ProductVariant,
} from '../../core/models/product.model';

interface SpecificationEntry {
  key: string;
  value: string;
}

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal modal-open">
      <div class="modal-box bg-base-200 border border-neutral max-w-2xl max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex justify-between items-center mb-6">
          <h3 class="font-bold text-xl">
            {{ isEditing() ? 'Edit Product' : 'Add Product' }}
          </h3>
          <button (click)="onClose()" class="btn btn-ghost btn-sm btn-square">
            <i class="pi pi-times"></i>
          </button>
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

        <form (ngSubmit)="onSubmit()">
          <!-- Title -->
          <div class="form-control mb-4">
            <label class="label" for="title">
              <span class="label-text">Product Title *</span>
            </label>
            <input
              type="text"
              id="title"
              [(ngModel)]="title"
              name="title"
              class="input input-bordered w-full bg-base-300"
              placeholder="e.g., NGK Spark Plug CR8E"
              required
              minlength="3"
              maxlength="200"
            />
            <label class="label">
              <span class="label-text-alt text-secondary">{{ title.length }}/200 characters</span>
            </label>
          </div>

          <!-- Category & Subcategory -->
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div class="form-control">
              <label class="label" for="category">
                <span class="label-text">Category *</span>
              </label>
              <select
                id="category"
                [(ngModel)]="category"
                name="category"
                class="select select-bordered w-full bg-base-300"
                required
              >
                <option [value]="null" disabled>Select category</option>
                @for (cat of categories; track cat.value) {
                  <option [value]="cat.value">{{ cat.label }}</option>
                }
              </select>
            </div>
            <div class="form-control">
              <label class="label" for="subcategory">
                <span class="label-text">Subcategory</span>
              </label>
              <input
                type="text"
                id="subcategory"
                [(ngModel)]="subcategory"
                name="subcategory"
                class="input input-bordered w-full bg-base-300"
                placeholder="e.g., Spark Plugs"
              />
            </div>
          </div>

          <!-- Description -->
          <div class="form-control mb-4">
            <label class="label" for="description">
              <span class="label-text">Description</span>
            </label>
            <textarea
              id="description"
              [(ngModel)]="description"
              name="description"
              class="textarea textarea-bordered w-full bg-base-300 h-24"
              placeholder="Describe your product..."
              maxlength="2000"
            ></textarea>
            <label class="label">
              <span class="label-text-alt text-secondary">{{ description.length }}/2000 characters</span>
            </label>
          </div>

          <!-- Price & Currency -->
          <div class="grid grid-cols-3 gap-4 mb-4">
            <div class="form-control col-span-2">
              <label class="label" for="price">
                <span class="label-text">Price *</span>
              </label>
              <div class="join w-full">
                <span class="join-item btn btn-disabled bg-base-300 border-base-300">
                  {{ getCurrencySymbol(currency) }}
                </span>
                <input
                  type="number"
                  id="price"
                  [(ngModel)]="price"
                  name="price"
                  class="input input-bordered join-item flex-1 bg-base-300"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>
            <div class="form-control">
              <label class="label" for="currency">
                <span class="label-text">Currency</span>
              </label>
              <select
                id="currency"
                [(ngModel)]="currency"
                name="currency"
                class="select select-bordered w-full bg-base-300"
              >
                @for (curr of currencies; track curr.value) {
                  <option [value]="curr.value">{{ curr.value }}</option>
                }
              </select>
            </div>
          </div>

          <!-- Stock & Pre-order -->
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div class="form-control">
              <label class="label" for="stock">
                <span class="label-text">Stock Quantity</span>
              </label>
              <input
                type="number"
                id="stock"
                [(ngModel)]="stockQuantity"
                name="stock"
                class="input input-bordered w-full bg-base-300"
                placeholder="0"
                min="0"
              />
            </div>
            <div class="form-control">
              <label class="label">
                <span class="label-text">Pre-orders</span>
              </label>
              <label class="label cursor-pointer justify-start gap-3 h-12 px-4 bg-base-300 rounded-lg border border-base-content/20">
                <input
                  type="checkbox"
                  [(ngModel)]="allowPreorder"
                  name="allowPreorder"
                  class="checkbox checkbox-primary"
                />
                <span class="label-text">Accept pre-orders</span>
              </label>
              <label class="label">
                <span class="label-text-alt text-secondary">Allow orders when out of stock</span>
              </label>
            </div>
          </div>

          <!-- Images -->
          <div class="form-control mb-4">
            <label class="label">
              <span class="label-text">Product Images (up to 5)</span>
            </label>
            <div class="flex flex-wrap gap-2 mb-2">
              @for (image of images; track $index; let i = $index) {
                <div class="relative group">
                  <img
                    [src]="image"
                    alt="Product image"
                    class="w-20 h-20 rounded-lg object-cover border border-neutral"
                  />
                  <!-- Reorder buttons -->
                  <div class="absolute bottom-1 left-1 right-1 flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    @if (i > 0) {
                      <button
                        type="button"
                        (click)="moveImage(i, -1)"
                        class="btn btn-circle btn-xs bg-base-300/90"
                        title="Move left"
                      >
                        <i class="pi pi-chevron-left text-xs"></i>
                      </button>
                    }
                    @if (i < images.length - 1) {
                      <button
                        type="button"
                        (click)="moveImage(i, 1)"
                        class="btn btn-circle btn-xs bg-base-300/90"
                        title="Move right"
                      >
                        <i class="pi pi-chevron-right text-xs"></i>
                      </button>
                    }
                  </div>
                  <!-- Delete button -->
                  <button
                    type="button"
                    (click)="removeImage(i)"
                    class="absolute -top-2 -right-2 btn btn-circle btn-xs btn-error opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <i class="pi pi-times text-xs"></i>
                  </button>
                </div>
              }
              @if (images.length < 5) {
                <label class="w-20 h-20 rounded-lg border-2 border-dashed border-neutral hover:border-primary flex items-center justify-center cursor-pointer transition-colors">
                  @if (uploadingImage()) {
                    <span class="loading loading-spinner loading-sm"></span>
                  } @else {
                    <i class="pi pi-plus text-secondary"></i>
                  }
                  <input
                    type="file"
                    (change)="onImageSelected($event)"
                    accept="image/*"
                    class="hidden"
                    [disabled]="uploadingImage()"
                  />
                </label>
              }
            </div>
            <label class="label">
              <span class="label-text-alt text-secondary">{{ images.length }}/5 images. Click + to upload.</span>
            </label>
          </div>

          <!-- Specifications -->
          <div class="form-control mb-4">
            <label class="label">
              <span class="label-text">Specifications</span>
            </label>
            <div class="space-y-2 mb-2">
              @for (spec of specifications; track $index; let i = $index) {
                <div class="flex gap-2">
                  <input
                    type="text"
                    [(ngModel)]="spec.key"
                    [name]="'specKey' + i"
                    class="input input-bordered input-sm flex-1 bg-base-300"
                    placeholder="Name (e.g., Brand)"
                  />
                  <input
                    type="text"
                    [(ngModel)]="spec.value"
                    [name]="'specValue' + i"
                    class="input input-bordered input-sm flex-1 bg-base-300"
                    placeholder="Value (e.g., NGK)"
                  />
                  <button
                    type="button"
                    (click)="removeSpecification(i)"
                    class="btn btn-ghost btn-sm btn-square"
                  >
                    <i class="pi pi-times"></i>
                  </button>
                </div>
              }
            </div>
            <button
              type="button"
              (click)="addSpecification()"
              class="btn btn-ghost btn-sm"
            >
              <i class="pi pi-plus mr-1"></i>
              Add Specification
            </button>
          </div>

          <!-- Product Variants -->
          <div class="form-control mb-4">
            <label class="label">
              <span class="label-text">Product Variants</span>
              <span class="label-text-alt text-secondary">For size, color options</span>
            </label>

            <!-- Variant Options (Size, Color, etc.) -->
            <div class="bg-base-300 rounded-lg p-4 mb-3">
              <div class="text-sm font-medium mb-3">Variant Options</div>
              <div class="space-y-3">
                @for (option of variantOptions; track $index; let i = $index) {
                  <div class="flex gap-2 items-start">
                    <input
                      type="text"
                      [(ngModel)]="option.name"
                      [name]="'optionName' + i"
                      class="input input-bordered input-sm w-28 bg-base-200"
                      placeholder="e.g., Size"
                      (change)="onVariantOptionsChange()"
                    />
                    <input
                      type="text"
                      [ngModel]="option.values.join(', ')"
                      (ngModelChange)="updateOptionValues(i, $event)"
                      [name]="'optionValues' + i"
                      class="input input-bordered input-sm flex-1 bg-base-200"
                      placeholder="e.g., S, M, L, XL"
                    />
                    <button
                      type="button"
                      (click)="removeVariantOption(i)"
                      class="btn btn-ghost btn-sm btn-square"
                    >
                      <i class="pi pi-times"></i>
                    </button>
                  </div>
                }
              </div>
              <button
                type="button"
                (click)="addVariantOption()"
                class="btn btn-ghost btn-sm mt-2"
              >
                <i class="pi pi-plus mr-1"></i>
                Add Option (Size, Color, etc.)
              </button>
            </div>

            <!-- Generated Variants -->
            @if (variants.length > 0) {
              <div class="bg-base-300 rounded-lg p-4">
                <div class="flex justify-between items-center mb-3">
                  <span class="text-sm font-medium">Variants ({{ variants.length }})</span>
                  <button
                    type="button"
                    (click)="regenerateVariants()"
                    class="btn btn-ghost btn-xs"
                  >
                    <i class="pi pi-refresh mr-1"></i>
                    Regenerate
                  </button>
                </div>
                <div class="overflow-x-auto">
                  <table class="table table-xs">
                    <thead>
                      <tr>
                        <th>Variant</th>
                        <th class="w-24">SKU</th>
                        <th class="w-20">Stock</th>
                        <th class="w-28">Price Override</th>
                        <th class="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (variant of variants; track variant.id; let i = $index) {
                        <tr>
                          <td class="font-medium">{{ getVariantName(variant) }}</td>
                          <td>
                            <input
                              type="text"
                              [(ngModel)]="variant.sku"
                              [name]="'variantSku' + i"
                              class="input input-bordered input-xs w-full bg-base-200"
                              placeholder="SKU"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              [(ngModel)]="variant.stockQuantity"
                              [name]="'variantStock' + i"
                              class="input input-bordered input-xs w-full bg-base-200"
                              min="0"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              [ngModel]="variant.priceCents ? variant.priceCents / 100 : null"
                              (ngModelChange)="updateVariantPrice(i, $event)"
                              [name]="'variantPrice' + i"
                              class="input input-bordered input-xs w-full bg-base-200"
                              placeholder="Base"
                              step="0.01"
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              (click)="removeVariant(i)"
                              class="btn btn-ghost btn-xs btn-square"
                            >
                              <i class="pi pi-times"></i>
                            </button>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
                <div class="text-xs text-secondary mt-2">
                  Total variant stock: {{ getTotalVariantStock() }} · Leave price empty to use base price
                </div>
              </div>
            }
          </div>

          <!-- Toggles -->
          <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  [(ngModel)]="isAvailable"
                  name="isAvailable"
                  class="checkbox checkbox-primary"
                />
                <span class="label-text">Available for sale</span>
              </label>
            </div>
            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  [(ngModel)]="isFeatured"
                  name="isFeatured"
                  class="checkbox checkbox-primary"
                />
                <span class="label-text">Featured product</span>
              </label>
            </div>
          </div>

          <!-- Actions -->
          <div class="modal-action">
            <button
              type="button"
              (click)="onClose()"
              class="btn btn-ghost"
              [disabled]="productService.isSaving()"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              [disabled]="!isFormValid() || productService.isSaving()"
            >
              @if (productService.isSaving()) {
                <span class="loading loading-spinner loading-sm"></span>
              }
              {{ isEditing() ? 'Save Changes' : 'Create Product' }}
            </button>
          </div>
        </form>
      </div>
      <div class="modal-backdrop bg-black/50" (click)="onClose()"></div>
    </div>
  `,
  styles: []
})
export class ProductFormComponent implements OnInit {
  @Input() product: Product | null = null;
  @Output() save = new EventEmitter<boolean>();
  @Output() close = new EventEmitter<void>();

  productService = inject(ProductService);

  // Form fields
  title = '';
  description = '';
  category: ProductCategory | null = null;
  subcategory = '';
  price = 0;
  currency = 'PHP';
  stockQuantity = 0;
  allowPreorder = false;
  images: string[] = [];
  specifications: SpecificationEntry[] = [];
  variantOptions: VariantOption[] = [];
  variants: ProductVariant[] = [];
  isAvailable = true;
  isFeatured = false;

  // Upload state
  uploadingImage = signal(false);

  // Constants
  categories = PRODUCT_CATEGORIES;
  currencies = CURRENCY_OPTIONS;

  // Helper
  getCurrencySymbol = getCurrencySymbol;

  ngOnInit(): void {
    if (this.product) {
      this.title = this.product.title;
      this.description = this.product.description || '';
      this.category = this.product.category;
      this.subcategory = this.product.subcategory || '';
      this.price = this.product.priceCents / 100;
      this.currency = this.product.currency;
      this.stockQuantity = this.product.stockQuantity;
      this.allowPreorder = this.product.allowPreorder || false;
      this.images = [...(this.product.images || [])];
      this.isAvailable = this.product.isAvailable;
      this.isFeatured = this.product.isFeatured;

      // Convert specifications object to array
      if (this.product.specifications) {
        this.specifications = Object.entries(this.product.specifications).map(([key, value]) => ({
          key,
          value: String(value),
        }));
      }

      // Load variant options and variants
      if (this.product.variantOptions) {
        this.variantOptions = [...this.product.variantOptions];
      }
      if (this.product.variants) {
        this.variants = [...this.product.variants];
      }
    }
  }

  isEditing(): boolean {
    // A product with empty ID is a duplicate (should create new, not edit)
    return !!this.product && !!this.product.id;
  }

  isFormValid(): boolean {
    return !!(
      this.title.trim().length >= 3 &&
      this.title.trim().length <= 200 &&
      this.category &&
      this.price >= 0
    );
  }

  async onImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    this.uploadingImage.set(true);
    const url = await this.productService.uploadProductImage(file);
    this.uploadingImage.set(false);

    if (url) {
      this.images.push(url);
    }

    // Reset input
    input.value = '';
  }

  removeImage(index: number): void {
    this.images.splice(index, 1);
  }

  moveImage(index: number, direction: number): void {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= this.images.length) return;
    const [removed] = this.images.splice(index, 1);
    this.images.splice(newIndex, 0, removed);
  }

  addSpecification(): void {
    this.specifications.push({ key: '', value: '' });
  }

  removeSpecification(index: number): void {
    this.specifications.splice(index, 1);
  }

  // Variant management methods
  addVariantOption(): void {
    this.variantOptions.push({ name: '', values: [] });
  }

  removeVariantOption(index: number): void {
    this.variantOptions.splice(index, 1);
    this.regenerateVariants();
  }

  updateOptionValues(index: number, valuesStr: string): void {
    const values = valuesStr.split(',').map(v => v.trim()).filter(v => v);
    this.variantOptions[index].values = values;
    this.onVariantOptionsChange();
  }

  onVariantOptionsChange(): void {
    // Auto-regenerate variants when options change
    this.regenerateVariants();
  }

  regenerateVariants(): void {
    const validOptions = this.variantOptions.filter(o => o.name && o.values.length > 0);
    if (validOptions.length === 0) {
      this.variants = [];
      return;
    }

    // Generate all combinations
    const combinations = this.generateCombinations(validOptions);

    // Preserve existing variant data where possible
    const existingVariantsMap = new Map<string, ProductVariant>();
    for (const v of this.variants) {
      const key = this.getVariantKey(v.attributes);
      existingVariantsMap.set(key, v);
    }

    this.variants = combinations.map(attrs => {
      const key = this.getVariantKey(attrs);
      const existing = existingVariantsMap.get(key);
      if (existing) {
        return { ...existing, attributes: attrs };
      }
      return {
        id: crypto.randomUUID(),
        attributes: attrs,
        stockQuantity: 0,
        priceCents: null,
      };
    });
  }

  private generateCombinations(options: VariantOption[]): Record<string, string>[] {
    if (options.length === 0) return [];
    if (options.length === 1) {
      return options[0].values.map(v => ({ [options[0].name]: v }));
    }

    const [first, ...rest] = options;
    const restCombinations = this.generateCombinations(rest);

    const result: Record<string, string>[] = [];
    for (const value of first.values) {
      for (const combo of restCombinations) {
        result.push({ [first.name]: value, ...combo });
      }
    }
    return result;
  }

  private getVariantKey(attrs: Record<string, string>): string {
    return Object.entries(attrs).sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => `${k}:${v}`).join('|');
  }

  getVariantName(variant: ProductVariant): string {
    return Object.values(variant.attributes).join(' / ');
  }

  updateVariantPrice(index: number, priceValue: number | null): void {
    this.variants[index].priceCents = priceValue ? Math.round(priceValue * 100) : null;
  }

  removeVariant(index: number): void {
    this.variants.splice(index, 1);
  }

  getTotalVariantStock(): number {
    return this.variants.reduce((sum, v) => sum + v.stockQuantity, 0);
  }

  async onSubmit(): Promise<void> {
    if (!this.isFormValid()) return;

    // Convert specifications array to object
    const specsObject: Record<string, string> = {};
    for (const spec of this.specifications) {
      if (spec.key.trim() && spec.value.trim()) {
        specsObject[spec.key.trim()] = spec.value.trim();
      }
    }

    // Clean up variant options (remove empty ones)
    const cleanVariantOptions = this.variantOptions.filter(o => o.name && o.values.length > 0);

    if (this.isEditing() && this.product) {
      // Update existing product
      const request: UpdateProductRequest = {
        productId: this.product.id,
        title: this.title.trim(),
        description: this.description.trim() || undefined,
        category: this.category!,
        subcategory: this.subcategory.trim() || undefined,
        priceCents: Math.round(this.price * 100),
        currency: this.currency,
        stockQuantity: this.stockQuantity,
        allowPreorder: this.allowPreorder,
        images: this.images,
        specifications: specsObject,
        variantOptions: cleanVariantOptions,
        variants: this.variants,
        isAvailable: this.isAvailable,
        isFeatured: this.isFeatured,
      };

      const result = await this.productService.updateProduct(request);
      this.save.emit(!!result);
    } else {
      // Create new product
      const request: CreateProductRequest = {
        title: this.title.trim(),
        description: this.description.trim() || undefined,
        category: this.category!,
        subcategory: this.subcategory.trim() || undefined,
        priceCents: Math.round(this.price * 100),
        currency: this.currency,
        stockQuantity: this.stockQuantity,
        allowPreorder: this.allowPreorder,
        images: this.images,
        specifications: specsObject,
        variantOptions: cleanVariantOptions,
        variants: this.variants,
        isAvailable: this.isAvailable,
        isFeatured: this.isFeatured,
      };

      const result = await this.productService.createProduct(request);
      this.save.emit(!!result);
    }
  }

  onClose(): void {
    this.close.emit();
  }
}
