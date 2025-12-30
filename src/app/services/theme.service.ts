import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private darkMode = new BehaviorSubject<boolean>(false);
  public darkMode$ = this.darkMode.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      // Load theme from localStorage
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark') {
        this.setDarkMode(true);
      } else if (savedTheme === 'light') {
        this.setDarkMode(false);
      } else {
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.setDarkMode(prefersDark);
      }
    }
  }

  setDarkMode(isDark: boolean) {
    this.darkMode.next(isDark);
    if (isPlatformBrowser(this.platformId)) {
      if (isDark) {
        document.documentElement.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
      }
    }
  }

  toggleDarkMode() {
    this.setDarkMode(!this.darkMode.value);
  }

  isDarkMode(): boolean {
    return this.darkMode.value;
  }
}
