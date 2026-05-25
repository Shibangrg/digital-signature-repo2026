import { CommonModule } from '@angular/common'; // Added for *ngIf
import { Component, inject } from '@angular/core'; // Added inject
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service'; // Added AuthService

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule], // Added components
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  // Inject the Auth Service
  public authService = inject(AuthService); 

  title = 'digital-signature-app';
  menuOpen = false;

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }
}