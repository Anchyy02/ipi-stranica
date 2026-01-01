import { Component, PLATFORM_ID, Inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  email = '';
  password = '';
  errorMessage = '';
  loading = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  async onSubmit() {
    if (!this.email || !this.password) {
      this.showError('Sva polja su obavezna!');
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      await this.authService.login(this.email, this.password);
      
      console.log('User logged in successfully');
      
      // Navigate to home
      this.router.navigate(['/']);
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Handle specific Firebase errors
      if (error.code === 'auth/user-not-found') {
        this.showError('Korisnik sa ovim emailom ne postoji!');
      } else if (error.code === 'auth/wrong-password') {
        this.showError('Pogrešna lozinka!');
      } else if (error.code === 'auth/invalid-email') {
        this.showError('Nevažeća email adresa!');
      } else if (error.code === 'auth/too-many-requests') {
        this.showError('Previše neuspješnih pokušaja. Pokušajte kasnije.');
      } else {
        this.showError('Greška prilikom prijavljivanja. Pokušajte ponovo.');
      }
    } finally {
      this.loading = false;
    }
  }

  private showError(message: string) {
    this.errorMessage = message;
    setTimeout(() => {
      this.errorMessage = '';
    }, 5000);
  }
}
