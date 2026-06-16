import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: 'bearer';
  candidate_name: string;
  candidate_email: string;
  interview_url: string;
  interview_name: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private base = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {}

  login(body: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.base}/login`, body)
      .pipe(
        tap(res => {
          sessionStorage.setItem('authToken', res.access_token);
          sessionStorage.setItem('candidateName', res.candidate_name);
          sessionStorage.setItem('candidateEmail', res.candidate_email);
          sessionStorage.setItem('interviewUrl', res.interview_url);
          sessionStorage.setItem('interviewName', res.interview_name);
        }),
      );
  }

  getToken(): string | null {
    return sessionStorage.getItem('authToken');
  }

  getInterviewUrl(): string | null {
    return sessionStorage.getItem('interviewUrl');
  }

  logout(): void {
    sessionStorage.clear();
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
