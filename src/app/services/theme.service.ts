import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { Firestore, doc, setDoc, getDoc } from '@angular/fire/firestore';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private darkMode = new BehaviorSubject<boolean>(false);
  public darkMode$ = this.darkMode.asObservable();

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private firestore: Firestore,
    private authService: AuthService
  ) {
    if (isPlatformBrowser(this.platformId)) {
      // Listen to auth state
      this.authService.currentUser.subscribe(user => {
        if (user) {
          this.loadUserTheme(user.id);
        } else {
          // Use system preference when not logged in
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          this.setDarkMode(prefersDark, false);
        }
      });
    }
  }

  private async loadUserTheme(userId: string) {
    try {
      const themeDoc = await getDoc(doc(this.firestore, 'userPreferences', userId));
      if (themeDoc.exists()) {
        const data = themeDoc.data();
        this.setDarkMode(data['darkMode'] || false, false);
      } else {
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.setDarkMode(prefersDark, true);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  }

  async setDarkMode(isDark: boolean, save: boolean = true) {
    this.darkMode.next(isDark);
    if (isPlatformBrowser(this.platformId)) {
      if (isDark) {
        document.documentElement.classList.add('dark-mode');
      } else {
        document.documentElement.classList.remove('dark-mode');
      }

      // Save to Firestore if user is logged in
      if (save) {
        const user = this.authService.currentUserValue;
        if (user) {
          try {
            await setDoc(doc(this.firestore, 'userPreferences', user.id), {
              darkMode: isDark
            }, { merge: true });
          } catch (error) {
            console.error('Error saving theme:', error);
          }
        }
      }
    }
  }

  async toggleDarkMode() {
    await this.setDarkMode(!this.darkMode.value);
  }

  isDarkMode(): boolean {
    return this.darkMode.value;
  }
}
