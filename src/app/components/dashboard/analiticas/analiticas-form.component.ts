import { Component, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
// import { ApiService } from 'src/app/shared/services/api.service';
import { AnaliticaService } from "../../../shared/services/dashboard/analiticas.services";

@Component({
  selector: 'app-analiticas-form',
  templateUrl: './analiticas-form.component.html',
  styleUrls: ['./analiticas-form.component.scss']
})
export class AnaliticaComponent implements OnInit {

  videoUrl: any;

  constructor(
    public sanitizer: DomSanitizer,
    public services: AnaliticaService
  ) { }

  async ngOnInit() {
    // const url1 = 'https://lookerstudio.google.com/embed/reporting/5e8cc7bd-8728-45b4-adc3-b60ea838b15c/page/p_ryp7uchfed'
    // const url2 = 'https://lookerstudio.google.com/embed/reporting/4ba99b67-c1d9-452c-abd1-084fa60b38ec/page/p_ryp7uchfed'

    // 
    const company = await this.services.getData({ nit: '12345' });

    const link = "https://lookerstudio.google.com/embed/reporting/6f7dd11d-70ea-4e02-b170-b0a8f5b40f47/page/3d91D"; //company[0].link;

    this.videoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(link);

  }

}