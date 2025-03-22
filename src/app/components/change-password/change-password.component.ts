import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UtilsService } from '../../shared/services/utils.service';
import { MaestroService } from '../../shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-change-password',
    templateUrl: './change-password.component.html',
    styleUrls: ['./change-password.component.scss']
})
export class ChangePasswordComponent implements OnInit {
    passwordForm: FormGroup;
    standardPasswordDetected: boolean = true; // Esta bandera se debería definir según la lógica de autenticación
    confirmVisible: boolean = false; // Nueva propiedad para mostrar confirmación inline

    constructor(private fb: FormBuilder, private router: Router,
        private service: MaestroService,
        private utils: UtilsService) {
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

    // Nuevo método para confirmar la acción
    confirmUpdate(): void {
        if (this.passwordForm.valid) {
            const user = JSON.parse(localStorage.getItem('user') ?? '{}');
            user["newPassword"] = this.utils.hash(this.passwordForm.value.newPassword);

            this.service.changePassword(user).subscribe({
                next: (result: any) => {
                    console.log("Contraseña actualizada", result);
                    this.router.navigate(['/dashboard']);
                }
            });
        }
    }

    // Permite cancelar el cambio
    cancelUpdate(): void {
        this.confirmVisible = false;
    }

    // Nuevo submit sin Swal: muestra la confirmación inline
    submit(): void {
        // Mostrar mensaje de confirmación en el HTML
        this.confirmVisible = true;
    }
}
