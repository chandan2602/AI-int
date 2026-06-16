import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService, LoginRequest } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  username = '';
  password = '';
  loading = false;
  error = '';
  successMessage = '';

  constructor(private auth: AuthService) {}

  submit(): void {
    if (!this.username.trim() || !this.password.trim()) {
      this.error = 'Username and password are required.';
      return;
    }

    this.loading = true;
    this.error = '';
    this.successMessage = '';

    const payload: LoginRequest = {
      username: this.username.trim(),
      password: this.password,
    };

    this.auth.login(payload).subscribe({
      next: response => {
        this.loading = false;
        this.successMessage = 'Login successful. Redirecting to your interview...';
        window.location.href = response.interview_url;
      },
      error: err => {
        this.loading = false;
        this.error = err?.error?.detail || 'Invalid username or password.';
      },
    });
  }
}
