import { Injectable, NgZone } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from './../../../environments/environment';
import { Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { SecurityService } from './security/security.service';
import { AngularFireDatabase } from '@angular/fire/compat/database'

// import myJson from '../services/json/ciudades.json';

@Injectable({
  providedIn: 'root'
})
export class ServiciosService {



  notificaci = [];
  private eventNotif = new Subject<any>();
  private subject = new Subject<any>();
  subject$ = this.subject.asObservable();

  url = environment.urlApi;

  version = 'Versión 0.22.1223a';

  constructor(
    private httpClient: HttpClient,
    private router: Router,
    public ngZone: NgZone,
    private securityService: SecurityService,
    private db: AngularFireDatabase
  ) {
  }

  async getOrdenCalendar(datos: any) {
    return this.httpClient.post(this.url + 'v1/orders/all', datos)
      // return this.httpClient.get(this.url + '/Compras/ListadoOrdenesEnviadas/' + fechaIni + '/' + fechaFin)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  async getOrdenCO2(datos: any) {
    return this.httpClient.post(this.url + 'v1/orders/co2emmit', datos)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });

  }
  async validateAddress(datos: any) {
    return this.httpClient.post(this.url + 'v1/orders/validate', datos)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  // ***************************************** USUARIOS *******************************************

  async getUsuarios(datos: any) {
    return this.httpClient.get(this.url + 'v1/users/all', datos)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  async getUsuario(datos: any) {
    return this.httpClient.get(this.url + 'v1/users', datos)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  async createUsuario(datos: any) {
    return this.httpClient.post(this.url + 'v1/users/create', datos)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  async editUsuario(datos: any) {
    return this.httpClient.post(this.url + 'v1/users/edit', datos)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  // ***************************************** EMPRESAS *******************************************

  async getCompanies() {
    return this.httpClient.get(this.url + 'v1/companies/all')
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  async getActiveCompanies() {
    return this.httpClient.get(this.url + 'v1/companies/active')
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  async getCompany(datos: any) {
    return this.httpClient.post(this.url + 'v1/companies', datos)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  async createCompany(datos: any) {

    return this.httpClient.post(this.url + 'v1/companies/create', datos)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  async editCompany(datos: any) {
    return this.httpClient.post(this.url + 'v1/companies/edit', datos)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  async logoCompany(datos: any) {
    return this.httpClient.post(this.url + 'v1/companies/editLogo', datos)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  // async getCompaniesInCart() {
  //   return this.httpClient.get(this.url + 'v1/companies/inCart')
  //     .toPromise()
  //     .then(async (res) => {
  //       return res;
  //     }).catch(err => {
  //       return err;
  //     });
  // }

  async getCompaniesInStock() {
    return this.httpClient.get(this.url + 'v1/companies/inStock')
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }



  // async getCompaniesInCartInStock() {
  //   return this.httpClient.get(this.url + 'v1/companies/inCartInStock')
  //     .toPromise()
  //     .then(async (res) => {
  //       return res;
  //     }).catch(err => {
  //       return err;
  //     });
  // }
  // ***************************************** DIRECCIONES *******************************************

  async getAddresses(datos: any) {
    return this.httpClient.post(this.url + 'v1/addresses/all', datos)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  async getAddres(datos: any) {
    return this.httpClient.post(this.url + 'v1/addresses', datos)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  async createAddress(datos: any) {

    return this.httpClient.post(this.url + 'v1/addresses/create', datos)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  editAddress(datos: any) {
    return this.httpClient.post(this.url + 'v1/addresses/edit', datos)
      .toPromise()
      .then((res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  async deleteAddress(datos: any) {
    return this.httpClient.post(this.url + 'v1/addresses/delete', datos)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  // ************************************** LOGIN

  signInWithEmailAndPassword(datos) {
    return this.httpClient.post(this.url + '/v1/authentication', datos);
  }

  // Sign out
  signOut() {
    this.router.routeReuseStrategy.shouldReuseRoute = function () {
      return false;
    };
    // return this.afAuth.auth.signOut().then(() => {
    // this.showLoader = false;
    localStorage.clear();
    sessionStorage.clear();
    this.ngZone.run(() => {
      this.router.navigate(['/login']);
    });
  }

  // ***************************************** ORDENES *******************************************
  getOrderByName(orden){
    return this.httpClient.get(this.url + "/v1/orders/byNroPedido/"+ orden)
      .toPromise()
      .then(res => {
        return res;
      }).catch(err => {
        return err;
      });
  }
  postOrder(datos: any) {
    return this.httpClient.post(this.url + "v1/orders/order", datos)
      .toPromise()
      .then(res => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  editOrder(datos: any) {
    return this.httpClient.post(this.url + "v1/orders/edit", datos)
      .toPromise()
      .then(res => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  deleteOrder(datos: any) {
    return this.httpClient.post(this.url + "v1/orders/delete", datos)
      .toPromise()
      .then(res => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  getDashboard(datos: any) {
    return this.httpClient.post(this.url + "v1/orders/dashboard", datos)
      .toPromise()
      .then(res => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  getTotalProductos(nit: any) {
    return this.httpClient.get(this.url + "v1/products/total/" + nit)
      .toPromise()
      .then(res => {
        return res;
      }).catch(err => {
        return err;
      });
  }


  getFacturacion(datos: any) {
    return this.httpClient.post(this.url + "v1/orders/factura", datos)
      .toPromise()
      .then(res => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  orderHistory(datos: any) {
    return this.httpClient.post(this.url + "v1/orders/history", datos)
      .toPromise()
      .then(res => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  ordersCoords(datos: any) {
    return this.httpClient.post(this.url + "v1/orders/coords", datos)
      .toPromise()
      .then(res => {
        return res;
      }).catch(err => {
        return err;
      });
  }
  // ***************************************** AJUSTES *******************************************

  async getSettings() {
    return this.httpClient.get(this.url + 'v1/settings')
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  editSettings(datos: any) {
    return this.httpClient.post(this.url + "v1/settings/edit", datos)
      .toPromise()
      .then(res => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  readCityFile() {
    return [];
  }

  // public publishNofications(data: any) {
  //   this.eventNotif.next(data);
  // }

  // public getNofications(): Subject<any> {
  //   return this.eventNotif;
  // }



  // ***************************************** PRODUCTS *******************************************


  postProduct(datos: any) {
    return this.httpClient.post(this.url + "v1/products/create", datos).toPromise()
      .then(res => {
        return res;
      }).catch(err => {
        return err;
      })
  }

  async getProduct(codbar: any) {
    return this.httpClient.post(this.url + "v1/products", codbar).toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  async getProducsByCompany(nit: any) {
    return this.httpClient.post(this.url + "v1/products/byCompany", nit).toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      })
  }

  async getProducsByClient(nit: any) {
    return this.httpClient.post(this.url + "v1/products/byClient", nit).toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      })
  }

  editProduct(datos: any) {
    return this.httpClient.post(this.url + "v1/products/edit", datos).toPromise()
      .then(res => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  deleteProduct(datos: any) {
    return this.httpClient.post(this.url + "v1/products/delete", datos).toPromise()
      .then(res => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  async getAllProducts() {
    return this.httpClient.get(this.url + "v1/products/all").toPromise()
      .then(async (res) => {
        return res
      }).catch(err => {
        return err;
      })
  }

  async getColorsByCompany(datos) {
    return this.httpClient.post(this.url + "v1/products/colorByCom", datos).toPromise()
      .then(async (res) => {
        return res
      }).catch(err => {
        return err;
      })
  }

  // ***************************************** CATEGORIAS *******************************************

  async getCategories(datos) {
    return this.httpClient.post(this.url + "v1/category", datos).toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  postCategory(datos: any) {
    return this.httpClient.post(this.url + "v1/category/create", datos).toPromise()
      .then(res => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  async getAllCategories() {
    return this.httpClient.get(this.url + "v1/category/all").toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  deleteCategory(datos: any) {
    return this.httpClient.post(this.url + 'v1/category/delete', datos)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  // ***************************************** CART *******************************************

  async getRequestCalendar(datos: any) {
    return this.httpClient.post(this.url + 'v1/requests/all', datos)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  async getRequestPending(datos: any) {
    return this.httpClient.post(this.url + 'v1/requests/pending', datos)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  public consultarEmpresas() {
    return this.httpClient.get(this.url + '/v1/companies/all').toPromise()
      .then(async (res) => {
        sessionStorage.setItem("currentCompany", JSON.stringify((res as any[])[0]))
      }).catch(err => {
        return err;
      });
  };

  public getEmpresaByName(company: any) {
    return this.httpClient.post(this.url + '/v1/companies/byName', company).subscribe({
      next: (res: any) => {
        // sessionStorage.setItem("currentCompany", JSON.stringify((res as any[])[0]))
        this.securityService.setCompanyInformationLogged((res as any[])[0]);

      }
      ,error: (err) => {
        console.log(err)
      }
    })

  };

  async getStateRequest(datos: any) {
    return this.httpClient.post(this.url + 'v1/requests/getState', datos)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }


  async editStateRequest(datos: any) {
    return this.httpClient.post(this.url + 'v1/requests/state', datos)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  async crearPedido(datos: any) {
    return this.httpClient.post(this.url + 'v1/requests/new', datos)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  async editarPedido(datos: any) {
    return this.httpClient.post(this.url + 'v1/requests/edit', datos)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  async getPedido(datos: any) {
    return this.httpClient.post(this.url + 'v1/requests/get', datos)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  // ***************************************** SEDES *******************************************

  async getMedias() {
    return this.httpClient.get(this.url + "v1/media/all").toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  async getMedia(id: any) {
    return this.httpClient.post(this.url + 'v1/media/', id)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  async createMedia(datos: any) {
    return this.httpClient.post(this.url + 'v1/media/create', datos)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  editMedia(datos: any) {
    return this.httpClient.post(this.url + "v1/media/edit", datos).toPromise()
      .then(res => {
        return res;
      }).catch(err => {
        return err;
      });
  }


  // ***************************************** SEDES *******************************************

  async getOffices() {
    return this.httpClient.get(this.url + "v1/offices/all").toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  async getOffice(id: any) {
    return this.httpClient.post(this.url + 'v1/offices/', id)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  async createOffice(datos: any) {
    return this.httpClient.post(this.url + 'v1/offices/create', datos)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  editOffice(datos: any) {
    return this.httpClient.post(this.url + "v1/offices/edit", datos).toPromise()
      .then(res => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  // ***************************************** ENFASIS *******************************************

  async getEmphasisAll() {
    return this.httpClient.get(this.url + "v1/emphasis/all").toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  async getEmphasis(codigo: any) {
    return this.httpClient.post(this.url + 'v1/emphasis/', codigo)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  async createEmphasis(datos: any) {
    return this.httpClient.post(this.url + 'v1/emphasis/create', datos)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  async editEmphasis(datos: any) {
    return this.httpClient.post(this.url + "v1/emphasis/edit", datos)
      .toPromise()
      .then(res => {
        return res;
      }).catch(err => {
        return err;
      });
  }


  // ***************************************** ENFASIS *******************************************

  async getExams() {
    return this.httpClient.get(this.url + "v1/exams/all").toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  async getExam(codigo: any) {
    return this.httpClient.post(this.url + 'v1/exams/', codigo)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  async createExam(datos: any) {
    return this.httpClient.post(this.url + 'v1/exams/create', datos)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  async editExam(datos: any) {
    return this.httpClient.post(this.url + "v1/exams/edit", datos)
      .toPromise()
      .then(res => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  // ***************************************** ESPECIALIDADES *******************************************

  async getSpecialties() {
    return this.httpClient.get(this.url + "v1/specialties/all").toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  async getSpecialty(codigo: any) {
    return this.httpClient.post(this.url + 'v1/specialties/', codigo)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  async createSpecialty(datos: any) {
    return this.httpClient.post(this.url + 'v1/specialties/create', datos)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  async editSpecialty(datos: any) {
    return this.httpClient.post(this.url + "v1/specialties/edit", datos)
      .toPromise()
      .then(res => {
        return res;
      }).catch(err => {
        return err;
      });
  }


  // ***************************************** ROLES *******************************************

  async setRol(rol: any) {
    return this.httpClient.post(this.url + 'v1/roles/edit', rol)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  async getRol(rol: any) {
    return this.httpClient.post(this.url + 'v1/roles/', rol)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  async getRolUser() {
    return this.httpClient.get(this.url + 'v1/roles/user')
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  // ***************************************** DatosBasicos *******************************************

  async saveAdmission(datos: any) {
    return this.httpClient.post(this.url + 'v1/databasic/create', datos)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }
  // ***************************************** Evaluaciones *******************************************

  async saveEvaluation(datos: any) {
    return this.httpClient.post(this.url + 'v1/evaluations/create', datos)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }
  // ***************************************** Admision *******************************************

  async saveAdmit(datos: any) {
    return this.httpClient.post(this.url + 'v1/admissions/create', datos)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  // ***************************************** TURNOS *******************************************

  async setTurn(cedula: any) {

    return this.httpClient.post(this.url + 'v1/turns/create', cedula)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  async getTurn() {

    return this.httpClient.get(this.url + 'v1/turns/active')
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }

  // https://us-central1-firmedica2022.cloudfunctions.net/api/v1/evaluations/create

  async getAllTurnActives() {

    return this.httpClient.get(this.url + 'v1/turns/all')
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }
  // ***************************************** NOTA ACLARATORIA *******************************************
  async saveClarificationNote(datos: any) {
    return this.httpClient.post(this.url + 'v1/exNotes/create', datos)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }
  async getClarificationNote(cedula: any) {
    return this.httpClient.get(this.url + "v1/exNotes/", cedula).toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }
  // ***************************************** NOTA EVOLUCION *******************************************
  async saveEvolutionNote(datos: any) {
    return this.httpClient.post(this.url + 'v1/evNotes/create', datos)
      .toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });
  }
  async getEvolutionNote(cedula: any) {
    return this.httpClient.get(this.url + "v1/evNotes/", cedula).toPromise()
      .then(async (res) => {
        return res;
      }).catch(err => {
        return err;
      });


  }

// *****SOPORTE****
addTicket(newTicket: any): Observable<any>  {
    
  // Configuramos los headers con keyApp y Authorization
  const headers = new HttpHeaders({
    'keyApp': 'e56dadf569d54b13809e94e95c97b31c',  // Reemplaza 'TU_KEY_APP' por la clave correcta
    'Authorization': sessionStorage.getItem('tk')  // Reemplaza 'TU_TOKEN' por el token correcto
  });

  // Hacemos el POST a la API
  return this.httpClient.post('https://api.katuq.com/v1/support/ticket/create', newTicket);
}
getTickets(): Observable<any[]> {
  const headers = new HttpHeaders({
    'keyApp': 'e56dadf569d54b13809e94e95c97b31c',
    'Authorization': sessionStorage.getItem('tk') || ''
  });

  return this.httpClient.get<any[]>('https://api.katuq.com/v1/support/ticket/all');
}
editTicket(newTicket: any): Observable<any>  {
    
  // Configuramos los headers con keyApp y Authorization
  const headers = new HttpHeaders({
    'keyApp': 'e56dadf569d54b13809e94e95c97b31c',  // Reemplaza 'TU_KEY_APP' por la clave correcta
    'Authorization': sessionStorage.getItem('tk')  // Reemplaza 'TU_TOKEN' por el token correcto
  });

  return this.httpClient.put('https://api.katuq.com/v1/support/ticket/'+newTicket.cd, newTicket);
}

addNotification(message: string, ticketId: string) {
 
  const ref = this.db.list('notificaciones');
  return ref.push({
    message,
    ticketId,
    timestamp: Date.now(),
    read: false
  });
}
getContacts(): Observable<any[]> {
  const headers = new HttpHeaders({
    'keyApp': 'e56dadf569d54b13809e94e95c97b31c',
    'Authorization': sessionStorage.getItem('tk') || ''
  });

  return this.httpClient.get<any[]>('https://api.katuq.com/v1/contacts');
}
}
