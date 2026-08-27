import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../shared/services/firebase/auth.service';
import { ServiciosService } from '../../shared/services/servicios.service';
import { UtilsService } from '../../shared/services/utils.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  /**
   * Pieza gráfica del panel izquierdo. Se dejan las dos para poder compararlas:
   * por defecto la nueva, y con ?fondo=actual se ve la anterior.
   */
  public fondoNuevo = true;

  public show: boolean = false;
  public loginForm: FormGroup;
  public errorMessage: any;
  user: any;
  version = environment.version
  // authService: any;

  // public authService: AuthService,
  constructor(
    public authService: AuthService,
    private service: ServiciosService,
    private utils: UtilsService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router) {

      this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required] //contraseña jarango

    });

  }

  ngOnInit() {
    // ?fondo=actual muestra la pieza anterior; sin parámetro, la nueva.
    this.fondoNuevo =
      this.route.snapshot.queryParamMap.get('fondo') !== 'actual';

    this.redirectIfLoggedIn();
  }

  /**
   * Si ya hay una sesión válida, no mostrar el login: redirigir al mismo
   * destino por rol que aplica handleSignInSuccess (auth.service). isLoggedIn
   * ya valida token (formato JWT) y expiración; si la sesión es inválida la
   * limpia y retorna false, dejando ver el login normalmente.
   */
  private redirectIfLoggedIn(): void {
    if (!this.authService.isLoggedIn) {
      return;
    }
    try {
      const user = JSON.parse(localStorage.getItem('user'));

      // Recordatorio pospuesto en esta sesión: no volver a interrumpir.
      if (user?.mustChangePassword && !sessionStorage.getItem('passwordChangeDeferred')) {
        this.router.navigate(['/change-password']);
        return;
      }
      if (user?.rol === 'Super Administrador') {
        this.router.navigate(['/superadmin/clientes']);
        return;
      }
      if (user?.rol === 'Administrador' && user?.company === 'Julsmind') {
        this.router.navigate(['/dashboards']);
        return;
      }

      const destino = (user?.bienvenidaPath && typeof user.bienvenidaPath === 'string')
        ? user.bienvenidaPath
        : '/welcome';
      this.router.navigate([destino]);
    } catch {
      // user corrupto en localStorage: quedarse en el login
    }
  }

  showPassword() {
    this.show = !this.show;
  }

  // // Login With Google
  // loginGoogle() {
  //   this.authService.GoogleAuth();
  // }

  // // // Login With Twitter
  // loginTwitter(): void {
  //   this.authService.signInTwitter();
  // }

  // // Login With Facebook
  // loginFacebook() {
  //   this.authService.signInFacebok();
  // }

  // Simple Login
  login() {
    // this.authService.SignIn(this.loginForm.value['email'], this.loginForm.value['password']);
  }

  onSubmit() {

    this.user = {}
    this.user.email = this.loginForm.value['email'].toLowerCase();
    this.user.password = this.utils.hash(this.loginForm.value['password']);
    this.user.token = null
    // grecaptcha.ready(() => {
    //   // 
    //   grecaptcha.execute('6LeCFVweAAAAAN2g1Gb3DmBP7LWgfxDBEJiEtVQE').then((token) => {
    //     this.user.token = token
    this.authService.SignIn(this.loginForm.value['email'].toLowerCase(), this.utils.hash(this.loginForm.value['password']), '');
    //   })
    // })

  }

}
