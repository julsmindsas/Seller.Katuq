import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../shared/services/firebase/auth.service';
import { ServiciosService } from '../../../shared/services/servicios.service';
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
    private serviciosService: ServiciosService,
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
      
      this.serviciosService.forgotPassword({ email }).subscribe({
        next: () => {
          this.emailSent = true;
          this.isLoading = false;
          this.toastr.success('Si el correo está registrado, recibirás las instrucciones', 'Solicitud recibida');
          
        },
        error: () => {
          this.isLoading = false;
          // El mensaje no confirma si el correo existe y permite volver a intentar.
          this.toastr.error('No pudimos procesar la solicitud. Intenta nuevamente.', 'Error');
        }
      });
    }
  }
}
