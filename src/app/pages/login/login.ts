import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {

  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';

  isRegistering = false;
  loading = false;
  errorMessage = '';

  async submit() {
    this.errorMessage = '';
    this.loading = true;

    try {
      if (this.isRegistering) {
        await this.authService.register(
          this.email,
          this.password
        );
      } else {
        await this.authService.login(
          this.email,
          this.password
        );
      }

      await this.router.navigate(['/dashboard']);

    } catch (error: any) {
      this.errorMessage = this.getErrorMessage(error.code);
    } finally {
      this.loading = false;
    }
  }

  toggleMode() {
    this.isRegistering = !this.isRegistering;
    this.errorMessage = '';
  }

  private getErrorMessage(code: string): string {
    switch (code) {
      case 'auth/invalid-email':
        return 'El correo electrónico no es válido.';

      case 'auth/invalid-credential':
        return 'Correo o contraseña incorrectos.';

      case 'auth/email-already-in-use':
        return 'Este correo ya está registrado.';

      case 'auth/weak-password':
        return 'La contraseña debe tener al menos 6 caracteres.';

      default:
        return 'Ocurrió un error. Inténtalo nuevamente.';
    }
  }
}