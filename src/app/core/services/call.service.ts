import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CallService {
  private base = `${environment.apiUrl}/calls`;

  constructor(private http: HttpClient) {}

  registerCall(payload: {
    interviewer_id: number;
    dynamic_data: Record<string, string>;
  }): Observable<any> {
    return this.http
      .post<{ registerCallResponse: any }>(`${this.base}/register`, payload)
      .pipe(map(r => r.registerCallResponse));
  }
}
