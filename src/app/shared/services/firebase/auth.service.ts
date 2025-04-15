import { Injectable, OnInit, NgZone } from "@angular/core";
import { Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { ServiciosService } from "../servicios.service";
import { TranslateService } from "@ngx-translate/core";
import Swal from "sweetalert2";
import { NavService } from "../nav.service";

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  emailVerified: boolean;
}

@Injectable({
  providedIn: "root",
})
export class AuthService implements OnInit {
  public userData: any;
  public showLoader: boolean = false;

  constructor(
    private services: ServiciosService,
    public router: Router,
    public ngZone: NgZone,
    public toster: ToastrService,
    private translate: TranslateService,
    private navServices: NavService
  ) { }

  ngOnInit(): void { }

  SignIn(email: string, password: string, token: string): void {
    const datos = {
      email: email.toLowerCase(),
      password: password,
      token: token,
    };

    this.services.signInWithEmailAndPassword(datos).subscribe({
      next: (result: any) => this.handleSignInSuccess(result),
      error: (err) => this.handleSignInError(err),
    });
  }

  private handleSignInSuccess(result: any): void {
    if (result.error) {
      this.showErrorAlert("¡ Datos incorrectos !");
      return;
    }

    if (result.token) {

      this.SetUserData(result.token);
      this.setMenu(result.menu);
      
      if (result.lang)
        this.setLanguage(result.lang);

      localStorage.setItem("user", JSON.stringify(result));
      localStorage.setItem("loginTime", new Date().toISOString());

      if (result.mustChangePassword) {
        this.router.navigate(["/change-password"]);
        this.services.getEmpresaByName({ company: result.company });
        this.showLoader = true;
        return;
      }

      // Redirigir a la página de bienvenida con accesos directos
      this.router.navigate(["/welcome"]);

      this.services.getEmpresaByName({ company: result.company });
      this.showLoader = true;
    } else {
      this.showErrorAlert("¡ Datos incorrectos !");
      this.showLoader = false;
      this.ngZone.run(() => this.router.navigate(["/login"]));
    }
  }

  setMenu(menu: any) {
    localStorage.setItem("authorizedMenuItems", JSON.stringify(menu));
    this.navServices.filterMenuItemsByAuthorization();
  }

  private handleSignInError(err: any): void {
    console.error("Error: ", err);
    this.toster.error("Correo o contraseña incorrecta.");
  }

  private showErrorAlert(message: string): void {
    Swal.fire({
      icon: "error",
      title: message,
      showConfirmButton: false,
      timer: 1500,
    });
  }

  private setLanguage(lang: any): void {
    this.translate.setDefaultLang(lang.code);
    this.translate.use(lang.code);
  }

  ForgotPassword(passwordResetEmail: string): void {
    // Implementar lógica para restablecer contraseña
  }

  AuthLogin(provider: any): void {
    // Implementar lógica para autenticación con proveedor externo
  }

  SetUserData(user: any): void {
    // Implementar lógica para establecer datos del usuario
  }

  SignOut(): void {
    this.showLoader = false;
    localStorage.removeItem('user');
    sessionStorage.removeItem('currentCompany');
    localStorage.removeItem('authorizedMenuItems');
    localStorage.removeItem('company');
    localStorage.removeItem('warehousePOS');
    localStorage.removeItem('warehouse');
    this.router.navigateByUrl('/login');
  }

  get isLoggedIn(): boolean {
    const user = localStorage.getItem("user");
    const loginTime = localStorage.getItem("loginTime");
    if (!user || !loginTime) {
      return false;
    }

    try {
      const parsedUser = JSON.parse(user);
      const token = parsedUser.token;
      const loginDate = new Date(loginTime);
      const currentDate = new Date();
      const timeDifference =
        (currentDate.getTime() - loginDate.getTime()) / (1000 * 60 * 60); // Diferencia en horas

      return token != null && token !== "" && timeDifference <= 24;
    } catch (error) {
      console.error("Error parsing user from localStorage", error);
      return false;
    }
  }
}
