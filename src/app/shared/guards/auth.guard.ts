import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/firebase/auth.service';

@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate {

    constructor(private authService: AuthService, private router: Router) { }

    canActivate(): boolean {
        // return true;
        if (this.authService.isLoggedIn) {
            return true;
        } else {
            this.authService.SignOut();
            return false;
        }
    }
}
