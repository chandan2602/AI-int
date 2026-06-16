import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { InterviewResponse } from '../models/response.model';

@Injectable({ providedIn: 'root' })
export class ResponseService {
  private base = `${environment.apiUrl}/responses`;

  constructor(private http: HttpClient) {}

  getAll(interviewId: string): Observable<InterviewResponse[]> {
    return this.http
      .get<{ data: InterviewResponse[] }>(`${this.base}?interviewId=${interviewId}`)
      .pipe(map(r => r.data ?? []));
  }

  getByCallId(callId: string): Observable<InterviewResponse> {
    return this.http
      .get<{ data: InterviewResponse }>(`${this.base}?callId=${callId}`)
      .pipe(map(r => r.data));
  }

  create(payload: any): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(this.base, payload);
  }

  update(callId: string, payload: any): Observable<any> {
    return this.http.patch(`${this.base}?callId=${callId}`, payload);
  }

  delete(callId: string): Observable<any> {
    return this.http.delete(`${this.base}?callId=${callId}`);
  }
}
