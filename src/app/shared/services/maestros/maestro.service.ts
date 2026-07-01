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

  public removeTagFromClients(tagName: string) {
    return this.http.post(this.urlBase + '/v1/clients/tags/remove', { tagName }, this.httpOptions);
  }

  public getClientTags(): Observable<any[]> {
    return this.http.get<any[]>(this.urlBase + '/v1/clients/tags', this.httpOptions) as any;
  }

  public saveClientTags(tags: any[]) {
    return this.http.post(this.urlBase + '/v1/clients/tags', { tags }, this.httpOptions);
  }

  /**
   * Busca clientes por término (documento, nombre, correo, teléfono)
   * Para autocompletado
   * @param term Término de búsqueda (mínimo 2 caracteres)
   * @param limit Número máximo de resultados (default 10)
   */
  public searchClients(term: string, limit: number = 10) {
    return this.http.post(this.urlBase + '/v1/clients/search', { term, limit }, this.httpOptions);
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

  // Tipos de Cliente (usando API de tipos-precios)
  public consultarTiposCliente() {
    return this.http.get(this.urlBase + '/v1/tipos-precios/all', this.httpOptions);
  }
  public consultarTiposClienteActivos() {
    return this.http.get(this.urlBase + '/v1/tipos-precios/active', this.httpOptions);
  }
  public createTipoCliente(tipoCliente: any) {
    return this.http.post(this.urlBase + '/v1/tipos-precios/create', tipoCliente, this.httpOptions);
  }
  public editTipoCliente(tipoCliente: any) {
    return this.http.post(this.urlBase + '/v1/tipos-precios/edit', tipoCliente, this.httpOptions);
  }
  public deleteTipoCliente(tipoCliente: any) {
    return this.http.post(this.urlBase + '/v1/tipos-precios/remove', tipoCliente, this.httpOptions);
  }

  // DESCUENTOS Y PROMOCIONES
  public consultarDescuentosPromociones() {
    return this.http.get(this.urlBase + '/v1/descuentos-promociones/all', this.httpOptions);
  }

  public createDescuentoPromocion(descuento: any) {
    return this.http.post(this.urlBase + '/v1/descuentos-promociones/create', descuento, this.httpOptions);
  }

  public editDescuentoPromocion(descuento: any) {
    return this.http.post(this.urlBase + '/v1/descuentos-promociones/edit', descuento, this.httpOptions);
  }

  public deleteDescuentoPromocion(descuento: any) {
    return this.http.post(this.urlBase + '/v1/descuentos-promociones/remove', descuento, this.httpOptions);
  }

  // HISTORIAL DE REDENCIONES — solo lectura desde el admin
  public consultarRedenciones(descuentoId: string) {
    return this.http.get(
      this.urlBase + `/v1/descuentos-promociones/redenciones/${descuentoId}`,
      this.httpOptions
    );
  }
  public createCompany(company: any) {
    return this.http.post(this.urlBase + '/v1/companies/create', company, this.httpOptions);
  }
  public editCompany(company: any) {
    return this.http.post(this.urlBase + '/v1/companies/edit', company, this.httpOptions);
  }
  public deleteCompany(identifier: string | { nit?: string; companyDocId?: string }) {
    const payload: { nit?: string; companyDocId?: string } =
      typeof identifier === 'string' ? { nit: identifier } : (identifier || {});
    return this.http.post(this.urlBase + '/v1/companies/delete', payload, this.httpOptions);
  }
  public createProduct(product: any) {
    return this.http.post(this.urlBase + '/v1/productos/create', product, this.httpOptions);
  }

  public bulkPatchProductos(ids: string[], accion: 'activar' | 'desactivar' | 'disponible' | 'agotado' | 'eliminar'): Observable<any> {
    return this.http.patch<any>(this.urlBase + '/v1/productos/bulk-patch', { ids, accion }, this.httpOptions);
  }
  quickSearchProducts(q: string, limit: number = 50, searchBy: string = 'referencia'): Observable<any> {
    const params = new HttpParams()
      .set('q', q.trim())
      .set('limit', limit.toString())
      .set('searchBy', searchBy);
    return this.http.get<any>(this.urlBase + '/v1/productos/search/quick', { params });
  }

  getProductsFiltered(filtros: any, pageSize: number, currentPage: number, lastDocId?: string): Observable<any> {
    let params = new HttpParams()
      .set('page', currentPage.toString())
      .set('pageSize', pageSize.toString());

    if (filtros.texto) params = params.set('searchTerm', filtros.texto);
    if (filtros.estado) params = params.set('estado', filtros.estado);
    if (filtros.disponibilidad) params = params.set('disponibilidad', filtros.disponibilidad);
    if (filtros.tipoProducto) params = params.set('tipoProducto', filtros.tipoProducto);
    if (filtros.precioDesde != null) params = params.set('precioDesde', filtros.precioDesde.toString());
    if (filtros.precioHasta != null) params = params.set('precioHasta', filtros.precioHasta.toString());
    if (filtros.requiereProduccion) params = params.set('requiereProduccion', filtros.requiereProduccion);
    if (filtros.inventariable) params = params.set('inventariable', filtros.inventariable);
    if (filtros.ultimaEdicion) params = params.set('ultimaEdicion', filtros.ultimaEdicion);
    if (filtros.categoria) params = params.set('categoria', filtros.categoria);
    if (filtros.subcategoria) params = params.set('subcategoria', filtros.subcategoria);
    if (filtros.exposicion) params = params.set('exposicion', filtros.exposicion);
    if (filtros.tipoEntrega) params = params.set('tipoEntrega', filtros.tipoEntrega);
    if (filtros.tiempoEntrega) params = params.set('tiempoEntrega', filtros.tiempoEntrega);
    if (filtros.canal) params = params.set('canal', filtros.canal);
    if (filtros.aceptaAdiciones) params = params.set('aceptaAdiciones', filtros.aceptaAdiciones);
    if (filtros.aceptaCalendario) params = params.set('aceptaCalendario', filtros.aceptaCalendario);
    if (filtros.permitePrecioManual) params = params.set('permitePrecioManual', filtros.permitePrecioManual);
    if (lastDocId) params = params.set('lastDocId', lastDocId);

    return this.http.get<any>(this.urlBase + '/v1/productos/all', { params });
  }
  public checkReferenciaUnica(referencia: string, excludeId?: string): Observable<any> {
    let params = new HttpParams().set('referencia', referencia);
    if (excludeId) params = params.set('excludeId', excludeId);
    return this.http.get(this.urlBase + '/v1/productos/check-referencia', { params });
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

  // Métodos para productos dropshipping y proveedores
  getProductosByProveedor(proveedorId: string, pageSize: number = 10, currentPage: number = 1): Observable<any> {
    let params = new HttpParams()
      .set('proveedorId', proveedorId)
      .set('page', currentPage.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<any>(this.urlBase + '/v1/productos/por-proveedor', { params });
  }

  getProductosDropshipping(pageSize: number = 10, currentPage: number = 1): Observable<any> {
    let params = new HttpParams()
      .set('page', currentPage.toString())
      .set('pageSize', pageSize.toString())
      .set('tipoProducto', 'dropshipping');

    return this.http.get<any>(this.urlBase + '/v1/productos/all', { params });
  }
  public editProductByReference(product: any) {
    return this.http.post(this.urlBase + '/v1/productos/edit', product, this.httpOptions);
  }

  public importPreciosTipoCliente(data: { precios: any[], porcentajeIva: number, preciosConIva: boolean }) {
    return this.http.post<any>(this.urlBase + '/v1/productos/import-precios', data, this.httpOptions);
  }

  /** Guarda los precios por tipo de cliente de UN producto (merge por tipoClienteId en backend). */
  public guardarPreciosTipoCliente(cd: string, precios: any[]) {
    return this.http.post<any>(this.urlBase + '/v1/productos/precios-tipo-cliente', { cd, precios }, this.httpOptions);
  }

  public limpiarPreciosTipoCliente() {
    return this.http.post<any>(this.urlBase + '/v1/productos/limpiar-precios', {}, this.httpOptions);
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

  /**
   * Elimina FÍSICAMENTE todos los productos de un comercio
   * ⚠️ OPERACIÓN DESTRUCTIVA - USO ADMINISTRATIVO/DESARROLLO
   * @param confirmCompanyName Nombre del comercio para confirmar
   */
  public deleteAllProductsByCompany(confirmCompanyName: string): Observable<any> {
    const payload = {
      confirmCompanyName: confirmCompanyName,
      confirmDelete: 'ELIMINAR_TODOS_LOS_PRODUCTOS'
    };
    return this.http.post(this.urlBase + '/v1/productos/delete-all-by-company', payload, this.httpOptions);
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

  // Servicios para canales
  getCanales(): Observable<any[]> {
    return this.http.get<any[]>(`${this.urlBase}/v1/canales`);
  }

  getCanalesActivos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.urlBase}/v1/canales`);
  }

  getCanalById(id: string): Observable<any> {
    return this.http.get<any>(`${this.urlBase}/v1/canales/${id}`);
  }

  crearCanal(canal: any): Observable<any> {
    return this.http.post<any>(`${this.urlBase}/v1/canales`, canal);
  }

  actualizarCanal(id: string, canal: any): Observable<any> {
    return this.http.put<any>(`${this.urlBase}/v1/canales/${id}`, canal);
  }

  eliminarCanal(id: string): Observable<any> {
    return this.http.delete<any>(`${this.urlBase}/v1/canales/${id}`);
  }

  // Métodos para la relación entre bodegas y canales
  getBodegasPorCanal(canalId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.urlBase}/v1/canales/${canalId}/bodegas`);
  }

  asignarBodegaACanal(canalId: string, bodegaId: string): Observable<any> {
    return this.http.post<any>(`${this.urlBase}/v1/canales/${canalId}/bodegas`, { bodegaId });
  }

  removerBodegaDeCanal(canalId: string, bodegaId: string): Observable<any> {
    return this.http.delete<any>(`${this.urlBase}/v1/canales/${canalId}/canales/${bodegaId}`);
  }

  getCompanyNotificationPreferences(companyName: string): Observable<any> {
    return this.http.get<any>(`${this.urlBase}/v1/notification-preferences/company/${encodeURIComponent(companyName)}`);
  }

  saveCompanyNotificationPreferences(companyName: string, preferences: any): Observable<any> {
    return this.http.put<any>(`${this.urlBase}/v1/notification-preferences/company/${encodeURIComponent(companyName)}`, preferences);
  }

  // Pedidos que contienen este producto
  getPedidosByProducto(productoId: string, page = 1, pageSize = 20): Observable<any> {
    const params = new HttpParams()
      .set('productoId', productoId)
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get<any>(`${this.urlBase}/v1/orders/all`, { params });
  }

  // Historial de cambios del producto
  getProductoHistorial(productoId: string): Observable<any> {
    return this.http.get<any>(`${this.urlBase}/v1/productos/historial/${productoId}`);
  }
}
