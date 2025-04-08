import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from './../../../../environments/environment'

import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MaestroService {
  
  eliminarUsuario(id: any) {
    return this.http.post(this.urlBase + '/v1/users/delete', { cd: id }, this.httpOptions);
  }

  changePassword(user: any) {
    return this.http.post(this.urlBase + '/v1/users/updateDefaultPassword', user, this.httpOptions);
  }
  changeNewPassword(user: any) {
    return this.http.post(this.urlBase + '/v1/users/changePassword', user, this.httpOptions);
  }

  deleteRol(id: any) {
    return this.http.post(this.urlBase + '/v1/roles/delete', id, this.httpOptions);
  }
  updateUser(usuario: any) {
    return this.http.post(this.urlBase + '/v1/users/edit', usuario, this.httpOptions);
  }
  eliminarCliente(id: any) {
    return this.http.post(this.urlBase + '/v1/clients/delete', { cd: id }, this.httpOptions);

  }
  exportToExcel() {
    return this.http.get(this.urlBase + '/v1/productos/export/excel', { responseType: 'blob' });
  }

  obtenerClientes() {
    return this.http.get(this.urlBase + '/v1/clients/all', this.httpOptions);
  }
  getProductByBarcode(barcode: string) {
    // Limpia eventos globales para evitar memory leaks
    return this.http.get<any>(this.urlBase + '/v1/inventory/all');
  }
  getMovimientosInventarioByProduct(row: any, pageSize: number, currentPage: number, lastDocId?: string) {
    let params = new HttpParams()
      .set('page', currentPage.toString())
      .set('pageSize', pageSize.toString())
      .set('productId', row.cd.toString());

    if (lastDocId) {
      params = params.set('lastDocId', lastDocId);
    }

    return this.http.get<any>(this.urlBase + '/v1/inventory/all', { params });
  }
  guardarMovimientoInventario(movimientos: any) {
    return this.http.post(this.urlBase + '/v1/inventory/create', movimientos, this.httpOptions);
  }

  editProcesoProduccion(procesoAGuardar: any) {
    return this.http.post(this.urlBase + '/v1/procesos/edit', procesoAGuardar, this.httpOptions);
  }
  getProcesos() {
    return this.http.get(this.urlBase + '/v1/procesos/all', this.httpOptions);
  }
  createProcesoProduccion(procesosConCentrosTrabajos: any) {
    return this.http.post(this.urlBase + '/v1/procesos/create', procesosConCentrosTrabajos, this.httpOptions);
  }
  deleteCentroTrabajo(centroTrabajo: any) {
    return this.http.post(this.urlBase + '/v1/centrotrabajo/delete', centroTrabajo, this.httpOptions);
  }
  addCentroTrabajo(nuevoCentroTrabajo: string) {
    const currentCompany = JSON.parse(sessionStorage.getItem('currentCompany') || '{}').nomComercial;
    return this.http.post(this.urlBase + '/v1/centrotrabajo/create', { nombre: nuevoCentroTrabajo, company: currentCompany }, this.httpOptions);
  }
  getCentrosTrabajo() {
    return this.http.get(this.urlBase + '/v1/centrotrabajo/all', this.httpOptions);
  }
  updateTiempoEntrega(value: any) {
    return this.http.post(this.urlBase + '/v1/tiemposentrega/edit', value, this.httpOptions);
  }

  updateTipoEntrega(value: any) {
    return this.http.post(this.urlBase + '/v1/tipoentrega/edit', value, this.httpOptions);
  }

  private urlBase: string = environment.urlApi;
  private httpOptions: any;
  constructor(private http: HttpClient) {
    var headers_object = new HttpHeaders();
    headers_object.append('Content-Type', 'application/json');

    this.httpOptions = {
      headers: headers_object
    };
  }
  public getClientByDocument(data: any) {
    return this.http.post(this.urlBase + '/v1/clients/doc', data, this.httpOptions);
  }
  public editClient(data: any) {
    return this.http.post(this.urlBase + '/v1/clients/edit', data, this.httpOptions);
  }
  public createClient(data: any) {
    return this.http.post(this.urlBase + '/v1/clients/create', data, this.httpOptions);
  }
  public consultarVariables() {
    return this.http.get(this.urlBase + '/v1/variables/all', this.httpOptions);
  }
  public editFormaPago(genrre: any) {
    return this.http.post(this.urlBase + '/v1/pagos/edit', genrre, this.httpOptions);
  }
  public editFormaPagoPOS(genrre: any) {
    return this.http.post(this.urlBase + '/v1/pagos/pos/edit', genrre, this.httpOptions);
  }
  public crearFormaPago(genrre: any) {
    return this.http.post(this.urlBase + '/v1/pagos/create', genrre, this.httpOptions);
  }
  public crearFormaPagoPOS(genrre: any) {
    return this.http.post(this.urlBase + '/v1/pagos/pos/create', genrre, this.httpOptions);
  }
  public deleteFormaPago(genrre: any) {
    return this.http.post(this.urlBase + '/v1/pagos/delete', genrre, this.httpOptions);
  }

  public deleteFormaPagoPOS(genrre: any) {
    return this.http.post(this.urlBase + '/v1/pagos/pos/delete', genrre, this.httpOptions);
  }

  public consultarFormaPago() {
    return this.http.get(this.urlBase + '/v1/pagos/all', this.httpOptions);
  }
  public consultarFormaPagoPOS() {
    return this.http.get(this.urlBase + '/v1/pagos/pos/all', this.httpOptions);
  }
  public crearEditarVariables(genrre: any) {
    return this.http.post(this.urlBase + '/v1/variables/edit', genrre, this.httpOptions);
  }
  public createEditGenrre(genrre: any) {
    return this.http.post(this.urlBase + '/v1/genero/edit', genrre, this.httpOptions);
  }
  public deleteGenrre(genrre: any) {
    return this.http.post(this.urlBase + '/v1/genero/remove', genrre, this.httpOptions);
  }
  public createEditOcasion(Ocasion: any) {
    return this.http.post(this.urlBase + '/v1/ocasion/edit', Ocasion, this.httpOptions);
  }
  public deleteOcasion(Ocasion: any) {
    return this.http.post(this.urlBase + '/v1/ocasion/remove', Ocasion, this.httpOptions);
  }
  public consultarGenero() {
    return this.http.get<any>(this.urlBase + '/v1/genero/all', this.httpOptions);
  }
  public consultarOcasion() {
    return this.http.get(this.urlBase + '/v1/ocasion/all', this.httpOptions);
  }
  public createCompany(company: any) {
    return this.http.post(this.urlBase + '/v1/companies/create', company, this.httpOptions);
  }
  public editCompany(company: any) {
    return this.http.post(this.urlBase + '/v1/companies/edit', company, this.httpOptions);
  }
  public createProduct(product: any) {
    return this.http.post(this.urlBase + '/v1/productos/create', product, this.httpOptions);
  }
  public getTotalProducts() {
    return this.http.get(this.urlBase + '/v1/productos/totalProducts', this.httpOptions);
  }

  getAllProductsPagination(pageSize: number, currentPage: number, lastDocId?: string): Observable<any> {
    let params = new HttpParams()
      .set('page', currentPage.toString())
      .set('pageSize', pageSize.toString());

    if (lastDocId) {
      params = params.set('lastDocId', lastDocId);
    }

    return this.http.get<any>(this.urlBase + '/v1/productos/all', { params });
  }

  getAllProductsInventariablesPagination(pageSize?: number, page?: number, lastDocId?: string, firstDocId?: string,
    options?: any): Observable<any> {
    let params: any = {
      pageSize,
      page
    };

    if (options?.filterOutOfStock) {
      params.filterOutOfStock = 'true';
    }

    if (options?.orderBy) {
      params.orderBy = options.orderBy;
    }

    if (options?.orderDirection) {
      params.orderDirection = options.orderDirection;
    }

    if (options?.aggregate) {
      params.aggregate = 'true';
    }
    return this.http.get<any>(this.urlBase + '/v1/productos/all/inventariables', { params });
  }

  getProductsBySearch(searchTerm: any, pageSize: number, currentPage: number, lastDocId?: string) {
    let params = new HttpParams()
      .set('searchTerm', searchTerm)
      .set('page', currentPage.toString())
      .set('pageSize', pageSize.toString());

    if (lastDocId) {
      params = params.set('lastDocId', lastDocId);
    }

    return this.http.get(this.urlBase + '/v1/productos/getBySearch', {
      params
    });
  }
  public editProductByReference(product: any) {
    return this.http.post(this.urlBase + '/v1/productos/edit', product, this.httpOptions);
  }
  public createUser(user: any) {
    return this.http.post(this.urlBase + '/v1/users/create', user, this.httpOptions);
  }
  public createRol(rol: any) {
    return this.http.post(this.urlBase + '/v1/roles/create', rol, this.httpOptions);
  }
  public createHorario(horario: any) {
    return this.http.post(this.urlBase + '/v1/horariosentrega/create', horario, this.httpOptions);
  }

  public createFormaEntrega(formas: any) {
    return this.http.post(this.urlBase + '/v1/formaentrega/create', formas, this.httpOptions);
  }
  public editFormaEntrega(formas: any) {
    return this.http.post(this.urlBase + '/v1/formaentrega/edit', formas, this.httpOptions);
  }
  public getFormaEntrega() {
    return this.http.get(this.urlBase + '/v1/formaentrega/all', this.httpOptions);
  }

  public getTipoEntrega() {
    return this.http.get(this.urlBase + '/v1/tipoentrega/all', this.httpOptions);
  }

  public createTiempoEntrega(formas: any) {
    return this.http.post(this.urlBase + '/v1/tiemposentrega/create', formas, this.httpOptions);
  }
  public createTipoEntrega(formas: any) {
    return this.http.post(this.urlBase + '/v1/tipoentrega/create', formas, this.httpOptions);
  }
  public getTiempoEntrega() {
    return this.http.get(this.urlBase + '/v1/tiemposentrega/all', this.httpOptions);
  }


  public getHorarioEntregas() {
    return this.http.get(this.urlBase + '/v1/horariosentrega/all', this.httpOptions);
  }
  public getRol() {
    return this.http.get(this.urlBase + '/v1/roles/all', this.httpOptions);
  }

  public consultarEmpresas() {
    return this.http.get(this.urlBase + '/v1/companies/all', this.httpOptions);
  }
  public consultarEmpresasByUser(user) {
    return this.http.get(this.urlBase + '/v1/companies/all', this.httpOptions);
  }
  public consultarUsuarios() {
    return this.http.get(this.urlBase + '/v1/users/all', this.httpOptions);
  }
  public

  deleteFormaEntrega(value: any) {
    return this.http.post(this.urlBase + '/v1/formaentrega/delete', value, this.httpOptions);
  }


  createCategorias(data: any) {
    const dataToSend = Object.assign({}, data);
    return this.http.post(this.urlBase + '/v1/categorias/create', dataToSend, this.httpOptions);
  }
  public getCategorias() {
    return this.http.get(this.urlBase + '/v1/categorias/all', this.httpOptions);
  }
  public createAdiciones(adicion: any) {
    return this.http.post(this.urlBase + '/v1/adiciones/create', adicion);
  }
  public deleteAdiciones(adicion: any) {
    return this.http.post(this.urlBase + '/v1/adiciones/delete', adicion);
  }
  public editAdiciones(adicion: any) {
    return this.http.post(this.urlBase + '/v1/adiciones/edit', adicion);
  }
  public createBillingZone(adicion: any) {
    return this.http.post(this.urlBase + '/v1/zonascobro/create', adicion);
  }
  public getBillingZone() {
    return this.http.get(this.urlBase + '/v1/zonascobro/all', this.httpOptions);
  }
  public editBillingZone(adicion: any) {
    return this.http.post(this.urlBase + '/v1/zonascobro/edit', adicion);
  }
  public deleteBillingZone(adicion: any) {
    return this.http.post(this.urlBase + '/v1/zonascobro/delete', adicion);
  }
  public getAdiciones() {
    return this.http.get(this.urlBase + '/v1/adiciones/all', this.httpOptions);
  }

  public deleteProducto(value: any) {
    return this.http.post(this.urlBase + '/v1/productos/delete', value, this.httpOptions);
  }

  deleteTipoDeEntrega(row: any) {
    return this.http.post(this.urlBase + '/v1/tipoentrega/delete', row, this.httpOptions);
  }

  public updateRol(id: any, rol: any) {
    return this.http.post(this.urlBase + '/v1/roles/edit', { id, ...rol }, this.httpOptions);
  }

  // createRol(role: Role): Observable<Role> {
  //   return this.http.post<Role>(`${this.urlBase}/roles`, role);
  // }
}
