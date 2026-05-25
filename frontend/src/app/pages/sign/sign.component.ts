import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { NavbarComponent } from '../../components/navbar/navbar.component';
import { AuthService } from '../../services/auth.service';
import { SignatureApiService, SupportedAlgorithm } from '../../services/signature-api.service';

@Component({
  selector: 'app-sign',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './sign.component.html',
  styleUrls: ['./sign.component.css']
})
export class SignComponent implements OnInit {
  @ViewChild('signFileInput') signFileInputRef?: ElementRef<HTMLInputElement>;

  private readonly api = inject(SignatureApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  /* ─────────────────────────────────────────────
   * State variables for Role and UI Actions
   * ───────────────────────────────────────────── */

  currentUserRole: string = 'user';
  pendingDocId = signal<string | null>(null);

  selectedFile: File | null = null;
  textData = '';

  loading = signal(false);
  error = signal<string | null>(null);
  actionSuccess = signal(false);
  successMessage = signal<string>('');
  dragOver = signal(false);

  /* ─────────────────────────────────────────────
   * Algorithm Modal
   * ───────────────────────────────────────────── */

  algorithmModalOpen = signal(false);
  supportedAlgorithms = signal<SupportedAlgorithm[]>([]);
  selectedAlgorithm = signal<'RSA-SHA256' | 'ECDSA-P256-SHA256'>('RSA-SHA256');
  algoLoading = signal(false);

  /* ─────────────────────────────────────────────
   * Signed Package
   * ───────────────────────────────────────────── */

  signedPackageBlob = signal<Blob | null>(null);
  signedPackageUrl = signal<string | null>(null);

  ngOnInit(): void {
    // 1. Get role from local storage (defaults to user)
    this.currentUserRole = localStorage.getItem('role') || 'user';

    // 2. Check URL params to see if admin is signing a pending document from dashboard
    this.route.queryParams.subscribe(params => {
      const docId = params['docId'];
      if (docId) {
        this.pendingDocId.set(docId);
      }
    });
  }

  /* ─────────────────────────────────────────────
   * File & Text Handlers
   * ───────────────────────────────────────────── */

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;

    if (this.selectedFile) {
      this.textData = '';
    }

    this.error.set(null);
    this.resetResult();
  }

  clearFile(): void {
    this.selectedFile = null;
    if (this.signFileInputRef?.nativeElement) {
      this.signFileInputRef.nativeElement.value = '';
    }
    this.error.set(null);
    this.resetResult();
  }

  onTextInput(): void {
    if (this.textData.trim().length > 0) {
      this.selectedFile = null;
      if (this.signFileInputRef?.nativeElement) {
        this.signFileInputRef.nativeElement.value = '';
      }
    }
    this.error.set(null);
    this.resetResult();
  }

  /* ─────────────────────────────────────────────
   * Action: Upload Document to Server
   * ───────────────────────────────────────────── */

 uploadToServer(): void {
    this.error.set(null);
    this.actionSuccess.set(false);
    this.loading.set(true);

    const formData = new FormData();
    if (this.selectedFile) {
      formData.append('file', this.selectedFile, this.selectedFile.name);
    }
    if (this.textData.trim()) {
      formData.append('data', this.textData.trim());
    }

    // FIX: Using the correct auth token key from your AuthService
    const token = localStorage.getItem('ds_auth_token'); 
    
    fetch('http://127.0.0.1:8000/api/upload-pending-document', {
      method: 'POST',
      headers: { 'Authorization': `Token ${token}` },
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      this.loading.set(false);
      if (data.status === 'success') {
        this.successMessage.set('Document uploaded to server successfully! It is now pending admin signature.');
        this.actionSuccess.set(true);
        this.selectedFile = null;
        this.textData = '';
      } else {
        this.error.set(data.detail || data.message || 'Upload failed');
      }
    })
    .catch(err => {
      this.loading.set(false);
      this.error.set('Network error during upload');
      console.error(err);
    });
  }
  /* ─────────────────────────────────────────────
   * Action: Sign Document (Admin Only)
   * ───────────────────────────────────────────── */

