import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

export interface User {
  id: number;
  name: string;
  email: string;
  loginTime: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    const storedUser = this.getUserFromStorage();
    this.currentUserSubject = new BehaviorSubject<User | null>(storedUser);
    this.currentUser = this.currentUserSubject.asObservable();

    // Listen for storage changes from projekat-prvi
    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener('storage', (e) => {
        if (e.key === 'currentUser') {
          const user = e.newValue ? JSON.parse(e.newValue) : null;
          this.currentUserSubject.next(user);
          console.log('User updated from storage event:', user);
        }
      });

      // Also poll for changes (as backup)
      setInterval(() => {
        const user = this.getUserFromStorage();
        if (JSON.stringify(user) !== JSON.stringify(this.currentUserSubject.value)) {
          this.currentUserSubject.next(user);
          console.log('User updated from polling:', user);
        }
      }, 1000);
    }
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  private getUserFromStorage(): User | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    try {
      const userStr = localStorage.getItem('currentUser');
      if (userStr) {
        return JSON.parse(userStr);
      }
    } catch (e) {
      console.error('Error parsing user from localStorage:', e);
    }
    return null;
  }

  public isLoggedIn(): boolean {
    return this.currentUserValue !== null;
  }

  public logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('currentUser');
      sessionStorage.removeItem('justLoggedIn');
      this.currentUserSubject.next(null);
    }
  }

  public login(user: User): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('currentUser', JSON.stringify(user));
      this.currentUserSubject.next(user);
    }
  }
}
