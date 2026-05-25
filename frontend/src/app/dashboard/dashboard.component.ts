import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { interval, Subject, takeUntil } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { NavbarComponent } from '../components/navbar/navbar.component';
import { DashboardService } from '../services/dashboard.service';
import { SignatureApiService, VerifyResult } from '../services/signature-api.service';

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

export interface DashboardVerificationState {
  verifyFile: File | null;
  verifyLoading: boolean;
  verifySuccess: boolean;
  verifyError: string | null;
  verifyDetails: VerifyResult | null;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit, OnDestroy {
  dashboardData: DashboardSummary | null = null;
  isLoading = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();
  private refreshInterval = 30000; // 30 seconds

  verification: DashboardVerificationState = {
    verifyFile: null,
    verifyLoading: false,
    verifySuccess: false,
    verifyError: null,
    verifyDetails: null,
  };

  constructor(
    private dashboardService: DashboardService,
    private signatureApi: SignatureApiService
  ) {}

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

    this.dashboardService
      .getSummary()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.dashboardData = data;
          this.isLoading = false;
        },
        error: (err) => {
          this.error = 'Failed to load dashboard data';
          this.isLoading = false;
          console.error('Dashboard load error:', err);
        },
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
        error: (err) => {
          console.error('Auto-refresh error:', err);
        },
      });
  }

  refreshDashboard(): void {
    this.loadDashboard();
  }

  onVerifyFileSelected(files: FileList | null): void {
  this.verification.verifyFile = files ? files[0] : null;
    this.verification.verifyError = null;
    this.verification.verifySuccess = false;
    this.verification.verifyDetails = null;
  }

  verifyOnDashboard(): void {
    if (!this.verification.verifyFile) {
      this.verification.verifyError = 'Please upload a signed_document.json file.';
      return;
    }

    this.verification.verifyLoading = true;
    this.verification.verifyError = null;
    this.verification.verifySuccess = false;
    this.verification.verifyDetails = null;

    this.signatureApi
      .verifyDocument(this.verification.verifyFile)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.verification.verifyDetails = res;
          this.verification.verifySuccess = res.status === 'valid';
          this.verification.verifyError =
            res.status === 'valid' ? null : res.message || 'Invalid signature.';
          this.verification.verifyLoading = false;
        },
        error: (err) => {
          this.verification.verifyLoading = false;
          this.verification.verifySuccess = false;
          this.verification.verifyError = err?.error?.message || 'Verification request failed.';
        },
      });
  }

  getHealthColor(status: string): string {
    return status === 'connected' || status === 'operational' ? 'success' : 'danger';
  }

  getHealthIcon(status: string): string {
    return status === 'connected' || status === 'operational' ? 'check-circle' : 'exclamation-circle';
  }
}

