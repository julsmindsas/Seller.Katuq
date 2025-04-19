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

  // Métodos de conveniencia para diferentes tipos de notificaciones
  success(title: string, message: string) {
    this.addNotification({
      message: message,
      details: title,
      timestamp: new Date(),
      type: 'success',
      typeIcon: 'success'
    });
  }

  error(title: string, message: string) {
    this.addNotification({
      message: message,
      details: title,
      timestamp: new Date(),
      type: 'danger',
      typeIcon: 'danger'
    });
  }

  warning(title: string, message: string) {
    this.addNotification({
      message: message,
      details: title,
      timestamp: new Date(),
      type: 'warning',
      typeIcon: 'warning'
    });
  }

  info(title: string, message: string) {
    this.addNotification({
      message: message,
      details: title,
      timestamp: new Date(),
      type: 'info',
      typeIcon: 'info'
    });
  }
}