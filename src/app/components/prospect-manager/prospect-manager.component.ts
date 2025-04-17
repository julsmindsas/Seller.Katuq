import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ProspectosService } from '../../shared/services/prospectos/prospectos.service';
import { Prospect } from '../../shared/models/prospect.model';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { of } from 'rxjs';

// Datos mock para demostración
const MOCK_PROSPECTS: Prospect[] = [
  {
    id: '1',
    companyName: 'Celuespecia',
    contactDate: new Date('2023-02-12'),
    status: 'new',
    contactInfo: {
      name: 'Jeider Torres',
      phone: '+573206100323',
      whatsapp: '+573206100323',
      email: 'celuespecialcom@gmail.com'
    },
    basicInfo: {
      city: 'Barranquilla',
      employeeCount: 10,
      website: 'celuespecial.com',
      companyType: 'Retail',
      sector: 'Tecnología'
    },
    timeline: [
      {
        id: '101',
        status: 'new',
        date: new Date('2023-02-12'),
        description: 'Nuevo prospecto desde la web',
        agentNote: 'Cliente interesado, no dejes pasar la oportunidad y contáctalo ahora.'
      }
    ]
  },
  {
    id: '2',
    companyName: 'PanZerO',
    contactDate: new Date('2023-02-12'),
    status: 'contacted',
    contactInfo: {
      name: 'Juan Gechelin',
      phone: '+573114567890',
      whatsapp: '+573114567890',
      email: 'contacto@panzero.com'
    },
    basicInfo: {
      city: 'Bogotá',
      employeeCount: 25,
      website: 'panzero.com',
      companyType: 'Restaurante',
      sector: 'Alimentos'
    },
    timeline: [
      {
        id: '201',
        status: 'new',
        date: new Date('2023-02-12'),
        description: 'Nuevo prospecto desde la web',
        agentNote: 'Cliente interesado en implementar sistema de inventario'
      },
      {
        id: '202',
        status: 'contacted',
        date: new Date('2023-02-28'),
        description: 'Contacto inicial realizado',
        agentNote: 'Ya te pusiste en contacto con el cliente.'
      }
    ]
  },
  {
    id: '3',
    companyName: 'Royal Flowers',
    contactDate: new Date('2023-03-13'),
    status: 'demo-completed',
    contactInfo: {
      name: 'Carolina Mendez',
      phone: '+573157894561',
      whatsapp: '+573157894561',
      email: 'cmendez@royalflowers.co'
    },
    basicInfo: {
      city: 'Medellín',
      employeeCount: 15,
      website: 'royalflowers.co',
      companyType: 'Florería',
      sector: 'Comercio'
    },
    timeline: [
      {
        id: '301',
        status: 'new',
        date: new Date('2023-03-13'),
        description: 'Nuevo prospecto desde la web',
        agentNote: 'Solicita información sobre sistema de ventas'
      },
      {
        id: '302',
        status: 'contacted',
        date: new Date('2023-03-15'),
        description: 'Contacto inicial realizado',
        agentNote: 'Cliente muy interesado, solicitó demostración'
      },
      {
        id: '303',
        status: 'meeting-scheduled',
        date: new Date('2023-03-20'),
        description: 'Cita programada para demostración',
        agentNote: 'Reunión virtual programada para el 25 de marzo'
      },
      {
        id: '304',
        status: 'demo-completed',
        date: new Date('2023-03-25'),
        description: 'Demostración realizada',
        agentNote: 'Cliente satisfecho con la demo, evaluará propuesta'
      }
    ]
  }
];

@Component({
  selector: 'app-prospect-manager',
  templateUrl: './prospect-manager.component.html',
  styleUrls: ['./prospect-manager.component.scss']
})
export class ProspectManagerComponent implements OnInit {
  @ViewChild('searchInput') searchInput: ElementRef;
  @ViewChild('newProspectModal') newProspectModal: any;
  
  prospects: Prospect[] = [];
  selectedProspect: Prospect | null = null;
  searchForm: FormGroup;
  prospectForm: FormGroup;
  noteForm: FormGroup;
  loading: boolean = false;
  isEdit: boolean = false;
  isNewProspect: boolean = false;
  useMockData: boolean = false;
  logoPath: string = 'assets/images/favicon.png';
  today: Date = new Date();
  updateStatusSection: boolean = false; // Nueva propiedad para mostrar/ocultar la sección de actualización de estado

  constructor(
    private formBuilder: FormBuilder,
    private prospectosService: ProspectosService,
    private modalService: NgbModal,
    private router: Router
  ) {
    this.initializeForms();
  }

  // Getters para acceder a formularios anidados
  get contactInfoForm() {
    return this.prospectForm.get('contactInfo') as FormGroup;
  }

  get basicInfoForm() {
    return this.prospectForm.get('basicInfo') as FormGroup;
  }

  ngOnInit(): void {
    this.loadProspects();
  }

