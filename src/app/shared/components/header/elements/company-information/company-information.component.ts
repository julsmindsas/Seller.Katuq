import { Component, OnInit, OnDestroy } from '@angular/core';
import { CompanyInformation } from '../../../../models/User/CompanyInformation';
import { SecurityService } from '../../../../services/security/security.service';
import { AuthService } from '../../../../services/firebase/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
    selector: 'app-company-information',
    templateUrl: './company-information.component.html',
    styleUrls: ['./company-information.component.scss']
})

export class CompanyInformationComponent implements OnInit, OnDestroy {
    constructor(
        private securityService: SecurityService,
        private authService: AuthService
    ) { }

    companyInformation: CompanyInformation;
    private logoError = false;
    private readonly DEFAULT_LOGO = 'assets/images/logo/Katuq/faviconkatuq.png';
    private readonly FALLBACK_LOGO = 'assets/images/logo/Katuq/katuq_light.svg';
    private destroy$ = new Subject<void>();

    ngOnInit() {
        this.securityService.getCompanyInformationLogged$()
            .pipe(takeUntil(this.destroy$))
            .subscribe((companyInformation: CompanyInformation | null) => {
                if (!companyInformation) {
                    companyInformation = this.securityService.getCompanyInformationLogged();
                }
                this.companyInformation = companyInformation as CompanyInformation;
                this.logoError = false; // Reset error state when company info changes
            });
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Obtiene la URL del logo con validación y fallback
     */
    getLogoUrl(): string {
        if (this.logoError) {
            return this.FALLBACK_LOGO;
        }

        if (this.companyInformation?.imgUrlLogo) {
            // Validar que la URL tenga un formato válido
            try {
                const url = new URL(this.companyInformation.imgUrlLogo, window.location.origin);
                return url.toString();
            } catch (error) {
                console.warn('URL de logo inválida:', this.companyInformation.imgUrlLogo);
                return this.DEFAULT_LOGO;
            }
        }

        return this.DEFAULT_LOGO;
    }

    /**
     * Maneja errores de carga de imagen
     */
    onLogoError(event: any): void {
        console.warn('Error cargando logo:', event);
        this.logoError = true;
        
        // Intentar cargar el logo por defecto si no es el que falló
        if (event.target.src !== this.FALLBACK_LOGO) {
            event.target.src = this.FALLBACK_LOGO;
        }
    }
}