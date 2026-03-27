import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { NotificationService, Notification } from '../../../../services/notification.service';

@Component({
  selector: 'app-notification',
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.scss']
})
export class NotificationComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  public openNotification: boolean = false;
  notifications: Notification[] = [];

  constructor(private notificationService: NotificationService,
    private toastService: ToastrService) { }

  ngOnInit() {
    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        notifications => {
          this.notifications = notifications;
        }
      );
  }
  actionNotification(notification: Notification) {
    if (notification.action) {
      notification.action();
    }
    this.notificationService.removeNotification(notification);
  }

  toggleNotificationMobile() {
    this.openNotification = !this.openNotification;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
