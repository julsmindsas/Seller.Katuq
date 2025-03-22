import { Component, OnDestroy, OnInit } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Route, Router } from '@angular/router';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import { ServiciosService } from 'src/app/shared/services/servicios.service';
import { ImagenService } from 'src/app/shared/utils/image.service';
import Swal from 'sweetalert2';


@Component({
  selector: 'app-adiciones',
  templateUrl: './adiciones.component.html',
  styleUrls: ['./adiciones.component.scss']
})
export class AdicionesComponent implements OnInit, OnDestroy {


  additionForm: FormGroup;
  // cities: any[];
  name: any;
  namestorage: any;
  email: any;
  cargando: Boolean;
  files: any;
  filesNames = [];
  filesPaths = [];
  fileImg = [];
  result: any;
  flag = [];
  images: any[];
  croppedImage: any = '';
  carrouselImg: any = [];
  fileUrls: any = [];
  isEditing: boolean = false;
  ciudadesOrigen = JSON.parse(sessionStorage.getItem('currentCompany')).ciudadess.ciudadesOrigen
  ciudadesEntrega = JSON.parse(sessionStorage.getItem('currentCompany')).ciudadess.ciudadesEntrega
  tipoEntrega: any;

  constructor(private formBuilder: FormBuilder, private service: MaestroService,
    public activeModal: NgbActiveModal, public storage: AngularFireStorage, private router: Router, private imageService: ImagenService) {

  }

  ngOnDestroy(): void {

  }

  ngOnInit() {
    this.additionForm = this.formBuilder.group({
      tipoEntrega: ['', Validators.required],
      unitsAvailable: ['', Validators.required],
      highlighted: ['', Validators.required],
      position: ['', Validators.required],
      inventario: [''],
      referencia:['',Validators.required],

      availableForPurchase: [''],
      availableFrom: [''],
      availableUntil: [''],
      recommended: [false],
      tiempoEntrega: ['', Validators.required],
      active: ['', Validators.required],
      precioTotal: [''],
      onlyPos: [''],
      precioIva: [''],
      porcentajeIVA: [''],
      precioUnitario: ['', Validators.required],
      imagenSecundaria: [[]],
      imagenPrincipal: [[]],
      descripcion: ['', Validators.required],
      titulo: ['', Validators.required],

      // availableCities: this.formBuilder.group({
      originCities: [[]],
      deliveryCities: [[]],
      esAdicion: [true],
      esPreferencia: [false],
      // })
    });
    this.service.getTipoEntrega().subscribe((r: any) => {
      this.tipoEntrega = r
      if (sessionStorage.getItem("adictionForEdit") != null) {
        this.additionForm.patchValue(JSON.parse(sessionStorage.getItem("adictionForEdit")));
        this.isEditing = true;
      }

    })

    this.additionForm.get('precioUnitario').valueChanges.subscribe((precioUnitario) => {
      if (precioUnitario) {

        const unitPrice = this.additionForm.get('precioUnitario').value;
        const valorIVA = this.additionForm.get('porcentajeIVA').value
        this.additionForm.get('precioIva').setValue((unitPrice * (valorIVA / 100)));
        this.additionForm.get('precioTotal').setValue(unitPrice + (unitPrice * (valorIVA / 100)));
      } else {
        this.additionForm.get('precioTotal').setValue('0');
      }
    });
    this.additionForm.get('porcentajeIVA').valueChanges.subscribe((porcentajeIVA) => {
      if (porcentajeIVA) {
        const unitPrice = this.additionForm.get('precioUnitario').value;
        const valorIVA = this.additionForm.get('porcentajeIVA').value
        this.additionForm.get('precioIva').setValue((unitPrice * (valorIVA / 100)));
        this.additionForm.get('precioTotal').setValue(unitPrice + (unitPrice * (valorIVA / 100)));
      } else {
        this.additionForm.get('precioTotal').setValue('0');
      }
    });
  }

  mostrarMensajeDeGuardado() {
    this.additionForm.reset();
    Swal.fire({
      title: 'guardo exitosamente!',
      text: 'Imagenes guardadas en la base de datos',
      icon: 'success',
      showConfirmButton: false,
      timer: 3000
    });
    this.carrouselImg = [];
  }

  submitAdicion() {

    if (this.additionForm.valid) {
      var adicion = this.additionForm.value;
      if (this.fileImg.length == 0) {
        this.Guardar(adicion);
      }
      // else {
      //   this.uploadImgAndSave()
      // }
    }
  }

  private Guardar(adicion: any) {
    let action = null;
    if (this.isEditing == false) {
      action = this.service.createAdiciones(adicion);
    }
    else {
      adicion["_id"] = JSON.parse(sessionStorage.getItem("adictionForEdit"))._id;
      action = this.service.editAdiciones(adicion);
    }

    action.subscribe(res => {
      this.mostrarMensajeDeGuardado();
      sessionStorage.removeItem("adictionForEdit");
      this.router.navigateByUrl("ecommerce/adiciones/listar");
      this.isEditing = false;
      this.cargando = false;
    });
  }

