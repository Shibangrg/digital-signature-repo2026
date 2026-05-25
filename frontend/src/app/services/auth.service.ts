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

  constructor(private http: HttpClient, private router: Router) {}

  private loadUserFromStorage(): AuthResponse | null {
    const data = localStorage.getItem('auth_user');
    return data ? JSON.parse(data) : null;
  }

  private saveSession(res: AuthResponse): void {
    localStorage.setItem('auth_token', res.token);
    localStorage.setItem('auth_user', JSON.stringify(res));
    this.currentUser.set(res);
  }

  // --- STANDARD AUTH ---
  login(payload: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, payload).pipe(
      tap((res) => this.saveSession(res))
    );
  }

  register(payload: any): Observable<AuthResponse> {
    // Payload may include optional 'join_code'
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, payload).pipe(
      tap((res) => this.saveSession(res))
    );
  }

  // --- B2B ORGANIZATION AUTH ---
  registerOrg(payload: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register-org`, payload).pipe(
      tap((res) => this.saveSession(res))
    );
  }

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

  private clearSession(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }
}