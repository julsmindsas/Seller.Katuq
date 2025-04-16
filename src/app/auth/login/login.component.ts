import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
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
    private route: ActivatedRoute) {
    
      this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required] //contraseña jarango

    });
  
  }

  ngOnInit() {
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
