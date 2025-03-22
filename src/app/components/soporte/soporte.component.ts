import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ServiciosService } from '../../shared/services/servicios.service';
import Swal from 'sweetalert2';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-soporte',
  templateUrl: './soporte.component.html',
  styleUrls: ['./soporte.component.scss']
})
export class SoporteComponent implements OnInit {
  ticketForm: FormGroup;
  users: any[] = [];
  categories: any[] = [];
  subcategories: any[] = [];
  canales: any;
  fileBase64String: any;
  selectedFiles: unknown[];
  imagePreviews: any[]=[];
  constructor(private fb: FormBuilder, private router: Router, private ticketService: ServiciosService,private storage:AngularFireStorage) {
    this.ticketForm = this.fb.group({
      adjuntos: [''],
      ticketComments:[''],
      canal: ['web', Validators.required],
      tienda: ['tienda web', Validators.required],
      categoria: [{ value: 'funcionalidad katuq', disabled: true }, Validators.required],
      subcategoria: [{ value: 'general', disabled: true }, Validators.required],
      motivo: [{ value: 'soporte', disabled: false }, Validators.required],
      nombreUsuarioReporta: ['', Validators.required],
      fechaRegistro: [new Date().toISOString().substring(0, 10), Validators.required],
      fechaEvento: ['', Validators.required],
      asunto: ['', Validators.required],
      usuarioMesaAyuda: ['Pendiente', Validators.required],
      status: ['Pendiente']
    });
  }
  ngOnInit(): void {
    // Llamar al servicio para obtener las categorías al cargar el componente
    // this.ticketService.getUsers().subscribe({
    //   next: (user: any) => {
    //     this.users = user.result; // Guardar categorías
    //   },
    //   error: (error) => {
    //     console.error('Error al obtener las categorías:', error);
    //     Swal.fire('Error', 'No se pudieron cargar las categorías', 'error');
    //   }
    // });
    this.users = [{
      "id": "5",
      "nombreCompleto": "Jairo Arango",
      "iniciales": "JA",
      "color": "#e11919",
      "email": "jarango@almara.com",
      "celular": "3015380656",
      "fechaCreacion": "2024-11-06T13:16:04.0316182+00:00"
    }];

    // this.ticketService.getCategories().subscribe({
    //   next: (categories: any) => {
    //     this.categories = categories.result; // Guardar categorías
    //   },
    //   error: (error) => {
    //     console.error('Error al obtener las categorías:', error);
    //     Swal.fire('Error', 'No se pudieron cargar las categorías', 'error');
    //   }
    // });
    this.categories = [
      {
        "id": "6",
        "nombre": "funcionalidad katuq",
        "fechaCreacion": "2024-10-11T00:00:00",
        "descripcion": "todo lo relacionado con funcionalidad katuq",
        "subCategorias": [
          {
            "id": "5",
            "nombre": "problemas con modulo de despachos",
            "fechaCreacion": "2024-10-11T00:00:00",
            "descripcion": "todo lo relacionado con el diseño y funcionalidad fisica del pos 4"
          },
          {
            "id": "4",
            "nombre": "problemas con modulo de productos",
            "fechaCreacion": "2024-10-11T00:00:00",
            "descripcion": "todo lo relacionado con el diseño y funcionalidad fisica del pos 4"
          },
          {
            "id": "3",
            "nombre": "problemas con modulo de pos",
            "fechaCreacion": "2024-10-11T00:00:00",
            "descripcion": "todo lo relacionado con el diseño y funcionalidad fisica del pos 4"
          },
          {
            "id": "2",
            "nombre": "problemas con imagenes",
            "fechaCreacion": "2024-10-11T00:00:00",
            "descripcion": "todo lo relacionado con el diseño y funcionalidad fisica del pos 4"
          }, {
            "id": "1",
            "nombre": "general",
            "fechaCreacion": "2024-10-11T00:00:00",
            "descripcion": "todo lo relacionado con el diseño y funcionalidad fisica del pos 4"
          }
        ]
      }
    ]

    // this.ticketService.getChannels().subscribe({
    //   next: (canales: any) => {
    //     this.canales = canales.result;
    //   },
    //   error: (error) => {
    //     console.error('Error al obtener los canales:', error);
    //     Swal.fire('Error', 'No se pudieron cargar los canales', 'error');
    //   }
    // });
    this.canales = [{
      "id": "1",
      "nombre": "chat",
      "descripcion": "todos los casos recibidos por chat",
      "fechaCreacion": "2024-10-09T05:09:08.335Z"
    },
    {
      "id": "2",
      "nombre": "chatbot",
      "descripcion": "todo lo relacionado con chatbot",
      "fechaCreacion": "2024-10-09T05:09:45.47Z"
    },
    {
      "id": "4",
      "nombre": "telefono",
      "descripcion": "todo lo correspondiente al telefono",
      "fechaCreacion": "2024-10-10T03:04:14.809Z"
    }]


    // Escuchar cambios en la selección de categoría
    this.ticketForm.get('categoria')?.valueChanges.subscribe((selectedCategory) => {
      this.onCategoryChange(selectedCategory);
    });
  }

