import { Component, OnInit, ViewChild, TemplateRef, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import { NavService, Menu } from '../../../shared/services/nav.service';
import { Role } from '../../../shared/models/roles/roles';
import Swal from 'sweetalert2';
import { UtilsService } from '../../../shared/services/utils.service';
import { CompanyFeaturesService } from '../../../shared/services/company-features.service';
import { ROLE_TEMPLATES, RoleTemplate } from '../../../shared/models/roles/role-templates';
import { catalogoDeMenus, disponiblesSinSeleccionadas, entradasConNombresActuales, menusParaGuardar, textoDeEntrada } from './roles-menus';

/**
 * Ticket 1108: permisos asignables a un rol que NO aparecen en el menú lateral,
 * agrupados por el `id` del grupo del menú bajo el que se muestran (D-546: el `id`
 * no cambia si el grupo cambia de nombre; hay dos grupos «Productos», el de Inventario
 * y el de Configuración). Mismo path, título e ícono con que quedaron guardados en los
 * roles que ya los tienen (así el selector los reconoce como ya asignados y no los duplica).
 */
const PERMISOS_FUERA_DEL_MENU: { [idGrupo: string]: Menu[] } = {
  productos: [
    // Lo lee productos.component.ts (puedeEdicionRapida): formulario rápido en
    // "Crear Producto" y "Edición rápida" en cada fila.
    { path: 'productos/crear-rapido', title: 'Creación rápida', type: 'link', icon: 'zap' } as Menu,
  ],
};

@Component({
  selector: 'app-roles',
  templateUrl: './roles.component.html',
  styleUrls: ['./roles.component.scss']
})
export class RolesComponent implements OnInit {
  public roleForm: FormGroup;
  public menus: Menu[] = [];
  public roles: any[] = [];
  public availableMenus: Menu[] = [];
  public availableMenusCopy: Menu[] = [];
  public selectedMenus: Menu[] = [];
  public empresas: string[] = [];
  public isJulsmind: boolean = false;
  public editingRoleId: string | null = null;
  /** D-547 (F2): lo que el rol en edición trae guardado en `orderActions` (puede no existir). */
  public accionesPedidoDelRol: unknown = null;
  private companyFeatures = inject(CompanyFeaturesService);
  @ViewChild('configModal') configModal: TemplateRef<any>;

  // ─── Plantillas de roles ────────────────────────────────────────
  // Catálogo declarativo en shared/models/roles/role-templates.ts.
  // Al elegir una plantilla, se pre-llenan: nombre + menús del pickList + permissions.
  public plantillasDisponibles: RoleTemplate[] = ROLE_TEMPLATES;
  public showTemplateModal: boolean = false;

  constructor(private fb: FormBuilder,
    private router: Router,
    private modalService: NgbModal,
    private utilsService: UtilsService,
    private maestroService: MaestroService, private navService: NavService) {
    this.roleForm = this.fb.group({
      rol: ['', Validators.required],
      menus: [[], Validators.required],
      empresa: [null],
      prefijoFacturacion: [''],
      // Permisos granulares por módulo (base sólida para iterar, no rompe nada).
      // Roles existentes no tienen este campo → backend NO lo valida hasta que
      // se active requirePermission en endpoints específicos. Las plantillas lo
      // pueblan, los roles manuales lo dejan vacío {}.
      permissions: [{}]
    });
  }

  ngOnInit(): void {
    this.checkCompany();
    this.loadMenus();
    this.loadRoles();
    this.loadRoleToEdit(); // nuevo
  }

  /**
   * D-547 (F2): «Acciones principales del pedido» del rol. Solo con la bandera `orderPinnedActions` encendida y
   * un rol ya guardado. Apagada, el componente no existe.
   */
  get mostrarAccionesPedido(): boolean {
    return !!this.editingRoleId && this.companyFeatures.isEnabled('orderPinnedActions');
  }

  checkCompany(): void {
    const currentCompanyString = localStorage.getItem('currentCompany');
    console.log('🏢 currentCompanyString (localStorage):', currentCompanyString);

    const currentCompany = currentCompanyString ? JSON.parse(currentCompanyString).nomComercial : null;
    console.log('🏢 currentCompany parsed:', currentCompany);
    console.log('🏢 Comparando con "Julsmind":', currentCompany === 'Julsmind');

    this.roleForm.get('empresa')?.setValue(currentCompany);

    if (currentCompany === 'Julsmind') {
      this.isJulsmind = true;
      console.log('✅ isJulsmind establecido a true');
      this.loadEmpresas();
    } else {
      console.log('❌ Empresa no es Julsmind, no se cargará el selector');
      console.log('💡 Valor actual de isJulsmind:', this.isJulsmind);
    }
  }

  loadEmpresas(): void {
    console.log('📋 Cargando empresas...');
    this.maestroService.consultarEmpresas().subscribe({
      next: (response: any) => {
        console.log('✅ Empresas cargadas:', response);
        this.empresas = response;
        console.log('📊 Total de empresas:', this.empresas.length);
        console.log('📊 Array empresas:', this.empresas);
      },
      error: (error) => {
        console.error('❌ Error cargando empresas:', error);
        Swal.fire({
          title: 'Error!',
          text: 'Hubo un problema al cargar las empresas',
          icon: 'error',
          confirmButtonText: 'Ok'
        });
      }
    });
  }

  loadMenus(): void {
    this.menus = this.navService.getMenuOriginal();
    this.availableMenus = this.getChildrenMenus(this.menus);
    this.availableMenusCopy = this.utilsService.deepClone(this.availableMenus);
  }

  /**
   * D-546: el catálogo del selector sale de `catalogoDeMenus` (roles-menus.ts): cada entrada con su grupo
   * («Clientes · Listado») y sin modificar el menú de NavService.
   */
  getChildrenMenus(menus: Menu[]): Menu[] {
    return catalogoDeMenus(menus, PERMISOS_FUERA_DEL_MENU);
  }

  /** El texto de una entrada en el selector. */
  textoDeEntrada(entrada: Menu): string {
    return textoDeEntrada(entrada);
  }

  loadRoles(): void {
    this.maestroService.getRol().subscribe({
      next: (response: any) => {
        this.roles = response;
      },
      error: (error) => {
        Swal.fire({
          title: 'Error!',
          text: 'Hubo un problema al cargar los roles',
          icon: 'error',
          confirmButtonText: 'Ok'
        });
      }
    });
  }

  loadRoleToEdit(): void {
    // Nuevo: Cargar rol a editar desde localStorage (clave "currentRole")
    const roleString = localStorage.getItem('currentRole');
    if (roleString) {
      const role: Role = JSON.parse(roleString);
      this.editingRoleId = (role as any).id || null;
      this.accionesPedidoDelRol = (role as any).orderActions || null;
      this.roleForm.patchValue({
        rol: role.rol,
        empresa: role.empresa,
        menus: role.menus,
        prefijoFacturacion: role.prefijoFacturacion || '',
        permissions: (role as any).permissions || {}
      });
      // D-546: un rol guardado con los nombres de antes se abre con los de ahora, reconocido por la ruta.
      this.selectedMenus = entradasConNombresActuales(role.menus, this.availableMenusCopy);
      this.roleForm.patchValue({ menus: this.selectedMenus });
      // Actualizar availableMenus eliminando los seleccionados
      this.availableMenus = disponiblesSinSeleccionadas(this.availableMenusCopy, this.selectedMenus);
    }
  }

  // ─── Plantillas: abrir/cerrar modal + aplicar ──────────────────────────
  abrirSelectorPlantillas(): void {
    this.showTemplateModal = true;
  }

  cerrarSelectorPlantillas(): void {
    this.showTemplateModal = false;
  }

  /**
   * Aplicar una plantilla al form: pre-llena nombre, menús seleccionados y
   * permissions. El admin puede ajustar después antes de guardar.
   *
   * Matching de menús: la plantilla declara paths (`ventas/crear`, `pedidos`,
   * etc). Buscamos esos paths en `availableMenusCopy` y los movemos a
   * `selectedMenus`. Si el path no existe (porque el menú fue removido del
   * proyecto), se ignora silenciosamente.
   *
   * Si el rol con `nombreSugerido` ya existe en la empresa, el admin verá el
   * conflicto al guardar (el backend lo rechazará por unique) o lo cambiará
   * manualmente.
   */
  aplicarPlantilla(tpl: RoleTemplate): void {
    // 1. Reset selectedMenus + availableMenus
    this.selectedMenus = [];
    this.availableMenus = this.utilsService.deepClone(this.availableMenusCopy);

    // 2. Si la plantilla usa wildcard '*', seleccionar TODOS los menús
    if (tpl.menus.length === 1 && tpl.menus[0] === '*') {
      this.selectedMenus = this.utilsService.deepClone(this.availableMenusCopy);
      this.availableMenus = [];
    } else {
      // 3. Matchear paths de la plantilla con menús reales (movables)
      const wantedPaths = new Set(tpl.menus);
      const toSelect: Menu[] = [];
      const toKeep: Menu[] = [];
      for (const menu of this.availableMenus) {
        if (menu['movable'] !== false && menu.path && wantedPaths.has(menu.path)) {
          toSelect.push(menu);
        } else {
          toKeep.push(menu);
        }
      }
      this.selectedMenus = toSelect;
      this.availableMenus = toKeep;
    }

    // 4. Patch form con nombre + permissions de la plantilla
    this.roleForm.patchValue({
      rol: tpl.nombreSugerido,
      menus: this.selectedMenus,
      permissions: tpl.permissions
    });

    // 5. Cerrar modal y feedback visual
    this.showTemplateModal = false;
    Swal.fire({
      title: 'Plantilla aplicada',
      text: `Se cargaron los menús y permisos de "${tpl.nombreSugerido}". Ajustá lo que necesites y guardá.`,
      icon: 'success',
      timer: 2500,
      showConfirmButton: false
    });
  }

  saveRole(): void {
    if (this.roleForm.valid) {
      const newRole: Role = this.roleForm.value;
      // Mismas rutas que el selector, sin los campos que solo sirven para mostrarlas (etiqueta, nombre anterior).
      newRole.menus = menusParaGuardar(this.selectedMenus);
      if (this.isJulsmind) {
        const empresaControl = this.roleForm.get('empresa');
        if (empresaControl) {
          newRole.empresa = empresaControl.value;
        }
      }
      if (this.editingRoleId) {
        // Actualizar rol en edición
        this.maestroService.updateRol(this.editingRoleId, newRole).subscribe({
          next: (response) => {
            Swal.fire({
              title: 'Actualizado!',
              text: 'Rol actualizado con éxito',
              icon: 'success',
              confirmButtonText: 'Ok'
            });
            this.loadRoles();
            localStorage.removeItem('currentRole');
          },
          error: (error) => {
            Swal.fire({
              title: 'Error!',
              text: 'Hubo un problema al actualizar el rol',
              icon: 'error',
              confirmButtonText: 'Ok'
            });
          }
        });
      } else {
        // Crear nuevo rol
        this.maestroService.createRol(newRole).subscribe({
          next: (response) => {
            Swal.fire({
              title: 'Guardado!',
              text: 'Rol guardado con éxito',
              icon: 'success',
              confirmButtonText: 'Ok'
            });
            this.loadRoles();
          },
          error: (error) => {
            Swal.fire({
              title: 'Error!',
              text: 'Hubo un problema al guardar el rol',
              icon: 'error',
              confirmButtonText: 'Ok'
            });
          }
        });
      }
    }
  }

  abrirConfiguraciones(): void {
    this.modalService.open(this.configModal, { size: 'lg', centered: true });
  }

  volver(): void {
    localStorage.removeItem('currentRole');
    this.router.navigateByUrl('/rol');
  }

  onMenuChange(event: any, modeDirection: string): void {
    const movedItems = event.items.filter((item: any) => item.movable == true);
    if (modeDirection === 'target') {
      this.selectedMenus = this.selectedMenus.filter((item: any) => item.movable == true);
      this.selectedMenus = [...this.selectedMenus, ...movedItems.filter(item => !this.selectedMenus.includes(item))];
      this.availableMenus = disponiblesSinSeleccionadas(this.availableMenusCopy, this.selectedMenus);
      this.availableMenus = [...this.availableMenus.sort((a, b) => a['index'] - b['index'])];
    }
    else {
      this.availableMenus = this.availableMenusCopy.filter((item: any) => !this.selectedMenus.includes(item));
      this.selectedMenus = this.selectedMenus.filter((item: any) => item.movable == true);
      this.availableMenus = this.availableMenus.sort((a, b) => a['index'] - b['index']);
    }
    const menusControl = this.roleForm.get('menus');
    if (menusControl) {
      menusControl.setValue(this.selectedMenus);
    }
  }

}
