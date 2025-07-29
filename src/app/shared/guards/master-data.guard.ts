import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of, timer } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { PedidosUtilService } from '../../components/ventas/service/pedidos.util.service';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class MasterDataGuard implements CanActivate {

  constructor(
    private pedidosUtilService: PedidosUtilService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | boolean {
    
    // Para rutas que requieren maestros críticos (como PDF generation)
    const requiresCriticalMasters = route.data?.['requiresMasterData'] === 'critical';
    
    // Si los maestros ya están listos, permitir acceso
    if (this.pedidosUtilService.isMaestrosReady()) {
      return true;
    }

    // Si no son críticos, permitir acceso con advertencia
    if (!requiresCriticalMasters) {
      this.showMasterDataWarning();
      return true;
    }

    // Para rutas críticas, esperar a que se carguen los maestros
    console.log('🛡️ MasterDataGuard: Waiting for critical master data...');
    
    return this.pedidosUtilService.waitUntilLoaded(10000).pipe(
      map(() => {
        console.log('✅ MasterDataGuard: Critical master data loaded');
        return true;
      }),
      catchError(error => {
        console.error('❌ MasterDataGuard: Failed to load critical master data:', error);
        
        this.toastr.error(
          'No se pueden cargar los datos necesarios. Por favor, recargue la página.',
          'Error crítico',
          {
            timeOut: 10000,
            progressBar: true,
            closeButton: true
          }
        );

        // Redirigir a dashboard si la carga falla
        this.router.navigate(['/dashboard']);
        return of(false);
      })
    );
  }

  private showMasterDataWarning(): void {
    // Pequeño delay para mostrar advertencia después de que el componente se inicialice
    timer(1000).subscribe(() => {
      this.toastr.info(
        'Los datos maestros se están cargando en segundo plano.',
        'Información',
        {
          timeOut: 5000,
          progressBar: true
        }
      );
    });
  }
}