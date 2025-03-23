import { Injectable, OnDestroy } from '@angular/core';
import { Subject, BehaviorSubject, fromEvent } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { Router } from '@angular/router';
import { CartSingletonService } from './ventas/cart.singleton.service';
import { UtilsService } from './utils.service';

// Menu
export interface Menu {
	headTitle1?: string,
	headTitle2?: string,
	path?: string;
	title?: string;
	icon?: string;
	type?: string;
	badgeType?: string;
	badgeValue?: string;
	active?: boolean;
	bookmark?: boolean;
	children?: Menu[];
	isOnlySuperAdministrador?: boolean;
}

@Injectable({
	providedIn: 'root'
})

export class NavService implements OnDestroy {

	private unsubscriber: Subject<any> = new Subject();
	public screenWidth: BehaviorSubject<number> = new BehaviorSubject(window.innerWidth);

	// Search Box
	public search: boolean = false;

	// Language
	public language: boolean = false;

	// Mega Menu
	public megaMenu: boolean = false;
	public levelMenu: boolean = false;
	public megaMenuColapse: boolean = window.innerWidth < 1199 ? true : false;

	// For Horizontal Layout Mobile
	public horizontal: boolean = window.innerWidth < 991 ? false : true;

	// Collapse Sidebar
	public collapseSidebar: boolean = window.innerWidth < 991 ? true : false;

	isAdmin: boolean = (() => {
		const user = localStorage.getItem('user');
		if (user) {
			const parsedUser = JSON.parse(user);
			return parsedUser.rol === 'Administrador' && parsedUser.company == 'Julsmind';
		}
		return false;
	})();
	// Full screen
	public fullScreen: boolean = false;
	ALLMENUITEMS: Menu[];

	constructor(private router: Router,
		private cartSingleton: CartSingletonService,
		private utils: UtilsService
	) {

		this.refrescarCart();

		this.setScreenWidth(window.innerWidth);
		fromEvent(window, 'resize').pipe(
			debounceTime(1000),
			takeUntil(this.unsubscriber)
		).subscribe((evt: any) => {
			this.setScreenWidth(evt.target.innerWidth);
			if (evt.target.innerWidth < 991) {
				this.collapseSidebar = true;
				this.megaMenu = false;
				this.levelMenu = false;
			}
			if (evt.target.innerWidth < 1199) {
				this.megaMenuColapse = true;
			}
		});
		if (window.innerWidth < 991) { // Detect Route change sidebar close
			this.router.events.subscribe(event => {
				this.collapseSidebar = true;
				this.megaMenu = false;
				this.levelMenu = false;
			});
		}
		this.ALLMENUITEMS = this.utils.deepClone(this.MENUITEMS);
		this.filterMenuItemsByAuthorization();
	}

	refrescarCart() {
		this.cartSingleton.refreshCart().subscribe({
			next: (products: any[]) => {
				console.log('products', products);
			}
		})
	}

	ngOnDestroy() {
		this.unsubscriber.complete();
	}

	private setScreenWidth(width: number): void {
		this.screenWidth.next(width);
	}

	getMenuItems(): Menu[] {
		return this.ALLMENUITEMS;
	}

	filterMenuItemsByAuthorization() {
		const authorizedPaths = JSON.parse(localStorage.getItem('authorizedMenuItems') || '[]').map((item: any) => item.path);
		const filteredMenu = this.MENUITEMS.map(item => {
			if (item.headTitle1) {
				// Si es un encabezado, eliminar cualquier propiedad children
				const header = { ...item };
				delete header.children;
				return header;
			}
			if (item.children) {
				// Filtrar hijos autorizados
				const filteredChildren = item.children.filter(child => authorizedPaths.includes(child.path));
				return filteredChildren.length > 0 ? { ...item, children: filteredChildren } : null;
			}
			return authorizedPaths.includes(item.path) ? item : null;
		}).filter(item => item !== null) as any[];

		// Remover encabezados consecutivos: Si hay dos items consecutivos con "headTitle1", se elimina el segundo
		const finalMenu: Menu[] = [];
		filteredMenu.forEach(item => {
			if ((item as Menu).headTitle1 && finalMenu.length && (finalMenu[finalMenu.length - 1] as Menu).headTitle1) {
				// Omitir este encabezado ya que es consecutivo
			} else {
				finalMenu.push(item);
			}
		});

		this.MENUITEMS = finalMenu;
		this.items.next(this.MENUITEMS);
	}

