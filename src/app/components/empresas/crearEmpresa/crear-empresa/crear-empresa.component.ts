import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormGroup, FormBuilder, FormControl, Validators, FormArray } from '@angular/forms';
import Swal from 'sweetalert2'
import { MaestroService } from '../../../../shared/services/maestros/maestro.service';
import { InfoPaises } from '../../../../../Mock/pais-estado-ciudad'
import { InfoIndicativos } from '../../../../../Mock/indicativosPais'
import { finalize, take } from 'rxjs';
import { Router } from '@angular/router';
import { AngularFireStorage } from '@angular/fire/compat/storage';
@Component({
  selector: 'app-crear-empresa',
  templateUrl: './crear-empresa.component.html',
  styleUrls: ['./crear-empresa.component.scss']
})

export class CrearEmpresaComponent implements OnInit {
  @ViewChild('paisSede') paisSede: ElementRef
  @ViewChild('nombreSede') nombreSede: ElementRef

  @ViewChild('direccionSede') direccionSede: ElementRef
  @ViewChild('dptoSede') dptoSede: ElementRef
  @ViewChild('ciudadSede') ciudadSede: ElementRef
  @ViewChild('rotuloDireccionSede') rotuloDireccionSede: ElementRef
  @ViewChild('comoLlegarSede') comoLlegarSede: ElementRef
  @ViewChild('codigoPostalSede') codigoPostalSede: ElementRef

  @ViewChild('nomCompletoContacto') nomCompletoContacto: ElementRef
  @ViewChild('indicativoTelContacto') indicativoTelContacto: ElementRef
  @ViewChild('telContacto') telContacto: ElementRef
  @ViewChild('indicativoFijoContacto') indicativoFijoContacto: ElementRef
  @ViewChild('fijoContacto') fijoContacto: ElementRef
  @ViewChild('extensionFijoContacto') extensionFijoContacto: ElementRef
  @ViewChild('emailContacto') emailContacto: ElementRef
  @ViewChild('cargoContacto') cargoContacto: ElementRef
  @ViewChild('linkGoogleMapsSede') linkGoogleMapsSede: ElementRef
  @ViewChild('barrio') barrio: ElementRef

  public f: FormGroup
  paises: string[];
  departamentos: any;
  ciudades: string[];
  paises1: string[];

  horarioPV: FormArray<any>;
  marketPlaces: FormArray<any>;
  redesSociales: FormArray<any>;
  canalesComunicacion: FormArray<any>;
  ciudadesOrigen = [
    {
      "value": "Medellín",
      "label": "Medellín"
    },
    {
      "value": "Bello",
      "label": "Bello"
    },
    {
      "value": "Itagüí",
      "label": "Itagüí"
    },
    {
      "value": "Envigado",
      "label": "Envigado"
    },
    {
      "value": "Sabaneta",
      "label": "Sabaneta"
    },
    {
      "value": "La Estrella",
      "label": "La Estrella"
    },
    {
      "value": "Caldas",
      "label": "Caldas"
    },
    {
      "value": "Copacabana",
      "label": "Copacabana"
    },
    {
      "value": "Girardota",
      "label": "Girardota"
    },
    {
      "value": "Barbosa",
      "label": "Barbosa"
    },
    {
      "value": "Guarne",
      "label": "Guarne"
    }
  ]

  ciudadesEntrega = [
    {
      "value": "Medellín",
      "label": "Medellín"
    },
    {
      "value": "Bello",
      "label": "Bello"
    },
    {
      "value": "Itagüí",
      "label": "Itagüí"
    },
    {
      "value": "Envigado",
      "label": "Envigado"
    },
    {
      "value": "Sabaneta",
      "label": "Sabaneta"
    },
    {
      "value": "La Estrella",
      "label": "La Estrella"
    },
    {
      "value": "Caldas",
      "label": "Caldas"
    },
    {
      "value": "Copacabana",
      "label": "Copacabana"
    },
    {
      "value": "Girardota",
      "label": "Girardota"
    },
    {
      "value": "Barbosa",
      "label": "Barbosa"
    },
    {
      "value": "Rionegro",
      "label": "Rionegro"
    },
    {
      "value": "Marinilla",
      "label": "Marinilla"
    },
    {
      "value": "La Ceja",
      "label": "La Ceja"
    },
    {
      "value": "Guarne",
      "label": "Guarne"
    },
    {
      "value": "Santuario",
      "label": "Santuario"
    },
    {
      "value": "Guarne",
      "label": "Guarne"
    },
    {
      "value": "El Retiro",
      "label": "El Retiro"
    },
    {
      "value": "Resto de Antioquia",
      "label": "Resto de Antioquia"
    },
    {
      "value": "Resto del País",
      "label": "Resto del País"
    },

  ]

