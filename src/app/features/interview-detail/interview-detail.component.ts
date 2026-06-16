import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { InterviewService } from '../../core/services/interview.service';
import { ResponseService } from '../../core/services/response.service';
import { AiService } from '../../core/services/ai.service';
import { EmailService } from '../../core/services/email.service';
import { Interview } from '../../core/models/interview.model';
import { InterviewResponse } from '../../core/models/response.model';

@Component({
  selector: 'app-interview-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './interview-detail.component.html',
  styleUrl: './interview-detail.component.css',
})
export class InterviewDetailComponent implements OnInit {
  interview?: Interview;
  responses: InterviewResponse[] = [];
  loading = true;
  generatingInsights = false;
  analyzingIds = new Set<number>();

  // Invite modal
  showInviteModal = false;
  inviteEmail = '';
  inviteName = '';
  sendingInvite = false;
  inviteSuccess = '';
  inviteError = '';

  constructor(
    private route: ActivatedRoute,
    private interviewService: InterviewService,
    private responseService: ResponseService,
    private aiService: AiService,
    private emailService: EmailService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.interviewService.getById(id).subscribe(interview => {
      this.interview = interview;
      this.responseService.getAll(id).subscribe(responses => {
        this.responses = responses;
        this.loading = false;
      });
    });
  }

  copyLink(): void {
    const url = `${window.location.origin}/call/${this.interview!.id}`;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  }

  openInviteModal(): void {
    this.inviteEmail = '';
    this.inviteName = '';
    this.inviteSuccess = '';
    this.inviteError = '';
    this.showInviteModal = true;
  }

  sendInvite(): void {
    if (!this.inviteEmail.trim() || !this.inviteName.trim()) return;
    this.sendingInvite = true;
    this.inviteSuccess = '';
    this.inviteError = '';

    const url = `${window.location.origin}/call/${this.interview!.id}`;
    this.emailService.sendInvite({
      to_email: this.inviteEmail,
      to_name: this.inviteName,
      interview_name: this.interview!.name,
      interview_url: url,
      duration: this.interview!.time_duration,
      question_count: this.interview!.question_count,
    }).subscribe({
      next: res => {
        this.sendingInvite = false;
        this.inviteSuccess = res.message;
        this.inviteEmail = '';
        this.inviteName = '';
      },
      error: err => {
        this.sendingInvite = false;
        this.inviteError = err?.error?.detail || 'Failed to send invite. Check your SMTP settings.';
      },
    });
  }

  analyzeResponse(response: InterviewResponse): void {
    if (!response.details?.transcript) return;
    this.analyzingIds.add(response.id);
    this.aiService.analyzeResponse({
      transcript: response.details.transcript,
      questions: this.interview!.questions || [],
    }).subscribe({
      next: analytics => {
        this.responseService.update(response.call_id!, { analytics, is_analysed: true }).subscribe();
        response.analytics = analytics;
        this.analyzingIds.delete(response.id);
      },
      error: () => this.analyzingIds.delete(response.id),
    });
  }

  deleteResponse(callId: string): void {
    if (!confirm('Delete this response?')) return;
    this.responseService.delete(callId).subscribe(() => {
      this.responses = this.responses.filter(r => r.call_id !== callId);
    });
  }

  generateInsights(): void {
    const transcripts = this.responses
      .filter(r => r.details?.transcript)
      .map(r => r.details.transcript as string);
    if (!transcripts.length) return;
    this.generatingInsights = true;
    this.aiService.generateInsights({ transcripts, interview_name: this.interview!.name }).subscribe({
      next: insights => {
        this.interview!.insights = insights;
        this.interviewService.update(this.interview!.id, { insights }).subscribe();
        this.generatingInsights = false;
      },
      error: () => { this.generatingInsights = false; },
    });
  }
}
