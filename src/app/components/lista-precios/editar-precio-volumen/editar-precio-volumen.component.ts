import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import { Producto } from 'src/app/shared/models/productos/Producto';

@Component({
  selector: 'app-editar-precio-volumen',
  templateUrl: './editar-precio-volumen.component.html',
  styleUrls: ['./editar-precio-volumen.component.scss']
})
export class EditarPrecioVolumenComponent implements OnInit {
  @Input() producto: Producto;

  precioForm: FormGroup;
  cargando = false;
  guardando = false;

  constructor(
    private fb: FormBuilder,
    private service: MaestroService,
    public activeModal: NgbActiveModal
  ) {}

  ngOnInit(): void {
    this.inicializarFormulario();
  }

  inicializarFormulario() {
    this.precioForm = this.fb.group({
      preciosVolumen: this.fb.array([])
    });

    // Cargar precios por volumen existentes
    const preciosExistentes = this.producto?.precio?.preciosVolumen || [];

    if (preciosExistentes.length > 0) {
      preciosExistentes.forEach((precio, index) => {
        const newItem = this.crearPreciosPorVolumen();
        newItem.patchValue({
          numeroUnidadesInicial: index === 0 ? 1 : precio.numeroUnidadesInicial,
          numeroUnidadesLimite: index === 0 ? 1 : precio.numeroUnidadesLimite,
          valorUnitarioPorVolumenSinIVA: precio.valorUnitarioPorVolumenSinIVA,
          valorIVAPorVolumen: precio.valorIVAPorVolumen || 19,
          valorUnitarioPorVolumenIva: precio.valorUnitarioPorVolumenIva,
          valorUnitarioPorVolumenConIVA: precio.valorUnitarioPorVolumenConIVA
        }, { emitEvent: false });

        // Si es la primera fila, deshabilitar los campos de cantidad
        if (index === 0) {
          newItem.get('numeroUnidadesInicial').disable();
          newItem.get('numeroUnidadesLimite').disable();
        }

        this.preciosVolumen.push(newItem);
      });
    }
  }

  get preciosVolumen(): FormArray {
    return this.precioForm.get('preciosVolumen') as FormArray;
  }

  crearPreciosPorVolumen(): FormGroup {
    const fbSub = this.fb.group({
      numeroUnidadesInicial: [0, [Validators.required]],
      numeroUnidadesLimite: [0, [Validators.required]],
      valorUnitarioPorVolumenSinIVA: [0, [Validators.required]],
      valorUnitarioPorVolumenIva: [0, [Validators.required]],
      valorIVAPorVolumen: [19, [Validators.required]],
      valorUnitarioPorVolumenConIVA: [0, [Validators.required]]
    });

    // Listener para precio sin IVA
    fbSub.get('valorUnitarioPorVolumenSinIVA').valueChanges.subscribe((precioSinIva: any) => {
      if (precioSinIva !== null && precioSinIva !== undefined && precioSinIva !== '') {
        let precioSinIvaNum = precioSinIva;
        if (typeof precioSinIva === 'string') {
          precioSinIvaNum = parseFloat(precioSinIva) || 0;
        }

        const precioIva = fbSub.get('valorIVAPorVolumen').value;
        let precioIvaNum = precioIva;
        if (typeof precioIva === 'string') {
          precioIvaNum = parseFloat(precioIva) || 0;
        } else if (precioIva === null || precioIva === undefined) {
          precioIvaNum = 0;
        }

        const calculo = precioSinIvaNum * (precioIvaNum / 100);
        const precioTotalConIva = calculo + precioSinIvaNum;

        fbSub.get('valorUnitarioPorVolumenIva').setValue(calculo, { emitEvent: false });
        fbSub.get('valorUnitarioPorVolumenConIVA').setValue(precioTotalConIva, { emitEvent: false });
      } else {
        fbSub.get('valorUnitarioPorVolumenIva').setValue(0, { emitEvent: false });
        fbSub.get('valorUnitarioPorVolumenConIVA').setValue(0, { emitEvent: false });
      }
    });

    // Listener para porcentaje IVA
    fbSub.get('valorIVAPorVolumen').valueChanges.subscribe((precioIva: any) => {
      if (precioIva !== null && precioIva !== undefined && precioIva !== '') {
        const unitPrice = fbSub.get('valorUnitarioPorVolumenSinIVA').value;

        let unitPriceNum = unitPrice;
        if (typeof unitPrice === 'string') {
          unitPriceNum = parseFloat(unitPrice) || 0;
        } else if (unitPrice === null || unitPrice === undefined) {
          unitPriceNum = 0;
        }

        let precioIvaNum = precioIva;
        if (typeof precioIva === 'string') {
          precioIvaNum = parseFloat(precioIva) || 0;
        }

        const calculo = unitPriceNum * (precioIvaNum / 100);
        const precioTotalConIva = calculo + unitPriceNum;

        fbSub.get('valorUnitarioPorVolumenIva').setValue(calculo, { emitEvent: false });
        fbSub.get('valorUnitarioPorVolumenConIVA').setValue(precioTotalConIva, { emitEvent: false });
      }
    });

    return fbSub;
  }

