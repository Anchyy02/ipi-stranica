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

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private authService: AuthService
  ) {}

  onSubmit() {
    if (!isPlatformBrowser(this.platformId)) return;

    if (!this.email || !this.password) {
      this.showError('Sva polja su obavezna!');
      return;
    }

    const users = this.getUsers();
    const user = users.find((u: any) => u.email === this.email.toLowerCase() && u.password === this.password);

    if (!user) {
      this.showError('Pogrešan email ili lozinka!');
      return;
    }

    const currentUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      loginTime: new Date().toISOString()
    };

    // Use AuthService to handle login
    this.authService.login(currentUser);
    
    // Set flag for fresh login
    sessionStorage.setItem('justLoggedIn', 'true');
    
    console.log('User logged in via Angular:', currentUser);
    
    // Navigate to home, header will redirect to profile
    this.router.navigate(['/']);
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
}
