import { Component, OnInit } from '@angular/core';
import { CompanyInformation } from '../../../../models/User/CompanyInformation';
import { SecurityService } from '../../../../services/security/security.service';
import { AuthService } from '../../../../services/firebase/auth.service';

@Component({
    selector: 'app-company-information',
    templateUrl: './company-information.component.html',
    styleUrls: ['./company-information.component.scss']
})

export class CompanyInformationComponent implements OnInit {
    constructor(
        private securityService: SecurityService,
        private authService: AuthService
    ) { }

    companyInformation: CompanyInformation;
    ngOnInit() {
        this.securityService.getCompanyInformationLogged$().subscribe((companyInformation: CompanyInformation | null) => {
            if (!companyInformation) {
                companyInformation = this.securityService.getCompanyInformationLogged();
            }
            else if (!companyInformation?.imgUrlLogo) {
                this.authService.SignOut();
            }
            this.companyInformation = companyInformation as CompanyInformation;
        });
    }
}