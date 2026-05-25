import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { SignatureApiService, VerifyResult } from '../../services/signature-api.service';

@Component({
  selector: 'app-verify',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './verify.component.html',
  styleUrl: './verify.component.css',
})
export class VerifyComponent {
  @ViewChild('verifyFileInput') verifyFileInputRef?: ElementRef<HTMLInputElement>;

  private readonly api = inject(SignatureApiService);

  /* ── State ─────────────────────────────────────── */
  signedFile: File | null = null;
  parsedPackage = signal<any>(null); // Holds the JSON payload from the file
  dragOver = signal(false);

  verifyLoading = signal(false);
  verifySuccess = signal(false);
  verifyError = signal<string | null>(null);
  verifyDetails = signal<VerifyResult | null>(null);

  /* ── Drag & Drop Handlers ──────────────────────── */
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
      this.handleFileSelection(file);
    }
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file) {
      this.handleFileSelection(file);
    }
  }

  private handleFileSelection(file: File): void {
    if (!file.name.toLowerCase().endsWith('.json')) {
      this.verifyError.set('Signed package must be a .json file.');
      this.clearFile();
      return;
    }
    this.signedFile = file;
    this.verifyError.set(null);

    // Read and parse the JSON file to extract metadata and original document bytes
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        this.parsedPackage.set(json);
      } catch (err) {
        this.parsedPackage.set(null);
      }
    };
    reader.readAsText(file);
  }

  clearFile(): void {
    this.signedFile = null;
    this.parsedPackage.set(null);
    const input = this.verifyFileInputRef?.nativeElement;
    if (input) input.value = '';
    this.verifySuccess.set(false);
    this.verifyDetails.set(null);
    this.verifyError.set(null);
  }

  /* ── Verify action ─────────────────────────────── */
  verifyDocument(): void {
    this.verifySuccess.set(false);
    this.verifyError.set(null);
    this.verifyDetails.set(null);

    if (!this.signedFile) {
      this.verifyError.set('Please upload signed_document.json.');
      return;
    }

    this.verifyLoading.set(true);

    this.api
      .verifyDocument(this.signedFile)
      .pipe(finalize(() => this.verifyLoading.set(false)))
      .subscribe({
        next: (res: VerifyResult) => {
          if (res.status === 'valid') {
            this.verifySuccess.set(true);
            this.verifyError.set(null);

            // Supplement backend response with data parsed directly from the validated JSON file
            const pkg = this.parsedPackage() || {};
            this.verifyDetails.set({
              ...pkg,
              ...res,
              timestamp: pkg.timestamp || res.timestamp,
              signed_by: pkg.signed_by || res.signed_by,
              algorithm: pkg.algorithm || res.algorithm_used || res.algorithm,
              hash: pkg.hash || res.hash,
              certificate_owner: pkg.certificate_owner || res.certificate_owner,
              original_filename: pkg.original_filename || pkg.document_name || res.original_filename
            });
          } else if (res.status === 'tampered') {
            this.verifySuccess.set(false);
            this.verifyDetails.set(res);
            this.verifyError.set(null);
          } else {
            this.verifySuccess.set(false);
            this.verifyDetails.set(res);
            this.verifyError.set(res.message || 'Invalid signature.');
          }
        },
        error: (e) => {
          let msg = 'Verification request failed.';
          if (e?.error) {
            try {
              const text = typeof e.error === 'string' ? e.error : '';
              if (text) {
                const parsed = JSON.parse(text);
                msg = parsed.message || msg;
              } else if (e.error.message) {
                msg = e.error.message;
              }
            } catch {
              if (e.error.message) msg = e.error.message;
            }
          }
          this.verifySuccess.set(false);
          this.verifyError.set(msg);
        },
      });
  }

  /* ── Download Original File ────────────────────── */
  downloadOriginalFile(): void {
    const pkg = this.parsedPackage();
    if (!pkg) {
      this.verifyError.set('Failed to read the package data.');
      return;
    }

    // The document is stored as a base64 string inside the JSON
    const base64Data = pkg.document || pkg.signed_data || pkg.original_data;
    if (!base64Data) {
      this.verifyError.set('No original file data found in the signed package.');
      return;
    }

    try {
      // Decode base64 to raw binary string, then convert to ArrayBuffer
      const byteString = atob(base64Data);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      
      // Create a blob and trigger browser download
      const blob = new Blob([ab]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = pkg.original_filename || pkg.document_name || 'original_document.bin';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      this.verifyError.set('Failed to decode the original file.');
    }
  }

  verifyButtonDisabled(): boolean {
    return this.verifyLoading() || !this.signedFile;
  }
}