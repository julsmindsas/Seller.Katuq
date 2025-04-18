import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor() { }

  getUsers(): Observable<any[]> {
    // Por ahora retornamos datos mock
    return of([
      { id: 1, name: 'Usuario 1', email: 'usuario1@ejemplo.com' },
      { id: 2, name: 'Usuario 2', email: 'usuario2@ejemplo.com' }
    ]);
  }
} 