  openAlgorithmModal(): void {
    this.error.set(null);
    this.actionSuccess.set(false);
    this.signedPackageBlob.set(null);
    this.revokeUrl();

    this.selectedAlgorithm.set(this.auth.signatureAlgorithm());
    this.algorithmModalOpen.set(true);

    if (this.supportedAlgorithms().length === 0) {
      this.algoLoading.set(true);
      this.api.supportedAlgorithms().pipe(finalize(() => this.algoLoading.set(false))).subscribe({
        next: (res) => {
          this.supportedAlgorithms.set(Array.isArray(res.algorithms) ? res.algorithms : []);
        },
        error: () => {
          this.supportedAlgorithms.set([
            { id: 'RSA-SHA256', label: 'RSA-SHA256' },
            { id: 'ECDSA-P256-SHA256', label: 'ECDSA-P256-SHA256' }
          ]);
        }
      });
    }
  }

  closeAlgorithmModal(): void {
    this.algorithmModalOpen.set(false);
  }

  confirmAlgorithmAndSign(): void {
    this.error.set(null);
    this.actionSuccess.set(false);
    this.signedPackageBlob.set(null);
    this.revokeUrl();
    this.loading.set(true);

    const formData = new FormData();

    if (this.selectedFile) {
      formData.append('file', this.selectedFile, this.selectedFile.name);
    }
    if (this.textData.trim()) {
      formData.append('data', this.textData.trim());
    }

    const pendingId = this.pendingDocId();
    if (pendingId) {
      formData.append('document_id', pendingId);
    }

    const desired = this.selectedAlgorithm();
    const current = this.auth.signatureAlgorithm();

    const doSign = () => {
      this.api.signDocumentRaw(formData).pipe(finalize(() => this.loading.set(false))).subscribe({
        next: (blob) => {
          this.signedPackageBlob.set(blob);
          this.signedPackageUrl.set(URL.createObjectURL(blob));
          
          this.successMessage.set('Document signed and cryptographic package generated successfully.');
          this.actionSuccess.set(true);
          
          this.closeAlgorithmModal();
          this.pendingDocId.set(null);
        },
        error: (e) => {
          if (e?.error instanceof Blob) {
            const reader = new FileReader();
            reader.onload = () => {
              try {
                const parsed = JSON.parse(reader.result as string);
                this.error.set(parsed?.detail ?? parsed?.message ?? 'Signing failed.');
              } catch {
                this.error.set('Signing failed.');
              }
            };
            reader.onerror = () => this.error.set('Signing failed.');
            reader.readAsText(e.error);
          } else {
            const msg = e?.error?.detail ?? (typeof e?.error === 'string' ? e.error : null) ?? e?.message ?? 'Signing failed.';
            this.error.set(String(msg));
          }
        }
      });
    };

    if (desired !== current) {
      this.api.setSignatureAlgorithm(desired).subscribe({
        next: () => {
          this.auth.signatureAlgorithm.set(desired);
          doSign();
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Could not switch algorithm.');
        }
      });
    } else {
      doSign();
    }
  }

  /* ─────────────────────────────────────────────
   * UI & Cleanup Helpers
   * ───────────────────────────────────────────── */

  downloadSignedDocument(): void {
    const url = this.signedPackageUrl();
    if (!url) return;

    const a = document.createElement('a');
    a.href = url;
    a.download = 'signed_document.json';
    a.click();
  }

  actionButtonDisabled(): boolean {
    const hasFile = this.selectedFile !== null;
    const hasText = this.textData.trim().length > 0;
    return this.loading() || (!hasFile && !hasText);
  }

  clearPendingState(): void {
    this.pendingDocId.set(null);
    this.resetResult();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.selectedFile = file;
      this.textData = '';
      this.error.set(null);
      this.resetResult();
    }
  }

  private revokeUrl(): void {
    const url = this.signedPackageUrl();
    if (url) {
      URL.revokeObjectURL(url);
      this.signedPackageUrl.set(null);
    }
  }

  resetResult(): void {
    this.actionSuccess.set(false);
    this.successMessage.set('');
    this.signedPackageBlob.set(null);
    this.revokeUrl();
  }
}