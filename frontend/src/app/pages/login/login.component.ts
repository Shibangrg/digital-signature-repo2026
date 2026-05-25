import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

type AuthMode = 'login' | 'join' | 'create';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  mode = signal<AuthMode>('login');
  
  username = signal('');
  password = signal('');
  orgName = signal('');
  joinCode = signal('');

  loading = signal(false);
  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);
  createdJoinCode = signal<string | null>(null);

  setMode(newMode: AuthMode): void {
    this.mode.set(newMode);
    this.errorMsg.set(null);
    this.successMsg.set(null);
    this.createdJoinCode.set(null);
  }

  onSubmit(): void {
    if (!this.username().trim() || !this.password().trim()) {
      this.errorMsg.set('Username and password are required.');
      return;
    }

    this.loading.set(true);
    this.errorMsg.set(null);
    this.successMsg.set(null);

    const req$ = this.getRequestObservable();

    req$.subscribe({
      next: (res: any) => {
        this.loading.set(false);
        
        // If they created an org, show the join code
        if (this.mode() === 'create' && res.join_code) {
          this.successMsg.set(`Workspace Created successfully! Your Admin Join Code is:`);
          this.createdJoinCode.set(res.join_code);
        } 
        // If they joined and are pending
        else if (this.mode() === 'join' && res.is_org_approved === false) {
          this.successMsg.set('Registration successful. Your account is pending admin approval.');
          setTimeout(() => this.router.navigate(['/sign']), 3000);
        } 
        // Standard login or auto-approved admin
        else {
          this.router.navigate(['/sign']);
        }
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err.error?.detail || err.error?.message || 'Authentication failed.';
        this.errorMsg.set(msg);
      },
    });
  }

  private getRequestObservable() {
    const payload: any = {
      username: this.username(),
      password: this.password(),
    };

    if (this.mode() === 'login') {
      return this.auth.login(payload);
    } else if (this.mode() === 'create') {
      payload.org_name = this.orgName();
      return this.auth.registerOrg(payload);
    } else {
      if (this.joinCode().trim()) {
        payload.join_code = this.joinCode().trim();
      }
      return this.auth.register(payload);
    }
  }
}