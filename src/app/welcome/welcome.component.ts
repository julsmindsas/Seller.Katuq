import { Component, OnInit } from '@angular/core';
import { ServiciosService } from '../shared/services/servicios.service';
import { HttpClient } from '@angular/common/http';

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

  // Indicadores economicos Colombia 2026
  trmHoy: number | null = null;
  trmCargando = false;
  indicadores = {
    salarioMinimo: 1423500,
    auxilioTransporte: 200000,
    uvt: 49799,
  };

  constructor(
    private service: ServiciosService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.currentCompany = JSON.parse(sessionStorage.getItem('currentCompany') || '{}');
    this.userActive = JSON.parse(localStorage.getItem('user') ?? '{}');

    if (localStorage.getItem('showOnboardingBanner') === 'true') {
      this.showOnboardingBanner = true;
    }

    this.cargarTRM();
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
}
