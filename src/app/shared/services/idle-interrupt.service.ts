import { Injectable } from '@angular/core';
import { InterruptSource, DEFAULT_INTERRUPTSOURCES, StorageInterruptSource, EventTargetInterruptSource } from '@ng-idle/core';
import { fromEvent, merge, Subject } from 'rxjs';
import { debounceTime, throttleTime, takeUntil } from 'rxjs/operators';

export interface IdleConfiguration {
  idleTime: number; // seconds
  timeoutTime: number; // seconds
  enableTouch: boolean;
  enableScroll: boolean;
  enableVisibility: boolean;
  enableFocus: boolean;
  enableStorage: boolean;
  debounceTime: number; // milliseconds
  throttleTime: number; // milliseconds
  profile: 'admin' | 'user' | 'pos';
}

export class TouchInterruptSource extends InterruptSource {
  private events = ['touchstart', 'touchend', 'touchmove', 'touchcancel'];
  
  protected doAttach(): void {
    this.events.forEach(eventType => {
      document.addEventListener(eventType, this.handleInterrupt, { passive: true });
    });
  }

  protected doDetach(): void {
    this.events.forEach(eventType => {
      document.removeEventListener(eventType, this.handleInterrupt);
    });
  }

  private handleInterrupt = () => {
    this.onInterrupt.emit({ source: this, innerArgs: null, force: false });
  };
}

export class ScrollInterruptSource extends InterruptSource {
  private destroy$ = new Subject<void>();
  private subscription: any;

  constructor(private debounceMs: number = 100) {
    super();
  }

  protected doAttach(): void {
    const scroll$ = merge(
      fromEvent(window, 'scroll', { passive: true }),
      fromEvent(document, 'scroll', { passive: true })
    ).pipe(
      debounceTime(this.debounceMs),
      takeUntil(this.destroy$)
    );

    this.subscription = scroll$.subscribe(() => {
      this.onInterrupt.emit({ source: this, innerArgs: null, force: false });
    });
  }

