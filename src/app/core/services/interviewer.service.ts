import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Interviewer } from '../models/interviewer.model';

@Injectable({ providedIn: 'root' })
export class InterviewerService {
  private base = `${environment.apiUrl}/interviewers`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Interviewer[]> {
    return this.http
      .get<{ data: Interviewer[] }>(this.base)
      .pipe(map(r => r.data ?? []));
  }

  getById(id: number): Observable<Interviewer> {
    return this.http
      .get<{ data: Interviewer }>(`${this.base}?id=${id}`)
      .pipe(map(r => r.data));
  }
}
