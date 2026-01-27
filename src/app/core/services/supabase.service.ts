import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private sessionSubject = new BehaviorSubject<Session | null>(null);
  public session$: Observable<Session | null> = this.sessionSubject.asObservable();

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'wheelbase-business-auth'
      }
    });

    // Listen to auth state changes
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.sessionSubject.next(session);
    });

    // Initialize session
    this.supabase.auth.getSession().then(({ data: { session } }) => {
      this.sessionSubject.next(session);
    });
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  get auth() {
    return this.supabase.auth;
  }

  /**
   * Get current session
   */
  async getSession(): Promise<Session | null> {
    const { data: { session } } = await this.supabase.auth.getSession();
    return session;
  }

  /**
   * Get access token
   */
  async getAccessToken(): Promise<string | null> {
    const session = await this.getSession();
    return session?.access_token || null;
  }

  /**
   * Call a business Edge Function
   */
  async callFunction<T = unknown>(functionName: string, body?: unknown): Promise<T> {
    const { data, error } = await this.supabase.functions.invoke(functionName, {
      body: body || {}
    });

    if (error) {
      console.error(`Function ${functionName} error:`, error);
      throw new Error(error.message || `Failed to call ${functionName}`);
    }

    if (!data.success) {
      throw new Error(data.error?.message || 'Function call failed');
    }

    return data.data as T;
  }

  /**
   * Call a business Edge Function with custom headers
   */
  async callFunctionWithAuth<T = unknown>(functionName: string, body?: unknown): Promise<T> {
    const token = await this.getAccessToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await this.supabase.functions.invoke(functionName, {
      body: body || {},
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (error) {
      console.error(`Function ${functionName} error:`, error);
      throw new Error(error.message || `Failed to call ${functionName}`);
    }

    if (!data.success) {
      throw new Error(data.error?.message || 'Function call failed');
    }

    return data.data as T;
  }

  /**
   * Sign in with Google OAuth
   */
  async signInWithGoogle(): Promise<void> {
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) {
      throw new Error(error.message);
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
    this.sessionSubject.next(null);
  }

  /**
   * Set session from tokens
   */
  async setSession(accessToken: string, refreshToken: string): Promise<void> {
    const { error } = await this.supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });
    if (error) {
      throw new Error(error.message);
    }
  }

  /**
   * Upload file via Edge Function (uses service role to bypass RLS)
   */
  async uploadFileToR2(file: File, folder: string, filename?: string): Promise<{ url: string }> {
    const token = await this.getAccessToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    if (filename) {
      formData.append('filename', filename);
    }

    const response = await fetch(`${environment.supabaseUrl}/functions/v1/upload-document`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'Upload failed' } }));
      throw new Error(errorData.error?.message || `Upload failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error?.message || 'Upload failed');
    }

    return data.data;
  }

  /**
   * Upload image to Cloudflare R2 CDN
   */
  async uploadImageToR2(file: File, folder: string, filename?: string): Promise<{ url: string; path: string }> {
    const token = await this.getAccessToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    if (filename) {
      formData.append('filename', filename);
    }

    const response = await fetch(`${environment.supabaseUrl}/functions/v1/upload-to-r2`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'Upload failed' } }));
      throw new Error(errorData.error?.message || `Upload failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error?.message || 'Upload failed');
    }

    return data.data;
  }
}
