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
	isOnlyAdmin?: boolean;
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

	// Verifica si es superadmin o admin de Julsmind
	isSuperAdmin: boolean = (() => {
		const user = localStorage.getItem('user');
		if (user) {
			const parsedUser = JSON.parse(user);
			return parsedUser.rol === 'Super Administrador';
		}
		return false;
	})();

	isAdmin: boolean = (() => {
		const user = localStorage.getItem('user');
		if (user) {
			const parsedUser = JSON.parse(user);
			return parsedUser.rol === 'Administrador' && parsedUser.company === 'Julsmind';
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
		const user = localStorage.getItem('user');
		if (user) {
			this.refrescarCart();
		}
		
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
		if (window.innerWidth < 991) {
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
				// console.log('products', products);
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
		const user = JSON.parse(localStorage.getItem('user') || '{}');
		const isSuperAdmin = user.rol === 'Super Administrador';
		const isJulsmindAdmin = user.rol === 'Administrador' && user.company === 'Julsmind';

		const filteredMenu = this.ALLMENUITEMS.map(item => {
			// Ocultar item si es solo para superadmin y el usuario no lo es
			if ((item.isOnlySuperAdministrador && !isSuperAdmin) || 
				(item.isOnlyAdmin && !isJulsmindAdmin)) {
				return null;
			}

			if (item.headTitle1) {
				const header = { ...item };
				delete header.children;
				return header;
			}

			if (item.children) {
				const filteredChildren = item.children.filter(child =>
					((!child.isOnlySuperAdministrador || isSuperAdmin) &&
					(!child.isOnlyAdmin || isJulsmindAdmin)) &&
					authorizedPaths.includes(child.path)
				);

				if ((item.isOnlySuperAdministrador && !isSuperAdmin) ||
					(item.isOnlyAdmin && !isJulsmindAdmin) ||
					filteredChildren.length === 0) {
					return null;
				}
				return { ...item, children: filteredChildren };
			}

			if ((item.isOnlySuperAdministrador && !isSuperAdmin) ||
				(item.isOnlyAdmin && !isJulsmindAdmin) ||
				!authorizedPaths.includes(item.path)) {
				return null;
			}
			return item;
		}).filter(item => item !== null) as Menu[];

		const finalMenu: Menu[] = [];
		let previousItem: Menu | null = null;

		filteredMenu.forEach(item => {
			const currentIsHeader = item.headTitle1;
			const previousIsHeader = previousItem?.headTitle1;

			if (currentIsHeader && previousIsHeader) {
				// Solo agregar el encabezado si tiene elementos visibles después
				const hasVisibleItems = filteredMenu.some((nextItem, index) => {
					const currentIndex = filteredMenu.indexOf(item);
					return index > currentIndex && !nextItem.headTitle1 && nextItem.children && nextItem.children.length > 0;
				});

				if (hasVisibleItems) {
					finalMenu.push(item);
				}
			} else {
				finalMenu.push(item);
			}

			previousItem = item;
		});

		this.MENUITEMS = finalMenu;
		this.items.next(this.MENUITEMS);
	}

	MENUITEMS: Menu[] = [
		{ headTitle1: 'Gestión Comercial' },
		{
			title: 'Clientes', icon: 'user-check', type: 'sub', active: false, children: [
				{ path: 'ventas/clientes', title: 'Crear Clientes', type: 'link' },
				{ path: 'ventas/clienteslista', title: 'Lista de Clientes', type: 'link' },
				{ path: 'prospectos/lista', title: 'Gestión de Prospectos', type: 'link' },
				{ path: 'proceso/ocasiones', title: 'Ocasiones', type: 'link' },
				{ path: 'proceso/generos', title: 'Géneros', type: 'link' }
			]
		},
		{
			title: 'Pedidos y Ventas', icon: 'dollar-sign', type: 'sub', active: false, children: [
				{ path: 'ventas/crear-ventas', title: 'Crear Venta Asistida', type: 'link' },
				{ path: 'ventas/carga-ventas', title: 'Cargar Ventas Masivas', type: 'link' },
				{ path: 'ventas/pedidos', title: 'Lista de Pedidos', type: 'link' },
				{ path: 'ventas/pos2', title: 'Ventas POS Avanzado', type: 'link' },
				{ path: 'pos/ventas', title: 'Ventas POS Rápido', type: 'link' },
				{ path: 'pos/list-ventas', title: 'Listado Ventas POS', type: 'link' }
			]
		},

		{ headTitle1: 'Operaciones Internas' },
		{
			title: 'Inventario y Productos', icon: 'package', type: 'sub', active: false, children: [
				{ path: 'productos', title: 'Maestro de Productos', type: 'link' },
				{ path: 'categorias', title: 'Categorías Globales', type: 'link' },
				{ path: 'ecommerce/adiciones/listar', title: 'Adiciones Globales', type: 'link' },
				{ path: 'inventario/inventario-catalogo', title: 'Inventario por Bodega', type: 'link' },
				{ path: 'inventario/bodegas', title: 'Bodegas', type: 'link' },
				{ path: 'inventario/recepcion-mercancia', title: 'Recepción Mercancía', type: 'link' },
				{ path: 'inventario/traslados', title: 'Traslados entre Bodegas', type: 'link' },
				{ path: 'inventario/historial-movimientos', title: 'Historial Movimientos', type: 'link' }
			]
		},
		{
			title: 'Plan de Producción', icon: 'archive', type: 'sub', active: false, children: [
				{ path: 'produccion/dashboard', title: 'Dashboard Producción', type: 'link' }
			]
		},

		{ headTitle1: 'Logística' },
		{
			title: 'Envíos y Entregas', icon: 'map-pin', type: 'sub', active: false, children: [
				{ path: 'formasEntrega', title: 'Formas Entrega Globales', type: 'link' },
				{ path: 'formasEntrega/tipoentrega/lista', title: 'Tipos de Entrega Globales', type: 'link' },
				{ path: 'tiempoentrega', title: 'Tiempos de Entrega Globales', type: 'link' },
				{ path: 'despachos', title: 'Lista de Despachos', type: 'link' },
				{ path: 'extras/zonasCobro', title: 'Zonas de Cobro Envío', type: 'link' }
			]
		},

		{ headTitle1: 'Inteligencia de Negocios', isOnlySuperAdministrador: true },
		{
			title: 'Indicadores KPI', icon: 'trending-up', type: 'sub', active: false, isOnlySuperAdministrador: true, children: [
				{ path: 'dashboards', title: 'Dashboard Gerencial', type: 'link' }
			]
		},

		{ headTitle1: 'Administración Global', isOnlySuperAdministrador: true },
		{
			title: 'Usuarios y Permisos', icon: 'shield', type: 'sub', active: false, isOnlySuperAdministrador: true, children: [
				{ path: 'rol/rol', title: 'Gestión de Roles', type: 'link' },
				{ path: 'usuarios', title: 'Gestión de Usuarios', type: 'link' }
			]
		},
		{
			title: 'Gestión de Empresas', icon: 'briefcase', type: 'sub', active: false, isOnlySuperAdministrador: true, children: [
				{ path: 'empresas', title: 'Directorio de Empresas', type: 'link' },
				{ path: 'empresas/modulovariable/produccion/opciones', title: 'Módulos Variables', type: 'link' }
			]
		},

		{ headTitle1: 'Configuración Plataforma', isOnlySuperAdministrador: true },
		{
			title: 'Gestión General', icon: 'settings', type: 'sub', active: false, isOnlySuperAdministrador: true, children: [
				{ path: 'superadmin/clientes', title: 'Gestión Clientes Plataforma', type: 'link' },
				{ path: 'notificaciones', title: 'Notificaciones Globales', type: 'link' },
				{ path: 'integrations', title: 'Integraciones Globales', type: 'link' },
				{ path: 'extras/formasPago', title: 'Formas de Pago Globales', type: 'link' }
			]
		},

		{ headTitle1: 'Soporte Katuq' },
		{
			title: 'Tickets y Ayuda', icon: 'headphones', type: 'sub', active: false, children: [
				{ path: 'soporte', title: 'Crear Ticket/Idea', type: 'link' },
				{ path: 'misTickets', title: 'Mis Tickets', type: 'link' },
				{ path: 'misIdeas', title: 'Mis Ideas', type: 'link' }
			]
		},
		{
			title: 'K.A.I Asistente IA', icon: 'cpu', type: 'sub', active: false, children: [
				{ path: 'chat', title: 'Chatear con K.A.I', type: 'link' }
			]
		},

		{ headTitle1: 'Katuq', headTitle2: `${new Date().getFullYear()} © Julsmind S.A.S` }
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