	MENUITEMS: Menu[] = [

		{
			headTitle1: 'Ventas'
		},
		{
			title: 'Clientes', icon: 'user-check', type: 'sub', badgeType: 'success', badgeValue: '', active: false, children: [
				{ path: 'ventas/clientes', title: 'Crear Clientes', type: 'link' },
				{ path: 'ventas/clienteslista', title: 'Lista de clientes', type: 'link' },
				{ path: 'proceso/ocasiones', title: 'Ocasiones', type: 'link' },
				{ path: 'proceso/generos', title: 'Géneros', type: 'link' },
			]
		},
		{
			title: 'Ventas', icon: 'dollar-sign', type: 'sub', badgeType: 'success', badgeValue: '', active: false, children: [
				{ path: 'ventas/crear-ventas', title: 'Crear Venta', type: 'link' },
				{ path: 'ventas/carga-ventas', title: 'Cargar Ventas', type: 'link' },
				{ path: 'ventas/pedidos', title: 'Lista de pedidos', type: 'link' },
				{ path: 'pos/ventas', title: 'Ventas POS', type: 'link' },
				{ path: 'pos/list-ventas', title: 'Listado Ventas POS', type: 'link' }
			]
		},

		{
			headTitle1: 'Producción'
		},
		{
			title: 'Plan de Produccion', icon: 'archive', type: 'sub', badgeType: 'success', badgeValue: '', active: false, children: [
				{ path: 'produccion/dashboard', title: 'Lista', type: 'link' }
			],
		},
		{
			title: 'Inventario', icon: 'package', type: 'sub', badgeType: 'success', badgeValue: '', active: false, children: [
				{ path: 'productos', title: 'Productos', type: 'link' },
				{ path: 'categorias', title: 'Categorías', type: 'link' },
				{ path: 'ecommerce/adiciones/listar', title: 'Adiciones', type: 'link' },
				{ path: '', title: 'Lista Lite*', type: 'link' },
				{ path: 'inventario/catalogo', title: 'Productos', type: 'link' },
				{ path: '', title: 'Cambio precios*', type: 'link' }
			]
		},
		{
			headTitle1: 'Logística'
		},
		{
			title: 'Entregas', icon: 'map-pin', type: 'sub', badgeType: 'success', badgeValue: '', active: false, children: [
				{ path: 'formasEntrega', title: 'Formas Entrega', type: 'link' },
				{ path: 'formasEntrega/tipoentrega/lista', title: 'Tipo de Entrega', type: 'link' },
				{ path: 'tiempoentrega', title: 'Tiempos de entrega', type: 'link' },
				{ path: 'despachos', title: 'Lista despachos', type: 'link' },
				{ path: 'extras/zonasCobro', title: 'Zonas Cobro', type: 'link' },
				{ path: '', title: 'Bloqueo fechas y horarios*', type: 'link' },
			]
		},
		{
			headTitle1: 'Inteligencia de Negocios',
			isOnlySuperAdministrador: true
		},
		{
			title: 'Indicadores KPI', icon: 'home', type: 'sub', badgeType: 'success', badgeValue: '', active: true, children: [
				{ path: 'dashboards', title: 'Graficos', type: 'link' },
			]
		},

		{
			headTitle1: 'Administración',
			isOnlySuperAdministrador: true
		},
		{
			title: 'Seguridad', icon: 'shield', type: 'sub', badgeType: 'success', badgeValue: '', active: false, children: [
				{ path: 'rol/rol', title: 'Roles', type: 'link' },
				{ path: 'usuarios', title: 'Usuarios*', type: 'link' },
			],
			isOnlySuperAdministrador: true
		},

		{
			title: 'Empresa', icon: 'home', type: 'sub', badgeType: 'success', badgeValue: '', active: false, children: [

				{ path: 'empresas', title: 'Empresas', type: 'link' },
				{ path: 'empresas', title: 'Módulos Fijos*', type: 'link' },
				{ path: 'empresas/modulovariable/produccion/opciones', title: 'Módulos Variables', type: 'link' },
				{ path: 'empresas', title: 'Módulos Adicionales*', type: 'link' },
				{ path: 'empresas', title: 'Modulos Aliados*', type: 'link' },
				{ path: 'empresas', title: 'Integraciones*', type: 'link' },
			], isOnlySuperAdministrador: true
		},
		{
			title: 'Notificaciones*', icon: 'message-circle', type: 'sub', badgeType: 'success', badgeValue: '', active: false, children: [
				{ path: 'notificaciones', title: 'Notificaciones*', type: 'link' }
			]
			, isOnlySuperAdministrador: true
		},
		{
			title: 'Pagos', icon: 'star', type: 'sub', badgeType: 'success', badgeValue: '', active: false, children: [

				{ path: 'extras/formasPago', title: 'Formas de pago', type: 'link' },
				{ path: 'extras/pos/formasPago', title: 'Formas de pagos POS', type: 'link' }
			]
		},
		{
			headTitle1: 'Katuq'
		},

		{
			title: 'Tickets', icon: 'headphones', type: 'sub', badgeType: 'success', badgeValue: '', active: false, children: [
				{ path: 'soporte', title: 'Crear', type: 'link' },
				{ path: 'misTickets', title: 'Mis Tickets', type: 'link' },
				{ path: 'misIdeas', title: 'Mis Ideas', type: 'link' },
			]
		},
		{
			title: 'K.A.I', icon: 'box', type: 'sub', badgeType: 'success', badgeValue: '', active: false, children: [
				{ path: 'chat', title: 'Asistencia', type: 'link' },
			],
			isOnlySuperAdministrador: false
		},
		{
			headTitle1: 'Katuq',
			headTitle2: '' + new Date().getFullYear() + ' © Julsmind S.A.S',
		},


	];

