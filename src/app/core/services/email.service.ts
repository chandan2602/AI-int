import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface InvitePayload {
  to_email: string;
  to_name: string;
  interview_name: string;
  interview_url: string;
  company_name?: string;
  duration?: string;
  question_count?: number;
}

export interface DriveInvitePayload {
  to_email: string;
  to_name: string;
  drive_name: string;
  rounds: {
    round: string;
    url: string;
    duration: string;
    question_count: number;
  }[];
}

@Injectable({ providedIn: 'root' })
export class EmailService {
  private base = `${environment.apiUrl}/email`;

  constructor(private http: HttpClient) {}

  sendInvite(payload: InvitePayload): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.base}/send-invite`,
      payload,
    );
  }

  sendDriveInvite(payload: DriveInvitePayload): Observable<{ success: boolean; message: string; user_id: string }> {
    return this.http.post<{ success: boolean; message: string; user_id: string }>(
      `${this.base}/send-invite`,
      {
        to_email: payload.to_email,
        to_name: payload.to_name,
        interview_name: payload.drive_name,
        // use the first round URL as the primary login entry point
        interview_url: payload.rounds[0]?.url ?? '',
        duration: payload.rounds.map(r => r.duration).join(' / '),
        question_count: payload.rounds.reduce((s, r) => s + r.question_count, 0),
      },
    );
  }
}
