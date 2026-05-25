import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { SignatureApiService } from '../../services/signature-api.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  readonly auth = inject(AuthService);
  private readonly api = inject(SignatureApiService);

  profileMenuOpen = signal(false);
  certificateModalOpen = signal(false);
  myCertificate = signal<string | null>(null);
  myCertificateLoading = signal(false);

  constructor() {
    this.loadMyCertificate();
  }

  toggleProfileMenu(): void {
    this.profileMenuOpen.set(!this.profileMenuOpen());
  }

  closeProfileMenu(): void {
    this.profileMenuOpen.set(false);
  }

  openCertificateModal(): void {
    this.certificateModalOpen.set(true);
    this.closeProfileMenu();
  }

  closeCertificateModal(): void {
    this.certificateModalOpen.set(false);
  }

  loadMyCertificate(): void {
    this.myCertificateLoading.set(true);
    this.api
      .myCertificate()
      .pipe(finalize(() => this.myCertificateLoading.set(false)))
      .subscribe({
        next: (res) => this.myCertificate.set(res.certificate ?? null),
        error: () => this.myCertificate.set(null),
      });
  }

  downloadPem(filename: string, content: string): void {
    if (!content?.trim()) return;
    const blob = new Blob([content], { type: 'application/x-pem-file' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  copyCertificate(content: string): void {
    const text = (content || '').trim();
    if (!text || !navigator.clipboard) return;
    void navigator.clipboard.writeText(text);
  }
}
