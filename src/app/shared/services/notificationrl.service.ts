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
    console.log('🔔 NotificationRL: Inicializando servicio (LEGACY - solo para compatibilidad)...');
    // NOTA: Este servicio ahora es solo para compatibilidad con componentes legacy
    // Las notificaciones reales se procesan en NotificationManagerService
    this.listenForNotifications();
  }

  private listenForNotifications() {
    // Cancelar la suscripción previa si ya existe
    if (this.firebaseSubscription) {
      this.firebaseSubscription.unsubscribe();
    }
    
    // 🔍 DEBUG: Verificar company data
    const companyData = JSON.parse(localStorage.getItem('currentCompany') || '{}');
    console.log('🔍 DEBUG NotificationRL - Company data:', companyData);
    if(!companyData || !companyData.nomComercial){
      console.log('⚠️ NotificationRL - No company data found, skipping notification setup');
      return;
    }
    
    // Usar múltiples fuentes para obtener el company identifier
    let companyId = companyData?.nomComercial ; // fallback a 'almara'
    
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

        // LEGACY: Solo mantener para compatibilidad con componentes antiguos
        // NotificationManagerService ahora escucha directamente ActualizacionTicket
        
        // Obtener la última notificación no leída
        const newNotification = sorted.find((n) => !n.read);
        
        if (newNotification && newNotification.id !== this.lastNotificationId) {
          console.log('🔔 NotificationRL (LEGACY): Procesando para compatibilidad:', newNotification.id);
          this.lastNotificationId = newNotification.id;
          
          // Solo mantener el toast simple para componentes legacy que aún usan este servicio
          this.notificationKatuq.addNotification({
            message: newNotification.message || newNotification.type || 'Nueva notificación',
            type: 'info',
            timestamp: new Date(),
            action: () => {
              this.markAsRead(newNotification.id);
            }
          });
          
          // YA NO enviamos a NotificationManagerService porque él escucha directamente
        }
      });
  }

  // Obtener las notificaciones como observable
  getNotifications() {
    return this.notifications$.asObservable();
  }

  // Marcar como leída
  markAsRead(notificationId: string): Promise<void> {
    const companyData = JSON.parse(localStorage.getItem('currentCompany') || '{}');
    if(!companyData || !companyData.nomComercial){
      console.log('⚠️ NotificationRL - Cannot mark as read, no company data');
      return Promise.resolve();
    }
    const notificationPath = 'ActualizacionTicket' + companyData.nomComercial;
    return this.db.object(`${notificationPath}/${notificationId}`).update({ read: true });
  }


  /**
   * DEPRECATED: Las pruebas ahora se deben hacer directamente en NotificationManagerService
   * @deprecated
   */
  public testFirebaseNotification(): void {
    console.log('⚠️ NotificationRL: Este método está deprecado. Use NotificationManagerService para pruebas.');
  }

  ngOnDestroy() {
    if (this.firebaseSubscription) {
      this.firebaseSubscription.unsubscribe();
    }
  }
}
