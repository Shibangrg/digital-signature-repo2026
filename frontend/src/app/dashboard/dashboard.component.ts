import { Component, OnInit, OnDestroy } from '@angular/core';
import { DashboardService } from '../services/dashboard.service';
import { Subject } from 'rxjs';
import { takeUntil, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';

export interface DashboardSummary {
  metrics: SystemMetrics;
  recent_activities: Activity[];
  user_stats: UserStats;
  system_health: SystemHealth;
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

export interface Activity {
  id: string;
  user_id: string;
  activity_type: string;
  description: string;
  timestamp: string;
}

export interface UserStats {
  total_users: number;
  active_users: number;
  inactive_users: number;
  by_role: { [key: string]: number };
}

export interface SystemHealth {
  status: string;
  timestamp: string;
  checks: { [key: string]: string };
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  dashboardData: DashboardSummary | null = null;
  isLoading = false;
  error: string | null = null;
  
  private destroy$ = new Subject<void>();
  private refreshInterval = 30000; // 30 seconds

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.loadDashboard();
    this.setupAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboard(): void {
    this.isLoading = true;
    this.error = null;
    
    this.dashboardService.getSummary()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.dashboardData = data;
          this.isLoading = false;
        },
        error: (error) => {
          this.error = 'Failed to load dashboard data';
          this.isLoading = false;
          console.error('Dashboard load error:', error);
        }
      });
  }

  private setupAutoRefresh(): void {
    interval(this.refreshInterval)
      .pipe(
        switchMap(() => this.dashboardService.getSummary()),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (data) => {
          this.dashboardData = data;
        },
        error: (error) => {
          console.error('Auto-refresh error:', error);
        }
      });
  }

  refreshDashboard(): void {
    this.loadDashboard();
  }

  getHealthColor(status: string): string {
    return status === 'connected' || status === 'operational' ? 'success' : 'danger';
  }

  getHealthIcon(status: string): string {
    return status === 'connected' || status === 'operational' ? 'check-circle' : 'exclamation-circle';
  }
}
