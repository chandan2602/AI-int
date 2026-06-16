import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { InterviewService } from '../../core/services/interview.service';
import { ResponseService } from '../../core/services/response.service';
import { CallService } from '../../core/services/call.service';
import { AuthService } from '../../core/services/auth.service';
import { AptitudeService } from '../../core/services/aptitude.service';
import { Interview } from '../../core/models/interview.model';
import { firstValueFrom } from 'rxjs';

export type CallState = 'idle' | 'loading' | 'active' | 'ended' | 'error';
export type RoundType = 'aptitude' | 'coding' | 'ai_interview';

interface RoundInfo {
  key: RoundType;
  label: string;
  duration: string;
  question_count: number;
  interview_id: string;
  name: string;
  questions: any[];
}

@Component({
  selector: 'app-call',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './call.component.html',
  styleUrl: './call.component.css',
})
export class CallComponent implements OnInit, OnDestroy {
  interview?: Interview;
  loadingInterview = true;
  state: CallState = 'idle';
  errorMessage = '';

  candidateName = '';
  candidateEmail = '';
  consentChecked = false;
  showConfirmEnd = false;
  tabSwitchCount = 0;

  isAuthenticated = false;
  showLoginModal = false;

  // Round tracking
  allRounds: RoundInfo[] = [];
  currentRoundType: RoundType = 'ai_interview';
  currentRoundIndex = 0;
  driveId = '';
  roundQuestions: any[] = [];
  currentQuestionIndex = 0;
  currentAnswer = '';
  roundAnswers: string[] = [];
  roundTimeLeft = 0;
  private roundTimerId: any;

  private callId?: string;
  private retellClient: any;

