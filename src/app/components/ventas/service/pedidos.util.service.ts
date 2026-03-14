import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject, forkJoin, Observable, of, timer, EMPTY } from "rxjs";
import { MaestroService } from "../../../shared/services/maestros/maestro.service";
import { CacheService } from "../../../shared/services/cache/cache.service";
import Swal from "sweetalert2";
import { parse } from "flatted";
import { Pedido } from "../modelo/pedido";
import { map, catchError, retry, shareReplay, switchMap, takeUntil, filter, timeout, take } from 'rxjs/operators';

interface MaestrosData {
    formaEntrega: any[];
    tiempoEntrega: any[];
    tipoEntrega: any[];
    ocasiones: any[];
    generos: any[];
    formasPago: any[];
    categorias: any[];
    adiciones: any[];
}

interface RawMaestrosData {
    formaEntrega: any;
    tiempoEntrega: any;
    tipoEntrega: any;
    ocasiones: any;
    generos: any;
    formasPago: any;
    categorias: any;
    adiciones: any;
}

interface MaestrosState {
    loading: boolean;
    loaded: boolean;
    error: boolean;
    lastUpdate: Date | null;
    data: MaestrosData | null;
}

@Injectable({
    providedIn: "root",
})
export class PedidosUtilService {
    private CACHE_KEY = 'pedidos_maestros';
    private CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutos como solicitado
    private AUTO_RELOAD_INTERVAL = 5 * 60 * 1000; // Auto reload cada 5 minutos
    private RETRY_ATTEMPTS = 3;

    public maestrosPedidos: BehaviorSubject<any> = new BehaviorSubject<any>([]);
    private maestrosState: BehaviorSubject<MaestrosState> = new BehaviorSubject<MaestrosState>({
        loading: false,
        loaded: false,
        error: false,
        lastUpdate: null,
        data: null
    });
    
