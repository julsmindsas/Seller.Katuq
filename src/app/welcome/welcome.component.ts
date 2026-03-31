import { Component, OnInit } from '@angular/core';
import { ServiciosService } from '../shared/services/servicios.service';
import { HttpClient } from '@angular/common/http';
import { AngularFirestore } from '@angular/fire/compat/firestore';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss']
})
export class WelcomeComponent implements OnInit {
  public userActive: any;
  public currentCompany: any;

  // Onboarding banner
  showOnboardingBanner = false;

  // Indicadores economicos Colombia (defaults como fallback)
  trmHoy: number | null = null;
  trmCargando = false;
  indicadores = {
    salarioMinimo: 1623500,
    auxilioTransporte: 229468,
    uvt: 49799,
    anio: 2026,
  };

  constructor(
    private service: ServiciosService,
    private http: HttpClient,
    private afs: AngularFirestore
  ) {}

  ngOnInit() {
    this.currentCompany = JSON.parse(sessionStorage.getItem('currentCompany') || '{}');
    this.userActive = JSON.parse(localStorage.getItem('user') ?? '{}');

    if (localStorage.getItem('showOnboardingBanner') === 'true') {
      this.showOnboardingBanner = true;
    }

    this.cargarTRM();
    this.cargarIndicadoresEconomicos();
  }

  dismissOnboarding(): void {
    this.showOnboardingBanner = false;
    localStorage.removeItem('showOnboardingBanner');
  }

  cargarTRM(): void {
    this.trmCargando = true;
    this.http.get<any[]>('https://www.datos.gov.co/resource/mcec-87by.json?$limit=1&$order=vigenciadesde%20DESC')
      .subscribe({
        next: (data) => {
          if (data?.length > 0) {
            this.trmHoy = parseFloat(data[0].valor);
          }
          this.trmCargando = false;
        },
        error: () => { this.trmCargando = false; }
      });
  }

  /**
   * Carga indicadores económicos desde Firestore (colección config/indicadores_economicos).
   * Si no existe el documento, usa los valores hardcodeados como fallback.
   * Para actualizar: editar el doc en Firestore o crear un script.
   */
  private cargarIndicadoresEconomicos(): void {
    this.afs.doc('config/indicadores_economicos').valueChanges().subscribe({
      next: (data: any) => {
        if (data) {
          this.indicadores = {
            salarioMinimo: data.salarioMinimo || this.indicadores.salarioMinimo,
            auxilioTransporte: data.auxilioTransporte || this.indicadores.auxilioTransporte,
            uvt: data.uvt || this.indicadores.uvt,
            anio: data.anio || this.indicadores.anio,
          };
        }
      },
      error: () => { /* Usa fallback hardcodeado */ }
    });
  }
}
