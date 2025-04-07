import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router'; // new import

interface User {
  name: string;
  image?: string;
  company?: string;
  rol?: string;
}

@Component({
  selector: 'app-my-account',
  templateUrl: './my-account.component.html',
  styleUrls: ['./my-account.component.scss']
})
export class MyAccountComponent implements OnInit {

  public openAccount: boolean = false;
  user?: User;

  constructor(private router: Router) {
    try {
      const userData = localStorage.getItem('user');
      this.user = userData ? JSON.parse(userData) : undefined;
    } catch (error) {
      console.error('Error parsing user from localStorage', error);
      this.user = undefined;
    }
  }

  ngOnInit() {
  }

  logOut() {
    localStorage.removeItem('user');
    sessionStorage.removeItem('currentCompany');
    this.router.navigateByUrl('/login');
  };

  // For Mobile Device
  toggleAccount() {
    this.openAccount = !this.openAccount;
  }

}