  fileChangeEvent(event: any, tipoImagen: string): void {
    Swal.fire({
      title: '¿Está seguro? esta imágenes se subirán de inmediato a la base de datos',
      text: '¡No podrás revertir esto!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, subelos!',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        for (let index = 0; index < event.target.files.length; index++) {
          this.files = event.target.files && event.target.files[index];
          this.fileImg.push({ img: event.target.files[index], tipo: tipoImagen });
          this.filesNames.push(this.files.name);
          let fileReader = new FileReader();
          fileReader.readAsDataURL(this.files);

          fileReader.onload = (event: any) => {
            this.carrouselImg.push((<FileReader>event.target).result);
            this.uploadImgAndSave();
          }
        }
      }

    });
  }


  async uploadImgAndSave() {
    if (this.carrouselImg.length < 0) {
      return;
    }
    Swal.fire({
      title: 'Subiendo...',
      html: `
        <h6>Por favor espere mientras se suben las imagenes</h6>
        <br>
        <div class="progress">
          <div class="progress-bar progress-bar-striped progress-bar-animated" id="progressbar" style="width:0%"></div>
        </div>`,
      showConfirmButton: false,
      allowOutsideClick: false
    });
    let progressPercent: number = 0;
    let base: number = (100 / this.fileImg.length)
    for (let index = 0; index < this.fileImg.length; index++) {
      // var referencia = this.storage.storage.ref('Medios/' + `${this.filesNames[index]}`);

      var uploading = this.storage.upload('Adiciones/' + `${this.filesNames[index]}`, this.fileImg[index].img);
      this.filesPaths.push({ name: this.filesNames[index], pathName: 'Adiciones/' + `${this.filesNames[index]}`, tipo: this.fileImg[index].tipo });
      var progress = (await uploading).state;

      uploading.then((a) => {
        console.log("🚀 ~ file: image-croper.component.ts:111 ~ uploading.then ~ a:", a)
        progressPercent += base;
        document.getElementById('progressbar').style.width = progressPercent + '%';
        this.flag.push(progress);
      }).catch(() => {
        this.flag.push(progress);
      }).finally(() => {
        if (parseInt(progressPercent.toString()) == 100) {
          Swal.close();
          this.resultImg();
        }
      });

    }
  }

  async resultImg() {
    if (this.flag.includes('error')) {
      Swal.fire({
        title: 'Atención!',
        text: 'Ocurrió un error al subir una imágen, inténtalo nuevamente',
        icon: 'warning',
        showConfirmButton: false,
        timer: 3000
      });
      this.activeModal.close('creado');
      this.carrouselImg = [];
      this.files;
      this.filesNames = [];

    } else {
      Swal.fire({
        title: '¡Subida exitosa!',
        text: 'Imagenes guardadas en la base de datos',
        icon: 'success',
        showConfirmButton: false,
        timer: 3000
      });
      this.activeModal.close('creado');
      this.carrouselImg = [];
      this.files;
      this.filesNames = [];

      this.guardarRegistrosEnFirebase();

    }
  }

  deleteImg(imgToDelete: string): void {

    Swal.fire({
      title: '¿Estás seguro?',
      text: `Se eliminará la imágen `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Si, eliminar',
      cancelButtonText: 'No, cancelar',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      showCloseButton: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.imageService.eliminarImagen(imgToDelete);
        Swal.fire('Eliminada!', 'La imágen ha sido eliminada.', 'success');
        var values = this.additionForm.controls['imagenesPrincipal'].value;
        values = values.filter(p => p.path != imgToDelete);
        this.additionForm.controls['imagenesPrincipal'].setValue(values);

      }
      else if (result.isDismissed) {
        Swal.fire({
          title: 'Cancelado',
          text: `La imágen  no se eliminó`,
          icon: 'success',
          showCloseButton: true
        });
        return;
      }
    })

  }

  guardarRegistrosEnFirebase() {

    this.filesPaths.forEach(img => {
      this.storage.ref(img.pathName).getDownloadURL().subscribe(url => {
        console.log('URL de descarga:', url);
        // this.images.push({
        const media = {
          urls: url,
          nombreImagen: img.name,
          path: img.pathName,
          tipo: img.tipo
        };

        this.fileUrls.push(media);

        if (this.fileUrls.length == this.filesPaths.length) {
          this.additionForm.controls["imagenPrincipal"].setValue(this.fileUrls.filter(r => r.tipo == "principal"))
          this.additionForm.controls["imagenSecundaria"].setValue(this.fileUrls.filter(r => r.tipo == "secundaria"))

          this.Guardar(this.additionForm.value)
        }
      });
    });
  }
}