  // Función para cambiar las subcategorías según la categoría seleccionada
  onCategoryChange(selectedCategory: string) {
    const category = this.categories.find(cat => cat.nombre === selectedCategory);
    if (category) {
      this.subcategories = category.subCategorias; // Actualizar subcategorías basadas en la categoría seleccionada
      this.ticketForm.get('subcategoria')?.setValue(''); // Limpiar selección de subcategoría
    } else {
      this.subcategories = [];
    }
  }
  onFileChange(event: any) {
    const files = event.target.files;
  
    if (files && files.length > 0) {
      this.selectedFiles = Array.from(files) as File[];
      this.imagePreviews = [];
  
      for (const file of this.selectedFiles) {
        if (file instanceof Blob) { // Verifica que sea un Blob (o File)
          const reader = new FileReader();
          reader.onload = (e: any) => {
            this.imagePreviews.push(e.target.result); // Agrega la miniatura
          };
          reader.readAsDataURL(file); // Convierte el archivo en una URL de datos base64
        }
      }
    }
  }
  async subirImagenesAFirebase(): Promise<string[]> {
    const urls = await Promise.all(
      this.selectedFiles.map(async (file:any, index) => {
        const fileName = `ticket_${Date.now()}_${index + 1}.jpg`;
        return this.subirImagenFirebase(file, fileName);
      })
    );
    return urls;
  }

  subirImagenFirebase(file: File, fileName: string): Promise<string> {
    const ref = this.storage.ref(`tickets/${fileName}`);
    const task = this.storage.upload(`tickets/${fileName}`, file);
  
    return new Promise((resolve, reject) => {
      task.snapshotChanges().pipe(
        finalize(() => {
          ref.getDownloadURL().subscribe({
            next: (url) => resolve(url),
            error: (err) => reject(err),
          });
        })
      ).subscribe({
        error: (error) => reject(error),
      });
    });
  }

  removeImage(preview: string) {
    this.imagePreviews = this.imagePreviews.filter(img => img !== preview);
  }

  async onSubmit() {
    const currentCompany=JSON.parse(sessionStorage.getItem('currentCompany') || '{}');
    
    if (this.ticketForm.valid) {
      const formData = this.ticketForm.getRawValue(); // Obtén todos los valores, incluidos los deshabilitados

    // Añade campos adicionales si es necesario
    formData.usuarioMesaAyuda = {
      id: '0',
      nombreCompleto: 'Desconocido',
      iniciales: 'UD',
      color: '#808080',
      email: 'anonimo@anonimo.com',
      celular: '0000',
      fechaCreacion: "2024-11-06T13:16:04.0316182+00:00"
    };
    formData.base64String = this.fileBase64String ?? ''; // Archivo adjunto
    formData.tienda =currentCompany.nomComercial;
   try {
      Swal.fire({
        title: 'Subiendo imágenes...',
        text: 'Por favor, espere.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Subir imágenes a Firebase y obtener las URLs
      const imageUrls =  await this.subirImagenesAFirebase();

      // Asignar las URLs a la propiedad 'adjuntos' del formulario
      formData.adjuntos=imageUrls;
      formData.company=currentCompany;

      

      // Enviar los datos al backend
      this.ticketService.addTicket(formData).subscribe({
        next: (response) => {
          Swal.fire('OK', `El Ticket ${response.result.cd} Guardado Correctamentedate`, 'success');
          formData.cd=response.result.cd
          this.ticketService.addNotification('Nuevo ticket creado', formData);
          this.router.navigate(['/tickets/backlog-tickets']);
        },
        error: (error) => {
          Swal.fire('Error', 'No se pudo guardar el ticket', 'error');
          console.error('Error al actualizar el ticket:', error);
        }
      });

    } catch (error) {
      Swal.fire('Error', 'Ocurrió un error al subir las imágenes', 'error');
      console.error('Error al subir imágenes:', error);
    }
  };

    }
  }
