import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { AuthService, PendingMember } from '../../services/auth.service';

@Component({
  selector: 'app-admin-team',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './admin-team.component.html'
})
export class AdminTeamComponent implements OnInit {
  private auth = inject(AuthService);

  pendingMembers = signal<PendingMember[]>([]);
  loading = signal(false);
  message = signal<{text: string, type: 'success'|'error'} | null>(null);

  ngOnInit(): void {
    this.fetchPendingMembers();
  }

  fetchPendingMembers(): void {
    this.loading.set(true);
    this.auth.getPendingMembers().subscribe({
      next: (members) => {
        this.pendingMembers.set(members);
        this.loading.set(false);
      },
      error: () => {
        this.message.set({ text: 'Failed to load pending members.', type: 'error' });
        this.loading.set(false);
      }
    });
  }

  manageMember(userId: number, action: 'approve' | 'deny'): void {
    if (action === 'deny' && !confirm('Are you sure you want to completely delete this user request?')) {
      return;
    }

    this.auth.manageMember(userId, action).subscribe({
      next: (res: any) => {
        this.message.set({ text: res.detail || `User successfully ${action}d.`, type: 'success' });
        this.fetchPendingMembers(); // Refresh the list
      },
      error: (err) => {
        const msg = err.error?.detail || `Failed to ${action} user.`;
        this.message.set({ text: msg, type: 'error' });
      }
    });
  }
}