import { Component, PLATFORM_ID, Inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  onSubmit() {
    if (!isPlatformBrowser(this.platformId)) return;

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

    const users = this.getUsers();
    const userExists = users.find((u: any) => u.email === this.email.toLowerCase());

    if (userExists) {
      this.showError('Korisnik sa ovim emailom već postoji!');
      return;
    }

    const newUser = {
      id: Date.now(),
      name: this.name,
      email: this.email.toLowerCase(),
      password: this.password,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));

    this.showSuccess('Uspješno ste se registrovali! Preusmjeravam na login...');

    setTimeout(() => {
      this.router.navigate(['/login']);
    }, 2000);
  }

  private getUsers(): any[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    const users = localStorage.getItem('users');
    return users ? JSON.parse(users) : [];
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
