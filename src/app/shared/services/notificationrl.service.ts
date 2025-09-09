import { Injectable, OnDestroy } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/compat/database';
import { BehaviorSubject, Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationrlService implements OnDestroy {
  private notifications$ = new BehaviorSubject<any[]>([]);
  private userId = 'usuarioId1'; // Cambiar por el usuario autenticado
  private firebaseSubscription: Subscription | null = null;
  private lastNotificationId: string | null = null; // Para evitar notificaciones repetidas

  constructor(
    private notificationKatuq: NotificationService,
    private db: AngularFireDatabase,
    private toastr: ToastrService
  ) {
    this.listenForNotifications();
  }

  private listenForNotifications() {
    // Cancelar la suscripción previa si ya existe
    if (this.firebaseSubscription) {
      this.firebaseSubscription.unsubscribe();
    }
    
    // 🔍 DEBUG: Verificar company data
    const companyData = JSON.parse(sessionStorage.getItem('currentCompany') || '{}');
    console.log('🔍 DEBUG NotificationRL - Company data:', companyData);
    
    // Usar múltiples fuentes para obtener el company identifier
    let companyId = companyData.nit || companyData.nombreComercio || 'almara'; // fallback a 'almara'
    
    const notificationPath = 'ActualizacionTicket' + companyId;
    console.log('🔍 DEBUG NotificationRL - Listening to path:', notificationPath);
    
    this.firebaseSubscription = this.db.list(notificationPath)
      .snapshotChanges()
      .subscribe((snapshots) => {
        console.log('🔍 DEBUG NotificationRL - Received snapshots:', snapshots.length);
        
        const notifications = snapshots.map((snapshot) => {
          const data: any = snapshot.payload.val();
          const id = snapshot.key; // Obtener el key (nombre del nodo)
          console.log('🔍 DEBUG NotificationRL - Processing notification:', { id, data });
          return { id, show: false, ...data }; // Combinar el key con los datos
        });

        const sorted = notifications.sort((a, b) => b.timestamp - a.timestamp); // Ordenar por más recientes
        console.log('🔍 DEBUG NotificationRL - Sorted notifications:', sorted.length);
        this.notifications$.next(sorted);

        // Obtener la última notificación no leída
        const newNotification = sorted.find((n) => !n.read);
        if (newNotification && newNotification.id !== this.lastNotificationId) {
          this.lastNotificationId = newNotification.id; // Guardar la última notificación procesada
          
          this.notificationKatuq.addNotification({
            message: newNotification.message,
            type: 'info',
            timestamp: new Date(),
            action: () => {
              this.markAsRead(newNotification.id);
            }
          });
        }
      });
  }

  // Obtener las notificaciones como observable
  getNotifications() {
    return this.notifications$.asObservable();
  }

  // Marcar como leída
  markAsRead(notificationId: string): Promise<void> {
    return this.db.object(`notificaciones/${notificationId}`).update({ read: true });
  }

  ngOnDestroy() {
    if (this.firebaseSubscription) {
      this.firebaseSubscription.unsubscribe();
    }
  }
}
