import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-terms-conditions',
  templateUrl: './terms-conditions.component.html',
  styleUrls: ['./terms-conditions.component.scss']
})
export class TermsConditionsComponent implements OnInit {

  // El archivo real en src/assets/pdf termina en ".docx.pdf".
  pdfPath: string = 'assets/pdf/Terminos y Condiciones Generales de uso KATUQ.docx.pdf';
  pdfUrl: string;
  safePdfUrl: SafeResourceUrl;

  constructor(private sanitizer: DomSanitizer) {
    this.pdfUrl = encodeURI(this.pdfPath);
    this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfUrl);
  }

  ngOnInit(): void { }
}
