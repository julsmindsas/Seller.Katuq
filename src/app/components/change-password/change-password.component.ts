import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UtilsService } from '../../shared/services/utils.service';
import { MaestroService } from '../../shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';
import { OnboardingService } from '../onboarding/services/onboarding.service';

@Component({
    selector: 'app-change-password',
    templateUrl: './change-password.component.html',
    styleUrls: ['./change-password.component.scss']
})
export class ChangePasswordComponent implements OnInit {
    // La sesión que pospone el cambio no vuelve a ser interrumpida hasta el
    // próximo login; los redirects de login/auth consultan esta misma llave.
    static readonly DEFER_KEY = 'passwordChangeDeferred';

    passwordForm: FormGroup;
    standardPasswordDetected: boolean = true; // Esta bandera se debería definir según la lógica de autenticación

    constructor(private fb: FormBuilder, private router: Router,
        private service: MaestroService,
        private utils: UtilsService,
        private onboardingService: OnboardingService) {
        this.passwordForm = this.fb.group({
            newPassword: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)]],
            confirmPassword: ['', Validators.required]
        }, { validator: this.passwordMatchValidator });
    }

    ngOnInit(): void {
        // Aquí se puede agregar la lógica para detectar si la contraseña es la estándar
    }

    passwordMatchValidator(form: FormGroup) {
        return form.get('newPassword')?.value === form.get('confirmPassword')?.value ? null : { mismatch: true };
    }

    submit(): void {
        if (this.passwordForm.valid) {
            const user = JSON.parse(localStorage.getItem('user') ?? '{}');
            // El backend deriva usuario y tenant del JWT. Nunca reenviar el
            // objeto de sesión (email, empresa, token o rol) como identidad.
            const passwordUpdate = {
                newPassword: this.utils.hash(this.passwordForm.value.newPassword)
            };

            this.service.changePassword(passwordUpdate).subscribe({
                next: (result: any) => {
                    user.mustChangePassword = false;
                    localStorage.setItem('user', JSON.stringify(user));
                    sessionStorage.removeItem(ChangePasswordComponent.DEFER_KEY);
                    Swal.fire({
                        icon: 'success',
                        title: 'Contraseña actualizada',
                        text: result?.message || 'Tu contraseña fue actualizada correctamente.',
                        timer: 2200,
                        showConfirmButton: false
                    });
                    void this.navigateAfterPasswordChange(user);
                },
                error: (err: any) => {
                    console.error('Error al cambiar contraseña', err);
                    Swal.fire({
                        icon: 'error',
                        title: 'No se pudo actualizar',
                        text: err?.error?.message || err?.message || 'Error desconocido al actualizar la contraseña.'
                    });
                }
            });
        }
    }

    private async navigateAfterPasswordChange(user: any): Promise<void> {
        if (user?.rol === 'Super Administrador') {
            await this.router.navigate(['/superadmin/clientes']);
            return;
        }
        if (user?.rol === 'Administrador' && user?.company === 'Julsmind') {
            await this.router.navigate(['/dashboards']);
            return;
        }
        if (user?.rol !== 'Administrador') {
            const destination = typeof user?.bienvenidaPath === 'string' && user.bienvenidaPath
                ? user.bienvenidaPath
                : '/welcome';
            await this.router.navigate([destination]);
            return;
        }

        try {
            const onboardingEntry = await this.onboardingService.getOnboardingEntryState();
            if (!onboardingEntry.completed) {
                localStorage.setItem('showOnboardingBanner', 'true');
                sessionStorage.removeItem('onboarding_banner_dismissed');
                await this.router.navigate([onboardingEntry.deferred ? '/welcome' : '/onboarding']);
                return;
            }
            localStorage.removeItem('showOnboardingBanner');
            sessionStorage.removeItem('onboarding_banner_dismissed');
        } catch (error) {
            console.error('No se pudo verificar el onboarding después de cambiar la contraseña', error);
            localStorage.setItem('showOnboardingBanner', 'true');
            sessionStorage.removeItem('onboarding_banner_dismissed');
        }
        await this.router.navigate(['/welcome']);
    }

    // Posponer el cambio: la sesión sigue a su destino normal y el
    // recordatorio no vuelve a interrumpir hasta el próximo login.
    deferUpdate(): void {
        sessionStorage.setItem(ChangePasswordComponent.DEFER_KEY, 'true');
        const user = JSON.parse(localStorage.getItem('user') ?? '{}');
        void this.navigateAfterPasswordChange(user);
    }
}
