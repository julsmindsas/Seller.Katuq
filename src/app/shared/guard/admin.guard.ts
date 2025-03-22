import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {

  constructor(public router: Router) { }

  canActivate(next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean> | Promise<boolean> | boolean {
      let user = JSON.parse(localStorage.getItem('user'));
      if (!user || user === null) {
        localStorage.setItem('katuq_layout', state.root.queryParams['layout'] ? state.root.queryParams['layout'] : 'light')
        localStorage.setItem('katuq_type', state.root.queryParams['type'] ? state.root.queryParams['type'] : 'ltr')
        this.router.navigate(['/login']);
        return true
      }
      else if (user) {
        if (!Object.keys(user).length) {
          localStorage.setItem('katuq_layout', state.root.queryParams['layout'] ? state.root.queryParams['layout'] : 'light')
          localStorage.setItem('katuq_type', state.root.queryParams['type'] ? state.root.queryParams['type'] : 'ltr')
          this.router.navigate(['/login']);
          return true
        }
      }

      
    return true
  }

}