  ciudadess: any;

  indicativos: { nombre: string; name: string; nom: string; iso2: string; iso3: string; phone_code: string; }[];
  indicativosLocales: any[];
  edit: any;
  mostrarCrear: boolean;
  sedess: { nombreSede: string; direccionSede: string; paisSede: string; dptoSede: string; ciudadSede: string; codigoPostalSede: string; rotuloDireccionSede: string; comoLlegarSede: string; linkGoogleMaps: string; barrio: string }[] = [];
  contactos: { nomCompletoContacto: any; indicativoTelContacto: any; telContacto: any; indicativoFijoContacto: any; fijoContacto: any; extensionFijoContacto: any; emailContacto: any; cargoContacto: any }[] = [];
  ciudadesss: any;
  frmPersonificaTuMarca: FormGroup
  archivos: any[];
  uploadedFiles: { name: string; url: string }[] = [];
  // Objetos para seguir el progreso y almacenar URLs por tipo
  uploadProgress: { [key: string]: number } = {};
  downloadURLs: { [key: string]: string } = {};


  handleFilesUploaded(files: { name: string; url: string }[]): void {
    this.uploadedFiles = files;
  }


  constructor(private fb: FormBuilder,
    private storage: AngularFireStorage, private service: MaestroService, private inforPaises: InfoPaises, private infoIndicativo: InfoIndicativos, private router: Router) {

    this.f = fb.group({
      nombre: ['', Validators.required],
      nomComercial: ['', Validators.required],
      nit: ['', Validators.required],
      digitoVerificacion: ['', Validators.required],
      indicativoFijoLocal: ['Código Area', Validators.required],
      fijo: ['', Validators.required],
      extensionFijo: ['', Validators.required],

      indicativoCel: ['Código País', Validators.required],
      cel: ['', Validators.required],
      emailFactuElec: ['', Validators.required],
      //campos Auxiliares

      nomCompletoContacto: [''],
      indicativoTelContacto: [''],
      telContacto: [''],
      indicativoFijoContacto: [''],
      fijoContacto: [''],
      extensionFijoContacto: [''],
      emailContacto: [''],
      cargoContacto: [''],

      nombreSede: [''],
      direccionSede: [''],
      paisSede: [''],
      dptoSede: [''],
      ciudadSede: [''],
      codigoPostalSede: [''],
      rotuloDireccionSede: [''],
      comoLlegarSede: [''],

      //termina campos Auxiliares

      emailContactoGeneral: ['', Validators.required],
      emailNotificacionesSistema: ['', Validators.required],
      direccion: ['', Validators.required],
      barrio: ['', Validators.required],
      pais: ['País', Validators.required],
      departamento: ['Departamento', Validators.required],
      ciudad: ['Ciudad', Validators.required],
      codPostal: ['', Validators.required],
      terminosYCondiciones: [false, Validators.required],
      tratamientoDeDatosPersonales: [false, Validators.required],
      logo: ['', Validators.required],
      apeturaSac: [[], Validators.required],
      cierreSac: [[], Validators.required],
      horarioPV: fb.array([]),
      aperturaPagweb: [[], Validators.required],
      cierrePagweb: [[], Validators.required],
      ciudadess: [[], Validators.required],
      contactos: [[], Validators.required],
      sedes: [[], Validators.required],
      marketPlace: fb.array([this.crearMP()]),
      redesSociales: fb.array([this.crearRS()]),
      canalesComunicacion: fb.array([this.crearCC()]),
      banner: [null],
      imageEmail: this.fb.group({
        encabezado: [null],
        piepagina: [null]
      }),
      //KAI
      personalidadMarca: [{}],
      canalInscripcion: ['Consultiva', Validators.required],
      planPago: ["Mensual", Validators.required],
      nombrePlan: ["Freemium", Validators.required],
      timeRestToExpirePlan: [0, Validators.required],
    });

    this.ciudadess = this.fb.group({
      ciudadesOrigen: [[], [Validators.required]],
      ciudadesEntrega: [[], Validators.required]
    });

    this.frmPersonificaTuMarca = this.fb.group({
      marcaProyeccion: ['', Validators.required],
      marcaHabla: ['', Validators.required],
      colaboradoresHablan: ['', Validators.required],
      tonoMarca: ['', Validators.required],
      frasesKai: ['', Validators.required],
      manejoQuejas: ['', Validators.required],
      terminosEvitar: ['', Validators.required]
    });

  }

