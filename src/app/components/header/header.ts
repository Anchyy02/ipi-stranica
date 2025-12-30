import { Component, PLATFORM_ID, Inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AuthService, User } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header {
  currentUser: User | null = null;
  isDarkMode = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router,
    private authService: AuthService,
    public themeService: ThemeService
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      // Subscribe to auth service for real-time user updates
      this.authService.currentUser.subscribe(user => {
        this.currentUser = user;
        console.log('Header: User state changed:', user);
      });
      
      // Subscribe to theme changes
      this.themeService.darkMode$.subscribe(isDark => {
        this.isDarkMode = isDark;
      });
      
      // Check if user just logged in and redirect to profile
      const justLoggedIn = sessionStorage.getItem('justLoggedIn');
      if (justLoggedIn === 'true' && this.currentUser) {
        sessionStorage.removeItem('justLoggedIn');
        console.log('User just logged in, redirecting to profile');
        // Small delay to ensure UI is ready
        setTimeout(() => {
          this.router.navigate(['/view-profile']);
        }, 100);
      }
    }
  }

  toggleTheme() {
    this.themeService.toggleDarkMode();
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      this.authService.logout();
      // Redirect to projekat-prvi login page
      window.location.href = '/projekat-prvi/login.html';
    }
  }
}
