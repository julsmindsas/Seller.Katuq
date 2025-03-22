import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss']
})
export class WelcomeComponent implements OnInit {

  // Se pueden obtener los accesos directos desde localStorage o servicio
  shortcuts: any[] = JSON.parse(localStorage.getItem('authorizedMenuItems') || '[]');

  loading: boolean = false;

  public huella: string;
  public huellaEmpresa;

  // empresas = [];
  empresa = '';
  imagenEmpresa = '';
  nit = '';
  esCart = false;
  public datos: any;
  contentDataURL;
  public userActive: any

  constructor() { }

  async ngOnInit() {
    // this.userActive = this.manageLocalStorageService.getUserActive()

    this.userActive = JSON.parse(localStorage.getItem('user') ?? '{}');
  }

}