  crearMP(): FormGroup {
    return this.fb.group({
      logoMP: ['', [Validators.required]],
      nombreMP: ['', [Validators.required]],
      linkMP: ['', [Validators.required]],
      activoMp: [false, [Validators.required]],
    });
  }
  crearCC() {
    return this.fb.group({
      logoCC: ['', [Validators.required]],
      nombreCC: ['', [Validators.required]],
      linkCC: ['', [Validators.required]],
      activoCc: [false, [Validators.required]],
    });
  }
  crearRS() {
    return this.fb.group({
      logoRS: ['', [Validators.required]],
      nombreRS: ['', [Validators.required]],
      linkRS: ['', [Validators.required]],
      activoRs: [false, [Validators.required]],
    });
  }
  horariosPV() {
    return this.fb.group({
      nombrePV: [this.sedess[this.sedess.length - 1].nombreSede, [Validators.required]],
      aperturaPv: ['', [Validators.required]],
      cierrePv: ['', [Validators.required]],
    });
  }
  addRow() {
    const sede = {
      nombreSede: this.nombreSede.nativeElement.value,
      direccionSede: this.direccionSede.nativeElement.value,
      paisSede: this.paisSede.nativeElement.value,
      dptoSede: this.dptoSede.nativeElement.value,
      ciudadSede: this.ciudadSede.nativeElement.value,
      codigoPostalSede: this.codigoPostalSede.nativeElement.value,
      rotuloDireccionSede: this.rotuloDireccionSede.nativeElement.value,
      comoLlegarSede: this.comoLlegarSede.nativeElement.value,
      linkGoogleMaps: this.linkGoogleMapsSede.nativeElement.value,
      barrio: this.barrio.nativeElement.value


    }
    this.sedess.push(sede)
    this.horarioPV = this.f.get('horarioPV') as FormArray;
    this.horarioPV.push(this.horariosPV());


  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const archivosSeleciconados = Array.from(input.files).map((archivo) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const archivoBase64 = reader.result as string;
            resolve({
              name: archivo.name,
              base64: archivoBase64
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(archivo);
        });
      });

