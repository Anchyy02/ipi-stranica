import { Component, PLATFORM_ID, Inject, DestroyRef } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { User } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header {
  currentUser$: Observable<User | null>;
  isDarkMode = false;
  private pendingJustLoggedInRedirect = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router,
    private authService: AuthService,
    public themeService: ThemeService,
    private destroyRef: DestroyRef
  ) {
    this.currentUser$ = this.authService.currentUser;
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      // Subscribe to auth service for real-time user updates
      this.authService.currentUser
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(user => {
        console.log('Header: User state changed:', user);

        if (this.pendingJustLoggedInRedirect && user) {
          this.pendingJustLoggedInRedirect = false;
          sessionStorage.removeItem('justLoggedIn');
          setTimeout(() => {
            this.router.navigate(['/view-profile']);
          }, 0);
        }
      });
      
      // Subscribe to theme changes
      this.themeService.darkMode$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(isDark => {
          this.isDarkMode = isDark;
        });
      
      // Check if user just logged in and redirect to profile
      const justLoggedIn = sessionStorage.getItem('justLoggedIn');
      this.pendingJustLoggedInRedirect = (justLoggedIn === 'true');
    }
  }

  toggleTheme() {
    this.themeService.toggleDarkMode();
  }

  async logout() {
    if (isPlatformBrowser(this.platformId)) {
      await this.authService.logout();
      window.location.href = '/projekat-prvi/login.html';
    }
  }
}
