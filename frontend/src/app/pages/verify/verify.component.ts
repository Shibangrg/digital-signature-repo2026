import { CommonModule } from '@angular/common';
import {
    Component,
    ElementRef,
    ViewChild,
    inject,
    signal
} from '@angular/core';

import { finalize } from 'rxjs/operators';

import { NavbarComponent } from '../../components/navbar/navbar.component';

import {
    SignatureApiService,
    VerifyResult
} from '../../services/signature-api.service';

/* ─────────────────────────────────────────────
   Verification Result Interface
───────────────────────────────────────────── */
export interface SignatureVerification {
  documentName: string;
  signatureId: string;
  status: string;
  verifiedAt: string;
  issuer: string;
  isValid: boolean;
}

@Component({
  selector: 'app-verify',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './verify.component.html',
  styleUrls: ['./verify.component.css']
})
export class VerifyComponent {

  @ViewChild('verifyFileInput')
  verifyFileInputRef?: ElementRef<HTMLInputElement>;

  private readonly api = inject(SignatureApiService);

  /* ─────────────────────────────────────────────
     State
  ───────────────────────────────────────────── */
  selectedFile: File | null = null;

  signedFile: File | null = null;

  parsedPackage = signal<any>(null);

  dragOver = signal(false);

  verifyingInProgress = false;

  verificationResults: SignatureVerification[] = [];

  verifyLoading = signal(false);

  verifySuccess = signal(false);

  verifyError = signal<string | null>(null);

  verifyDetails = signal<VerifyResult | null>(null);

  /* ─────────────────────────────────────────────
     Init
  ───────────────────────────────────────────── */
  ngOnInit(): void {}

  /* ─────────────────────────────────────────────
     Drag & Drop
  ───────────────────────────────────────────── */
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

  /* ─────────────────────────────────────────────
     File Selection
  ───────────────────────────────────────────── */
  onFileSelected(event: any): void {
    const file = event.target.files?.[0];

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

      this.verifyError.set(
        'Signed package must be a .json file.'
      );

      this.clearFile();

      return;
    }

    this.selectedFile = file;

    this.signedFile = file;

    this.verifyError.set(null);

    this.verifySuccess.set(false);

    this.verifyDetails.set(null);

    /* Read Package */
    const reader = new FileReader();

    reader.onload = (e) => {

      try {

        const json = JSON.parse(
          e.target?.result as string
        );

        this.parsedPackage.set(json);

      } catch {

        this.parsedPackage.set(null);

      }

    };

    reader.readAsText(file);
  }

  /* ─────────────────────────────────────────────
     Verify Signature
  ───────────────────────────────────────────── */
  verifySignature(): void {

    this.verifyDocument();

  }

  verifyDocument(): void {

    this.verifySuccess.set(false);

    this.verifyError.set(null);

    this.verifyDetails.set(null);

    if (!this.signedFile) {

      this.verifyError.set(
        'Please upload signed_document.json.'
      );

      return;
    }

    this.verifyingInProgress = true;

    this.verifyLoading.set(true);

    this.api
      .verifyDocument(this.signedFile)
      .pipe(
        finalize(() => {

          this.verifyLoading.set(false);

          this.verifyingInProgress = false;

        })
      )
      .subscribe({

        next: (res: VerifyResult) => {

          this.verifyDetails.set(res);

          if (res.status === 'valid') {

            this.verifySuccess.set(true);

            this.verifyError.set(null);

            const pkg = this.parsedPackage() || {};

            /* Merge Old Verification Results */
            this.verificationResults = [
              {
                documentName:
                  pkg.original_filename ||
                  this.selectedFile?.name ||
                  'Unknown Document',

                signatureId:
                  pkg.signature_id ||
                  'sig_' +
                    Math.random()
                      .toString(36)
                      .substr(2, 9),

                status: 'Valid',

                verifiedAt:
                  new Date().toISOString(),

                issuer:
                  pkg.signed_by ||
                  'System Administrator',

                isValid: true
              }
            ];

            /* Merge Detailed Result */
            this.verifyDetails.update(current => ({
              ...pkg,
              ...current,

              timestamp:
                current?.timestamp ||
                pkg.timestamp,

              signed_by:
                current?.signed_by ||
                pkg.signed_by,

              algorithm:
                current?.algorithm_used ||
                current?.algorithm ||
                pkg.algorithm,

              hash:
                current?.hash ||
                pkg.hash,

              certificate_owner:
                current?.certificate_owner ||
                pkg.certificate_owner,

              original_filename:
                current?.original_filename ||
                pkg.original_filename ||
                pkg.document_name
            }));

          } else if (
            res.status === 'tampered'
          ) {

            this.verifySuccess.set(false);

            this.verifyError.set(
              'Document integrity compromised.'
            );

          } else {

            this.verifySuccess.set(false);

            this.verifyError.set(
              res.message ||
              'Invalid signature.'
            );

          }

        },

        error: (e) => {

          let msg =
            'Verification request failed.';

          if (e?.error) {

            try {

              const text =
                typeof e.error === 'string'
                  ? e.error
                  : '';

              const parsed = text
                ? JSON.parse(text)
                : e.error;

              msg = parsed.message || msg;

            } catch {

              if (e.error.message) {
                msg = e.error.message;
              }

            }

          }

          this.verifySuccess.set(false);

          this.verifyError.set(msg);

        }

      });
  }

  /* ─────────────────────────────────────────────
     Download Original File
  ───────────────────────────────────────────── */
  downloadOriginalFile(): void {

    const pkg = this.parsedPackage();

    if (!pkg) {

      this.verifyError.set(
        'Failed to read the package data.'
      );

      return;
    }

    const base64Data =
      pkg.document ||
      pkg.signed_data ||
      pkg.original_data;

    if (!base64Data) {

      this.verifyError.set(
        'No original file data found.'
      );

      return;
    }

    try {

      const byteString = atob(base64Data);

      const ab = new ArrayBuffer(
        byteString.length
      );

      const ia = new Uint8Array(ab);

      for (
        let i = 0;
        i < byteString.length;
        i++
      ) {
        ia[i] = byteString.charCodeAt(i);
      }

      const blob = new Blob([ab]);

      const url =
        URL.createObjectURL(blob);

      const a =
        document.createElement('a');

      a.href = url;

      a.download =
        pkg.original_filename ||
        pkg.document_name ||
        'original_document.bin';

      a.click();

      URL.revokeObjectURL(url);

    } catch {

      this.verifyError.set(
        'Failed to decode original file.'
      );

    }
  }

  /* ─────────────────────────────────────────────
     Clear / Reset
  ───────────────────────────────────────────── */
  clearFile(): void {

    this.selectedFile = null;

    this.signedFile = null;

    this.parsedPackage.set(null);

    const input =
      this.verifyFileInputRef
        ?.nativeElement;

    if (input) {
      input.value = '';
    }

    this.verifySuccess.set(false);

    this.verifyDetails.set(null);

    this.verifyError.set(null);

    this.verificationResults = [];
  }

  resetForm(): void {

    this.clearFile();

  }

  /* ─────────────────────────────────────────────
     Button State
  ───────────────────────────────────────────── */
  verifyButtonDisabled(): boolean {

    return (
      this.verifyLoading() ||
      !this.signedFile
    );

  }

}