	MEGAMENUITEMS: Menu[] = [
		{
			title: 'Error Pages', type: 'sub', active: true, children: [
				{ path: 'javascript:void(0);', title: 'Error Page 400', type: 'extLink' },
				{ path: 'javascript:void(0);', title: 'Error Page 401', type: 'extLink' },
				{ path: 'javascript:void(0);', title: 'Error Page 403', type: 'extLink' },
				{ path: 'javascript:void(0);', title: 'Error Page 404', type: 'extLink' },
				{ path: 'javascript:void(0);', title: 'Error Page 500', type: 'extLink' },
				{ path: 'javascript:void(0);', title: 'Error Page 503', type: 'extLink' },
			]
		},
		{
			title: 'Authentication', type: 'sub', active: false, children: [
				{ path: 'javascript:void(0);', title: 'Login Simple', type: 'extLink' },
				{ path: 'javascript:void(0);', title: 'Login BG Image', type: 'extLink' },
				{ path: 'javascript:void(0);', title: 'Login BG Video', type: 'extLink' },
				{ path: 'javascript:void(0);', title: 'Simple Register', type: 'extLink' },
				{ path: 'javascript:void(0);', title: 'Register BG Image', type: 'extLink' },
				{ path: 'javascript:void(0);', title: 'Register BG Video', type: 'extLink' }
			]
		},
		{
			title: 'Usefull Pages', type: 'sub', active: false, children: [
				{ path: 'javascript:void(0);', title: 'Search Pages', type: 'extLink' },
				{ path: 'javascript:void(0);', title: 'Unlock User', type: 'extLink' },
				{ path: 'javascript:void(0);', title: 'Forgot Password', type: 'extLink' },
				{ path: 'javascript:void(0);', title: 'Reset Password', type: 'extLink' },
				{ path: 'javascript:void(0);', title: 'Maintenance', type: 'extLink' }
			]
		},
		{
			title: 'Email templates', type: 'sub', active: false, children: [
				{ path: 'http://admin.pixelstrap.com/cuba/theme/basic-template.html', title: 'Basic Email', type: 'extTabLink' },
				{ path: 'http://admin.pixelstrap.com/cuba/theme/email-header.html', title: 'Basic With Header', type: 'extTabLink' },
				{ path: 'http://admin.pixelstrap.com/cuba/theme/template-email.html', title: 'Ecomerce Template', type: 'extTabLink' },
				{ path: 'http://admin.pixelstrap.com/cuba/theme/template-email-2.html', title: 'Email Template 2', type: 'extTabLink' },
				{ path: 'http://admin.pixelstrap.com/cuba/theme/ecommerce-templates.html', title: 'Ecommerce Email', type: 'extTabLink' },
				{ path: 'http://admin.pixelstrap.com/cuba/theme/email-order-success.html', title: 'Order Success', type: 'extTabLink' }
			]
		},
		{
			title: 'Coming Soon', type: 'sub', active: false, children: [
				{ path: 'javascript:void(0);', title: 'Coming Simple', type: 'extLink' },
				{ path: 'javascript:void(0);', title: 'Coming BG Image', type: 'extLink' },
				{ path: 'javascript:void(0);', title: 'Coming BG Video', type: 'extLink' }
			]
		},
	];

	LEVELMENUITEMS: Menu[] = [
		{
			path: 'javascript:void(0);', title: 'File Manager', icon: 'git-pull-request', type: 'extLink'
		},
		{
			title: 'Users', icon: 'users', type: 'sub', active: false, children: [
				{ path: 'javascript:void(0);', title: 'All Users', icon: 'users', type: 'extLink' },
				{ path: 'javascript:void(0);', title: 'User Profile', icon: 'users', type: 'extLink' },
				{ path: 'javascript:void(0);', title: 'Edit Profile', icon: 'users', type: 'extLink' },
			]
		},
		{ path: 'javascript:void(0);', title: 'Bookmarks', icon: 'heart', type: 'extLink' },
		{ path: 'javascript:void(0);', title: 'Calender', icon: 'calendar', type: 'extLink' },
		{ path: 'javascript:void(0);', title: 'Social App', icon: 'zap', type: 'extLink' }
	];

	// Array
	items = new BehaviorSubject<Menu[]>(this.MENUITEMS);
	megaItems = new BehaviorSubject<Menu[]>(this.MEGAMENUITEMS);
	levelmenuitems = new BehaviorSubject<Menu[]>(this.LEVELMENUITEMS);

}
