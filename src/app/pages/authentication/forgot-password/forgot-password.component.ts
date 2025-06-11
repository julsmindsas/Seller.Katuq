import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../shared/services/firebase/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent implements OnInit {

  public forgotPasswordForm: FormGroup;
  public isLoading: boolean = false;
  public emailSent: boolean = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private toastr: ToastrService
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
    // Verificar si el usuario ya está logueado
    if (this.authService.isLoggedIn) {
      this.router.navigate(['/dashboard']);
    }
  }

  onSubmit(): void {
    if (this.forgotPasswordForm.valid && !this.isLoading) {
      this.isLoading = true;
      const email = this.forgotPasswordForm.value.email.toLowerCase();
      
      this.authService.ForgotPassword(email)
        .then(() => {
          this.emailSent = true;
          this.isLoading = false;
          this.toastr.success('Se han enviado las instrucciones a tu correo', 'Éxito');
          
          // Opcional: redirigir después de unos segundos
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 5000);
        })
        .catch((error) => {
          this.isLoading = false;
          console.error('Error al enviar email de recuperación:', error);
          this.toastr.error('Error al enviar las instrucciones. Intenta nuevamente.', 'Error');
        });
    }
  }
}