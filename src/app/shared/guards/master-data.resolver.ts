import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, timeout, tap } from 'rxjs/operators';
import { PedidosUtilService } from '../../components/ventas/service/pedidos.util.service';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class MasterDataResolver implements Resolve<boolean> {
  
  constructor(
    private pedidosUtilService: PedidosUtilService,
    private toastr: ToastrService
  ) {}

  resolve(): Observable<boolean> {
    // Verificar si los maestros ya están listos
    if (this.pedidosUtilService.isMaestrosReady()) {
      console.log('🎯 Master data already ready');
      return of(true);
    }

    console.log('⏳ Waiting for master data to load...');
    
    return this.pedidosUtilService.waitUntilLoaded(15000).pipe(
      timeout(20000), // Timeout total de 20 segundos
      tap(() => {
        console.log('✅ Master data loaded successfully by resolver');
      }),
      catchError(error => {
        console.error('❌ Master data resolver failed:', error);
        
        // Mostrar notificación al usuario
        this.toastr.warning(
          'Los datos maestros no se han cargado completamente. Algunas funciones pueden no estar disponibles.',
          'Datos no disponibles',
          {
            timeOut: 8000,
            progressBar: true,
            closeButton: true
          }
        );

        // Permitir continuar con advertencia en caso de error
        return of(false);
      })
    );
  }
}