    private productInCart: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);
    private empresaActual: any;
    private formaEntrega: any[] = [];
    private tiempoEntrega: any[] = [];
    private tipoEntrega: any[] = [];
    private ocasiones: any[] = [];
    private generos: any[] = [];
    private formasPago: any[] = [];
    private categorias: any[] = [];
    private adiciones: any[] = [];
    
    // Observable para controlar la limpieza de recursos
    private destroy$ = new BehaviorSubject<boolean>(false);

    constructor(
        private maestroService: MaestroService,
        private cacheService: CacheService
    ) {
        this.initializeCart();
        // No cargar automáticamente en constructor - será manejado desde AuthService
    }

    /**
     * Inicialización de maestros - llamado desde AuthService después del login
     */
    public initializeMaestros(): void {
        const user = localStorage.getItem('user');
        if (user) {
            this.warmupCriticalData();
            this.loadMaestrosInBackground();
            this.setupAutoReload();
        }
    }

    /**
     * Pre-carga datos críticos para el mercado colombiano
     */
    private warmupCriticalData(): void {
        console.log('🔥 Iniciando cache warming para datos críticos...');
        
        // Pre-cargar formas de pago (crítico para Colombia)
        this.maestroService.consultarFormaPago().pipe(
            takeUntil(this.destroy$),
            catchError(error => {
                console.warn('⚠️ Error pre-cargando formas de pago:', error);
                return of([]);
            })
        ).subscribe(formasPago => {
            if (Array.isArray(formasPago) && formasPago.length > 0) {
                this.formasPago = formasPago;
                console.log('✅ Formas de pago pre-cargadas:', formasPago.length);
            }
        });

        // Pre-cargar géneros y ocasiones (críticos para personalización)
        const criticalWarmup$ = forkJoin({
            generos: this.maestroService.consultarGenero().pipe(catchError(() => of([]))),
            ocasiones: this.maestroService.consultarOcasion().pipe(catchError(() => of([])))
        });

        criticalWarmup$.pipe(
            takeUntil(this.destroy$)
        ).subscribe({
            next: (results) => {
                if (Array.isArray(results.generos)) {
                    this.generos = results.generos;
                }
                if (Array.isArray(results.ocasiones)) {
                    this.ocasiones = results.ocasiones;
                }
                console.log('✅ Datos críticos pre-cargados - Géneros:', this.generos.length, 'Ocasiones:', this.ocasiones.length);
            },
            error: (error) => {
                console.warn('⚠️ Error en cache warming crítico:', error);
            }
        });
    }

    /**
     * Carga maestros en segundo plano sin bloquear UI
     */
    private loadMaestrosInBackground(): void {
        // Usar timer para ejecutar en el siguiente tick, evitando bloqueo
        timer(100).pipe(
            switchMap(() => this.getAllMaestros()),
            takeUntil(this.destroy$)
        ).subscribe({
            next: () => {
                console.log('Maestros cargados exitosamente en segundo plano');
            },
            error: (error) => {
                console.error('Error cargando maestros en segundo plano:', error);
            }
        });
    }

    /**
     * Configura la recarga automática cada 5 minutos
     */
    private setupAutoReload(): void {
        timer(this.AUTO_RELOAD_INTERVAL, this.AUTO_RELOAD_INTERVAL).pipe(
            switchMap(() => {
                console.log('Recarga automática de maestros...');
                return this.forceReloadMaestros();
            }),
            takeUntil(this.destroy$)
        ).subscribe({
            next: () => {
                console.log('Recarga automática completada');
            },
            error: (error) => {
                console.warn('Error en recarga automática:', error);
            }
        });
    }

    private initializeCart(): void {
        const carritoStr = localStorage.getItem('carrito');
        if (carritoStr) {
            try {
                const carrito = JSON.parse(carritoStr);
                this.productInCart.next(Array.isArray(carrito) ? carrito : []);
            } catch (e) {
                this.productInCart.next([]);
                localStorage.removeItem('carrito');
            }
        }
    }

    addToCart(ProductoCompra: any): void {
        const currentCart = this.productInCart.value;
        const updatedCart = [...currentCart, ProductoCompra];
        localStorage.setItem('carrito', JSON.stringify(updatedCart));
        this.productInCart.next(updatedCart);
    }

    getAllMaestros(): Observable<MaestrosData> {
        this.updateState({ loading: true, error: false });
        
        const empresaStr = localStorage.getItem("currentCompany");
        this.empresaActual = empresaStr ? JSON.parse(empresaStr) : {};
        const cacheKey = `${this.CACHE_KEY}_${this.empresaActual?.nomComercial}`;

        const fetchFreshData = (): Observable<MaestrosData> => {
            return forkJoin({
                formaEntrega: this.maestroService.getFormaEntrega().pipe(
                    catchError(error => {
                        console.warn('Error cargando formaEntrega:', error);
                        return of([]);
                    })
                ),
                tiempoEntrega: this.maestroService.getTiempoEntrega().pipe(
                    catchError(error => {
                        console.warn('Error cargando tiempoEntrega:', error);
                        return of([]);
                    })
                ),
                tipoEntrega: this.maestroService.getTipoEntrega().pipe(
                    catchError(error => {
                        console.warn('Error cargando tipoEntrega:', error);
                        return of([]);
                    })
                ),
                ocasiones: this.maestroService.consultarOcasion().pipe(
                    catchError(error => {
                        console.warn('Error cargando ocasiones:', error);
                        return of([]);
                    })
                ),
                generos: this.maestroService.consultarGenero().pipe(
                    catchError(error => {
                        console.warn('Error cargando generos:', error);
                        return of([]);
                    })
                ),
                formasPago: this.maestroService.consultarFormaPago().pipe(
                    catchError(error => {
                        console.warn('Error cargando formasPago:', error);
                        return of([]);
                    })
                ),
                categorias: this.maestroService.getCategorias().pipe(
                    catchError(error => {
                        console.warn('Error cargando categorias:', error);
                        return of([]);
                    })
                ),
                adiciones: this.maestroService.getAdiciones().pipe(
                    catchError(error => {
                        console.warn('Error cargando adiciones:', error);
                        return of([]);
                    })
                )
        }).pipe(
            map((results: RawMaestrosData): MaestrosData => {
                const processedResults: MaestrosData = {
                    formaEntrega: Array.isArray(results.formaEntrega) ? results.formaEntrega : [],
                    tiempoEntrega: Array.isArray(results.tiempoEntrega) ? results.tiempoEntrega : [],
                    tipoEntrega: Array.isArray(results.tipoEntrega) ? results.tipoEntrega : [],
                    ocasiones: Array.isArray(results.ocasiones) ? results.ocasiones : [],
                    generos: Array.isArray(results.generos) ? results.generos : [],
                    formasPago: Array.isArray(results.formasPago) ? results.formasPago : [],
                    adiciones: Array.isArray(results.adiciones) ? results.adiciones : [],
                    categorias: []
                };

                try {
                    const categoriasData = results.categorias;
                    if (Array.isArray(categoriasData) && categoriasData.length > 0) {
                        const categoriasRaw = categoriasData[0]?.categoria;
                        if (categoriasRaw) {
                            processedResults.categorias = parse(categoriasRaw).map(p => this.mapCategoria(p));
                        }
                    }
                } catch (e) {
                    console.error('Error procesando categorías:', e);
                        processedResults.categorias = [];
                }

                return processedResults;
            }),
                retry(this.RETRY_ATTEMPTS),
                shareReplay(1)
        );
        };

        return this.cacheService.get(
            cacheKey,
            fetchFreshData,
            this.CACHE_EXPIRY
        ).pipe(
            map((results: MaestrosData) => {
                // Actualizar las propiedades del servicio
                this.formaEntrega = results.formaEntrega || [];
                this.tiempoEntrega = results.tiempoEntrega || [];
                this.tipoEntrega = results.tipoEntrega || [];
                this.ocasiones = results.ocasiones || [];
                this.generos = results.generos || [];
                this.formasPago = results.formasPago || [];
                this.categorias = results.categorias || [];
                this.adiciones = results.adiciones || [];

                const maestrosData = {
                    empresaActual: this.empresaActual,
                    formaEntrega: this.formaEntrega,
                    tiempoEntrega: this.tiempoEntrega,
                    tipoEntrega: this.tipoEntrega,
                    ocasiones: this.ocasiones,
                    generos: this.generos,
                    formasPago: this.formasPago,
                    categorias: this.categorias,
                    adiciones: this.adiciones
                };

                // Emitir los datos actualizados
                this.maestrosPedidos.next(maestrosData);
                this.updateState({ 
                    loading: false, 
                    loaded: true, 
                    error: false, 
                    lastUpdate: new Date(),
                    data: results 
                });

                return results;
            }),
            catchError(error => {
                console.error('Error al obtener maestros:', error);
                this.updateState({ loading: false, error: true });
                
                // Intentar usar datos del estado si están disponibles
                const currentState = this.maestrosState.value;
                if (currentState.data) {
                    console.warn('Usando datos del caché local debido a error');
                    return of(currentState.data);
                }
                
                // Mostrar error solo si no hay datos disponibles
                this.showErrorNotification();
                return EMPTY;
            })
        );
    }

    private updateState(update: Partial<MaestrosState>): void {
        const currentState = this.maestrosState.value;
        this.maestrosState.next({ ...currentState, ...update });
    }

    private showErrorNotification(): void {
                Swal.fire({
            title: 'Error de Conexión',
            text: 'No se pudieron cargar los datos maestros. Se reintentará automáticamente.',
            icon: 'warning',
            confirmButtonText: 'Aceptar',
            timer: 3000,
            timerProgressBar: true
        });
    }

    convertFechaEntregaString(fechaEntrega: { day: number, month: number, year: number }) {
        if (!fechaEntrega) {
            return '';
        }
        return `${fechaEntrega.day}/${fechaEntrega.month}/${fechaEntrega.year}`;
    }

    /**
     * Versión mejorada de getAllMaestro$ con mejor lógica de validación
     */
    getAllMaestro$(): Observable<any> {
        // Verificar si los datos están completos y válidos
        if (this.areMaestrosDataComplete()) {
            const maestrosData = this.buildMaestrosData();
            this.maestrosPedidos.next(maestrosData);
            return this.maestrosPedidos.asObservable();
        }

        // Si no están completos, cargar datos
        return this.getAllMaestros().pipe(
            map(() => this.buildMaestrosData()),
            catchError(error => {
                console.error('Error en getAllMaestro$:', error);
                // Devolver datos parciales si están disponibles
                const maestrosData = this.buildMaestrosData();
                this.maestrosPedidos.next(maestrosData);
                return this.maestrosPedidos.asObservable();
            })
        );
    }

    /**
     * Verifica si los datos maestros están completos
     */
    private areMaestrosDataComplete(): boolean {
        const requiredArrays = [
            this.formaEntrega,
            this.tiempoEntrega,
            this.tipoEntrega,
            this.ocasiones,
            this.generos,
            this.formasPago,
            this.categorias,
            this.adiciones
        ];

        // Verificar que todos los arrays estén definidos (pueden ser vacíos, pero no undefined)
        return requiredArrays.every(arr => Array.isArray(arr)) && this.empresaActual;
    }

    /**
     * Construye el objeto de datos maestros
     */
    public buildMaestrosData(): any {
        return {
            empresaActual: this.empresaActual,
            formaEntrega: this.formaEntrega || [],
            tiempoEntrega: this.tiempoEntrega || [],
            tipoEntrega: this.tipoEntrega || [],
            ocasiones: this.ocasiones || [],
            generos: this.generos || [],
            formasPago: this.formasPago || [],
            categorias: this.categorias || [],
            adiciones: this.adiciones || []
        };
    }

    /**
     * Obtiene el estado actual de los maestros
     */
    getMaestrosState(): Observable<MaestrosState> {
        return this.maestrosState.asObservable();
    }

    /**
     * Espera hasta que los maestros estén completamente cargados
     * @param timeoutMs Timeout en milisegundos (default: 10 segundos)
     * @returns Observable que emite true cuando los maestros están listos
     */
    waitUntilLoaded(timeoutMs: number = 10000): Observable<boolean> {
        return new Observable<boolean>(observer => {
            const currentState = this.maestrosState.value;
            
            // Si ya están cargados, emitir inmediatamente
            if (currentState.loaded && !currentState.error && this.areMaestrosDataComplete()) {
                observer.next(true);
                observer.complete();
                return;
            }

            // Si hay error y no hay datos, intentar recargar
            if (currentState.error && !currentState.data) {
                console.log('Maestros en error, intentando recargar...');
                this.forceReloadMaestros().subscribe({
                    next: () => {
                        observer.next(true);
                        observer.complete();
                    },
                    error: (err) => {
                        console.error('Error recargando maestros:', err);
                        observer.error(new Error('No se pudieron cargar los datos maestros'));
                    }
                });
                return;
            }

            // Esperar hasta que se carguen
            const subscription = this.maestrosState.pipe(
                filter(state => state.loaded && !state.error),
                map(() => this.areMaestrosDataComplete()),
                filter(complete => complete),
                timeout(timeoutMs),
                take(1)
            ).subscribe({
                next: () => {
                    observer.next(true);
                    observer.complete();
                },
                error: (err) => {
                    if (err.name === 'TimeoutError') {
                        console.error('Timeout esperando maestros');
                        observer.error(new Error('Timeout esperando datos maestros'));
                    } else {
                        console.error('Error esperando maestros:', err);
                        observer.error(err);
                    }
                }
            });

            // Cleanup en caso de unsubscribe
            return () => subscription.unsubscribe();
        });
    }

    /**
     * Verifica si los maestros están listos de forma síncrona
     * @returns true si los maestros están cargados y completos
     */
    isMaestrosReady(): boolean {
        const state = this.maestrosState.value;
        return state.loaded && !state.error && this.areMaestrosDataComplete();
    }

    //setear productos en el carrito
    setProductInCart() {
        let products = JSON.parse(localStorage.getItem("carrito") || "[]");
        this.productInCart.next(products);
    }
    //remover producto
    removeProduct(producto: any) {
        let products = JSON.parse(localStorage.getItem("carrito") || "[]");
        const index = products.findIndex((p: any) => p.producto.crearProducto.cd === producto.producto.crearProducto.cd);
        if (index !== -1) {
            products.splice(index, 1);
            localStorage.setItem("carrito", JSON.stringify(products));
        }
        this.productInCart.next(products);
    }

    //limpiar carrito
    clearCart() {
        localStorage.removeItem("carrito");
        this.productInCart.next([]);
    }

    private mapCategoria(p: any): any {
        return {
            label: p.data?.nombre,
            data: p.data,
            children: p.children ? p.children.map(sub => this.mapCategoria(sub)) : null
        };
    }

    //calcular valores del pedido
    pedido: Pedido;

    /**
     * Calcula el precio unitario sin IVA considerando escalas de volumen
     */
    private calcularPrecioUnitarioSinIVA(itemCarrito: any): number {
        const producto = itemCarrito.producto;
        const cantidad = itemCarrito.cantidad;

        if (!producto?.precio) {
            return 0;
        }

        // PRIORIDAD 0: Si tiene precio manual override, calcular sin IVA a partir del precio con IVA manual
        if (itemCarrito._precioManualOverride !== undefined && itemCarrito._precioManualOverride !== null) {
            const precioManualConIva = Number(itemCarrito._precioManualOverride) || 0;
            const porcentajeIva = (itemCarrito._ivaManualOverride !== undefined && itemCarrito._ivaManualOverride !== null)
                ? Number(itemCarrito._ivaManualOverride)
                : Number(producto?.precio?.precioUnitarioIva) || 0;
            return precioManualConIva / (1 + porcentajeIva / 100);
        }

        // 🔒 Si el producto tiene precio por categoría de cliente, usar precio fijo SIN escalar por volumen
        if (producto._precioAplicadoPorCategoria) {
            return Number(producto.precio.precioUnitarioSinIva) || 0;
        }

        const preciosVolumen = producto.precio.preciosVolumen || [];

        // Si no hay precios por volumen, usar precio base
        if (preciosVolumen.length === 0) {
            return Number(producto.precio.precioUnitarioSinIva) || 0;
        }

        // ✅ CORREGIDO: Filtrar solo rangos con límites válidos definidos
        const rangosValidos = preciosVolumen.filter((x: any) => {
            const tieneMinimo = x?.numeroUnidadesInicial !== undefined && x?.numeroUnidadesInicial !== null;
            const tieneMaximo = x?.numeroUnidadesLimite !== undefined && x?.numeroUnidadesLimite !== null;
            return tieneMinimo && tieneMaximo;
        });

        // Buscar el precio por volumen que aplique para esta cantidad
        const precioVolumen = rangosValidos.find((x: any) => {
            const min = Number(x.numeroUnidadesInicial) || 0;
            const max = Number(x.numeroUnidadesLimite) || Infinity;
            return cantidad >= min && cantidad <= max;
        });

        // Si se encuentra un precio por volumen, usarlo; sino usar precio base
        if (precioVolumen) {
            return Number(precioVolumen.valorUnitarioPorVolumenSinIVA) || 0;
        } else {
            return Number(producto.precio.precioUnitarioSinIva) || 0;
        }
    }

    /**
     * Calcula el precio unitario con IVA considerando escalas de volumen
     */
    private calcularPrecioUnitarioConIVA(itemCarrito: any): number {
        const producto = itemCarrito.producto;
        const cantidad = itemCarrito.cantidad;

        if (!producto?.precio) {
            return 0;
        }

        // PRIORIDAD 0: Si tiene precio manual override, usarlo directamente
        if (itemCarrito._precioManualOverride !== undefined && itemCarrito._precioManualOverride !== null) {
            return Number(itemCarrito._precioManualOverride) || 0;
        }

        // 🔒 Si el producto tiene precio por categoría de cliente, usar precio fijo SIN escalar por volumen
        if (producto._precioAplicadoPorCategoria) {
            return Number(producto.precio.precioUnitarioConIva) || 0;
        }

        const preciosVolumen = producto.precio.preciosVolumen || [];

        // Si no hay precios por volumen, usar precio base
        if (preciosVolumen.length === 0) {
            return Number(producto.precio.precioUnitarioConIva) || 0;
        }

        // ✅ CORREGIDO: Filtrar solo rangos con límites válidos definidos
        const rangosValidos = preciosVolumen.filter((x: any) => {
            const tieneMinimo = x?.numeroUnidadesInicial !== undefined && x?.numeroUnidadesInicial !== null;
            const tieneMaximo = x?.numeroUnidadesLimite !== undefined && x?.numeroUnidadesLimite !== null;
            return tieneMinimo && tieneMaximo;
        });

        // Buscar el precio por volumen que aplique para esta cantidad
        const precioVolumen = rangosValidos.find((x: any) => {
            const min = Number(x.numeroUnidadesInicial) || 0;
            const max = Number(x.numeroUnidadesLimite) || Infinity;
            return cantidad >= min && cantidad <= max;
        });

        // Si se encuentra un precio por volumen, usarlo; sino usar precio base
        if (precioVolumen) {
            return Number(precioVolumen.valorUnitarioPorVolumenConIVA) || 0;
        } else {
            return Number(producto.precio.precioUnitarioConIva) || 0;
        }
    }

    getSubtotal(): number {
        let totalPrecioSinIVADef = 0;
        if (this.pedido && this.pedido.carrito) {

            this.pedido.carrito.forEach((itemCarrito: any) => {
                // Calcular precio base del producto con escalas de volumen
                const precioUnitarioSinIVA = this.calcularPrecioUnitarioSinIVA(itemCarrito);
                let totalPrecioSinIVA = precioUnitarioSinIVA * itemCarrito.cantidad;

                // Sumar precios de adiciones
                if (itemCarrito.configuracion && itemCarrito.configuracion.adiciones) {
                    itemCarrito.configuracion.adiciones.forEach(adicion => {
                        totalPrecioSinIVA += (adicion['cantidad'] * adicion['referencia']['precioUnitario']) * itemCarrito.cantidad;
                    });
                }

                // Sumar precios de preferencias
                if (itemCarrito.configuracion && itemCarrito.configuracion.preferencias) {
                    itemCarrito.configuracion.preferencias.forEach(preferencia => {
                        totalPrecioSinIVA += (preferencia['valorUnitarioSinIva']) * itemCarrito.cantidad;
                    });
                }
                
                totalPrecioSinIVADef += totalPrecioSinIVA;
            });

        }
        
        // ✅ SOLUCIÓN: NO incluir el envío aquí para evitar duplicación
        // El envío se sumará manualmente en actualizarValoresPedido()
        console.log('💰 SUBTOTAL - Solo productos (sin envío):', {
            subtotalProductos: totalPrecioSinIVADef,
            totalEnvio: this.pedido?.totalEnvio || 0
        });
        
        return totalPrecioSinIVADef;
    }
    
    /**
     * 🔄 NUEVO: Obtener subtotal solo de productos (sin envío)
     * Útil para casos donde se necesita el subtotal base
     */
    getSubtotalSinEnvio(): number {
        let totalPrecioSinIVADef = 0;
        if (this.pedido && this.pedido.carrito) {

            this.pedido.carrito.forEach((itemCarrito: any) => {
                // Calcular precio base del producto con escalas de volumen
                const precioUnitarioSinIVA = this.calcularPrecioUnitarioSinIVA(itemCarrito);
                let totalPrecioSinIVA = precioUnitarioSinIVA * itemCarrito.cantidad;

                // Sumar precios de adiciones
                if (itemCarrito.configuracion && itemCarrito.configuracion.adiciones) {
                    itemCarrito.configuracion.adiciones.forEach(adicion => {
                        totalPrecioSinIVA += (adicion['cantidad'] * adicion['referencia']['precioUnitario']) * itemCarrito.cantidad;
                    });
                }

                // Sumar precios de preferencias
                if (itemCarrito.configuracion && itemCarrito.configuracion.preferencias) {
                    itemCarrito.configuracion.preferencias.forEach(preferencia => {
                        totalPrecioSinIVA += (preferencia['valorUnitarioSinIva']) * itemCarrito.cantidad;
                    });
                }
                
                totalPrecioSinIVADef += totalPrecioSinIVA;
            });

        }
        
        return totalPrecioSinIVADef;
    }
    /**
     * Calcula el IVA unitario considerando escalas de volumen
     */
    private calcularIVAUnitario(itemCarrito: any): number {
        const producto = itemCarrito.producto;
        const cantidad = itemCarrito.cantidad;

        if (!producto?.precio) {
            return 0;
        }

        // 🔒 Si el producto tiene precio por categoría de cliente, usar IVA fijo SIN escalar por volumen
        if (producto._precioAplicadoPorCategoria) {
            return Number(producto.precio.valorIva) || 0;
        }

        const preciosVolumen = producto.precio.preciosVolumen || [];

        // Si no hay precios por volumen, usar IVA base
        if (preciosVolumen.length === 0) {
            return Number(producto.precio.valorIva) || 0;
        }

        // ✅ CORREGIDO: Filtrar solo rangos con límites válidos definidos
        const rangosValidos = preciosVolumen.filter((x: any) => {
            const tieneMinimo = x?.numeroUnidadesInicial !== undefined && x?.numeroUnidadesInicial !== null;
            const tieneMaximo = x?.numeroUnidadesLimite !== undefined && x?.numeroUnidadesLimite !== null;
            return tieneMinimo && tieneMaximo;
        });

        // Buscar el precio por volumen que aplique para esta cantidad
        const precioVolumen = rangosValidos.find((x: any) => {
            const min = Number(x.numeroUnidadesInicial) || 0;
            const max = Number(x.numeroUnidadesLimite) || Infinity;
            return cantidad >= min && cantidad <= max;
        });

        // Si se encuentra un precio por volumen, usar su IVA; sino usar IVA base
        if (precioVolumen) {
            return Number(precioVolumen.valorUnitarioPorVolumenIva) || 0;
        } else {
            return Number(producto.precio.valorIva) || 0;
        }
    }

    checkIVAPrice() {
        let totalPrecioIVA = 0;

        this.pedido.carrito?.forEach((itemCarrito: any) => {
            // Calcular IVA base del producto con escalas de volumen
            const ivaUnitario = this.calcularIVAUnitario(itemCarrito);
            totalPrecioIVA += ivaUnitario * itemCarrito.cantidad;

            // Sumar precios de adiciones
            if (itemCarrito.configuracion && itemCarrito.configuracion.adiciones) {
                itemCarrito.configuracion.adiciones.forEach(adicion => {
                    totalPrecioIVA += (adicion['cantidad'] * adicion['referencia']['precioIva']) * itemCarrito.cantidad;
                });
            }

            // Sumar precios de preferencias
            if (itemCarrito.configuracion && itemCarrito.configuracion.preferencias) {
                itemCarrito.configuracion.preferencias.forEach(preferencia => {
                    totalPrecioIVA += preferencia['valorIva'] * itemCarrito.cantidad;
                });
            }
        });

        return totalPrecioIVA;
    }

    getTotalToPay(shipinCost: number): number {
        // ✅ SOLUCIÓN: El subtotal ya incluye el envío desde actualizarValoresPedido()
        // shipinCost se mantiene por compatibilidad pero ya no se suma
        const subtotalConEnvio = this.pedido?.totalPedidoSinDescuento || this.getSubtotal();
        const totalConDescuento = subtotalConEnvio - this.getDiscount();
        
        console.log('💰 TOTAL TO PAY - Cálculo final:', {
            subtotalConEnvio,
            descuento: this.getDiscount(),
            totalConDescuento,
            shipinCost // Solo para debug, ya no se suma
        });
        
        return totalConDescuento;
    }

    getShippingCost(allBillingZone): number {
        // Si es "Recoge en Tienda", el envío es 0
        if (this.pedido?.formaEntrega?.toLowerCase()?.includes('recoge')) {
            return 0;
        }

        // Si el pedido tiene totalEnvio en 0 explícitamente (para recoge), respetar eso
        if (this.pedido?.totalEnvio === 0 && this.pedido?.envio?.valorZonaCobro === 0) {
            return 0;
        }

        // Si el pedido ya tiene valorZonaCobro, usarlo directamente como prioridad
        if (this.pedido?.envio?.valorZonaCobro && this.pedido.envio.valorZonaCobro > 0) {
            return this.pedido.envio.valorZonaCobro;
        }

        // Intentar buscar en allBillingZone si está disponible
        if (allBillingZone && Array.isArray(allBillingZone) && allBillingZone.length > 0) {
            if (this.pedido && this.pedido.envio?.zonaCobro && this.pedido.envio?.ciudad) {
                const ciudadPedido = this.pedido.envio.ciudad?.toString().toLowerCase().trim();
                const zonaPedido = this.pedido.envio.zonaCobro?.toString().toLowerCase().trim();

                const valorFlete = allBillingZone.filter((item) => {
                    const ciudadItem = item.ciudad?.toString().toLowerCase().trim();
                    const zonaItem = item.nombreZonaCobro?.toString().toLowerCase().trim();
                    return ciudadItem === ciudadPedido && zonaItem === zonaPedido;
                });

                if (valorFlete.length > 0) {
                    return valorFlete[0].valorZonaCobro || 0;
                }
            }
        }

        return 0;
    }
    getShippingTaxCost(allBillingZone): number {
        // Si es "Recoge en Tienda", no hay impuesto de envío
        if (this.pedido?.formaEntrega?.toLowerCase()?.includes('recoge')) {
            return 0;
        }

        if (!allBillingZone || !Array.isArray(allBillingZone) || allBillingZone.length === 0) {
            return 0;
        }

        if (this.pedido && this.pedido.envio?.zonaCobro && this.pedido.envio?.ciudad) {
            const ciudadPedido = this.pedido.envio.ciudad?.toString().toLowerCase().trim();
            const zonaPedido = this.pedido.envio.zonaCobro?.toString().toLowerCase().trim();

            const valorFlete = allBillingZone.filter((item) => {
                const ciudadItem = item.ciudad?.toString().toLowerCase().trim();
                const zonaItem = item.nombreZonaCobro?.toString().toLowerCase().trim();
                return ciudadItem === ciudadPedido && zonaItem === zonaPedido;
            });

            if (valorFlete.length > 0) {
                return valorFlete[0].impuesto || 0;
            }
        }
        return 0;
    }
    getShippingTaxCostInvoice(allBillingZone, pedido): number {
        if (!allBillingZone || !Array.isArray(allBillingZone)) {
            return 0;
        }

        if (pedido && pedido.envio?.zonaCobro && pedido.envio?.ciudad) {
            const valorFlete = allBillingZone.filter((item => item.ciudad === pedido.envio?.ciudad && item.nombreZonaCobro === pedido.envio?.zonaCobro))
            if (valorFlete.length > 0)
                return valorFlete[0].impuesto;
            else
                return 0;
        }
        return 0;
    }
    getShippingTaxValue(allBillingZone): string {
        if (!allBillingZone || !Array.isArray(allBillingZone)) {
            return "";
        }

        if (this.pedido && this.pedido.envio?.zonaCobro && this.pedido.envio?.ciudad) {
            const valorFlete = allBillingZone.filter((item => item.ciudad === this.pedido.envio?.ciudad && item.nombreZonaCobro === this.pedido.envio?.zonaCobro))
            if (valorFlete.length > 0)
                return valorFlete[0].impuestoZonaCobro;
            else
                return "";
        }
        return "";
    }

    getShippingTaxValueInvoice(allBillingZone, pedido): string {
        if (!allBillingZone || !Array.isArray(allBillingZone)) {
            return "";
        }

        if (pedido && pedido.envio?.zonaCobro && pedido.envio?.ciudad) {
            const valorFlete = allBillingZone.filter((item => item.ciudad === pedido.envio?.ciudad && item.nombreZonaCobro === pedido.envio?.zonaCobro))
            if (valorFlete.length > 0)
                return valorFlete[0].impuestoZonaCobro;
            else
                return "";
        }
        return "";
    }

    getDiscount(): number {
        if (this.pedido && this.pedido.porceDescuento) {
            // 🔄 NUEVO: Los descuentos se aplican solo a productos, no al envío
            const subtotalProductos = this.getSubtotalSinEnvio();
            const descuento = subtotalProductos * ((this.pedido.porceDescuento) / 100);
            
            console.log('💰 DESCUENTO - Cálculo:', {
                subtotalProductos,
                porcentajeDescuento: this.pedido.porceDescuento,
                descuentoCalculado: descuento
            });
            
            return descuento;
        }
        return 0;
    }

    /**
     * Método para limpiar el caché de maestros
     */
    clearMaestrosCache(): void {
        const cacheKey = `${this.CACHE_KEY}_${this.empresaActual?.nomComercial}`;
        this.cacheService.clearCacheEntry(cacheKey);
    }

    /**
     * Método para forzar una recarga de maestros
     */
    forceReloadMaestros(): Observable<MaestrosData> {
        this.clearMaestrosCache();
        return this.getAllMaestros();
    }

    /**
     * Método para limpiar recursos al destruir el servicio
     */
    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.complete();
    }
}
