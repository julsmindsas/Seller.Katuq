import { Component, OnInit } from '@angular/core';
import { CompanyInformation } from 'src/app/shared/models/User/CompanyInformation';
import { SecurityService } from 'src/app/shared/services/security/security.service';

@Component({
    selector: 'app-company-information',
    templateUrl: 'company-information.component.html',
    styleUrls: ['./company-information.component.scss']
})

export class CompanyInformationComponent implements OnInit {
    constructor(
        private securityService: SecurityService
    ) { }

    companyInformation: CompanyInformation;

    ngOnInit() {
        this.securityService.getCompanyInformationLogged$().subscribe((companyInformation: CompanyInformation) => {
            if (!companyInformation) {
                companyInformation = this.securityService.getCompanyInformationLogged();
            }
            this.companyInformation = companyInformation;
        });
    }
}