import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router'; // new import
import { AuthService } from '../../../../services/firebase/auth.service';

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

  constructor(private router: Router, private authService: AuthService) {
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
    this.authService.SignOut()
  };

  // For Mobile Device
  toggleAccount() {
    this.openAccount = !this.openAccount;
  }

}