  private initializeForms() {
    this.searchForm = this.formBuilder.group({
      searchTerm: ['']
    });

    this.prospectForm = this.formBuilder.group({
      companyName: ['', Validators.required],
      contactInfo: this.formBuilder.group({
        name: ['', Validators.required],
        phone: ['', Validators.required],
        whatsapp: [''],
        email: ['', [Validators.required, Validators.email]]
      }),
      basicInfo: this.formBuilder.group({
        city: ['', Validators.required],
        employeeCount: ['', Validators.required],
        website: [''],
        companyType: ['', Validators.required],
        sector: ['', Validators.required]
      })
    });

    this.noteForm = this.formBuilder.group({
      description: ['', Validators.required],
      agentNote: ['', Validators.required]
    });
  }

  loadProspects() {
    this.loading = true;
    
    if (this.useMockData) {
      // Usar datos mock
      setTimeout(() => {
        this.prospects = [...MOCK_PROSPECTS];
        this.loading = false;
      }, 500); // Simular delay de red
    } else {
      // Usar API real
      this.prospectosService.getProspectos().subscribe({
        next: (data) => {
          this.prospects = data as Prospect[];
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading prospects:', error);
          this.loading = false;
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron cargar los prospectos'
          });
        }
      });
    }
  }

  selectProspect(prospect: Prospect) {
    this.selectedProspect = prospect;
    this.isNewProspect = false;
    this.isEdit = false;
    this.prospectForm.patchValue({
      companyName: prospect.companyName,
      contactInfo: {
        name: prospect.contactInfo.name,
        phone: prospect.contactInfo.phone,
        whatsapp: prospect.contactInfo.whatsapp,
        email: prospect.contactInfo.email
      },
      basicInfo: {
        city: prospect.basicInfo.city,
        employeeCount: prospect.basicInfo.employeeCount,
        website: prospect.basicInfo.website,
        companyType: prospect.basicInfo.companyType,
        sector: prospect.basicInfo.sector
      }
    });
  }

  searchProspects() {
    const term = this.searchForm.get('searchTerm')?.value?.toLowerCase();
    if (!term) {
      this.loadProspects();
      return;
    }

    if (this.useMockData) {
      // Búsqueda en datos mock
      this.prospects = MOCK_PROSPECTS.filter(p => 
        p.companyName.toLowerCase().includes(term) || 
        p.contactInfo.name.toLowerCase().includes(term) ||
        p.contactInfo.email.toLowerCase().includes(term)
      );
    } else {
      // Implementar búsqueda con API
    }
  }

  addNote() {
    if (this.noteForm.valid && this.selectedProspect) {
      const note = {
        id: `note-${Date.now()}`,
        status: this.selectedProspect.status,
        date: new Date(),
        description: this.noteForm.value.description,
        agentNote: this.noteForm.value.agentNote
      };

      if (this.useMockData) {
        // Agregar nota localmente
        this.selectedProspect.timeline.push(note);
        this.noteForm.reset();
        Swal.fire({
          icon: 'success',
          title: 'Éxito',
          text: 'Nota agregada correctamente'
        });
      } else {
        // Agregar nota vía API
        this.prospectosService.addProspectoNote(this.selectedProspect.id, note).subscribe({
          next: () => {
            this.noteForm.reset();
            this.loadProspects();
            Swal.fire({
              icon: 'success',
              title: 'Éxito',
              text: 'Nota agregada correctamente'
            });
          },
          error: (error) => {
            console.error('Error adding note:', error);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudo agregar la nota'
            });
          }
        });
      }
    }
  }

  updateStatus(status: Prospect['status']) {
    if (this.selectedProspect) {
      if (this.useMockData) {
        // Actualizar estado localmente
        this.selectedProspect.status = status;
        
        // Agregar al timeline
        const note = {
          id: `status-${Date.now()}`,
          status: status,
          date: new Date(),
          description: `Estado actualizado a ${this.getStatusLabel(status)}`,
          agentNote: 'Cambio de estado automático'
        };
        
        this.selectedProspect.timeline.push(note);
        
        Swal.fire({
          icon: 'success',
          title: 'Éxito',
          text: 'Estado actualizado correctamente'
        });
      } else {
        // Actualizar estado vía API
        this.prospectosService.updateProspectoStatus(this.selectedProspect.id, status).subscribe({
          next: () => {
            this.loadProspects();
            Swal.fire({
              icon: 'success',
              title: 'Éxito',
              text: 'Estado actualizado correctamente'
            });
          },
          error: (error) => {
            console.error('Error updating status:', error);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudo actualizar el estado'
            });
          }
        });
      }
    }
  }

  // Método para alternar el modo edición
  toggleEditMode() {
    this.isEdit = !this.isEdit;
    // Si se cancela la edición, recargar los datos del prospecto seleccionado
    if (!this.isEdit && this.selectedProspect) {
      this.selectProspect(this.selectedProspect);
    }
  }

  saveProspect() {
    if (this.prospectForm.valid) {
      const prospectData: Partial<Prospect> = {
        ...this.prospectForm.value,
        contactDate: new Date(),
      };

      if (this.isNewProspect) {
        // Crear nuevo prospecto
        prospectData.status = 'new';
        prospectData.timeline = [{
          id: Date.now().toString(),
          status: 'new',
          date: new Date(),
          description: 'Nuevo prospecto creado',
          agentNote: 'Prospecto creado manualmente'
        }];

        if (this.useMockData) {
          const newProspect: Prospect = {
            id: (MOCK_PROSPECTS.length + 1).toString(),
            ...prospectData as Prospect
          };
          this.prospects.push(newProspect);
          this.selectedProspect = null;
          this.isNewProspect = false;
          this.isEdit = false;
          this.prospectForm.reset();
          Swal.fire({
            title: '¡Éxito!',
            text: 'Prospecto creado correctamente',
            icon: 'success'
          });
          return;
        }

        this.prospectosService.createProspecto(prospectData).subscribe({
          next: (prospect) => {
            this.prospects.push(prospect);
            this.selectedProspect = null;
            this.isNewProspect = false;
            this.isEdit = false;
            this.prospectForm.reset();
            Swal.fire({
              title: '¡Éxito!',
              text: 'Prospecto creado correctamente',
              icon: 'success'
            });
          },
          error: (error) => {
            Swal.fire({
              title: 'Error',
              text: 'No se pudo crear el prospecto',
              icon: 'error'
            });
          }
        });
      } else if (this.isEdit && this.selectedProspect) {
        // Editar prospecto existente
        const updatedProspect: Prospect = {
          ...this.selectedProspect,
          ...prospectData,
        };

        if (this.useMockData) {
          const idx = this.prospects.findIndex(p => p.id === this.selectedProspect.id);
          if (idx !== -1) {
            this.prospects[idx] = updatedProspect;
            this.selectedProspect = updatedProspect;
          }
          this.isEdit = false;
          Swal.fire({
            title: '¡Éxito!',
            text: 'Prospecto actualizado correctamente',
            icon: 'success'
          });
          return;
        }

        this.prospectosService.updateProspecto(this.selectedProspect.id, prospectData).subscribe({
          next: (prospect) => {
            const idx = this.prospects.findIndex(p => p.id === this.selectedProspect.id);
            if (idx !== -1) {
              this.prospects[idx] = prospect;
              this.selectedProspect = prospect;
            }
            this.isEdit = false;
            Swal.fire({
              title: '¡Éxito!',
              text: 'Prospecto actualizado correctamente',
              icon: 'success'
            });
          },
          error: (error) => {
            Swal.fire({
              title: 'Error',
              text: 'No se pudo actualizar el prospecto',
              icon: 'error'
            });
          }
        });
      }
    }
  }

  getStatusColor(status: string): string {
    const colors = {
      'new': 'primary',
      'contacted': 'info',
      'meeting-scheduled': 'warning',
      'demo-completed': 'success',
      'started': 'success',
      'closed': 'secondary'
    };
    return colors[status] || 'primary';
  }
  
  getStatusLabel(status: string): string {
    const labels = {
      'new': 'Nuevo',
      'contacted': 'Contactado',
      'meeting-scheduled': 'Cita Programada',
      'demo-completed': 'Demo Realizada',
      'started': 'Iniciado',
      'closed': 'Cerrado'
    };
    return labels[status] || status;
  }

  getStatusIcon(status: string): string {
    const icons = {
      'new': 'fa-star',
      'contacted': 'fa-phone',
      'meeting-scheduled': 'fa-calendar',
      'demo-completed': 'fa-laptop',
      'started': 'fa-check-circle',
      'closed': 'fa-flag'
    };
    return icons[status] || 'fa-circle';
  }

  openModal(content: any) {
    this.modalService.open(content, { size: 'lg' });
  }

  createNewProspect() {
    this.isNewProspect = true;
    this.isEdit = true;
    this.selectedProspect = null;
    this.prospectForm.reset();
  }

  convertToClient(prospect: Prospect) {
    Swal.fire({
      title: '¿Convertir en cliente?',
      text: '¿Estás seguro de convertir este prospecto en cliente?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, convertir',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.prospectosService.convertToClient(prospect.id).subscribe({
          next: (updatedProspect) => {
            const index = this.prospects.findIndex(p => p.id === prospect.id);
            if (index !== -1) {
              this.prospects[index] = updatedProspect;
              this.selectProspect(updatedProspect);
            }
            Swal.fire({
              title: '¡Éxito!',
              text: 'Prospecto convertido en cliente',
              icon: 'success'
            });
          },
          error: (error) => {
            Swal.fire({
              title: 'Error',
              text: 'No se pudo convertir el prospecto',
              icon: 'error'
            });
          }
        });
      }
    });
  }
}