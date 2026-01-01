import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  errorMessage = '';
  successMessage = '';
  loading = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  async onSubmit() {
    if (!this.name || !this.email || !this.password) {
      this.showError('Sva polja su obavezna!');
      return;
    }

    if (this.password.length < 6) {
      this.showError('Lozinka mora imati najmanje 6 karaktera!');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.showError('Lozinke se ne poklapaju!');
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      await this.authService.register(this.email, this.password, this.name);
      
      this.showSuccess('Uspješno ste se registrovali! Preusmjeravam na home...');

      setTimeout(() => {
        this.router.navigate(['/']);
      }, 2000);
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Handle specific Firebase errors
      if (error.code === 'auth/email-already-in-use') {
        this.showError('Korisnik sa ovim emailom već postoji!');
      } else if (error.code === 'auth/invalid-email') {
        this.showError('Nevažeća email adresa!');
      } else if (error.code === 'auth/weak-password') {
        this.showError('Lozinka je previše slaba!');
      } else {
        this.showError('Greška prilikom registracije. Pokušajte ponovo.');
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

  private showSuccess(message: string) {
    this.successMessage = message;
  }
}