      Promise.all(archivosSeleciconados).then((archivos) => {
        this.archivos = archivos;
      }).catch((error) => {
        console.error('Error al obtener los archivos en base64:', error);
      });
    }
  }




  get sedes(): FormArray {
    return this.f.get('sedes') as FormArray;
  }

  addRowContact() {
    const contacto = {
      nomCompletoContacto: this.nomCompletoContacto.nativeElement.value,
      indicativoTelContacto: this.indicativoTelContacto.nativeElement.value,
      telContacto: this.telContacto.nativeElement.value,
      indicativoFijoContacto: this.indicativoFijoContacto.nativeElement.value,
      fijoContacto: this.fijoContacto.nativeElement.value,
      extensionFijoContacto: this.extensionFijoContacto.nativeElement.value,
      emailContacto: this.emailContacto.nativeElement.value,
      cargoContacto: this.cargoContacto.nativeElement.value

    }
    this.contactos.push(contacto)

  };

  addRowMP() {
    this.marketPlaces = this.f.get('marketPlace') as FormArray;
    this.marketPlaces.push(this.crearMP());


  }
  addRowRS() {
    this.redesSociales = this.f.get('redesSociales') as FormArray;
    this.redesSociales.push(this.crearRS());

  }
  addRowCC() {
    this.canalesComunicacion = this.f.get('canalesComunicacion') as FormArray;
    this.canalesComunicacion.push(this.crearCC());


  }
  redirectToPostalCode() {
    window.open('https://visor.codigopostal.gov.co/472/visor', '_blank');
  }
  deleteItemContact(i) {
    this.contactos.splice(i, 1);
  }
  deleteItem(i) {
    this.sedess.splice(i, 1);
    this.horarioPV.removeAt(i)

  }
  lessRowMP(i) {
    this.marketPlaces.removeAt(i);
  }
  lessRowRS(i) {
    this.redesSociales.removeAt(i);
  }
  lessRowCC(i) {
    this.canalesComunicacion.removeAt(i);
  }

  ngAfterContentInit() {
    this.mostrarCrear = true
    const infoFormsCompany = sessionStorage.getItem('infoFormsCompany');
    this.edit = infoFormsCompany ? JSON.parse(infoFormsCompany) : null;
    if (this.edit != null) {
      this.mostrarCrear = false

      this.contactos = this.edit.contactos
      this.sedess = this.edit.sedes
      this.horarioPV = this.edit.horarioPV
      this.f.value.canalesComunicacion = this.edit.canalesComunicacion
      this.edit.horarioPV?.map(x => {
        this.horarioPV = this.f.get('horarioPV') as FormArray;
        this.horarioPV.push(this.horariosPV());
      })
      this.edit.canalesComunicacion?.map(x => {
        this.addRowCC()
      })
      this.edit.marketPlace?.map(x => {
        this.addRowMP()
      })
      this.edit.redesSociales?.map(x => {
        this.addRowRS()
      })
      this.f.patchValue(this.edit)
      this.f.controls['cel'].setValue(this.edit?.celular)
      this.f.controls['emailContactoGeneral'].setValue(this.edit?.correo)
      this.frmPersonificaTuMarca.patchValue(this.edit?.personalidadMarca);
      this.uploadedFiles = this.edit.personalidadMarca?.archivos;
      this.ciudadess.patchValue(this.edit?.ciudadess)
      // this.ciudadesss.patchValue(this.edit.ciudadess.ciudadesOrigen)

      this.identificarDepto()

      this.identificarCiu()
    }
  }


  handleFileDeleted(fileUrl: string): void {
    this.uploadedFiles = this.uploadedFiles.filter(file => file.url !== fileUrl);
  }

  removeFile(file: any): void {
    if (confirm(`¿Estás seguro de que deseas eliminar el archivo "${file.name}"?`)) {
      this.uploadedFiles = this.uploadedFiles.filter(f => f.url !== file.url);
    }
  }
  ngOnInit(): void {
    this.indicativos = this.infoIndicativo.datos
    this.indicativosLocales = this.infoIndicativo.indicativosLocales
    this.paises = this.inforPaises.paises.map(x => {
      return x.Pais
    })
    this.paises1 = this.paises
  }
  guardar() {

    this.f.controls['ciudadess'].setValue(this.ciudadess.value)
    this.f.controls['contactos'].setValue(this.contactos)
    this.f.controls['sedes'].setValue(this.sedess)
    this.service.editCompany(this.f.value).subscribe(r => {

      Swal.fire({
        title: 'Guardado!',
        text: 'Guardado con exito',
        icon: 'success',
        confirmButtonText: 'Ok'
      })
    });
  }
  editar() {

    if (this.frmPersonificaTuMarca.valid) {
      const formularioData = {
        ...this.frmPersonificaTuMarca.value,
        archivos: this.uploadedFiles
      };
      console.log('Datos del formulario:', formularioData);
      this.f.controls["personalidadMarca"].setValue(formularioData);
      // Aquí puedes implementar la lógica para enviar los datos a un servidor
    } else {
      console.log('Formulario inválido');
    }

    this.f.controls['ciudadess'].setValue(this.ciudadess.value)
    this.f.controls['contactos'].setValue(this.contactos)
    this.f.controls['sedes'].setValue(this.sedess)
    this.service.editCompany(this.f.value).subscribe(r => {
      sessionStorage.setItem('infoFormsCompany', JSON.stringify(this.f.value))
      Swal.fire({
        title: 'Editado!',
        text: 'Editado con exito',
        icon: 'success',
        confirmButtonText: 'Ok'
      })
    });
  }

  identificarDepto() {
    this.inforPaises?.paises.map(x => {
      if (x.Pais == this.f.controls.pais.value) {
        this.departamentos = x.Regiones.map(c => {
          return c.departamento
        })
      }
    })

  }
  identificarCiu() {
    this.inforPaises?.paises.map(x => {
      if (x.Pais == this.f.controls.pais.value) {
        x.Regiones.map(y => {
          if (y.departamento == this.f.controls.departamento.value) {
            this.ciudades = y.ciudades.map(c => {
              return c
            })
            this.ciudadesOrigen = this.ciudades.map(city => ({
              value: city, label: city
            }))

          }
        })

      }
    })
  }
  identificarDepto1() {
    this.inforPaises.paises.map(x => {
      if (x.Pais == this.paisSede.nativeElement.value) {
        this.departamentos = x.Regiones.map(c => {
          return c.departamento
        })
      }
    })

  }
  identificarCiu1() {
    this.inforPaises.paises.map(x => {
      if (x.Pais == this.paisSede.nativeElement.value) {
        x.Regiones.map(y => {
          if (y.departamento == this.dptoSede.nativeElement.value) {
            this.ciudades = y.ciudades.map(c => {
              return c
            })
          }
        })

      }
    })
  }


  /**
   * Maneja la selección de archivos y sube la imagen a Firebase Storage.
   * Se genera la ruta en función del tipo de imagen:
   * - Para logo: /Empresa/{nombreEmpresa}/Imagenes/Logo/
   * - Para banners: /Empresa/{nombreEmpresa}/Imagenes/Banner/
   * - Para email (encabezado o pie): /Empresa/{nombreEmpresa}/Imagenes/Email/
   */
  onFileSelected(event: Event, type: string): void {
    Swal.fire({
      title: 'Subir imagen',
      text: '¿Estás seguro de que deseas subir la imagen seleccionada?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, subir imagen',
      cancelButtonText: 'No, cancelar',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
    }).then((result) => {
      if (result.isConfirmed) {

        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
          const file = input.files[0];
          // Se obtiene el nombre de la empresa del formulario
          const nombreEmpresa: string = this.f.get('nomComercial')?.value;
          if (!nombreEmpresa) {
            console.error('El nombre de la empresa es requerido para definir la ruta de la imagen.');
            return;
          }

          let folderPath = '';
          // Para los campos de imagen de email se utiliza la misma carpeta
          if (type === 'logo') {
            folderPath = `/Empresas/${nombreEmpresa}/Imagenes/Logo/`;
          } else if (type === 'banner') {
            folderPath = `/Empresas/${nombreEmpresa}/Imagenes/Banner/`;
          } else if (type === 'imagenEmail.encabezado' || type === 'imagenEmail.piepagina') {
            folderPath = `/Empresas/${nombreEmpresa}/Imagenes/Email/`;
          } else {
            folderPath = `/Empresas/${nombreEmpresa}/Imagenes/Otros/`;
          }

          const filePath = `${folderPath}${new Date().getTime()}_${file.name}`;
          const fileRef = this.storage.ref(filePath);
          const task = this.storage.upload(filePath, file);
          // Abrir modal con progress bar usando SweetAlert2
          Swal.fire({
            title: 'Subiendo imagen...',
            html: `<div class="progress" style="height: 25px;">
                 <div id="upload-progress" class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar"
                   style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">0%</div>
               </div>`,
            allowOutsideClick: false,
            showConfirmButton: false,
            willOpen: () => {
              Swal.showLoading();
            }
          });


          // Seguimiento del porcentaje de subida
          task.percentageChanges().subscribe(percent => {
            if (percent !== undefined) {
              const percentRounded = Math.round(percent);
              this.uploadProgress[type] = percentRounded;
              const progressBar = document.getElementById('upload-progress');
              if (progressBar) {
                progressBar.style.width = percentRounded + '%';
                progressBar.setAttribute('aria-valuenow', percentRounded.toString());
                progressBar.innerHTML = percentRounded + '%';
              }
            }
          });

          // Al finalizar la subida, se obtiene la URL y se actualiza el control del formulario
          task.snapshotChanges().pipe(
            finalize(() => {
              fileRef.getDownloadURL().subscribe(url => {
                if (url) {
                  // Si el control es anidado (contiene punto)
                  if (type.includes('.')) {
                    const [groupName, controlName] = type.split('.');
                    const group = this.f.get(groupName) as FormGroup;
                    group.patchValue({ [controlName]: url });
                  } else {
                    this.f.patchValue({ [type]: url });
                  }
                  // Cerrar el modal de carga y mostrar mensaje de éxito
                  Swal.close();
                  Swal.fire({
                    icon: 'success',
                    title: 'Éxito',
                    text: 'Imagen subida correctamente.'
                  });
                }
              });
            })
          ).subscribe();
        }
      }
    });
  }
}
