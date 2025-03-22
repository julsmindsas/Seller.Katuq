import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Notification {
  message: string;
  timestamp: Date;
  btnName?: string;
  details?: string;
  action?: () => void;
  type: 'function' | 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'dark' | 'secondary' | 'light';
  typeIcon?: 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'dark' | 'secondary' | 'light';
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  removeNotification(notification: Notification) {
    const currentNotifications = this.notificationsSource.getValue();
    const index = currentNotifications.indexOf(notification);
    if (index > -1) {
      currentNotifications.splice(index, 1);
      this.notificationsSource.next(currentNotifications);
    }
  }

  private notificationsSource = new BehaviorSubject<Notification[]>([]);
  notifications$ = this.notificationsSource.asObservable();

  addNotification(notification: Notification) {
    const currentNotifications = this.notificationsSource.getValue();
    this.notificationsSource.next([...currentNotifications, notification]);
  }
}