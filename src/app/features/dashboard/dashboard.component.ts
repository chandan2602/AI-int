import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Pipe, PipeTransform } from '@angular/core';
import { InterviewService } from '../../core/services/interview.service';
import { EmailService } from '../../core/services/email.service';
import { AptitudeService, DriveRoundDetail, DriveResponse } from '../../core/services/aptitude.service';
import { Interview } from '../../core/models/interview.model';

@Pipe({ name: 'activeCount', standalone: true })
export class ActiveCountPipe implements PipeTransform {
  transform(interviews: Interview[]): number {
    return interviews.filter(i => i.is_active).length;
  }
}

// Flat display model used in the UI
export interface RoundRow {
  key:            'aptitude' | 'coding' | 'ai_interview';
  label:          string;
  interview_id:   string;
  name:           string;
  question_count: number;
  time_duration:  string;
  url:            string;
}

export interface DriveGroup {
  driveId: string;
  driveName: string;
  rounds:    Interview[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ActiveCountPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  interviews: Interview[] = [];
  drives:     DriveGroup[] = [];
  loading = true;
  totalResponses = 0;

  // Single-round invite modal
  showModal      = false;
  activeInterview: Interview | null = null;
  inviteName  = '';
  inviteEmail = '';
  sending     = false;
  successMsg  = '';
  errorMsg    = '';

  // Drive invite modal
  showDriveModal   = false;
  activeDrive:       DriveGroup | null = null;
  driveInviteName  = '';
  driveInviteEmail = '';
  driveRows:         RoundRow[] = [];   // flattened from API response
  driveLoading     = false;
  driveSending     = false;
  driveSuccessMsg  = '';
  driveErrorMsg    = '';

  private userId = 'user-1';
  private orgId  = 'org-1';

  private readonly ROUND_META: Record<string, { label: string; color: string }> = {
    aptitude:    { label: 'R1 – Aptitude',   color: 'apt'  },
    coding:      { label: 'R2 – Coding',     color: 'code' },
    ai_interview:{ label: 'R3 – AI Interview', color: 'ai' },
  };

  constructor(
    private interviewService: InterviewService,
    private emailService:     EmailService,
    private aptitudeService:  AptitudeService,
  ) {}

  ngOnInit(): void {
    this.interviewService.getAll(this.userId, this.orgId).subscribe({
      next: data => {
        this.interviews = data;
        this.drives     = this.groupByDrive(data);
        this.totalResponses = data.reduce((s, i) => s + (i.response_count || 0), 0);
        this.loading    = false;
      },
      error: () => { this.loading = false; },
    });
  }

  // Group interviews by drive_id → drive_name → description fallback
  private groupByDrive(interviews: Interview[]): DriveGroup[] {
    const map = new Map<string, { driveId: string; driveName: string; rounds: Interview[] }>();
    for (const iv of interviews) {
      // Prefer drive_id as the stable key; fall back to drive_name or description
      const key      = iv.drive_id?.trim()    || iv.drive_name?.trim() || iv.description?.trim() || iv.name;
      const label    = iv.drive_name?.trim()  || iv.description?.trim() || iv.name;
      if (!map.has(key)) map.set(key, { driveId: key, driveName: label, rounds: [] });
      map.get(key)!.rounds.push(iv);
    }
    
    // Sort rounds within each drive in correct order
    const sortOrder = (iv: Interview): number => {
      if (iv.name.includes('Aptitude')) return 0;
      if (iv.name.includes('Coding')) return 1;
      return 2; // AI Interview
    };
    
    for (const group of map.values()) {
      group.rounds.sort((a, b) => sortOrder(a) - sortOrder(b));
    }
    
    return Array.from(map.values()).map(v => ({ driveId: v.driveId, driveName: v.driveName, rounds: v.rounds }));
  }

  /** Convert the API object response to an ordered flat array for the UI */
  private flattenDriveResponse(res: DriveResponse): RoundRow[] {
    const order: ('aptitude' | 'coding' | 'ai_interview')[] = ['aptitude', 'coding', 'ai_interview'];
    const rows: RoundRow[] = [];
    for (const key of order) {
      const detail: DriveRoundDetail | undefined = res.rounds[key];
      if (!detail) continue;
      rows.push({
        key,
        label:          this.ROUND_META[key].label,
        interview_id:   detail.interview_id,
        name:           detail.name,
        question_count: detail.question_count ?? 0,
        time_duration:  detail.time_duration  ?? '–',
        url:            `${window.location.origin}/call/${detail.interview_id}`,
      });
    }
    return rows;
  }

  /** Build fallback rows from in-memory interviews when API call fails */
  private fallbackRows(drive: DriveGroup): RoundRow[] {
    // Create a map of key to interview
    const interviewMap: Record<'aptitude' | 'coding' | 'ai_interview', Interview | undefined> = {
      aptitude: undefined,
      coding: undefined,
      ai_interview: undefined,
    };

    // Classify each interview into the map
    for (const iv of drive.rounds) {
      if (iv.name.includes('Aptitude')) {
        interviewMap.aptitude = iv;
      } else if (iv.name.includes('Coding')) {
        interviewMap.coding = iv;
      } else {
        interviewMap.ai_interview = iv;
      }
    }

    // Build rows in correct order
    const order: ('aptitude' | 'coding' | 'ai_interview')[] = ['aptitude', 'coding', 'ai_interview'];
    const rows: RoundRow[] = [];
    
    for (const key of order) {
      const iv = interviewMap[key];
      if (!iv) continue;
      rows.push({
        key,
        label:          this.ROUND_META[key].label,
        interview_id:   iv.id,
        name:           iv.name,
        question_count: iv.question_count ?? 0,
        time_duration:  iv.time_duration  ?? '–',
        url:            `${window.location.origin}/call/${iv.id}`,
      });
    }
    
    return rows;
  }

  roundColor(name: string): string {
    if (name.includes('Aptitude')) return 'apt';
    if (name.includes('Coding'))   return 'code';
    return 'ai';
  }

  roundLabel(name: string): string {
    if (name.includes('Aptitude')) return 'R1 – Aptitude';
    if (name.includes('Coding'))   return 'R2 – Coding';
    return 'R3 – AI';
  }

  // ── Single-round invite ────────────────────────────────────────────────────
  copyLink(interview: Interview, event: Event): void {
    event.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/call/${interview.id}`);
    alert('Link copied!');
  }

  openSendModal(interview: Interview, event: Event): void {
    event.stopPropagation();
    this.activeInterview = interview;
    this.inviteName = '';
    this.inviteEmail = '';
    this.successMsg = '';
    this.errorMsg   = '';
    this.showModal  = true;
  }

  closeModal(): void { this.showModal = false; this.activeInterview = null; }

  sendInvite(): void {
    if (!this.inviteName.trim() || !this.inviteEmail.trim() || !this.activeInterview) return;
    this.sending    = true;
    this.successMsg = '';
    this.errorMsg   = '';
    this.emailService.sendInvite({
      to_email:       this.inviteEmail.trim(),
      to_name:        this.inviteName.trim(),
      interview_name: this.activeInterview.name,
      interview_url:  `${window.location.origin}/call/${this.activeInterview.id}`,
      duration:       this.activeInterview.time_duration || '15 minutes',
      question_count: this.activeInterview.question_count || 5,
    }).subscribe({
      next: res => {
        this.sending    = false;
        this.successMsg = res.message;
        this.inviteName = '';
        this.inviteEmail = '';
      },
      error: err => {
        this.sending  = false;
        this.errorMsg = err?.error?.detail || 'Failed to send.';
      },
    });
  }

  // ── Drive invite ───────────────────────────────────────────────────────────
  openDriveModal(drive: DriveGroup, event: Event): void {
    event.stopPropagation();
    this.activeDrive     = drive;
    this.driveInviteName  = '';
    this.driveInviteEmail = '';
    this.driveSuccessMsg  = '';
    this.driveErrorMsg    = '';
    this.driveRows        = [];
    this.showDriveModal   = true;
    this.driveLoading     = true;

    this.aptitudeService.getDrive(drive.driveId, this.userId).subscribe({
      next:  res   => { this.driveLoading = false; this.driveRows = this.flattenDriveResponse(res); },
      error: ()    => { this.driveLoading = false; this.driveRows = this.fallbackRows(drive); },
    });
  }

  closeDriveModal(): void { this.showDriveModal = false; this.activeDrive = null; }

  sendDriveInvite(): void {
    if (!this.driveInviteName.trim() || !this.driveInviteEmail.trim() || !this.activeDrive) return;
    this.driveSending    = true;
    this.driveSuccessMsg = '';
    this.driveErrorMsg   = '';

    this.emailService.sendDriveInvite({
      to_email:   this.driveInviteEmail.trim(),
      to_name:    this.driveInviteName.trim(),
      drive_name: this.activeDrive.driveName,
      rounds: this.driveRows.map(r => ({
        round:          r.label,
        url:            r.url,
        duration:       r.time_duration,
        question_count: r.question_count,
      })),
    }).subscribe({
      next: res => {
        this.driveSending    = false;
        this.driveSuccessMsg = res.message;
        this.driveInviteName  = '';
        this.driveInviteEmail = '';
      },
      error: err => {
        this.driveSending  = false;
        this.driveErrorMsg = err?.error?.detail || 'Failed to send drive invite.';
      },
    });
  }

  delete(id: string, event: Event): void {
    event.stopPropagation();
    if (!confirm('Delete this interview?')) return;
    this.interviewService.delete(id).subscribe(() => {
      this.interviews = this.interviews.filter(i => i.id !== id);
      this.drives     = this.groupByDrive(this.interviews);
    });
  }
}
