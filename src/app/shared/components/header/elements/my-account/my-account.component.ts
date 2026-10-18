import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../services/firebase/auth.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { abrirOpinar } from '../../../opinar-modal/opinar-modal.component';

interface User {
  name: string;
  image?: string;
  company?: string;
  rol?: string;
}

interface MenuItem {
  path: string;
  icon: string;
  label: string;
}

@Component({
  selector: 'app-my-account',
  templateUrl: './my-account.component.html',
  styleUrls: ['./my-account.component.scss']
})
export class MyAccountComponent implements OnInit {

  public openAccount: boolean = false;
  user?: User;

  // "Mi Cuenta" - Always visible to all users
  accountMenuItem: MenuItem = {
    path: 'usuarios/editarUsuario',
    icon: 'user',
    label: 'Cuenta'
  };

  // Menu items that require authorization
  menuItems: MenuItem[] = [
    {
      path: 'empresas',
      icon: 'briefcase',
      label: 'Configuración de empresa'
    },
    {
      path: 'usuarios',
      icon: 'users',
      label: 'Usuarios'
    },
    {
      path: 'rol',
      icon: 'shield',
      label: 'Roles'
    },
    {
      path: 'rol/rol',
      icon: 'shield',
      label: 'Roles'
    }
  ];

  // Only authorized items will be shown
  authorizedMenuItems: MenuItem[] = [];

  // Authorized paths from localStorage
  private authorizedPaths: string[] = [];

  constructor(
    private router: Router,
    private authService: AuthService,
    private modal: NgbModal
  ) {
    try {
      const userData = localStorage.getItem('user');
      this.user = userData ? JSON.parse(userData) : undefined;
    } catch (error) {
      console.error('Error parsing user from localStorage', error);
      this.user = undefined;
    }

    // Get authorized paths from localStorage
    try {
      const authorizedMenuItems = JSON.parse(
        localStorage.getItem('authorizedMenuItems') || '[]'
      );
      this.authorizedPaths = authorizedMenuItems.map((item: any) => {
        if (item.path === 'rol/rol') {
          return 'rol';
        }
        return item.path;
      });

    } catch (error) {
      console.error('Error parsing authorizedMenuItems from localStorage', error);
      this.authorizedPaths = [];
    }
  }

  ngOnInit() {
    // Filter menu items based on authorized paths
    this.authorizedMenuItems = this.menuItems.filter(
      item => this.authorizedPaths.includes(item.path)
    );
  }

  logOut() {
    this.authService.SignOut()
  };

  /** "Opinar" (D-483): en celular la barra no tiene espacio para el botón y va aquí. */
  opinar() {
    this.openAccount = false;
    abrirOpinar(this.modal);
  }

  // For Mobile Device
  toggleAccount() {
    this.openAccount = !this.openAccount;
  }

}