  addRow() {
    const newItem = this.crearPreciosPorVolumen();

    if (this.preciosVolumen.length > 0) {
      const lastItem = this.preciosVolumen.at(this.preciosVolumen.length - 1);
      const lastLimitInit = lastItem.get('numeroUnidadesInicial').value;
      const lastLimitSecond = lastItem.get('numeroUnidadesLimite').value;
      const newValueLimit = lastLimitSecond + 1;
      const newValueLimitSecond = newValueLimit + Math.abs(lastLimitInit - lastLimitSecond);
      newItem.get('numeroUnidadesInicial').setValue(newValueLimit);
      newItem.get('numeroUnidadesLimite').setValue(newValueLimitSecond);
    } else {
      newItem.get('numeroUnidadesInicial').setValue(2);
      newItem.get('numeroUnidadesLimite').setValue(10);
    }

    this.preciosVolumen.push(newItem);
  }

  lessRow(index: number) {
    this.preciosVolumen.removeAt(index);
  }

  guardar() {
    // Validar que todos los precios de volumen tengan valores
    let preciosValidos = true;
    for (let i = 0; i < this.preciosVolumen.length; i++) {
      const item = this.preciosVolumen.at(i);
      const precioSinIva = item.get('valorUnitarioPorVolumenSinIVA').value;
      if (!precioSinIva || precioSinIva <= 0) {
        preciosValidos = false;
        break;
      }
    }

    if (!preciosValidos) {
      return;
    }

    this.guardando = true;

    // Construir el array de precios por volumen
    const preciosVolumenData = this.preciosVolumen.controls.map((item, index) => {
      return {
        numeroUnidadesInicial: index === 0 ? 1 : item.get('numeroUnidadesInicial').value,
        numeroUnidadesLimite: index === 0 ? 1 : item.get('numeroUnidadesLimite').value,
        valorUnitarioPorVolumenSinIVA: parseFloat(item.get('valorUnitarioPorVolumenSinIVA').value) || 0,
        valorIVAPorVolumen: parseFloat(item.get('valorIVAPorVolumen').value) || 0,
        valorUnitarioPorVolumenIva: item.get('valorUnitarioPorVolumenIva').value || 0,
        valorUnitarioPorVolumenConIVA: item.get('valorUnitarioPorVolumenConIVA').value || 0
      };
    });

    // Actualizar el objeto precio del producto
    const precioActualizado = {
      ...this.producto.precio,
      preciosVolumen: preciosVolumenData
    };

    const productoActualizado = {
      ...this.producto,
      precio: precioActualizado,
      date_edit: new Date().toISOString()
    };

    console.log('Guardando precios por volumen:', productoActualizado);

    this.service.editProductByReference(productoActualizado).subscribe({
      next: (response) => {
        console.log('Precios por volumen actualizados exitosamente:', response);
        this.guardando = false;
        this.activeModal.close({
          success: true,
          producto: productoActualizado
        });
      },
      error: (error) => {
        console.error('Error al actualizar precios por volumen:', error);
        this.guardando = false;
        this.activeModal.close({
          success: false,
          error: error
        });
      }
    });
  }

  cancelar() {
    this.activeModal.dismiss();
  }
}
