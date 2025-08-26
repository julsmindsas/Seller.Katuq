import { Injectable } from '@angular/core';

export enum HapticFeedbackType {
  LIGHT = 'light',
  MEDIUM = 'medium',
  HEAVY = 'heavy',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  SELECTION = 'selection'
}

@Injectable({
  providedIn: 'root'
})
export class HapticFeedbackService {

  private isHapticEnabled: boolean;
  private isReducedMotion: boolean;

  constructor() {
    this.isHapticEnabled = this.checkHapticSupport();
    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Listen for reduced motion changes
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      this.isReducedMotion = e.matches;
    });
  }

  private checkHapticSupport(): boolean {
    // Check for various haptic APIs
    return (
      'vibrate' in navigator ||
      'hapticFeedback' in navigator ||
      // @ts-ignore - iOS Safari specific
      'webkitVibrate' in navigator ||
      // Check for device orientation API as proxy for mobile
      'DeviceOrientationEvent' in window
    );
  }

  /**
   * Provide haptic feedback based on interaction type
   */
  impact(type: HapticFeedbackType = HapticFeedbackType.LIGHT): void {
    if (!this.isHapticEnabled || this.isReducedMotion) {
      return;
    }

    try {
      // iOS Safari HapticFeedback (if available)
      // @ts-ignore
      if (window.navigator.hapticFeedback) {
        this.iosHapticFeedback(type);
        return;
      }

      // Standard Vibration API
      if ('vibrate' in navigator) {
        this.standardVibration(type);
        return;
      }

      // Webkit Vibration (older browsers)
      // @ts-ignore
      if ('webkitVibrate' in navigator) {
        // @ts-ignore
        navigator.webkitVibrate(this.getVibrationPattern(type));
        return;
      }

    } catch (error) {
      // Silently fail if haptic feedback is not supported
      console.debug('Haptic feedback not supported:', error);
    }
  }

  private iosHapticFeedback(type: HapticFeedbackType): void {
    // @ts-ignore - iOS Safari specific API
    const haptic = navigator.hapticFeedback;
    
    switch (type) {
      case HapticFeedbackType.LIGHT:
      case HapticFeedbackType.SELECTION:
        haptic.impact('light');
        break;
      case HapticFeedbackType.MEDIUM:
        haptic.impact('medium');
        break;
      case HapticFeedbackType.HEAVY:
        haptic.impact('heavy');
        break;
      case HapticFeedbackType.SUCCESS:
        haptic.notification('success');
        break;
      case HapticFeedbackType.WARNING:
        haptic.notification('warning');
        break;
      case HapticFeedbackType.ERROR:
        haptic.notification('error');
        break;
      default:
        haptic.impact('light');
    }
  }

  private standardVibration(type: HapticFeedbackType): void {
    const pattern = this.getVibrationPattern(type);
    navigator.vibrate(pattern);
  }

  private getVibrationPattern(type: HapticFeedbackType): number | number[] {
    switch (type) {
      case HapticFeedbackType.LIGHT:
      case HapticFeedbackType.SELECTION:
        return 10; // Very light tap
      
      case HapticFeedbackType.MEDIUM:
        return 25; // Medium tap
      
      case HapticFeedbackType.HEAVY:
        return 50; // Strong tap
      
      case HapticFeedbackType.SUCCESS:
        return [10, 50, 10]; // Double light tap
      
      case HapticFeedbackType.WARNING:
        return [25, 100, 25]; // Double medium tap
      
      case HapticFeedbackType.ERROR:
        return [50, 100, 50, 100, 50]; // Triple strong tap
      
      default:
        return 10;
    }
  }

  /**
   * Navigation-specific haptic feedback
   */
  navigationTap(): void {
    this.impact(HapticFeedbackType.SELECTION);
  }

  /**
   * Button tap feedback
   */
  buttonTap(isSecondary: boolean = false): void {
    this.impact(isSecondary ? HapticFeedbackType.LIGHT : HapticFeedbackType.MEDIUM);
  }

  /**
   * Success action feedback
   */
  success(): void {
    this.impact(HapticFeedbackType.SUCCESS);
  }

  /**
   * Error action feedback
   */
  error(): void {
    this.impact(HapticFeedbackType.ERROR);
  }

  /**
   * Warning action feedback
   */
  warning(): void {
    this.impact(HapticFeedbackType.WARNING);
  }

  /**
   * Toggle haptic feedback on/off
   */
  setEnabled(enabled: boolean): void {
    this.isHapticEnabled = enabled && this.checkHapticSupport();
    localStorage.setItem('hapticFeedbackEnabled', enabled.toString());
  }

  /**
   * Check if haptic feedback is currently enabled
   */
  isEnabled(): boolean {
    const stored = localStorage.getItem('hapticFeedbackEnabled');
    if (stored !== null) {
      return stored === 'true' && this.checkHapticSupport();
    }
    return this.isHapticEnabled;
  }

  /**
   * Age-specific haptic intensity adjustment
   */
  setAgeGroup(ageGroup: 'young' | 'middle' | 'senior'): void {
    // Adjust haptic intensity based on age group
    // Seniors might prefer stronger feedback, young users lighter
    localStorage.setItem('userAgeGroup', ageGroup);
  }

  private getAgeAdjustedIntensity(baseType: HapticFeedbackType): HapticFeedbackType {
    const ageGroup = localStorage.getItem('userAgeGroup') as 'young' | 'middle' | 'senior';
    
    if (!ageGroup) return baseType;

    switch (ageGroup) {
      case 'young':
        // Young users: slightly reduce intensity
        if (baseType === HapticFeedbackType.MEDIUM) return HapticFeedbackType.LIGHT;
        if (baseType === HapticFeedbackType.HEAVY) return HapticFeedbackType.MEDIUM;
        return baseType;
      
      case 'senior':
        // Senior users: increase intensity for better perception
        if (baseType === HapticFeedbackType.LIGHT) return HapticFeedbackType.MEDIUM;
        if (baseType === HapticFeedbackType.MEDIUM) return HapticFeedbackType.HEAVY;
        return baseType;
      
      default:
        return baseType;
    }
  }
}