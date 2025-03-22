import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { NotificationService, Notification } from 'src/app/shared/services/notification.service';

@Component({
  selector: 'app-notification',
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.scss']
})
export class NotificationComponent implements OnInit {

  public openNotification: boolean = false;
  notifications: Notification[] = [];

  constructor(private notificationService: NotificationService,
    private toastService: ToastrService) { }

  ngOnInit() {
    this.notificationService.notifications$.subscribe(
      notifications => {
        this.notifications = notifications;
      }
    );
  }
  actionNotification(notification: Notification) {
    notification.action();
    this.notificationService.removeNotification(notification);
  }

  toggleNotificationMobile() {
    this.openNotification = !this.openNotification;
  }

}
