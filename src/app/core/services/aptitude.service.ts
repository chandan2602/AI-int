import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DriveRoundDetail {
  interview_id: string;
  name: string;
  description?: string;
  question_count: number;
  time_duration: string;
  is_active: boolean;
  questions: any[];
}

export interface DriveResponse {
  drive_name: string;
  total_rounds: number;
  rounds: {
    aptitude?:    DriveRoundDetail;
    coding?:      DriveRoundDetail;
    ai_interview?: DriveRoundDetail;
  };
}

export interface CodingQuestion {
  id: string;
  question: string;
  difficulty: string;
  expected_language: string;
  test_cases: { input: string; output: string }[];
  explanation: string;
}

export interface McqQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

export interface UploadPdfResponse {
  success: boolean;
  interview_id: string;
  name: string;
  question_count: number;
  questions: McqQuestion[];
}

export interface AddQuestionResponse {
  success: boolean;
  question_added: CodingQuestion;
  total_questions: number;
}

export interface CreateCodingRoundResponse {
  success: boolean;
  interview_id: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class AptitudeService {
  private base = `${environment.apiUrl}/aptitude`;

  constructor(private http: HttpClient) {}

  getDrive(driveId: string, userId = 'user-1'): Observable<DriveResponse> {
    const safeId = (driveId || '').trim();
    return this.http.get<DriveResponse>(
      `${this.base}/drive?drive_id=${encodeURIComponent(safeId)}&user_id=${userId}`,
    );
  }

  uploadPdf(
    file: File,
    interviewName: string,
    organizationId = 'org-1',
    userId = 'user-1',
    timeDuration?: string,
    driveId?: string,
  ): Observable<UploadPdfResponse> {
    const form = new FormData();
    form.append('file', file);
    form.append('interview_name', interviewName);
    form.append('organization_id', organizationId);
    form.append('user_id', userId);
    if (timeDuration) form.append('time_duration', timeDuration);
    if (driveId)      form.append('drive_id', driveId);
    return this.http.post<UploadPdfResponse>(`${this.base}/upload-pdf`, form);
  }

  createCodingRound(
    interviewName: string,
    organizationId = 'org-1',
    userId = 'user-1',
    timeDuration?: string,
    driveId?: string,
  ): Observable<CreateCodingRoundResponse> {
    return this.http.post<CreateCodingRoundResponse>(`${this.base}/create-coding-round`, {
      interview_name: interviewName,
      organization_id: organizationId,
      user_id: userId,
      time_duration: timeDuration,
      drive_id: driveId,
    });
  }

  addCodingQuestion(
    interviewId: string,
    q: Omit<CodingQuestion, 'id'>,
  ): Observable<AddQuestionResponse> {
    return this.http.post<AddQuestionResponse>(`${this.base}/add-coding-question`, {
      interview_id: interviewId,
      ...q,
    });
  }

  addAptitudeQuestion(
    interviewId: string,
    q: Omit<McqQuestion, 'id'>,
  ): Observable<{ success: boolean; question_added: McqQuestion; total_questions: number }> {
    return this.http.post<{ success: boolean; question_added: McqQuestion; total_questions: number }>(
      `${this.base}/add-question`,
      { interview_id: interviewId, ...q },
    );
  }
}
