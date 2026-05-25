import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { interval, Subject, takeUntil } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { NavbarComponent } from '../components/navbar/navbar.component';
import { DashboardService } from '../services/dashboard.service';
import { SignatureApiService, VerifyResult } from '../services/signature-api.service';

export interface DocumentInfo {
  id: string;
  filename: string;
  size: string;
  status: string;
  uploaded_by: string;
  uploaded_at: string;
}

export interface DashboardSummary {
  metrics: SystemMetrics;
  recent_activities: Activity[];
  user_stats: UserStats;
  system_health: SystemHealth;
  recent_documents?: DocumentInfo[];
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
  imports: [CommonModule, NavbarComponent, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit, OnDestroy {
  dashboardData: DashboardSummary | null = null;
  isLoading = false;
  error: string | null = null;
  currentUserRole: string = 'user'; 

  private destroy$ = new Subject<void>();
  private refreshInterval = 30000; 

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
    this.currentUserRole = (localStorage.getItem('ds_auth_role') || 'user').toLowerCase();
    this.loadDashboard();
    this.setupAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private populateDummyDocumentsIfNeeded(data: DashboardSummary) {
    if (!data.recent_documents || data.recent_documents.length === 0) {
      data.recent_documents = [
        { id: 'DOC-1029', filename: 'Q3_Financial_Report.pdf', size: '2.4 MB', status: 'signed', uploaded_by: 'admin', uploaded_at: new Date().toISOString() },
        { id: 'DOC-1028', filename: 'Vendor_Agreement_v2.docx', size: '1.1 MB', status: 'pending', uploaded_by: 'johndoe', uploaded_at: new Date(Date.now() - 3600000).toISOString() },
        { id: 'DOC-1027', filename: 'Employee_NDA_2026.pdf', size: '0.8 MB', status: 'verified', uploaded_by: 'hr_manager', uploaded_at: new Date(Date.now() - 86400000).toISOString() },
        { id: 'DOC-1026', filename: 'System_Architecture.json', size: '15 KB', status: 'failed', uploaded_by: 'admin', uploaded_at: new Date(Date.now() - 172800000).toISOString() }
      ];
    }
  }

  private loadDashboard(): void {
    this.isLoading = true;
    this.error = null;

    this.dashboardService
      .getSummary()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const data = res.data ? res.data : res;
          this.populateDummyDocumentsIfNeeded(data);
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
        next: (res: any) => {
          const data = res.data ? res.data : res;
          this.populateDummyDocumentsIfNeeded(data);
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

  adminSignDocument(doc: DocumentInfo): void {
    if (this.currentUserRole !== 'admin') return;

    doc.status = 'signing...';
    
    const token = localStorage.getItem('ds_auth_token'); 
    
    fetch(`http://127.0.0.1:8000/api/approve-pending-document/${doc.id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json'
      }
    })
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success') {
        doc.status = 'signed'; 
        if (this.dashboardData) {
          if (this.dashboardData.metrics.documents_pending > 0) {
            this.dashboardData.metrics.documents_pending -= 1;
          }
          this.dashboardData.metrics.total_signatures += 1;
        }
      } else {
        doc.status = 'pending'; 
        alert(data.detail || 'Failed to sign document');
      }
    })
    .catch(err => {
      doc.status = 'pending';
      console.error(err);
    });
  }

  /* ─────────────────────────────────────────────
   * Download Signed Document from Dropdown
   * ───────────────────────────────────────────── */
  downloadSignedDocument(doc: DocumentInfo): void {
    const token = localStorage.getItem('ds_auth_token'); 
    
    fetch(`http://127.0.0.1:8000/api/download-pending-document/${doc.id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${token}`
      }
    })
    .then(res => {
      if (!res.ok) throw new Error('Download failed');
      return res.blob();
    })
    .then(blob => {
      // Create a blob URL and trigger the browser's download prompt
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `signed_${doc.filename}`; 
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    })
    .catch(err => {
      console.error('Download error:', err);
      alert('Could not download the document.');
    });
  }
  scrollToVerify(): void {
    const element = document.getElementById('verify-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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