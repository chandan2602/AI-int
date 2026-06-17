import { Component, OnInit, OnDestroy, ViewChild, NgZone } from '@angular/core';
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
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { ProctoringService, ProctorEvent } from '../../core/services/proctoring.service';

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
  imports: [CommonModule, FormsModule, MonacoEditorModule],
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
  fraudEvents: ProctorEvent[] = [];
  private fraudSub: any;

  // Login state
  loginUsername = '';
  loginPassword = '';
  loginLoading = false;
  loginError = '';

  // Code editor state (for coding round)
  editorOptions: any = {
    theme: 'vs-dark',
    language: 'python',
    fontSize: 14,
    minimap: { enabled: false },
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    automaticLayout: true,
  };
  codeLanguage: 'python' | 'java' | 'cpp' | 'javascript' = 'python';
  codeTemplates: Record<string, string> = {
    python: `# Write your Python code here\n\ndef solve():\n    # Your solution\n    pass\n\nif __name__ == "__main__":\n    solve()`,
    java: `public class Solution {\n    public static void main(String[] args) {\n        // Your solution\n    }\n}`,
    cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your solution\n    return 0;\n}`,
    javascript: `// Write your JavaScript code here\n\nfunction solve() {\n    // Your solution\n}\n\nsolve();`,
  };
  isRunning = false;
  executionOutput = '';
  executionError = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private interviewService: InterviewService,
    private responseService: ResponseService,
    private callService: CallService,
    private authService: AuthService,
    private aptitudeService: AptitudeService,
    private proctoringService: ProctoringService,
    private ngZone: NgZone,
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

    // Subscribe to proctoring fraud events
    this.fraudSub = this.proctoringService.fraudDetected$.subscribe(ev => {
      this.ngZone.run(() => {
        this.fraudEvents.push(ev);
        // auto-remove after 8 seconds
        setTimeout(() => {
          this.fraudEvents = this.fraudEvents.filter(f => f.timestamp !== ev.timestamp);
        }, 8000);
      });
    });
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
          // If transitioning to AI interview round, auto-start the call
          if (this.currentRoundType === 'ai_interview') {
            setTimeout(() => this.startNewAICall(), 500);
          } else {
            this.proctoringService.initializeProctoring();
          }
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
      const detail = res.rounds[key] || (key === 'ai_interview' ? res.rounds.other : undefined);
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
    // Ensure all three rounds appear in the sidebar. If a round is missing from the drive
    // response, add a disabled placeholder (no interview_id) so the UI still shows it.
    for (const key of order) {
      if (!this.allRounds.find(r => r.key === key)) {
        this.allRounds.push({
          key,
          label: this.getRoundLabel(key),
          duration: '–',
          question_count: 0,
          interview_id: '',
          name: this.getRoundLabel(key),
          questions: [],
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
    this.currentAnswer = currentRound?.key === 'coding' ? this.codeTemplates[this.codeLanguage] : '';
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
    // Only allow navigation to rounds that have a valid interview id and which
    // are not ahead of the current round.
    if (!round.interview_id) return;
    if (this.allRounds.indexOf(round) <= this.currentRoundIndex) {
      // Stop previous Retell call before navigating to new round
      this.retellClient?.stopCall?.();
      this.proctoringService.destroyProctoring();
      this.router.navigate(['/call', round.interview_id]);
    }
  }

  ngOnDestroy(): void {
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.retellClient?.stopCall?.();
    this.proctoringService.destroyProctoring();
    try { this.fraudSub?.unsubscribe?.(); } catch (e) {}
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
            this.proctoringService.initializeProctoring();
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
    this.proctoringService.initializeProctoring();
  }

  private async startNewAICall(): Promise<void> {
    // Called when transitioning to an AI interview round
    if (!this.interview) return;

    // Create a new response entry for this round
    try {
      const response = await firstValueFrom(this.responseService.create({
        interview_id: this.interview.id,
        name: this.candidateName,
        email: this.candidateEmail,
        is_ended: false,
      }));
      this.callId = response.id.toString();
    } catch (err) {
      console.error('Failed to create response entry:', err);
      return;
    }

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
          this.proctoringService.initializeProctoring();
        } catch (err) {
          console.error('Failed to start Retell call:', err);
          this.errorMessage = 'Failed to start call. Please try again.';
          this.state = 'error';
        }
      },
      error: (err) => {
        console.error('Failed to register call:', err);
        this.errorMessage = 'Failed to connect to the interviewer. Please try again.';
        this.state = 'error';
      },
    });
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
      this.currentAnswer = this.roundAnswers[this.currentQuestionIndex] || (this.currentRoundType === 'coding' ? this.codeTemplates[this.codeLanguage] : '');
      return;
    }
    this.finishRound();
  }

  previousQuestion(): void {
    if (this.currentQuestionIndex === 0) return;
    this.roundAnswers[this.currentQuestionIndex] = this.currentAnswer;
    this.currentQuestionIndex -= 1;
    this.currentAnswer = this.roundAnswers[this.currentQuestionIndex] || (this.currentRoundType === 'coding' ? this.codeTemplates[this.codeLanguage] : '');
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
    this.proctoringService.destroyProctoring();
    
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

  // Code editor methods for coding round
  changeLanguage(language: 'python' | 'java' | 'cpp' | 'javascript'): void {
    const previousTemplate = this.codeTemplates[this.codeLanguage];
    this.codeLanguage = language;
    this.editorOptions = { ...this.editorOptions, language };
    if (!this.currentAnswer.trim() || this.currentAnswer === previousTemplate) {
      this.currentAnswer = this.codeTemplates[language];
    }
  }

  runCode(): void {
    if (!this.currentAnswer.trim()) {
      this.executionError = 'Please write some code before running.';
      return;
    }
    
    this.isRunning = true;
    this.executionOutput = '';
    this.executionError = '';

    // Simulate code execution - in production, call your backend API
    setTimeout(() => {
      // This is a placeholder - replace with actual backend API call
      this.executionOutput = 'Program executed successfully!\nOutput: Your code ran without errors.';
      this.isRunning = false;
    }, 1500);
  }

  submitCode(): void {
    if (!this.currentAnswer.trim()) {
      this.executionError = 'Please write some code before submitting.';
      return;
    }

    // Save current code as answer and move to next question
    this.roundAnswers[this.currentQuestionIndex] = this.currentAnswer;
    
    if (this.currentQuestionIndex < this.roundQuestions.length - 1) {
      this.currentQuestionIndex += 1;
      this.currentAnswer = this.roundAnswers[this.currentQuestionIndex] || this.codeTemplates[this.codeLanguage];
      this.executionOutput = '';
      this.executionError = '';
      return;
    }
    
    this.finishRound();
  }
}
