import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Interview } from '../models/interview.model';

@Injectable({ providedIn: 'root' })
export class InterviewService {
  private base = `${environment.apiUrl}/interviews`;

  constructor(private http: HttpClient) {}

  getAll(userId: string, orgId: string): Observable<Interview[]> {
    return this.http
      .get<{ data: Interview[] }>(`${this.base}?userId=${userId}&organizationId=${orgId}`)
      .pipe(map(r => r.data ?? []));
  }

  getById(id: string): Observable<Interview> {
    return this.http
      .get<{ data: Interview }>(`${this.base}?id=${id}`)
      .pipe(map(r => r.data));
  }

  create(payload: any): Observable<any> {
    return this.http.post(this.base, payload);
  }

  update(id: string, payload: any): Observable<any> {
    return this.http.patch(this.base, { id, ...payload });
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.base}?id=${id}`);
  }
}
