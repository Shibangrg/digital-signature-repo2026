import { CommonModule } from '@angular/common';
import { Component, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { AuthService } from '../../services/auth.service';
import { SignatureApiService } from '../../services/signature-api.service';
export interface SupportedAlgorithm {
  id: string;
  label: string;
}
@Component({
  selector: 'app-sign',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './sign.component.html',
  styleUrl: './sign.component.css',
})

export class SignComponent implements OnInit {
  // MUST BE PUBLIC to use in the HTML template
  public auth = inject(AuthService);
  private api = inject(SignatureApiService);
  // ADD THIS for the missing file input reference
  @ViewChild('fileInput') signFileInputRef!: ElementRef<HTMLInputElement>;
  inputType = signal<'text' | 'file'>('text');
signLoading = signal(false);
signError = signal<string | null>(null);

setInputType(type: 'text' | 'file'): void {
  this.inputType.set(type);
}

  // IMPLEMENT THIS to satisfy OnInit
  ngOnInit(): void {
    // Initialization logic if needed
  }
  
  // ... Keep the exact rest of your existing logic in this file unchanged ...

  /* ── State ─────────────────────────────────────── */
  selectedFile: File | null = null;
  textData = '';

  loading = signal(false);
  error = signal<string | null>(null);
  signSuccess = signal(false);

  // Algorithm selection modal
  algorithmModalOpen = signal(false);
  supportedAlgorithms = signal<SupportedAlgorithm[]>([]);
  selectedAlgorithm = signal<'RSA-SHA256' | 'ECDSA-P256-SHA256'>('RSA-SHA256');
  algoLoading = signal(false);

  /** Holds the signed package Blob for download */
  private signedPackageBlob = signal<Blob | null>(null);
  private signedPackageUrl = signal<string | null>(null);

  /* ── File selection ────────────────────────────── */
  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
    this.error.set(null);
    this.resetResult();
  }

  clearFile(): void {
    this.selectedFile = null;
    const input = this.signFileInputRef?.nativeElement;
    if (input) input.value = '';
    this.error.set(null);
  }

  /* ── Sign action ───────────────────────────────── */
  signDocument(): void {
    // Open algorithm picker first
    this.openAlgorithmModal();
  }
  

  private openAlgorithmModal(): void {
    this.error.set(null);
    this.signSuccess.set(false);
    this.signedPackageBlob.set(null);
    this.revokeUrl();

  // TYPE-CAST THE VALUE HERE
    const currentAlgo = this.auth.signatureAlgorithm() as 'RSA-SHA256' | 'ECDSA-P256-SHA256';
    
    // Default to 'RSA-SHA256' if the value is something else or undefined
    const validAlgo = (currentAlgo === 'ECDSA-P256-SHA256') ? 'ECDSA-P256-SHA256' : 'RSA-SHA256';
    
    this.selectedAlgorithm.set(validAlgo);

    this.algorithmModalOpen.set(true);

    this.algorithmModalOpen.set(true);
    if (this.supportedAlgorithms().length === 0) {
      this.algoLoading.set(true);
      this.api
        .supportedAlgorithms()
        .pipe(finalize(() => this.algoLoading.set(false)))
        .subscribe({
          next: (res) => {
            const list = Array.isArray(res.algorithms) ? res.algorithms : [];
            this.supportedAlgorithms.set(list);
          },
          error: () => {
            // fallback to defaults
            this.supportedAlgorithms.set([
              { id: 'RSA-SHA256', label: 'RSA-SHA256' },
              { id: 'ECDSA-P256-SHA256', label: 'ECDSA-P256-SHA256' },
            ]);
          },
        });
    }
  }

  closeAlgorithmModal(): void {
    this.algorithmModalOpen.set(false);
  }

  confirmAlgorithmAndSign(): void {
    this.error.set(null);
    this.signSuccess.set(false);
    this.signedPackageBlob.set(null);
    this.revokeUrl();
    this.loading.set(true);

    const formData = new FormData();

    if (this.selectedFile) {
      formData.append('file', this.selectedFile, this.selectedFile.name);
    } else {
      formData.append('data', this.textData);
    }

    const desired = this.selectedAlgorithm();
    const current = this.auth.signatureAlgorithm();

    const doSign = () => {
      this.api
        .signDocumentRaw(formData)
        .pipe(finalize(() => this.loading.set(false)))
        .subscribe({
          next: (blob) => {
            this.signedPackageBlob.set(blob);
            const url = URL.createObjectURL(blob);
            this.signedPackageUrl.set(url);
            this.signSuccess.set(true);
            this.closeAlgorithmModal();
          },
          error: (e) => {
          // When responseType is 'blob', error body is a Blob — read it as text
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
            const msg =
              e?.error?.detail ??
              (typeof e?.error === 'string' ? e.error : null) ??
              e?.message ??
              'Signing failed.';
            this.error.set(String(msg));
          }
          },
        });
    };

    if (desired !== current) {
      this.api
        .setSignatureAlgorithm(desired)
        .subscribe({
          next: () => {
            this.auth.signatureAlgorithm.set(desired);
            doSign();
          },
          error: () => {
            this.loading.set(false);
            this.error.set('Could not switch algorithm. Please try again.');
          },
        });
    } else {
      doSign();
    }
  }

  downloadSignedDocument(): void {
    const url = this.signedPackageUrl();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = 'signed_document.json';
    a.click();
  }

  signButtonDisabled(): boolean {
    const hasData = this.selectedFile !== null || (this.textData || '').trim().length > 0;
    return this.loading() || !hasData;
  }

  /* ── Drag & Drop ───────────────────────────────── */
  dragOver = signal(false);

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
      this.error.set(null);
      this.resetResult();
    }
  }

  /* ── Cleanup ───────────────────────────────────── */
  private revokeUrl(): void {
    const url = this.signedPackageUrl();
    if (url) {
      URL.revokeObjectURL(url);
      this.signedPackageUrl.set(null);
    }
  }

  private resetResult(): void {
    this.signSuccess.set(false);
    this.signedPackageBlob.set(null);
    this.revokeUrl();
  }
  
}
