import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';

@Component({
  selector: 'app-tiempo-entrega',
  templateUrl: './tiempo-entrega.component.html',
  styleUrls: ['./tiempo-entrega.component.scss']
})
export class TiempoEntregaComponent implements OnInit {
  form: FormGroup;

  selectOptions: string[] = ['Option 1', 'Option 2', 'Option 3'];
  empresaActual: any;
  constructor(private formBuilder: FormBuilder, private service: MaestroService, private router: Router) { }
  formasEntrega: any;
  ciudadesMedellin = [
    {
      "city": "Medellín"
    },
    {
      "city": "Envigado"
    },
    {
      "city": "Sabaneta"
    },
    {
      "city": "Itagüí"
    },
    {
      "city": "Caldas"
    },
    {
      "city": "La Estrella"
    },
    {
      "city": "Bello"
    },
    {
      "city": "Copacabana"
    },
    {
      "city": "Girardota"
    },
    {
      "city": "Rionegro"
    }
  ]

  ngOnInit(): void {
    const tiempoEntregaStr = sessionStorage.getItem("tiempoEntregaEdit");
    const tiempoEntregaEdit = tiempoEntregaStr ? JSON.parse(tiempoEntregaStr) : null;

    this.service.consultarEmpresasByUser(null).subscribe((r: any) => {
      this.empresaActual = (r as any[])[0];
      console.log("🚀 ~ file: tiempo-entrega.component.ts:71 ~ TiempoEntregaComponent ~ this.service.consultarEmpresasByUser ~ this.empresaActual", this.empresaActual)
    });

    this.form = this.formBuilder.group({
      nombreInterno: [tiempoEntregaEdit ? tiempoEntregaEdit.nombreInterno : '', Validators.required],
      nombreExterno: [tiempoEntregaEdit ? tiempoEntregaEdit.nombreExterno : '', Validators.required],
      descripcion: [tiempoEntregaEdit ? tiempoEntregaEdit.descripcion : '', Validators.required],
      minDias: [tiempoEntregaEdit ? tiempoEntregaEdit.minDias : null, Validators.required],
      posicion: [tiempoEntregaEdit ? tiempoEntregaEdit.posicion : null, Validators.required],
      activo: [tiempoEntregaEdit ? tiempoEntregaEdit.activo : true],
      ciudad: [tiempoEntregaEdit ? tiempoEntregaEdit.ciudad : [], Validators.required],  // Suponiendo que ciudad es un array que debe convertirse a una cadena separada por comas.
      cd: [tiempoEntregaEdit ? tiempoEntregaEdit.cd : null]
    });
  }

  onSubmit() {
    if (this.form.valid) {
      // form is valid, do something with the form values
      console.log(this.form.value);
      if (this.form.value.cd == null) {
        this.service.createTiempoEntrega(this.form.value).subscribe(res => {
          console.log("🚀 ~ file: tiempo-entrega.component.ts:71 ~ TiempoEntregaComponent ~ this.service.createTipoEntrega ~ res:", res)
          this.router.navigateByUrl('/tiempoentrega')
        })
      } else {

        this.service.updateTiempoEntrega(this.form.value).subscribe(res => {
          console.log("🚀 ~ file: tiempo-entrega.component.ts:71 ~ TiempoEntregaComponent ~ this.service.createTipoEntrega ~ res:", res)
          this.router.navigateByUrl('/tiempoentrega')
        })
      }
    } else {
      // form is invalid, show an error message
    }
  }
}
