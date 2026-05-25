import { CommonModule } from '@angular/common';
import {
    Component,
    ElementRef,
    ViewChild,
    inject,
    signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { NavbarComponent } from '../../components/navbar/navbar.component';
import { AuthService } from '../../services/auth.service';
import {
    SignatureApiService,
    SupportedAlgorithm
} from '../../services/signature-api.service';

@Component({
  selector: 'app-sign',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './sign.component.html',
  styleUrls: ['./sign.component.css']
})
export class SignComponent {
  @ViewChild('signFileInput')
  signFileInputRef?: ElementRef<HTMLInputElement>;

  private readonly api = inject(SignatureApiService);
  private readonly auth = inject(AuthService);

  /* ─────────────────────────────────────────────
   * State
   * ───────────────────────────────────────────── */

  selectedFile: File | null = null;
  textData = '';

  loading = signal(false);
  error = signal<string | null>(null);
  signSuccess = signal(false);

  dragOver = signal(false);

  /* ─────────────────────────────────────────────
   * Algorithm Modal
   * ───────────────────────────────────────────── */

  algorithmModalOpen = signal(false);

  supportedAlgorithms = signal<SupportedAlgorithm[]>([]);

  selectedAlgorithm = signal<
    'RSA-SHA256' | 'ECDSA-P256-SHA256'
  >('RSA-SHA256');

  algoLoading = signal(false);

  /* ─────────────────────────────────────────────
   * Signed Package
   * ───────────────────────────────────────────── */

  private signedPackageBlob = signal<Blob | null>(null);
  private signedPackageUrl = signal<string | null>(null);

  /* ─────────────────────────────────────────────
   * File Selection
   * ───────────────────────────────────────────── */

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.selectedFile = input.files?.[0] ?? null;

    // Clear text if file selected
    if (this.selectedFile) {
      this.textData = '';
    }

    this.error.set(null);
    this.resetResult();
  }

  clearFile(): void {
    this.selectedFile = null;

    const input = this.signFileInputRef?.nativeElement;

    if (input) {
      input.value = '';
    }

    this.error.set(null);
    this.resetResult();
  }

  /* ─────────────────────────────────────────────
   * Text Input
   * ───────────────────────────────────────────── */

  onTextInput(): void {
    // Remove file if text is entered
    if (this.textData.trim().length > 0) {
      this.selectedFile = null;

      const input = this.signFileInputRef?.nativeElement;

      if (input) {
        input.value = '';
      }
    }

    this.error.set(null);
    this.resetResult();
  }

  /* ─────────────────────────────────────────────
   * Sign Flow
   * ───────────────────────────────────────────── */

  signDocument(): void {
    const hasFile = this.selectedFile !== null;
    const hasText = this.textData.trim().length > 0;

    if (!hasFile && !hasText) {
      this.error.set('Please upload a file or enter text.');
      return;
    }

    this.openAlgorithmModal();
  }

  private openAlgorithmModal(): void {
    this.error.set(null);
    this.signSuccess.set(false);

    this.signedPackageBlob.set(null);
    this.revokeUrl();

    this.selectedAlgorithm.set(
      this.auth.signatureAlgorithm()
    );

    this.algorithmModalOpen.set(true);

    if (this.supportedAlgorithms().length === 0) {
      this.algoLoading.set(true);

      this.api
        .supportedAlgorithms()
        .pipe(
          finalize(() => this.algoLoading.set(false))
        )
        .subscribe({
          next: (res) => {
            const list = Array.isArray(res.algorithms)
              ? res.algorithms
              : [];

            this.supportedAlgorithms.set(list);
          },

          error: () => {
            this.supportedAlgorithms.set([
              {
                id: 'RSA-SHA256',
                label: 'RSA-SHA256'
              },
              {
                id: 'ECDSA-P256-SHA256',
                label: 'ECDSA-P256-SHA256'
              }
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
    this.signSuccess.set(false);

    this.signedPackageBlob.set(null);
    this.revokeUrl();

    this.loading.set(true);

    const formData = new FormData();

    /* ─────────────────────────────────────────
     * Merge File + Text Support
     * ───────────────────────────────────────── */

    if (this.selectedFile) {
      formData.append(
        'file',
        this.selectedFile,
        this.selectedFile.name
      );
    }

    if (this.textData.trim()) {
      formData.append('data', this.textData.trim());
    }

    const desired = this.selectedAlgorithm();
    const current = this.auth.signatureAlgorithm();

    const doSign = () => {
      this.api
        .signDocumentRaw(formData)
        .pipe(
          finalize(() => this.loading.set(false))
        )
        .subscribe({
          next: (blob) => {
            this.signedPackageBlob.set(blob);

            const url = URL.createObjectURL(blob);

            this.signedPackageUrl.set(url);

            this.signSuccess.set(true);

            this.closeAlgorithmModal();
          },

          error: (e) => {
            if (e?.error instanceof Blob) {
              const reader = new FileReader();

              reader.onload = () => {
                try {
                  const parsed = JSON.parse(
                    reader.result as string
                  );

                  this.error.set(
                    parsed?.detail ??
                    parsed?.message ??
                    'Signing failed.'
                  );
                } catch {
                  this.error.set('Signing failed.');
                }
              };

              reader.onerror = () => {
                this.error.set('Signing failed.');
              };

              reader.readAsText(e.error);
            } else {
              const msg =
                e?.error?.detail ??
                (typeof e?.error === 'string'
                  ? e.error
                  : null) ??
                e?.message ??
                'Signing failed.';

              this.error.set(String(msg));
            }
          }
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

            this.error.set(
              'Could not switch algorithm.'
            );
          }
        });
    } else {
      doSign();
    }
  }

  /* ─────────────────────────────────────────────
   * Download
   * ───────────────────────────────────────────── */

  downloadSignedDocument(): void {
    const url = this.signedPackageUrl();

    if (!url) return;

    const a = document.createElement('a');

    a.href = url;
    a.download = 'signed_document.json';

    a.click();
  }

  /* ─────────────────────────────────────────────
   * Button State
   * ───────────────────────────────────────────── */

  signButtonDisabled(): boolean {
    const hasFile = this.selectedFile !== null;

    const hasText =
      this.textData.trim().length > 0;

    return this.loading() || (!hasFile && !hasText);
  }

  /* ─────────────────────────────────────────────
   * Drag & Drop
   * ───────────────────────────────────────────── */

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

      // Clear text if file dropped
      this.textData = '';

      this.error.set(null);

      this.resetResult();
    }
  }

  /* ─────────────────────────────────────────────
   * Cleanup
   * ───────────────────────────────────────────── */

  private revokeUrl(): void {
    const url = this.signedPackageUrl();

    if (url) {
      URL.revokeObjectURL(url);

      this.signedPackageUrl.set(null);
    }
  }

  resetResult(): void {
    this.signSuccess.set(false);

    this.signedPackageBlob.set(null);

    this.revokeUrl();
  }
}