  protected doDetach(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}

export class VisibilityInterruptSource extends InterruptSource {
  protected doAttach(): void {
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  protected doDetach(): void {
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  private onVisibilityChange = () => {
    if (!document.hidden) {
      this.onInterrupt.emit({ source: this, innerArgs: null, force: false });
    }
  };
}

export class FocusInterruptSource extends InterruptSource {
  private events = ['focus', 'focusin'];
  
  protected doAttach(): void {
    this.events.forEach(eventType => {
      window.addEventListener(eventType, this.onFocus, true);
    });
  }

  protected doDetach(): void {
    this.events.forEach(eventType => {
      window.removeEventListener(eventType, this.onFocus, true);
    });
  }

  private onFocus = () => {
    this.onInterrupt.emit({ source: this, innerArgs: null, force: false });
  };
}

export class EnhancedKeyboardInterruptSource extends InterruptSource {
  private events = ['keydown', 'keyup', 'keypress'];
  private destroy$ = new Subject<void>();
  private subscription: any;

  constructor(private throttleMs: number = 50) {
    super();
  }

  protected doAttach(): void {
    const keyboard$ = merge(
      ...this.events.map(event => fromEvent(document, event))
    ).pipe(
      throttleTime(this.throttleMs),
      takeUntil(this.destroy$)
    );

    this.subscription = keyboard$.subscribe(() => {
      this.onInterrupt.emit({ source: this, innerArgs: null, force: false });
    });
  }

  protected doDetach(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}

@Injectable({
  providedIn: 'root'
})
export class IdleInterruptService {
  private currentProfile: 'admin' | 'user' | 'pos' = 'user';
  private customInterruptSources: InterruptSource[] = [];
  private activityCount = 0;
  private lastActivity = new Date();

  private profiles: Record<string, IdleConfiguration> = {
    admin: {
      idleTime: 300, // 5 minutes
      timeoutTime: 900, // 15 minutes
      enableTouch: true,
      enableScroll: true,
      enableVisibility: true,
      enableFocus: true,
      enableStorage: true,
      debounceTime: 100,
      throttleTime: 50,
      profile: 'admin'
    },
    user: {
      idleTime: 120, // 2 minutes
      timeoutTime: 600, // 10 minutes
      enableTouch: true,
      enableScroll: true,
      enableVisibility: true,
      enableFocus: true,
      enableStorage: true,
      debounceTime: 150,
      throttleTime: 100,
      profile: 'user'
    },
    pos: {
      idleTime: 60, // 1 minute
      timeoutTime: 300, // 5 minutes
      enableTouch: true,
      enableScroll: false, // POS typically doesn't need scroll detection
      enableVisibility: true,
      enableFocus: true,
      enableStorage: false, // POS doesn't need storage monitoring
      debounceTime: 50,
      throttleTime: 25,
      profile: 'pos'
    }
  };

  constructor() {
    this.initializeActivityTracking();
  }

  setProfile(profile: 'admin' | 'user' | 'pos'): void {
    this.currentProfile = profile;
    console.log(`Idle profile switched to: ${profile}`);
  }

  getCurrentConfiguration(): IdleConfiguration {
    return { ...this.profiles[this.currentProfile] };
  }

  updateConfiguration(config: Partial<IdleConfiguration>): void {
    this.profiles[this.currentProfile] = {
      ...this.profiles[this.currentProfile],
      ...config
    };
  }

  createEnhancedInterruptSources(): InterruptSource[] {
    const config = this.getCurrentConfiguration();
    const sources: InterruptSource[] = [...DEFAULT_INTERRUPTSOURCES];

    // Add storage interrupt source if enabled
    if (config.enableStorage) {
      sources.push(new StorageInterruptSource(2));
      sources.push(new EventTargetInterruptSource('user', 'storage'));
    }

    // Add touch interrupt source if enabled
    if (config.enableTouch) {
      sources.push(new TouchInterruptSource());
    }

    // Add scroll interrupt source if enabled
    if (config.enableScroll) {
      sources.push(new ScrollInterruptSource(config.debounceTime));
    }

    // Add visibility interrupt source if enabled
    if (config.enableVisibility) {
      sources.push(new VisibilityInterruptSource());
    }

    // Add focus interrupt source if enabled
    if (config.enableFocus) {
      sources.push(new FocusInterruptSource());
    }

    // Replace default keyboard source with enhanced version
    sources.push(new EnhancedKeyboardInterruptSource(config.throttleTime));

    this.customInterruptSources = sources;
    return sources;
  }

  private initializeActivityTracking(): void {
    // Activity tracking is now handled through individual interrupt sources
    // Each interrupt source calls onInterrupt.emit() which can be monitored
    console.log('Activity tracking initialized for idle interrupt service');
  }

  trackActivity(): void {
    this.activityCount++;
    this.lastActivity = new Date();
  }

  getActivityStats(): { count: number; lastActivity: Date } {
    return {
      count: this.activityCount,
      lastActivity: new Date(this.lastActivity)
    };
  }

  resetActivityStats(): void {
    this.activityCount = 0;
    this.lastActivity = new Date();
  }

  cleanup(): void {
    this.customInterruptSources.forEach(source => {
      if (source && typeof (source as any).doDetach === 'function') {
        (source as any).doDetach();
      }
    });
    this.customInterruptSources = [];
  }

  logConfiguration(): void {
    const config = this.getCurrentConfiguration();
    console.group('🔧 Idle Configuration');
    console.log('Profile:', config.profile);
    console.log('Idle Time:', config.idleTime + 's');
    console.log('Timeout Time:', config.timeoutTime + 's');
    console.log('Touch Enabled:', config.enableTouch);
    console.log('Scroll Enabled:', config.enableScroll);
    console.log('Visibility Enabled:', config.enableVisibility);
    console.log('Focus Enabled:', config.enableFocus);
    console.log('Storage Enabled:', config.enableStorage);
    console.log('Debounce Time:', config.debounceTime + 'ms');
    console.log('Throttle Time:', config.throttleTime + 'ms');
    console.groupEnd();
  }
}