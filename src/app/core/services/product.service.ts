import { Injectable, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import {
  Product,
  CreateProductRequest,
  UpdateProductRequest,
  ListProductsRequest,
  ProductCategory,
} from '../models/product.model';

interface ProductListMeta {
  total: number;
  limit: number;
  offset: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private productsSignal = signal<Product[]>([]);
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);
  private metaSignal = signal<ProductListMeta>({ total: 0, limit: 50, offset: 0 });

  // Individual product loading state
  private savingSignal = signal<boolean>(false);

  readonly products = computed(() => this.productsSignal());
  readonly isLoading = computed(() => this.loadingSignal());
  readonly isSaving = computed(() => this.savingSignal());
  readonly error = computed(() => this.errorSignal());
  readonly total = computed(() => this.metaSignal().total);
  readonly meta = computed(() => this.metaSignal());

  constructor(private supabase: SupabaseService) {}

  clearError(): void {
    this.errorSignal.set(null);
  }

  /**
   * Load products for the current business
   */
  async loadProducts(request: ListProductsRequest = {}): Promise<Product[]> {
    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);

      const response = await this.supabase.callFunctionWithAuth<Product[]>(
        'manage-business-products',
        {
          action: 'list',
          ...request,
        }
      );

      this.productsSignal.set(response || []);
      return response || [];
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load products';
      this.errorSignal.set(message);
      return [];
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Create a new product
   */
  async createProduct(request: CreateProductRequest): Promise<Product | null> {
    try {
      this.savingSignal.set(true);
      this.errorSignal.set(null);

      const product = await this.supabase.callFunctionWithAuth<Product>(
        'manage-business-products',
        {
          action: 'create',
          ...request,
        }
      );

      if (product) {
        // Add to local list
        this.productsSignal.update(products => [product, ...products]);
        this.metaSignal.update(meta => ({ ...meta, total: meta.total + 1 }));
      }

      return product;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create product';
      this.errorSignal.set(message);
      return null;
    } finally {
      this.savingSignal.set(false);
    }
  }

  /**
   * Update an existing product
   */
  async updateProduct(request: UpdateProductRequest): Promise<Product | null> {
    try {
      this.savingSignal.set(true);
      this.errorSignal.set(null);

      const product = await this.supabase.callFunctionWithAuth<Product>(
        'manage-business-products',
        {
          action: 'update',
          ...request,
        }
      );

      if (product) {
        // Update in local list
        this.productsSignal.update(products =>
          products.map(p => p.id === product.id ? product : p)
        );
      }

      return product;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update product';
      this.errorSignal.set(message);
      return null;
    } finally {
      this.savingSignal.set(false);
    }
  }

  /**
   * Delete a product
   */
  async deleteProduct(productId: string): Promise<boolean> {
    try {
      this.savingSignal.set(true);
      this.errorSignal.set(null);

      await this.supabase.callFunctionWithAuth<{ deleted: boolean }>(
        'manage-business-products',
        {
          action: 'delete',
          productId,
        }
      );

      // Remove from local list
      this.productsSignal.update(products =>
        products.filter(p => p.id !== productId)
      );
      this.metaSignal.update(meta => ({ ...meta, total: Math.max(0, meta.total - 1) }));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete product';
      this.errorSignal.set(message);
      return false;
    } finally {
      this.savingSignal.set(false);
    }
  }

  /**
   * Toggle product availability
   */
  async toggleAvailability(productId: string): Promise<Product | null> {
    try {
      this.errorSignal.set(null);

      const product = await this.supabase.callFunctionWithAuth<Product>(
        'manage-business-products',
        {
          action: 'toggle_availability',
          productId,
        }
      );

      if (product) {
        // Update in local list
        this.productsSignal.update(products =>
          products.map(p => p.id === product.id ? product : p)
        );
      }

      return product;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to toggle availability';
      this.errorSignal.set(message);
      return null;
    }
  }

  /**
   * Upload a product image to R2
   */
  async uploadProductImage(file: File): Promise<string | null> {
    try {
      this.errorSignal.set(null);

      const filename = `product_${Date.now()}.${file.name.split('.').pop() || 'jpg'}`;
      const response = await this.supabase.uploadFileToR2(file, 'business-products', filename);

      return response.url;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload image';
      this.errorSignal.set(message);
      return null;
    }
  }

  /**
   * Reset state (useful when navigating away)
   */
  reset(): void {
    this.productsSignal.set([]);
    this.errorSignal.set(null);
    this.metaSignal.set({ total: 0, limit: 50, offset: 0 });
  }
}
