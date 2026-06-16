import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Question } from '../models/interview.model';
import { Analytics } from '../models/response.model';

@Injectable({ providedIn: 'root' })
export class AiService {
  private base = `${environment.apiUrl}/ai`;

  constructor(private http: HttpClient) {}

  generateQuestions(payload: {
    role: string;
    company: string;
    interview_name: string;
    job_description: string;
    question_count: number;
  }): Observable<Question[]> {
    return this.http
      .post<{ response: string }>(`${this.base}/generate-questions`, payload)
      .pipe(map(r => JSON.parse(r.response).questions as Question[]));
  }

  generateFromPdf(file: File, questionCount: number, topic?: string): Observable<Question[]> {
    const form = new FormData();
    form.append('file', file);
    const params: Record<string, string> = { question_count: String(questionCount) };
    if (topic) params['topic'] = topic;
    return this.http
      .post<{ questions: Question[] }>(`${environment.apiUrl}/aptitude/upload-pdf`, form, { params })
      .pipe(map(r => r.questions));
  }

  analyzeResponse(payload: {
    transcript: string;
    questions: Question[];
  }): Observable<Analytics> {
    return this.http
      .post<{ analytics: Analytics }>(`${this.base}/analyze`, payload)
      .pipe(map(r => r.analytics));
  }

  generateInsights(payload: {
    transcripts: string[];
    interview_name: string;
  }): Observable<string[]> {
    return this.http
      .post<{ insights: string[] }>(`${this.base}/generate-insights`, payload)
      .pipe(map(r => r.insights));
  }
}
