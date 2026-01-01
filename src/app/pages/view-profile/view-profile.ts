import { Component, PLATFORM_ID, Inject, DestroyRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { combineLatest } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-view-profile',
  imports: [CommonModule],
  templateUrl: './view-profile.html',
  styleUrl: './view-profile.css'
})
export class ViewProfile {
  currentUser$: Observable<User | null>;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router,
    private authService: AuthService,
    private destroyRef: DestroyRef
  ) {
    this.currentUser$ = this.authService.currentUser;
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      combineLatest([this.authService.authReady, this.authService.currentUser])
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(([ready, user]) => {
          if (user) {
            return;
          }
          if (ready) {
            console.log('No user found (auth ready), redirecting to login');
            window.location.href = '/projekat-prvi/login.html';
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
