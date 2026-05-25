import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  created_at: string;
  last_login?: string;
  is_active: boolean;
}

export interface Activity {
  id: string;
  user_id: string;
  activity_type: string;
  description: string;
  timestamp: string;
  metadata?: any;
}

export interface SystemMetrics {
  total_users: number;
  active_users: number;
  total_documents: number;
  total_signatures: number;
  documents_pending: number;
  system_uptime_hours: number;
  avg_signature_time_seconds: number;
  timestamp: string;
}

export interface Report {
  id: string;
  title: string;
  report_type: string;
  created_by: string;
  created_at: string;
  data: any;
  filters?: any;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = `${environment.apiBaseUrl}/dashboard`;

  constructor(private http: HttpClient) {}

  getSummary(): Observable<any> {
    return this.http.get(`${this.apiUrl}/summary`);
  }

  getUsers(role?: string): Observable<any> {
    let params = new HttpParams();
    if (role) {
      params = params.set('role', role);
    }
    return this.http.get(`${this.apiUrl}/users`, { params });
  }

  createUser(userData: Partial<User>): Observable<any> {
    return this.http.post(`${this.apiUrl}/users`, userData);
  }

  getUser(userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${userId}`);
  }

  updateUser(userId: string, userData: Partial<User>): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${userId}`, userData);
  }

  deactivateUser(userId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/${userId}/deactivate`, {});
  }

  getActivities(limit: number = 10): Observable<any> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get(`${this.apiUrl}/activities`, { params });
  }

  getUserActivities(userId: string, limit: number = 50): Observable<any> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get(`${this.apiUrl}/activities/user/${userId}`, { params });
  }

  getActivitySummary(days: number = 7): Observable<any> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get(`${this.apiUrl}/activities/summary`, { params });
  }

  updateMetrics(metrics: Partial<SystemMetrics>): Observable<any> {
    return this.http.post(`${this.apiUrl}/metrics`, metrics);
  }

  generateReport(report: Partial<Report>): Observable<any> {
    return this.http.post(`${this.apiUrl}/reports`, report);
  }

  getHealth(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`);
  }
}