  // Login state
  loginUsername = '';
  loginPassword = '';
  loginLoading = false;
  loginError = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private interviewService: InterviewService,
    private responseService: ResponseService,
    private callService: CallService,
    private authService: AuthService,
    private aptitudeService: AptitudeService,
  ) {}

  // Template-friendly boolean getters to avoid string literal comparisons in templates
  get isIdle(): boolean { return this.state === 'idle'; }
  get isLoading(): boolean { return this.state === 'loading'; }
  get isActive(): boolean { return this.state === 'active'; }
  get isEnded(): boolean { return this.state === 'ended'; }
  get isError(): boolean { return this.state === 'error'; }

  get currentRound(): RoundInfo | undefined {
    return this.allRounds ? this.allRounds[this.currentRoundIndex] : undefined;
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (!id) return;
      this.loadInterview(id);
    });
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  private loadInterview(id: string): void {
    const wasActive = this.state === 'active';
    this.loadingInterview = true;
    this.errorMessage = '';
    this.clearRoundTimer();
    this.interviewService.getById(id).subscribe({
      next: data => {
        this.interview = data;
        this.driveId = data.drive_id || '';
        this.initializeRounds(data, wasActive);
        this.state = wasActive ? 'active' : 'idle';
        if (wasActive) {
          this.startRoundTimer();
        }
        this.loadingInterview = false;
      },
      error: () => {
        this.loadingInterview = false;
        this.errorMessage = 'Interview not found.';
      },
    });
  }

  private initializeRounds(interview: Interview, keepActive = false): void {
    // Determine current round type
    if (interview.name.includes('Aptitude')) {
      this.currentRoundType = 'aptitude';
    } else if (interview.name.includes('Coding')) {
      this.currentRoundType = 'coding';
    } else {
      this.currentRoundType = 'ai_interview';
    }

    // If we have a drive ID, fetch all rounds for this drive
    if (this.driveId) {
      this.aptitudeService.getDrive(this.driveId, 'user-1').subscribe({
        next: res => {
          this.buildRoundsFromDrive(res);
          if (keepActive) {
            this.state = 'active';
            this.startRoundTimer();
          }
        },
        error: () => {
          this.allRounds = [this.createRoundInfo(interview)];
          this.updateCurrentRoundIndex();
          if (keepActive) {
            this.state = 'active';
            this.startRoundTimer();
          }
        },
      });
    } else {
      this.allRounds = [this.createRoundInfo(interview)];
      this.currentRoundIndex = 0;
      this.loadCurrentRoundDetails();
      if (keepActive) {
        this.state = 'active';
        this.startRoundTimer();
      }
    }
  }

  private buildRoundsFromDrive(res: any): void {
    this.allRounds = [];
    const order: RoundType[] = ['aptitude', 'coding', 'ai_interview'];
    
    for (const key of order) {
      const detail = res.rounds[key];
      if (detail) {
        this.allRounds.push({
          key,
          label: this.getRoundLabel(key),
          duration: detail.time_duration || '–',
          question_count: detail.question_count || 0,
          interview_id: detail.interview_id,
          name: detail.name,
          questions: detail.questions || [],
        });
      }
    }
    
    this.updateCurrentRoundIndex();
  }

  private createRoundInfo(interview: Interview): RoundInfo {
    const key = interview.name.includes('Aptitude') ? 'aptitude'
              : interview.name.includes('Coding') ? 'coding'
              : 'ai_interview';
    return {
      key,
      label: this.getRoundLabel(key),
      duration: interview.time_duration || '–',
      question_count: interview.question_count || 0,
      interview_id: interview.id,
      name: interview.name,
      questions: interview.questions || [],
    };
  }

  private getRoundLabel(key: RoundType): string {
    const labels: Record<RoundType, string> = {
      aptitude: 'R1 – Aptitude',
      coding: 'R2 – Coding',
      ai_interview: 'R3 – AI Interview',
    };
    return labels[key];
  }

  private updateCurrentRoundIndex(): void {
    this.currentRoundIndex = this.allRounds.findIndex(r => r.key === this.currentRoundType);
    if (this.currentRoundIndex === -1) this.currentRoundIndex = 0;
    this.loadCurrentRoundDetails();
  }

  private loadCurrentRoundDetails(): void {
    const currentRound = this.allRounds[this.currentRoundIndex];
    this.roundQuestions = currentRound?.questions ?? [];
    this.currentQuestionIndex = 0;
    this.roundAnswers = new Array(this.roundQuestions.length).fill('');
    this.currentAnswer = '';
    this.roundTimeLeft = this.parseDuration(currentRound?.duration || '0 minutes');
    this.clearRoundTimer();
  }

  private parseDuration(duration: string): number {
    const minutes = Number(duration.split(' ')[0]) || 0;
    return minutes * 60;
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  private startRoundTimer(): void {
    this.clearRoundTimer();
    if (this.roundTimeLeft <= 0) return;
    this.roundTimerId = setInterval(() => {
      this.roundTimeLeft -= 1;
      if (this.roundTimeLeft <= 0) {
        this.roundTimeLeft = 0;
        this.clearRoundTimer();
        this.finishRound();
      }
    }, 1000);
  }

  private clearRoundTimer(): void {
    if (this.roundTimerId) {
      clearInterval(this.roundTimerId);
      this.roundTimerId = null;
    }
  }

  isRoundCompleted(index: number): boolean {
    return index < this.currentRoundIndex;
  }

  isRoundCurrent(index: number): boolean {
    return index === this.currentRoundIndex;
  }

  goToRound(round: RoundInfo): void {
    if (this.allRounds.indexOf(round) <= this.currentRoundIndex) {
      this.router.navigate(['/call', round.interview_id]);
    }
  }

  ngOnDestroy(): void {
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.retellClient?.stopCall?.();
  }

  openLoginModal(): void {
    this.loginError = '';
    this.showLoginModal = true;
  }

  closeLoginModal(): void {
    this.showLoginModal = false;
  }

  candidateLogin(): void {
    if (!this.loginUsername.trim() || !this.loginPassword.trim()) {
      this.loginError = 'Username and password are required.';
      return;
    }
    this.loginLoading = true;
    this.loginError = '';

    this.authService.login({
      username: this.loginUsername.trim(),
      password: this.loginPassword,
    }).subscribe({
      next: res => {
        this.loginLoading = false;
        this.candidateName = res.candidate_name;
        this.candidateEmail = res.candidate_email;
        this.isAuthenticated = true;
        this.showLoginModal = false;
      },
      error: err => {
        this.loginLoading = false;
        this.loginError = err?.error?.detail || 'Invalid username or password.';
      },
    });
  }

  async startInterview(): Promise<void> {
    if (!this.interview || !this.consentChecked) return;

    // Create the response entry before starting the round
    await firstValueFrom(this.responseService.create({
      interview_id: this.interview.id,
      name: this.candidateName,
      email: this.candidateEmail,
      is_ended: false,
    }));

    if (this.currentRoundType === 'ai_interview') {
      this.state = 'loading';

      this.callService.registerCall({
        interviewer_id: this.interview.interviewer_id as number,
        dynamic_data: {
          candidate_name: this.candidateName,
          interview_name: this.interview.name,
          questions: this.interview.questions?.map(q => q.question).join('; ') || '',
        },
      }).subscribe({
        next: async (callResponse) => {
          this.callId = callResponse.call_id;
          try {
            const { RetellWebClient } = await import('retell-client-js-sdk');
            this.retellClient = new RetellWebClient();
            this.retellClient.on('call_ended', () => this.onCallEnded());
            this.retellClient.on('error', (err: any) => {
              this.errorMessage = err?.message || 'Call error occurred.';
              this.state = 'error';
            });
            await this.retellClient.startCall({ accessToken: callResponse.access_token });
            this.state = 'active';
            this.startRoundTimer();
          } catch {
            this.errorMessage = 'Failed to start call. Please allow microphone access and try again.';
            this.state = 'error';
          }
        },
        error: () => {
          this.errorMessage = 'Failed to connect to the interviewer. Please try again.';
          this.state = 'error';
        },
      });
      return;
    }

    // Non-AI rounds should enter the active assessment state
    this.state = 'active';
    this.startRoundTimer();
  }

  private async completeRoundAndProceed(): Promise<void> {
    this.finishRound();
  }

  selectOption(option: string): void {
    this.currentAnswer = option;
  }

  nextQuestion(): void {
    this.roundAnswers[this.currentQuestionIndex] = this.currentAnswer;
    if (this.currentQuestionIndex < this.roundQuestions.length - 1) {
      this.currentQuestionIndex += 1;
      this.currentAnswer = this.roundAnswers[this.currentQuestionIndex] || '';
      return;
    }
    this.finishRound();
  }

  previousQuestion(): void {
    if (this.currentQuestionIndex === 0) return;
    this.roundAnswers[this.currentQuestionIndex] = this.currentAnswer;
    this.currentQuestionIndex -= 1;
    this.currentAnswer = this.roundAnswers[this.currentQuestionIndex] || '';
  }

  private finishRound(): void {
    this.clearRoundTimer();
    if (this.currentRoundIndex < this.allRounds.length - 1) {
      const nextRound = this.allRounds[this.currentRoundIndex + 1];
      this.router.navigate(['/call', nextRound.interview_id]);
      return;
    }
    this.state = 'ended';
  }

  confirmEnd(): void {
    this.showConfirmEnd = true;
  }

  endInterview(): void {
    this.showConfirmEnd = false;
    this.retellClient?.stopCall?.();
    this.onCallEnded();
  }

  private onCallEnded(): void {
    if (this.callId) {
      firstValueFrom(this.responseService.update(this.callId, {
        is_ended: true,
        tab_switch_count: this.tabSwitchCount,
      }));
    }
    this.state = 'ended';
    
    // After 3 seconds, check if there's a next round or show completion
    setTimeout(() => {
      if (this.currentRoundIndex < this.allRounds.length - 1) {
        const nextRound = this.allRounds[this.currentRoundIndex + 1];
        this.router.navigate(['/call', nextRound.interview_id]);
      }
    }, 3000);
  }

  private onVisibilityChange = (): void => {
    if (document.hidden && this.state === 'active') {
      this.tabSwitchCount++;
    }
  };
}
