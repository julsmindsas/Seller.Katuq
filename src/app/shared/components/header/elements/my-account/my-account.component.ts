import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-my-account',
  templateUrl: './my-account.component.html',
  styleUrls: ['./my-account.component.scss']
})
export class MyAccountComponent implements OnInit {

  public openAccount: boolean = false;
  user: any;
  userActive: any;
  constructor() {

    this.user = JSON.parse(localStorage.getItem('user') ?? '{}');
  }

  ngOnInit() {
  }

  logOut() {
    localStorage.removeItem('user');
    sessionStorage.removeItem('currentCompany');
    location.href = '/login';
  };

  // For Mobile Device
  toggleAccount() {
    this.openAccount = !this.openAccount;
  }

}
