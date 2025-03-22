import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-terms-conditions',
  templateUrl: './terms-conditions.component.html',
  styleUrls: ['./terms-conditions.component.scss']
})
export class TermsConditionsComponent implements OnInit {

  pdfPath: string = 'assets/pdf/Terminos y Condiciones Generales de uso KATUQ.pdf';
  safePdfUrl: SafeResourceUrl;

  constructor(private sanitizer: DomSanitizer) {
    this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(encodeURI(this.pdfPath));
  }

  ngOnInit(): void { }
}
