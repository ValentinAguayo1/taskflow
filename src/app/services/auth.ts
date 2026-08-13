import { Injectable, signal } from '@angular/core';

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User
} from 'firebase/auth';

import { auth } from '../core/firebase.config';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly userSignal = signal<User | null>(auth.currentUser);
  private authReady = false;

  readonly user = this.userSignal.asReadonly();

  private readonly readyPromise = new Promise<void>((resolve) => {
    onAuthStateChanged(auth, (user) => {
      this.userSignal.set(user);
      if (!this.authReady) {
        this.authReady = true;
        resolve();
      }
    });
  });

  get currentUser(): User | null {
    return this.userSignal();
  }

  async waitForUser(): Promise<User | null> {
    await this.readyPromise;
    return this.userSignal();
  }

  login(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  register(email: string, password: string) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  logout() {
    return signOut(auth);
  }
}
