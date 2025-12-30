import { Component, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-view-profile',
  imports: [CommonModule],
  templateUrl: './view-profile.html',
  styleUrl: './view-profile.css'
})
export class ViewProfile {
  currentUser: User | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      // Subscribe to auth service
      this.authService.currentUser.subscribe(user => {
        this.currentUser = user;
        
        if (!user) {
          console.log('No user found, redirecting to login');
          window.location.href = '/projekat-prvi/login.html';
        } else {
          console.log('User profile loaded:', user);
        }
      });
      
      // Clear the "just logged in" flag if it exists
      sessionStorage.removeItem('justLoggedIn');
    }
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      this.authService.logout();
      window.location.href = '/projekat-prvi/login.html';
    }
  }
}
