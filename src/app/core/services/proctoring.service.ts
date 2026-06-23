import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export interface ProctorEvent {
  type: string;
  detail?: any;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProctoringService {
  private eventsSubject = new Subject<ProctorEvent>();
  public events$: Observable<ProctorEvent> = this.eventsSubject.asObservable();

  private fraudSubject = new Subject<ProctorEvent>();
  public fraudDetected$: Observable<ProctorEvent> = this.fraudSubject.asObservable();

  private initialized = false;

  private localStream: MediaStream | null = null;

  // Counters used to decide if behaviour looks suspicious
  private blurCount = 0;
  private visibilityHiddenCount = 0;
  private copyAttempts = 0;
  private rightClickAttempts = 0;
  private fullscreenExitCount = 0;

  // thresholds (tune as needed)
  private readonly BLUR_THRESHOLD = 3;
  private readonly VISIBILITY_THRESHOLD = 1;
  private readonly COPY_THRESHOLD = 1;
  private readonly RIGHT_CLICK_THRESHOLD = 2;
  private readonly FULLSCREEN_EXIT_THRESHOLD = 1;

  // Dedup map to avoid emitting duplicate fraud events in short succession
  private lastFraudTimestamps: Record<string, number> = {};
  private readonly FRAUD_DEDUP_MS = 2000;

  constructor(private ngZone: NgZone) {}

  initializeProctoring(): void {
    if (this.initialized) return;
    this.initialized = true;

    // run outside angular to avoid unnecessary change detection
    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('visibilitychange', this.onVisibilityChange);
      window.addEventListener('blur', this.onBlur);
      window.addEventListener('focus', this.onFocus);
      document.addEventListener('copy', this.onCopy);
      document.addEventListener('contextmenu', this.onRightClick);
      document.addEventListener('fullscreenchange', this.onFullscreenExit);
    });
  }

  destroyProctoring(): void {
    if (!this.initialized) return;
    this.initialized = false;

    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('focus', this.onFocus);
    document.removeEventListener('copy', this.onCopy);
    document.removeEventListener('contextmenu', this.onRightClick);
    document.removeEventListener('fullscreenchange', this.onFullscreenExit);

    // stop camera if active
    this.stopCamera();

    this.eventsSubject.complete();
    this.fraudSubject.complete();
  }

  async startCamera(): Promise<MediaStream> {
    if (this.localStream) return this.localStream;
    try {
      // Try with both video and audio first
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true 
      });
      this.localStream = stream;
      this.emitEvent('camera-started');
      return stream;
    } catch (err: any) {
      console.error('Camera permission error:', err);
      // Fallback: try video only
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        this.localStream = stream;
        this.emitEvent('camera-started');
        return stream;
      } catch (fallbackErr) {
        this.emitEvent('camera-error', { error: err?.message || 'Camera access denied' });
        throw fallbackErr;
      }
    }
  }

  stopCamera(): void {
    if (!this.localStream) return;
    try {
      this.localStream.getTracks().forEach(t => t.stop());
    } catch (e) {
      // ignore
    }
    this.localStream = null;
    this.emitEvent('camera-stopped');
  }

  private emitEvent(type: string, detail?: any) {
    const ev: ProctorEvent = { type, detail, timestamp: Date.now() };
    this.eventsSubject.next(ev);
  }

  private emitFraud(ev: ProctorEvent) {
    const key = ev.type + JSON.stringify(ev.detail || {});
    const now = Date.now();
    const last = this.lastFraudTimestamps[key] || 0;
    if (now - last < this.FRAUD_DEDUP_MS) return; // ignore duplicate in short window
    this.lastFraudTimestamps[key] = now;
    this.fraudSubject.next(ev);
  }

  private onVisibilityChange = () => {
    this.visibilityHiddenCount += (document.hidden ? 1 : 0);
    this.emitEvent('visibilitychange', { hidden: document.hidden });

    if (this.visibilityHiddenCount >= this.VISIBILITY_THRESHOLD) {
      this.emitFraud({ type: 'suspicious-visibility', detail: { count: this.visibilityHiddenCount }, timestamp: Date.now() });
      this.visibilityHiddenCount = 0;
    }
  };

  private onBlur = () => {
    this.blurCount += 1;
    this.emitEvent('blur');

    if (this.blurCount >= this.BLUR_THRESHOLD) {
      this.emitFraud({ type: 'suspicious-blur', detail: { count: this.blurCount }, timestamp: Date.now() });
    }
  };

  private onFocus = () => {
    this.emitEvent('focus');
  };

  private onCopy = (event: ClipboardEvent) => {
    this.copyAttempts += 1;
    // prevent copy during proctored assessment
    try {
      event.preventDefault();
      // some browsers require stopPropagation as well
      event.stopPropagation();
    } catch (e) {
      // ignore
    }

    this.emitEvent('copy-attempt', { count: this.copyAttempts });

    if (this.copyAttempts >= this.COPY_THRESHOLD) {
      this.emitFraud({ type: 'copy-attempt', detail: { count: this.copyAttempts }, timestamp: Date.now() });
    }
  };

  private onRightClick = (event: MouseEvent) => {
    this.rightClickAttempts += 1;
    try { event.preventDefault(); } catch (e) {}
    this.emitEvent('right-click', { count: this.rightClickAttempts });

    if (this.rightClickAttempts >= this.RIGHT_CLICK_THRESHOLD) {
      this.emitFraud({ type: 'right-click-suspicious', detail: { count: this.rightClickAttempts }, timestamp: Date.now() });
    }
  };

  private onFullscreenExit = () => {
    const exited = !document.fullscreenElement;
    if (exited) {
      this.fullscreenExitCount += 1;
      this.emitEvent('fullscreen-exit', { count: this.fullscreenExitCount });

      if (this.fullscreenExitCount >= this.FULLSCREEN_EXIT_THRESHOLD) {
        this.emitFraud({ type: 'fullscreen-exit', detail: { count: this.fullscreenExitCount }, timestamp: Date.now() });
      }
    }
  };
}
