import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AiService } from '../../core/services/ai.service';
import { InterviewService } from '../../core/services/interview.service';
import { InterviewerService } from '../../core/services/interviewer.service';
import { AptitudeService, McqQuestion, CodingQuestion } from '../../core/services/aptitude.service';
import { Interviewer } from '../../core/models/interviewer.model';
import { Question } from '../../core/models/interview.model';

export type PageStep = 'info' | 'aptitude' | 'coding' | 'ai';

@Component({
  selector: 'app-interview-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './interview-create.component.html',
  styleUrl: './interview-create.component.css',
})
export class InterviewCreateComponent {
  step: PageStep = 'info';

  // ── Step 0 – Drive Info ────────────────────────────────────────────────────
  info = {
    interviewName: '',
    jobRole: '',
    jobDescription: '',
    objective: '',
  };

  // ── Round durations ────────────────────────────────────────────────────────
  aptDuration    = '30 minutes';
  codingDuration = '45 minutes';
  aiDuration     = '15 minutes';

  // Shared drive ID — generated once when user proceeds past info step
  private driveId = '';

  // ── Round 1 – Aptitude ─────────────────────────────────────────────────────
  aptFile: File | null = null;
  aptDragOver = false;
  aptLoading = false;
  aptDone = false;
  aptInterviewId = '';
  aptQuestions: McqQuestion[] = [];
  aptError = '';

  // ── Round 2 – Coding ───────────────────────────────────────────────────────
  codingInterviewId = '';
  codingCreating = false;
  codingDone = false;
  codingQuestions: CodingQuestion[] = [];
  codingError = '';
  showAddForm = false;
  addingQ = false;
  addQError = '';
  newCodingQ: Omit<CodingQuestion, 'id'> = this.blankCodingQ();
  newTestCase = { input: '', output: '' };

  // ── Round 3 – AI Interview ─────────────────────────────────────────────────
  aiGenerating = false;
  aiSaving = false;
  aiQuestions: Question[] = [];
  aiStep: 'form' | 'review' = 'form';
  aiError = '';
  aiQuestionCount = 5;

  interviewers: Interviewer[] = [];
  selectedInterviewer: number | null = null;

  private userId = 'user-1';
  private orgId = 'org-1';

  constructor(
    private aiService: AiService,
    private interviewService: InterviewService,
    private interviewerService: InterviewerService,
    private aptitudeService: AptitudeService,
    private router: Router,
  ) {
    this.interviewerService.getAll().subscribe(data => {
      this.interviewers = data;
      if (data.length) this.selectedInterviewer = data[0].id;
    });
  }

  // ── Info step validation ───────────────────────────────────────────────────
  infoValid(): boolean {
    return !!this.info.interviewName.trim() && !!this.info.jobRole.trim();
  }

  proceedToRounds(): void {
    if (this.infoValid()) {
      if (!this.driveId) this.driveId = crypto.randomUUID();
      this.step = 'aptitude';
    }
  }

  // ── Aptitude ───────────────────────────────────────────────────────────────
  onAptFileDrop(e: DragEvent): void {
    e.preventDefault(); this.aptDragOver = false;
    const f = e.dataTransfer?.files[0];
    if (f?.type === 'application/pdf') this.aptFile = f;
  }

  onAptFileSelect(e: Event): void {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) this.aptFile = f;
  }

  uploadAptitudePdf(): void {
    if (!this.aptFile) return;
    this.aptLoading = true;
    this.aptError = '';
    this.aptitudeService.uploadPdf(this.aptFile, this.info.interviewName, this.orgId, this.userId, this.aptDuration, this.driveId).subscribe({
      next: res => {
        this.aptLoading = false;
        this.aptDone = true;
        this.aptInterviewId = res.interview_id;
        this.aptQuestions = res.questions;
      },
      error: err => {
        this.aptLoading = false;
        this.aptError = err?.error?.detail || 'Failed to generate questions from PDF.';
      },
    });
  }

  // ── Coding ─────────────────────────────────────────────────────────────────
  createCodingRound(): void {
    this.codingCreating = true;
    this.codingError = '';
    this.aptitudeService.createCodingRound(this.info.interviewName, this.orgId, this.userId, this.codingDuration, this.driveId).subscribe({
      next: res => {
        this.codingCreating = false;
        this.codingDone = true;
        this.codingInterviewId = res.interview_id;
        this.showAddForm = true;
      },
      error: err => {
        this.codingCreating = false;
        const detail: string = err?.error?.detail || '';
        // 409 — round already exists; extract the interview_id and resume
        const match = detail.match(/interview_id:\s*([a-f0-9-]{36})/i);
        if (err.status === 409 && match) {
          this.codingDone = true;
          this.codingInterviewId = match[1];
          this.codingError = '';
          this.showAddForm = true;
        } else {
          this.codingError = detail || 'Failed to create coding round.';
        }
      },
    });
  }

  addTestCase(): void {
    if (!this.newTestCase.input.trim()) return;
    this.newCodingQ.test_cases.push({ ...this.newTestCase });
    this.newTestCase = { input: '', output: '' };
  }

  removeTestCase(i: number): void {
    this.newCodingQ.test_cases.splice(i, 1);
  }

  addCodingQuestion(): void {
    if (!this.newCodingQ.question.trim()) return;
    this.addingQ = true;
    this.addQError = '';
    this.aptitudeService.addCodingQuestion(this.codingInterviewId, this.newCodingQ).subscribe({
      next: res => {
        this.addingQ = false;
        this.codingQuestions.push(res.question_added);
        this.newCodingQ = this.blankCodingQ();
        this.newTestCase = { input: '', output: '' };
        this.showAddForm = false;
      },
      error: err => {
        this.addingQ = false;
        this.addQError = err?.error?.detail || 'Failed to add question.';
      },
    });
  }

  private blankCodingQ(): Omit<CodingQuestion, 'id'> {
    return { question: '', difficulty: 'medium', expected_language: '', test_cases: [], explanation: '' };
  }

  // ── AI Interview ───────────────────────────────────────────────────────────
  generateAiQuestions(): void {
    this.aiGenerating = true;
    this.aiError = '';
    this.aiService.generateQuestions({
      role: this.info.jobRole,
      company: this.info.interviewName,
      interview_name: this.info.interviewName,
      job_description: this.info.jobDescription,
      question_count: this.aiQuestionCount,
    }).subscribe({
      next: qs => { this.aiQuestions = qs; this.aiGenerating = false; this.aiStep = 'review'; },
      error: err => {
        this.aiGenerating = false;
        this.aiError = err?.error?.detail || 'Failed to generate questions.';
      },
    });
  }

  saveAiRound(): void {
    this.aiSaving = true;
    const id = crypto.randomUUID();
    const payload = {
      id,
      name: this.info.jobRole,
      description: this.info.interviewName,
      objective: this.info.objective,
      organization_id: this.orgId,
      user_id: this.userId,
      interviewer_id: this.selectedInterviewer,
      questions: this.aiQuestions,
      question_count: this.aiQuestions.length,
      time_duration: this.aiDuration,
      is_active: true,
      drive_id: this.driveId,
      drive_name: this.info.interviewName,
      url: `${window.location.origin}/call/${id}`,
    };
    this.interviewService.create(payload).subscribe({
      next: () => { this.router.navigate(['/dashboard']); },
      error: () => { this.aiSaving = false; this.aiError = 'Failed to save interview.'; },
    });
  }
}
