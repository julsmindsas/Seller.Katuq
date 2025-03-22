import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import { NavService, Menu } from '../../../shared/services/nav.service';
import { Role } from '../../../shared/models/roles/roles';
import Swal from 'sweetalert2';
import { UtilsService } from '../../../shared/services/utils.service';

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
  private editingRoleId: string | null = null; // nuevo

  constructor(private fb: FormBuilder,
    private utilsService: UtilsService,
    private maestroService: MaestroService, private navService: NavService) {
    this.roleForm = this.fb.group({
      rol: ['', Validators.required],
      menus: [[], Validators.required],
      empresa: [null]
    });
  }

  ngOnInit(): void {
    this.checkCompany();
    this.loadMenus();
    this.loadRoles();
    this.loadRoleToEdit(); // nuevo
  }

  checkCompany(): void {
    const currentCompanyString = sessionStorage.getItem('currentCompany');
    const currentCompany = currentCompanyString ? JSON.parse(currentCompanyString).nomComercial : null;
    this.roleForm.get('empresa')?.setValue(currentCompany);
    if (currentCompany === 'Julsmind') {
      this.isJulsmind = true;
      this.loadEmpresas();
    }
  }

  loadEmpresas(): void {
    this.maestroService.consultarEmpresas().subscribe({
      next: (response: any) => {
        this.empresas = response;
      },
      error: (error) => {
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
    this.menus = this.navService.getMenuItems();
    this.availableMenus = this.getChildrenMenus(this.menus);
    this.availableMenusCopy = this.utilsService.deepClone(this.availableMenus);
  }

  getChildrenMenus(menus: Menu[]): Menu[] {
    let childrenMenus: Menu[] = [];
    let index = 0;
    menus.forEach(menu => {
      const menuParaAgregar = this.utilsService.deepClone(menu);
      menuParaAgregar.children = [];
      if (menu.children) {
        menuParaAgregar['movable'] = false;
        menuParaAgregar['index'] = index++;
        childrenMenus.push(menuParaAgregar);
        menu.children.forEach(child => {
          child['movable'] = true;
          child['index'] = index++;
        });
        childrenMenus = childrenMenus.concat(menu.children);
      }
    });
    return childrenMenus;
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
      this.roleForm.patchValue({
        rol: role.rol,
        empresa: role.empresa,
        menus: role.menus
      });
      this.selectedMenus = role.menus;
      // Actualizar availableMenus eliminando los seleccionados
      this.availableMenus = this.availableMenusCopy.filter((menu: Menu) =>
        !this.selectedMenus.some(selected => selected.path === menu.path && selected.title === menu.title)
      );
    }
  }

  saveRole(): void {
    if (this.roleForm.valid) {
      const newRole: Role = this.roleForm.value;
      newRole.menus = this.selectedMenus;
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

  onMenuChange(event: any, modeDirection: string): void {
    const movedItems = event.items.filter((item: any) => item.movable == true);
    if (modeDirection === 'target') {
      this.selectedMenus = this.selectedMenus.filter((item: any) => item.movable == true);
      this.selectedMenus = [...this.selectedMenus, ...movedItems.filter(item => !this.selectedMenus.includes(item))];
      this.availableMenus = this.availableMenusCopy.filter((item: any) => !this.selectedMenus.some(item2 => item2.path == item.path && item2.title == item.title));
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
