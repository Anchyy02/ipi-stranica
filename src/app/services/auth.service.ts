import { Injectable, PLATFORM_ID, Inject, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser, updateProfile } from '@angular/fire/auth';
import { Firestore, doc, setDoc, getDoc, getDocFromCache } from '@angular/fire/firestore';

export interface User {
  id: string;
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
  private authReadySubject = new BehaviorSubject<boolean>(false);
  public authReady: Observable<boolean> = this.authReadySubject.asObservable();

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private auth: Auth,
    private firestore: Firestore,
    private ngZone: NgZone
  ) {
    this.currentUserSubject = new BehaviorSubject<User | null>(null);
    this.currentUser = this.currentUserSubject.asObservable();

    if (isPlatformBrowser(this.platformId)) {
      this.initializeAuth();
    } else {
      this.emitUser(null);
    }
  }

  private emitUser(user: User | null) {
    this.ngZone.run(() => this.currentUserSubject.next(user));
  }

  private buildFallbackUser(firebaseUser: FirebaseUser): User {
    return {
      id: firebaseUser.uid,
      name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
      email: firebaseUser.email || '',
      loginTime: new Date().toISOString()
    };
  }

  private async initializeAuth() {
    const currentFirebaseUser = this.auth.currentUser;
    
    if (currentFirebaseUser) {
      try {
        // Show logged-in state immediately (no Firestore wait)
        this.emitUser(this.buildFallbackUser(currentFirebaseUser));

        // Then hydrate from Firestore (cache-first)
        const user = await this.loadUserProfile(currentFirebaseUser);
        console.log('Initial user hydrated from Firestore:', user);
        this.emitUser(user);
      } catch (error) {
        console.error('Error loading initial user:', error);
      }
    }

    onAuthStateChanged(this.auth, async (firebaseUser) => {
      if (!this.authReadySubject.value) {
        this.ngZone.run(() => this.authReadySubject.next(true));
      }
      console.log('Firebase Auth State Changed:', firebaseUser ? firebaseUser.email : 'No user');
      if (firebaseUser) {
        // Immediately update UI to logged-in (fast), then hydrate profile.
        this.emitUser(this.buildFallbackUser(firebaseUser));

        this.loadUserProfile(firebaseUser)
          .then((user) => {
            console.log('User profile loaded:', user);
            this.emitUser(user);
          })
          .catch((error) => {
            console.error('Error loading user profile:', error);
            // Keep fallback user rather than forcing logged-out UI.
          });
      } else {
        console.log('No user, setting currentUser to null');
        this.emitUser(null);
      }
    }, (error) => {
      console.error('Firebase auth state error:', error);
      this.emitUser(null);
      if (!this.authReadySubject.value) {
        this.ngZone.run(() => this.authReadySubject.next(true));
      }
    });
  }

  private async loadUserProfile(firebaseUser: FirebaseUser): Promise<User> {
    // Try cache first so UI becomes consistent fast after redirect.
    try {
      const cachedDoc = await getDocFromCache(doc(this.firestore, 'users', firebaseUser.uid));
      if (cachedDoc.exists()) {
        return cachedDoc.data() as User;
      }
    } catch {
      // Cache miss is normal.
    }

    const userDoc = await getDoc(doc(this.firestore, 'users', firebaseUser.uid));
    
    if (userDoc.exists()) {
      return userDoc.data() as User;
    }
    
    // Create basic user profile if doesn't exist
    const user: User = this.buildFallbackUser(firebaseUser);
    
    await setDoc(doc(this.firestore, 'users', firebaseUser.uid), user);
    return user;
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public isLoggedIn(): boolean {
    return this.currentUserValue !== null;
  }

  public async logout(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      // Do NOT clear localStorage here: tracker/statistics data is stored there and
      // must persist across logout/login.
      // Clearing sessionStorage is fine (used for ephemeral UI flags like redirects).
      sessionStorage.clear();
    }
    await signOut(this.auth);
    this.emitUser(null);
  }

  public async login(email: string, password: string): Promise<void> {
    const credential = await signInWithEmailAndPassword(this.auth, email, password);
    const user = await this.loadUserProfile(credential.user);
    
    // Update login time
    await setDoc(doc(this.firestore, 'users', user.id), {
      ...user,
      loginTime: new Date().toISOString()
    });
  }

  public async register(email: string, password: string, name: string): Promise<void> {
    const credential = await createUserWithEmailAndPassword(this.auth, email, password);
    
    // Update Firebase profile
    await updateProfile(credential.user, { displayName: name });
    
    // Create user document in Firestore
    const user: User = {
      id: credential.user.uid,
      name: name,
      email: email,
      loginTime: new Date().toISOString()
    };
    
    await setDoc(doc(this.firestore, 'users', user.id), user);
  }
}
