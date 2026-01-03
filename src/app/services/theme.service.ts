import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';

export interface ThemeDefinition {
  id: string;
  name: string;
  vars: Record<string, string>;
}

interface ThemesJson {
  themes: ThemeDefinition[];
}

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly storageThemeKey = 'themeId';
  private readonly storagePrevThemeKey = 'themeIdBeforeDark';

  private darkMode = new BehaviorSubject<boolean>(false);
  public darkMode$ = this.darkMode.asObservable();

  private themeId = new BehaviorSubject<string>('blue');
  public themeId$ = this.themeId.asObservable();

  private themes = new BehaviorSubject<ThemeDefinition[]>([]);
  public themes$ = this.themes.asObservable();

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private http: HttpClient,
    private authService: AuthService
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeThemes();

      // Apply theme when auth state changes (requested: switch during login)
      this.authService.currentUser.subscribe(() => {
        this.applyTheme(this.getStoredThemeId() ?? this.getDefaultThemeId());
      });
    }
  }

  private async initializeThemes() {
    try {
      const json = await firstValueFrom(this.http.get<ThemesJson>('/themes.json'));
      const list = Array.isArray(json?.themes) ? json.themes : [];
      this.themes.next(list);
    } catch (error) {
      console.warn('ThemeService: Failed to load /themes.json, using CSS defaults.', error);
      this.themes.next([]);
    }

    // Apply stored theme (or default) immediately.
    this.applyTheme(this.getStoredThemeId() ?? this.getDefaultThemeId());
  }

  private getDefaultThemeId(): string {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'blue';
  }

  private getStoredThemeId(): string | null {
    try {
      return localStorage.getItem(this.storageThemeKey);
    } catch {
      return null;
    }
  }

  private setStoredThemeId(themeId: string) {
    try {
      localStorage.setItem(this.storageThemeKey, themeId);
    } catch {
      // ignore
    }
  }

  private setStoredPrevThemeId(themeId: string) {
    try {
      localStorage.setItem(this.storagePrevThemeKey, themeId);
    } catch {
      // ignore
    }
  }

  private getStoredPrevThemeId(): string | null {
    try {
      return localStorage.getItem(this.storagePrevThemeKey);
    } catch {
      return null;
    }
  }

  private applyCssVars(vars: Record<string, string>) {
    const root = document.documentElement;
    for (const [key, value] of Object.entries(vars)) {
      if (!key.startsWith('--')) continue;
      root.style.setProperty(key, value);
    }
  }

  private applyTheme(themeId: string) {
    const root = document.documentElement;
    const current = this.themeId.value;

    // If switching away from dark via explicit theme selection, remember it.
    if (current === 'dark' && themeId !== 'dark') {
      this.setStoredPrevThemeId(themeId);
    }

    this.themeId.next(themeId);
    root.setAttribute('data-theme', themeId);

    const isDark = themeId === 'dark' || themeId === 'cyberpunk';
    this.darkMode.next(isDark);

    // Keep legacy class for existing CSS selectors (e.g., :root.dark-mode ...)
    if (themeId === 'dark') {
      root.classList.add('dark-mode');
    } else {
      root.classList.remove('dark-mode');
    }

    const match = this.themes.value.find(t => t.id === themeId);
    if (match?.vars) {
      this.applyCssVars(match.vars);
    }
  }

  async setDarkMode(isDark: boolean, save: boolean = true) {
    if (!isPlatformBrowser(this.platformId)) return;

    if (isDark) {
      const current = this.themeId.value;
      if (current && current !== 'dark') {
        this.setStoredPrevThemeId(current);
      }
      this.setTheme('dark', save);
    } else {
      const previous = this.getStoredPrevThemeId() ?? 'blue';
      this.setTheme(previous, save);
    }
  }

  setTheme(themeId: string, save: boolean = true) {
    if (!isPlatformBrowser(this.platformId)) return;
    this.applyTheme(themeId);
    if (save) {
      this.setStoredThemeId(themeId);
    }
  }

  async toggleDarkMode() {
    await this.setDarkMode(!this.darkMode.value);
  }

  isDarkMode(): boolean {
    return this.darkMode.value;
  }

  getCurrentThemeId(): string {
    return this.themeId.value;
  }
}
