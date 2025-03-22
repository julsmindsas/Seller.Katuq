import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UtilsService } from '../../../shared/services/utils.service';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-shared-change-password',
    templateUrl: './change-password.component.html',
    styleUrls: ['./change-password.component.scss']
})
export class SharedChangePasswordComponent implements OnInit {
    passwordForm: FormGroup;
    standardPasswordDetected: boolean = true; // Esta bandera se debería definir según la lógica de autenticación
    confirmVisible: boolean = false; // Nueva propiedad para mostrar confirmación inline

    constructor(private fb: FormBuilder, private router: Router,
        private service: MaestroService,
        private utils: UtilsService) {
        this.passwordForm = this.fb.group({
            Password: ['', Validators.required],
            newPassword: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$.!%*?&])[A-Za-z\d@$.!%*?&]{8,}$/)]],
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


            const UserLogged = JSON.parse(localStorage.getItem('user')!);

            const user = JSON.parse('{}');
            user["actualPassword"] = this.utils.hash(this.passwordForm.value.Password);
            user["newPassword"] = this.utils.hash(this.passwordForm.value.newPassword);
            user["email"] = UserLogged.email;

            this.service.changeNewPassword(user).subscribe((result: any) => {

                console.log("Contraseña actualizada", result);

                //LImpiar fortmulario

                this.passwordForm.controls['Password'].setValue('');
                this.passwordForm.controls['newPassword'].setValue('');
                this.passwordForm.controls['confirmPassword'].setValue('');

                this.passwordForm.controls['Password'].untouched;
                this.passwordForm.controls['newPassword'].untouched;
                this.passwordForm.controls['confirmPassword'].untouched;


                Swal.fire({
                    icon: 'success',
                    title: 'Contraseña cambiada con éxito!',
                    showConfirmButton: true
                });
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
        this.confirmUpdate();
    }
}
