import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuthResponse {
  token: string;
  username: string;
  role?: string;
  signature_algorithm?: string;
  is_org_approved?: boolean;
  join_code?: string;
  org_name?: string;
}

export interface User {
  username: string;
  role: 'system_admin' | 'org_admin' | 'user';
  org_name?: string;
  join_code?: string;
  is_pending_approval: boolean;
}

export interface PendingMember {
  user_id: number;
  username: string;
  date_joined: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = environment.apiBaseUrl;
  currentUser = signal<AuthResponse | null>(this.loadUserFromStorage());
  signatureAlgorithm = signal<'RSA-SHA256' | 'ECDSA-P256-SHA256'>((this.currentUser()?.signature_algorithm as any) ?? 'RSA-SHA256');
  constructor(private http: HttpClient, private router: Router) {}

  // --- SESSION MANAGEMENT ---
  private loadUserFromStorage(): AuthResponse | null {
    const data = localStorage.getItem('auth_user');
    return data ? JSON.parse(data) : null;
  }

  private saveSession(res: AuthResponse): void {
    localStorage.setItem('auth_token', res.token);
    localStorage.setItem('auth_user', JSON.stringify(res));
    this.currentUser.set(res);
  }

  private clearSession(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  // --- AUTHENTICATION ---
  login(payload: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, payload).pipe(
      tap((res) => this.saveSession(res))
    );
  }

  // --- REGISTRATION FLOWS ---
  // Standard user: Optionally takes a join_code for B2B onboarding
  register(payload: any): Observable<AuthResponse> {
  // Pass the entire object to the backend
  return this.http.post<AuthResponse>(`${this.apiUrl}/register`, payload).pipe(
    tap((res) => this.saveSession(res))
  );
}

// Org Admin registration
registerOrg(payload: any): Observable<AuthResponse> {
  return this.http.post<AuthResponse>(`${this.apiUrl}/register-org`, payload).pipe(
    tap((res) => this.saveSession(res))
  );
}

  // --- ADMIN APPROVAL (B2B) ---
  getPendingMembers(): Observable<PendingMember[]> {
    return this.http.get<PendingMember[]>(`${this.apiUrl}/org/pending-members`);
  }

  manageMember(userId: number, action: 'approve' | 'deny'): Observable<any> {
    return this.http.post(`${this.apiUrl}/org/manage-member`, { user_id: userId, action });
  }

  // --- LOGOUT ---
  logout(): void {
    this.http.post(`${this.apiUrl}/logout`, {}).subscribe({
      next: () => this.clearSession(),
      error: () => this.clearSession(),
    });
  }
  token(): string | null {
    return localStorage.getItem('auth_token');
  }

  clearLocal(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    this.currentUser.set(null);
  }
}