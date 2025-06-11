import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../shared/services/firebase/auth.service';
import { ServiciosService } from '../../../shared/services/servicios.service';
import { UtilsService } from '../../../shared/services/utils.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {

  public show: boolean = false;
  public showConfirm: boolean = false;
  public resetPasswordForm: FormGroup;
  public isLoading: boolean = false;
  public passwordReset: boolean = false;
  public tokenError: boolean = false;
  private resetToken: string = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private serviciosService: ServiciosService,
    private utils: UtilsService,
    private toastr: ToastrService
  ) {
    this.resetPasswordForm = this.fb.group({
      newPassword: ['', [
        Validators.required, 
        Validators.minLength(8), 
        Validators.pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
      ]],
      confirmPassword: ['', Validators.required]
    }, { validator: this.passwordMatchValidator });
  }

  ngOnInit() {
    // Obtener el token de la URL
    this.route.queryParams.subscribe(params => {
      this.resetToken = params['token'];
      if (!this.resetToken) {
        this.tokenError = true;
        this.toastr.error('Token de recuperación no encontrado', 'Error');
      } else {
        // Verificar si el token es válido
        this.verifyToken();
      }
    });
  }

  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { mismatch: true };
  }

  verifyToken(): void {
    this.serviciosService.verifyResetToken({ token: this.resetToken }).subscribe({
      next: (result: any) => {
        if (!result.valid) {
          this.tokenError = true;
          this.toastr.error('El token de recuperación es inválido o ha expirado', 'Error');
        }
      },
      error: (error) => {
        this.tokenError = true;
        this.toastr.error('Error al verificar el token', 'Error');
        console.error('Error verifying token:', error);
      }
    });
  }

  showPassword() {
    this.show = !this.show;
  }

  showConfirmPassword() {
    this.showConfirm = !this.showConfirm;
  }

  onSubmit(): void {
    if (this.resetPasswordForm.valid && !this.isLoading && !this.tokenError) {
      this.isLoading = true;
      
      const resetData = {
        token: this.resetToken,
        newPassword: this.utils.hash(this.resetPasswordForm.value.newPassword)
      };

      this.serviciosService.resetPassword(resetData).subscribe({
        next: (result: any) => {
          if (result.success) {
            this.passwordReset = true;
            this.isLoading = false;
            this.toastr.success('Contraseña actualizada correctamente', 'Éxito');
            
            // Redirigir al login después de 3 segundos
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 3000);
          } else {
            this.isLoading = false;
            this.toastr.error(result.message || 'Error al actualizar la contraseña', 'Error');
          }
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Error al resetear contraseña:', error);
          this.toastr.error('Error al actualizar la contraseña. Intenta nuevamente.', 'Error');
        }
      });
    }
  }
}
