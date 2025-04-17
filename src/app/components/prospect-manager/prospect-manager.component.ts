import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ProspectosService } from '../../shared/services/prospectos/prospectos.service';
import { Prospect } from '../../shared/models/prospect.model';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { of, Subscription, interval } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';

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
export class ProspectManagerComponent implements OnInit, OnDestroy {
  @ViewChild('searchInput') searchInput: ElementRef;
  @ViewChild('newProspectModal') newProspectModal: any;
  @ViewChild('scheduleTaskModal') scheduleTaskModal: any;
  @ViewChild('communicationModal') communicationModal: any;
  @ViewChild('exportModal') exportModal: any;
  @ViewChild('documentsModal') documentsModal: any;
  @ViewChild('calendarModal') calendarModal: any;
  @ViewChild('advancedFiltersModal') advancedFiltersModal: any;
  
  prospects: Prospect[] = [];
  filteredProspects: Prospect[] = [];
  selectedProspect: Prospect | null = null;
  searchForm: FormGroup;
  prospectForm: FormGroup;
  noteForm: FormGroup;
  taskForm: FormGroup;
  emailForm: FormGroup;
  exportForm: FormGroup;
  loading: boolean = false;
  isEdit: boolean = false;
  isNewProspect: boolean = false;
  useMockData: boolean = true; // Cambiado a true para demostración
  logoPath: string = 'assets/images/favicon.png';
  today: Date = new Date();
  updateStatusSection: boolean = false;

  // Nuevas propiedades
  selectedFilter: string = 'all';
  statsLoading: boolean = false;
  pendingTasks: any[] = [];
  hasNotification: boolean = false;
  notificationCount: number = 0;
  exportFormatOptions = ['Excel', 'CSV', 'PDF'];
  selectedExportFormat: string = 'Excel';
  
  stats: any = {
    total: 0,
    new: 0,
    contacted: 0,
    meetingScheduled: 0,
    demoCompleted: 0,
    started: 0,
    closed: 0,
    conversionRate: 0
  };
  
  selectedSort: string = 'date-desc';
  showFilters: boolean = false;
  priorityLevels: string[] = ['Alta', 'Media', 'Baja'];
  communicationChannels: any[] = [
    { id: 'email', icon: 'fa-envelope', label: 'Correo', color: '#d44638' },
    { id: 'phone', icon: 'fa-phone', label: 'Llamada', color: '#4285f4' },
    { id: 'whatsapp', icon: 'fa-whatsapp', label: 'WhatsApp', color: '#25D366' }
  ];
  
  taskTypes: any[] = [
    { id: 'call', icon: 'fa-phone', label: 'Llamada' },
    { id: 'meeting', icon: 'fa-calendar', label: 'Reunión' },
    { id: 'email', icon: 'fa-envelope', label: 'Correo' },
    { id: 'follow-up', icon: 'fa-reply', label: 'Seguimiento' }
  ];

  // Nuevas propiedades para funcionalidades mejoradas
  advancedFiltersForm: FormGroup;
  documentsForm: FormGroup;
  documentsList: any[] = [];
  reminderCheckInterval: Subscription;
  activeReminders: any[] = [];
  dueSoonTasks: any[] = [];
  overdueTasks: any[] = [];
  calendarEvents: any[] = [];
  performanceMetrics: any = {
    averageResponseTime: 0,
    conversionRate: 0,
    leadsBySource: [],
    statusBreakdown: [],
    prospectTrend: []
  };
  
  // Opciones ampliadas para filtros
  leadSources: string[] = ['Sitio Web', 'Referido', 'Redes Sociales', 'Email Marketing', 'Feria Comercial', 'Google Ads', 'LinkedIn', 'Llamada Entrante'];
  budgetRanges: string[] = ['< $1M', '$1M - $5M', '$5M - $10M', '$10M - $20M', '> $20M'];
  interestAreas: string[] = ['Punto de Venta', 'Inventario', 'E-commerce', 'Marketing', 'Solución Completa', 'CRM', 'Soporte', 'Capacitación'];
  documentTypes: string[] = ['Cotización', 'Propuesta', 'Contrato', 'Ficha técnica', 'Presentación', 'Otro'];

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
    this.loadStats();
    this.loadPerformanceMetrics();
    this.setupReminderCheck();
  }
  
  ngOnDestroy(): void {
    if (this.reminderCheckInterval) {
      this.reminderCheckInterval.unsubscribe();
    }
  }

  private initializeForms() {
    this.searchForm = this.formBuilder.group({
      searchTerm: [''],
      filterStatus: ['all'],
      dateRange: [null],
      priorityFilter: ['all']
    });

    this.prospectForm = this.formBuilder.group({
      companyName: ['', Validators.required],
      priority: ['Media'],
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
        sector: ['', Validators.required],
        interestedIn: [''],
        budget: [''],
        leadSource: ['']
      })
    });

    this.noteForm = this.formBuilder.group({
      description: ['', Validators.required],
      agentNote: ['', Validators.required]
    });

    // Formulario para programar tareas
    this.taskForm = this.formBuilder.group({
      taskType: ['call', Validators.required],
      dueDate: [this.getDefaultDueDate(), Validators.required],
      dueTime: ['10:00', Validators.required],
      description: ['', Validators.required],
      reminder: [true],
      priority: ['Media']
    });
    
    // Formulario para enviar correo electrónico
    this.emailForm = this.formBuilder.group({
      to: ['', [Validators.required, Validators.email]],
      subject: ['', Validators.required],
      message: ['', Validators.required],
      attachDocument: [false]
    });
    
    // Formulario para exportación de datos
    this.exportForm = this.formBuilder.group({
      format: ['Excel', Validators.required],
      includeNotes: [true],
      dateRange: [null],
      onlySelected: [false]
    });

    // Formulario para filtros avanzados
    this.advancedFiltersForm = this.formBuilder.group({
      dateFrom: [null],
      dateTo: [null],
      leadSource: [''],
      budget: [''],
      interestArea: [''],
      employeeCountMin: [''],
      employeeCountMax: [''],
      hasDocuments: [false],
      lastContact: [''],
      tags: ['']
    });
    
    // Formulario para gestión de documentos
    this.documentsForm = this.formBuilder.group({
      title: ['', Validators.required],
      type: ['', Validators.required],
      file: [null, Validators.required],
      description: [''],
      isPrivate: [false]
    });
  }

  loadProspects() {
    this.loading = true;
    
    if (this.useMockData) {
      // Usar datos mock
      setTimeout(() => {
        this.prospects = [...MOCK_PROSPECTS];
        
        // Añadir prioridad y campos adicionales a los prospectos mock
        this.prospects.forEach(p => {
          p.priority = p.priority || this.getRandomPriority();
          if (p.basicInfo) {
            p.basicInfo.leadSource = p.basicInfo.leadSource || this.getRandomLeadSource();
            p.basicInfo.budget = p.basicInfo.budget || this.getRandomBudget();
          }
        });
        
        this.filteredProspects = [...this.prospects];
        this.applyFiltersAndSort();
        this.loadPendingTasks();
        this.loading = false;
      }, 500); // Simular delay de red
    } else {
      // Usar API real
      this.prospectosService.getProspectos().subscribe({
        next: (data) => {
          this.prospects = data as Prospect[];
          this.filteredProspects = [...this.prospects];
          this.applyFiltersAndSort();
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

  // Método nuevo para cargar tareas pendientes
  loadPendingTasks() {
    if (this.useMockData) {
      // Crear algunas tareas pendientes de muestra
      this.pendingTasks = [
        {
          id: 't1',
          prospectId: '1',
          prospectName: 'Celuespecia',
          taskType: 'call',
          dueDate: new Date(new Date().setDate(new Date().getDate() + 1)),
          description: 'Llamada de seguimiento',
          completed: false,
          priority: 'Alta'
        },
        {
          id: 't2',
          prospectId: '2',
          prospectName: 'PanZerO',
          taskType: 'meeting',
          dueDate: new Date(new Date().setDate(new Date().getDate() + 3)),
          description: 'Reunión de demostración',
          completed: false,
          priority: 'Media'
        }
      ];
      
      this.notificationCount = this.pendingTasks.filter(t => 
        new Date(t.dueDate).toDateString() === new Date().toDateString()
      ).length;
      
      this.hasNotification = this.notificationCount > 0;
    } else {
      // Código para API real
      this.prospectosService.getPendingTasks().subscribe({
        next: (tasks) => {
          this.pendingTasks = tasks;
          this.notificationCount = this.pendingTasks.filter(t => 
            new Date(t.dueDate).toDateString() === new Date().toDateString()
          ).length;
          this.hasNotification = this.notificationCount > 0;
        },
        error: (error) => {
          console.error('Error loading tasks:', error);
        }
      });
    }
  }

  // Método nuevo para cargar estadísticas
  loadStats() {
    this.statsLoading = true;
    
    if (this.useMockData) {
      setTimeout(() => {
        // Calcular estadísticas basadas en los datos mock
        this.stats.total = MOCK_PROSPECTS.length;
        this.stats.new = MOCK_PROSPECTS.filter(p => p.status === 'new').length;
        this.stats.contacted = MOCK_PROSPECTS.filter(p => p.status === 'contacted').length;
        this.stats.meetingScheduled = MOCK_PROSPECTS.filter(p => p.status === 'meeting-scheduled').length;
        this.stats.demoCompleted = MOCK_PROSPECTS.filter(p => p.status === 'demo-completed').length;
        this.stats.started = MOCK_PROSPECTS.filter(p => p.status === 'started').length;
        this.stats.closed = MOCK_PROSPECTS.filter(p => p.status === 'closed').length;
        
        // Calcular tasa de conversión (prospectos cerrados / total)
        this.stats.conversionRate = this.stats.total > 0 
          ? Math.round((this.stats.closed / this.stats.total) * 100) 
          : 0;
        
        this.statsLoading = false;
      }, 700);
    } else {
      // En un escenario real, obtendríamos estas estadísticas de la API
      this.prospectosService.getProspectStats().subscribe({
        next: (data: any) => {
          this.stats = data;
          this.statsLoading = false;
        },
        error: (error) => {
          console.error('Error loading stats:', error);
          this.statsLoading = false;
        }
      });
    }
  }

  // Método para cargar métricas de rendimiento
  loadPerformanceMetrics() {
    if (this.useMockData) {
      // Generar datos de métricas simulados
      this.performanceMetrics = {
        averageResponseTime: 2.3, // días promedio de respuesta
        conversionRate: this.stats.total > 0 ? (this.stats.closed / this.stats.total * 100).toFixed(1) : 0,
        leadsBySource: [
          { source: 'Sitio Web', count: 12 },
          { source: 'Redes Sociales', count: 8 },
          { source: 'Referido', count: 5 },
          { source: 'Email Marketing', count: 3 },
          { source: 'Google Ads', count: 4 }
        ],
        statusBreakdown: [
          { status: 'new', label: 'Nuevos', count: this.stats.new },
          { status: 'contacted', label: 'Contactados', count: this.stats.contacted },
          { status: 'meeting-scheduled', label: 'Con Cita', count: this.stats.meetingScheduled },
          { status: 'demo-completed', label: 'Demo Realizada', count: this.stats.demoCompleted },
          { status: 'started', label: 'Iniciados', count: this.stats.started },
          { status: 'closed', label: 'Cerrados', count: this.stats.closed }
        ],
        prospectTrend: [
          { month: 'Ene', count: 5 },
          { month: 'Feb', count: 7 },
          { month: 'Mar', count: 9 },
          { month: 'Abr', count: 12 },
          { month: 'May', count: 8 },
          { month: 'Jun', count: 10 }
        ]
      };
    } else {
      // Código para API real
      this.prospectosService.getPerformanceMetrics().subscribe({
        next: (data) => {
          this.performanceMetrics = data;
        },
        error: (error) => {
          console.error('Error loading performance metrics:', error);
        }
      });
    }
  }

  // Configurar verificación periódica de recordatorios
  setupReminderCheck() {
    // Revisar recordatorios cada minuto
    this.reminderCheckInterval = interval(60000)
      .pipe(
        startWith(0),
        switchMap(() => {
          return this.checkForDueTasks();
        })
      )
      .subscribe(tasks => {
        this.processPendingTasks(tasks);
      });
  }

  // Verificar tareas pendientes
  checkForDueTasks() {
    if (this.useMockData) {
      const now = new Date();
      const dueSoonTasks = this.pendingTasks.filter(task => {
        const taskDate = new Date(task.dueDate);
        taskDate.setHours(parseInt(task.dueTime.split(':')[0], 10));
        taskDate.setMinutes(parseInt(task.dueTime.split(':')[1], 10));
        
        // Tareas que vencen en menos de 30 minutos
        const timeDiff = (taskDate.getTime() - now.getTime()) / (1000 * 60);
        return timeDiff > 0 && timeDiff <= 30 && task.reminder && !task.notified;
      });
      
      const overdueTasks = this.pendingTasks.filter(task => {
        const taskDate = new Date(task.dueDate);
        taskDate.setHours(parseInt(task.dueTime.split(':')[0], 10));
        taskDate.setMinutes(parseInt(task.dueTime.split(':')[1], 10));
        
        // Tareas vencidas en las últimas 24 horas y no completadas
        const timeDiff = (now.getTime() - taskDate.getTime()) / (1000 * 60);
        return timeDiff > 0 && timeDiff <= 1440 && !task.completed && !task.overdueNotified;
      });
      
      return of({ dueSoonTasks, overdueTasks });
    } else {
      // Código para API real
      return this.prospectosService.checkDueTasks();
    }
  }

  // Procesar tareas pendientes y mostrar notificaciones
  processPendingTasks(tasks: any) {
    // Notificar tareas próximas
    if (tasks.dueSoonTasks && tasks.dueSoonTasks.length > 0) {
      tasks.dueSoonTasks.forEach(task => {
        // Marcar como notificada para no volver a notificar
        const taskIndex = this.pendingTasks.findIndex(t => t.id === task.id);
        if (taskIndex !== -1) {
          this.pendingTasks[taskIndex].notified = true;
        }
        
        // Mostrar notificación
        const prospectName = task.prospectName;
        const taskType = this.getTaskTypeLabel(task.taskType);
        const taskTime = task.dueTime;
        
        this.showNotification(
          'Recordatorio de tarea',
          `Tienes una tarea de tipo "${taskType}" programada con ${prospectName} a las ${taskTime}.`,
          'info'
        );
      });
    }
    
    // Notificar tareas vencidas
    if (tasks.overdueTasks && tasks.overdueTasks.length > 0) {
      tasks.overdueTasks.forEach(task => {
        // Marcar como notificada para no volver a notificar
        const taskIndex = this.pendingTasks.findIndex(t => t.id === task.id);
        if (taskIndex !== -1) {
          this.pendingTasks[taskIndex].overdueNotified = true;
        }
        
        // Mostrar notificación
        const prospectName = task.prospectName;
        const taskType = this.getTaskTypeLabel(task.taskType);
        
        this.showNotification(
          'Tarea vencida',
          `No completaste la tarea de tipo "${taskType}" con ${prospectName}.`,
          'warning'
        );
      });
    }
  }

  // Mostrar notificación
  showNotification(title: string, message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') {
    Swal.fire({
      title: title,
      text: message,
      icon: type,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 5000,
      timerProgressBar: true
    });
  }

  selectProspect(prospect: Prospect) {
    this.selectedProspect = prospect;
    this.isNewProspect = false;
    this.isEdit = false;
    this.prospectForm.patchValue({
      companyName: prospect.companyName,
      priority: prospect.priority || 'Media',
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
        sector: prospect.basicInfo.sector,
        interestedIn: prospect.basicInfo.interestedIn || '',
        budget: prospect.basicInfo.budget || '',
        leadSource: prospect.basicInfo.leadSource || ''
      }
    });

    // Resetear el formulario de notas al cambiar de prospecto
    this.noteForm.reset();
  }

  searchProspects() {
    const term = this.searchForm.get('searchTerm')?.value?.toLowerCase();
    const status = this.searchForm.get('filterStatus')?.value;
    
    this.selectedFilter = status;
    
    if (!term && status === 'all') {
      this.filteredProspects = [...this.prospects];
      return;
    }

    this.filteredProspects = this.prospects.filter(prospect => {
      const matchesTerm = !term || 
        prospect.companyName.toLowerCase().includes(term) || 
        prospect.contactInfo.name.toLowerCase().includes(term) ||
        prospect.contactInfo.email.toLowerCase().includes(term);
        
      const matchesStatus = status === 'all' || prospect.status === status;
      
      return matchesTerm && matchesStatus;
    });
    
    this.applySort();
  }

  filterByStatus(status: string) {
    this.selectedFilter = status;
    this.searchForm.patchValue({ filterStatus: status });
    this.searchProspects();
  }

  applyFiltersAndSort() {
    this.searchProspects();
    this.applySort();
  }

  applySort() {
    const sortBy = this.selectedSort;
    
    if (sortBy === 'company-asc') {
      this.filteredProspects.sort((a, b) => a.companyName.localeCompare(b.companyName));
    } else if (sortBy === 'company-desc') {
      this.filteredProspects.sort((a, b) => b.companyName.localeCompare(a.companyName));
    } else if (sortBy === 'date-asc') {
      this.filteredProspects.sort((a, b) => new Date(a.contactDate).getTime() - new Date(b.contactDate).getTime());
    } else if (sortBy === 'date-desc') {
      this.filteredProspects.sort((a, b) => new Date(b.contactDate).getTime() - new Date(a.contactDate).getTime());
    } else if (sortBy === 'priority-high') {
      // Ordenar por prioridad (alta primero)
      const priorityOrder = { 'Alta': 0, 'Media': 1, 'Baja': 2 };
      this.filteredProspects.sort((a, b) => {
        return (priorityOrder[a.priority || 'Media'] || 1) - (priorityOrder[b.priority || 'Media'] || 1);
      });
    }
  }

  changeSort(sortOption: string) {
    this.selectedSort = sortOption;
    this.applySort();
  }

  addNote() {
    if (!this.selectedProspect || !this.noteForm.valid) return;

    const note = {
      id: `note-${Date.now()}`,
      status: this.selectedProspect.status as 'new' | 'contacted' | 'meeting-scheduled' | 'demo-completed' | 'started' | 'closed',
      date: new Date(),
      description: this.noteForm.value.description,
      agentNote: this.noteForm.value.agentNote
    };

    if (this.useMockData) {
      if (!this.selectedProspect.timeline) {
        this.selectedProspect.timeline = [];
      }
      this.selectedProspect.timeline.push(note);
      this.noteForm.reset();
      Swal.fire('Nota Agregada', 'La nota ha sido agregada al historial.', 'success');
    } else {
      this.prospectosService.addProspectoNote(this.selectedProspect.id, note).subscribe({
        next: () => {
          this.loadProspects();
          this.noteForm.reset();
          Swal.fire('Nota Agregada', 'La nota ha sido agregada al historial.', 'success');
        },
        error: (error) => {
          console.error('Error al agregar nota:', error);
          Swal.fire('Error', 'No se pudo agregar la nota.', 'error');
        }
      });
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
      const prospectData = this.prospectForm.value;
      
      if (this.isNewProspect) {
        const newProspect: Prospect = {
          ...prospectData,
          id: (MOCK_PROSPECTS.length + 1).toString(),
          contactDate: new Date(),
          status: 'new',
          timeline: []
        };
        
        if (this.useMockData) {
          this.prospects.push(newProspect);
          this.selectedProspect = newProspect;
          this.isNewProspect = false;
          this.isEdit = false;
          Swal.fire('Prospecto Creado', 'El prospecto ha sido creado correctamente.', 'success');
        } else {
          this.prospectosService.createProspecto(prospectData).subscribe({
            next: (prospect) => {
              this.prospects.push(prospect);
              this.selectedProspect = prospect;
              this.isNewProspect = false;
              this.isEdit = false;
              Swal.fire('Prospecto Creado', 'El prospecto ha sido creado correctamente.', 'success');
            },
            error: (error) => {
              console.error('Error al crear prospecto:', error);
              Swal.fire('Error', 'No se pudo crear el prospecto.', 'error');
            }
          });
        }
      } else if (this.selectedProspect) {
        const updatedProspect: Prospect = {
          ...this.selectedProspect,
          ...prospectData
        };
        
        if (this.useMockData) {
          const idx = this.prospects.findIndex(p => p.id === this.selectedProspect?.id);
          if (idx !== -1) {
            this.prospects[idx] = updatedProspect;
            this.selectedProspect = updatedProspect;
          }
          this.isEdit = false;
          Swal.fire('Prospecto Actualizado', 'El prospecto ha sido actualizado correctamente.', 'success');
        } else {
          this.prospectosService.updateProspecto(this.selectedProspect.id, prospectData).subscribe({
            next: (prospect) => {
              const idx = this.prospects.findIndex(p => p.id === this.selectedProspect?.id);
              if (idx !== -1) {
                this.prospects[idx] = prospect;
                this.selectedProspect = prospect;
              }
              this.isEdit = false;
              Swal.fire('Prospecto Actualizado', 'El prospecto ha sido actualizado correctamente.', 'success');
            },
            error: (error) => {
              console.error('Error al actualizar prospecto:', error);
              Swal.fire('Error', 'No se pudo actualizar el prospecto.', 'error');
            }
          });
        }
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
    this.prospectForm.reset({
      priority: 'Media'
    });
  }

  convertToClient(prospect: Prospect) {
    if (!prospect) return;
    
    Swal.fire({
      title: 'Convertir a cliente',
      text: `¿Estás seguro que deseas convertir a ${prospect.companyName} en cliente?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, convertir',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        if (this.useMockData) {
          // Lógica mock
          const idx = this.prospects.findIndex(p => p.id === prospect.id);
          if (idx !== -1) {
            this.prospects[idx].status = 'closed';
            this.selectedProspect = this.prospects[idx];
          }
        } else {
          this.prospectosService.convertToClient(prospect.id).subscribe({
            next: (updatedProspect) => {
              const idx = this.prospects.findIndex(p => p.id === prospect.id);
              if (idx !== -1) {
                this.prospects[idx] = updatedProspect;
                this.selectedProspect = updatedProspect;
              }
              Swal.fire('¡Convertido!', 'El prospecto ha sido convertido a cliente.', 'success');
            },
            error: (error) => {
              console.error('Error al convertir prospecto:', error);
              Swal.fire('Error', 'No se pudo convertir el prospecto a cliente.', 'error');
            }
          });
        }
      }
    });
  }

  // Mantener solo una versión de scheduleTask
  scheduleTask() {
    if (!this.selectedProspect || !this.taskForm.valid) return;

    const taskData = {
      id: `task-${Date.now()}`,
      status: 'new' as const,
      date: new Date(),
      description: this.taskForm.value.description,
      agentNote: this.taskForm.value.agentNote,
      isTask: true,
      taskType: this.taskForm.value.taskType,
      dueDate: this.taskForm.value.dueDate,
      dueTime: this.taskForm.value.dueTime,
      reminder: this.taskForm.value.reminder
    };

    if (this.useMockData) {
      if (!this.selectedProspect.timeline) {
        this.selectedProspect.timeline = [];
      }
      this.selectedProspect.timeline.push(taskData);
      this.loadPendingTasks();
      this.loadProspects();
    } else {
      this.prospectosService.scheduleTask(this.selectedProspect.id, taskData).subscribe({
        next: () => {
          this.loadPendingTasks();
          this.loadProspects();
          Swal.fire('Tarea Programada', 'La tarea ha sido programada correctamente.', 'success');
        },
        error: (error) => {
          console.error('Error al programar tarea:', error);
          Swal.fire('Error', 'No se pudo programar la tarea.', 'error');
        }
      });
    }
  }

  // Fecha predeterminada para tareas (día siguiente)
  getDefaultDueDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  // Método para abrir modal de programación de tareas
  openScheduleTaskModal() {
    if (this.selectedProspect) {
      // Pre-llenar el correo del prospecto si vamos a programar un email
      if (this.selectedProspect.contactInfo && this.selectedProspect.contactInfo.email) {
        this.emailForm.patchValue({
          to: this.selectedProspect.contactInfo.email
        });
      }
      
      this.modalService.open(this.scheduleTaskModal, {
        centered: true,
        size: 'lg'
      });
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Atención',
        text: 'Por favor, seleccione un prospecto primero'
      });
    }
  }
  
  completeTask(taskId: string) {
    if (this.useMockData) {
      const taskIndex = this.pendingTasks.findIndex(t => t.id === taskId);
      if (taskIndex > -1) {
        this.pendingTasks[taskIndex].completed = true;
        
        // Actualizar contadores de notificaciones
        if (new Date(this.pendingTasks[taskIndex].dueDate).toDateString() === new Date().toDateString()) {
          this.notificationCount = Math.max(0, this.notificationCount - 1);
          this.hasNotification = this.notificationCount > 0;
        }
        
        // Eliminar de la lista después de un breve retraso
        setTimeout(() => {
          this.pendingTasks = this.pendingTasks.filter(t => t.id !== taskId);
        }, 500);
        
        Swal.fire({
          icon: 'success',
          title: 'Tarea completada',
          timer: 1500,
          showConfirmButton: false
        });
      }
    } else {
      this.prospectosService.completeTask(taskId).subscribe({
        next: () => {
          this.loadPendingTasks();
          Swal.fire({
            icon: 'success',
            title: 'Tarea completada',
            timer: 1500,
            showConfirmButton: false
          });
        },
        error: (error) => {
          console.error('Error completing task:', error);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo completar la tarea'
          });
        }
      });
    }
  }
  
  getTaskTypeLabel(taskType: string): string {
    const task = this.taskTypes.find(t => t.id === taskType);
    return task ? task.label : taskType;
  }

  getTaskTypeIcon(taskType: string): string {
    const task = this.taskTypes.find(t => t.id === taskType);
    return task ? task.icon : 'fa-tasks';
  }
  
  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  }
  
  // Nuevos métodos para comunicación
  openCommunicationModal(channel: string) {
    if (!this.selectedProspect) {
      Swal.fire({
        icon: 'warning',
        title: 'Atención',
        text: 'Por favor, seleccione un prospecto primero'
      });
      return;
    }
    
    if (channel === 'email') {
      this.emailForm.patchValue({
        to: this.selectedProspect.contactInfo.email,
        subject: `Seguimiento - ${this.selectedProspect.companyName}`
      });
      this.modalService.open(this.communicationModal, {
        centered: true,
        size: 'lg'
      });
    } else if (channel === 'whatsapp') {
      const phone = this.selectedProspect.contactInfo.whatsapp || this.selectedProspect.contactInfo.phone;
      if (phone) {
        const whatsappUrl = `https://wa.me/${phone.replace(/\+/g, '')}?text=Hola ${this.selectedProspect.contactInfo.name}, soy tu asesor de Katuq...`;
        window.open(whatsappUrl, '_blank');
        
        // Registrar la interacción en el timeline
        this.registerCommunication('whatsapp');
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'Atención',
          text: 'No hay número de WhatsApp disponible para este prospecto'
        });
      }
    } else if (channel === 'phone') {
      const phone = this.selectedProspect.contactInfo.phone;
      if (phone) {
        window.location.href = `tel:${phone}`;
        
        // Registrar la llamada en el timeline
        this.registerCommunication('phone');
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'Atención',
          text: 'No hay número de teléfono disponible para este prospecto'
        });
      }
    }
  }
  
  sendEmail() {
    if (this.emailForm.valid && this.selectedProspect) {
      const emailData = this.emailForm.value;
      
      if (this.useMockData) {
        // Registrar el correo en el timeline
        this.registerCommunication('email', emailData.subject);
        
        this.modalService.dismissAll();
        this.emailForm.reset();
        
        Swal.fire({
          icon: 'success',
          title: 'Correo enviado',
          text: 'El correo electrónico ha sido enviado correctamente',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        // Código para API real
        this.prospectosService.sendEmail(this.selectedProspect.id, emailData).subscribe({
          next: () => {
            this.registerCommunication('email', emailData.subject);
            this.modalService.dismissAll();
            this.emailForm.reset();
            
            Swal.fire({
              icon: 'success',
              title: 'Correo enviado',
              text: 'El correo electrónico ha sido enviado correctamente'
            });
          },
          error: (error) => {
            console.error('Error sending email:', error);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudo enviar el correo electrónico'
            });
          }
        });
      }
    }
  }
  
  registerCommunication(channel: string, subject?: string) {
    if (this.selectedProspect) {
      const channelInfo = this.communicationChannels.find(c => c.id === channel);
      const description = channelInfo ? 
        `Comunicación vía ${channelInfo.label}${subject ? ': ' + subject : ''}` : 
        `Comunicación vía ${channel}`;
        
      const note = {
        id: `comm-${Date.now()}`,
        status: this.selectedProspect.status,
        date: new Date(),
        description: description,
        agentNote: 'Comunicación registrada automáticamente'
      };
      
      if (!this.selectedProspect.timeline) {
        this.selectedProspect.timeline = [];
      }
      
      this.selectedProspect.timeline.push(note);
    }
  }
  
  // Nuevos métodos para exportación de datos
  openExportModal() {
    this.modalService.open(this.exportModal, {
      centered: true,
      size: 'lg'
    });
  }
  
  exportProspects() {
    if (this.exportForm.valid) {
      const exportOptions = this.exportForm.value;
      let dataToExport = this.filteredProspects;
      
      if (exportOptions.onlySelected && this.selectedProspect) {
        dataToExport = [this.selectedProspect];
      }
      
      if (this.useMockData) {
        // Simulación de exportación
        const format = exportOptions.format.toLowerCase();
        let message = `Datos exportados en formato ${format}.`;
        
        if (exportOptions.includeNotes) {
          message += ' Se incluyeron todas las notas y el historial.';
        }
        
        Swal.fire({
          icon: 'success',
          title: 'Exportación completada',
          text: message,
          timer: 2000,
          showConfirmButton: false
        });
        
        this.modalService.dismissAll();
      } else {
        this.prospectosService.exportProspects(dataToExport, exportOptions).subscribe({
          next: (blob) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `prospectos_${new Date().toISOString().split('T')[0]}.${exportOptions.format.toLowerCase()}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.modalService.dismissAll();
            
            Swal.fire({
              icon: 'success',
              title: 'Exportación completada',
              text: 'Los datos han sido exportados correctamente'
            });
          },
          error: (error) => {
            console.error('Error exporting data:', error);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudieron exportar los datos'
            });
          }
        });
      }
    }
  }
  
  // Método para filtros avanzados
  openAdvancedFilters() {
    this.modalService.open(this.advancedFiltersModal, {
      centered: true,
      size: 'lg'
    });
  }

  applyAdvancedFilters() {
    if (this.advancedFiltersForm.valid) {
      const filters = this.advancedFiltersForm.value;
      
      if (this.useMockData) {
        // Aplicar filtros a datos locales
        this.filteredProspects = this.prospects.filter(prospect => {
          let matches = true;
          
          // Filtro por rango de fechas
          if (filters.dateFrom && filters.dateTo) {
            const prospectDate = new Date(prospect.contactDate);
            const fromDate = new Date(filters.dateFrom);
            const toDate = new Date(filters.dateTo);
            if (prospectDate < fromDate || prospectDate > toDate) {
              matches = false;
            }
          }
          
          // Filtro por fuente de lead
          if (filters.leadSource && prospect.basicInfo.leadSource !== filters.leadSource) {
            matches = false;
          }
          
          // Filtro por presupuesto
          if (filters.budget && prospect.basicInfo.budget !== filters.budget) {
            matches = false;
          }
          
          // Filtro por área de interés
          if (filters.interestArea && prospect.basicInfo.interestedIn !== filters.interestArea) {
            matches = false;
          }
          
          // Filtro por número de empleados
          if (filters.employeeCountMin && prospect.basicInfo.employeeCount < parseInt(filters.employeeCountMin)) {
            matches = false;
          }
          
          if (filters.employeeCountMax && prospect.basicInfo.employeeCount > parseInt(filters.employeeCountMax)) {
            matches = false;
          }
          
          return matches;
        });
        
        // Cerrar modal
        this.modalService.dismissAll();
        
        if (this.filteredProspects.length === 0) {
          this.showNotification('Sin resultados', 'No hay prospectos que coincidan con los filtros aplicados.', 'info');
        } else {
          this.showNotification(
            'Filtros aplicados', 
            `Se encontraron ${this.filteredProspects.length} prospectos que coinciden con los filtros.`, 
            'success'
          );
        }
      } else {
        // Código para API real
        this.prospectosService.getFilteredProspects(filters).subscribe({
          next: (data) => {
            this.filteredProspects = data;
            this.modalService.dismissAll();
            
            if (this.filteredProspects.length === 0) {
              this.showNotification('Sin resultados', 'No hay prospectos que coinciden con los filtros aplicados.', 'info');
            } else {
              this.showNotification(
                'Filtros aplicados',
                `Se encontraron ${this.filteredProspects.length} prospectos que coinciden con los filtros.`,
                'success'
              );
            }
          },
          error: (error) => {
            console.error('Error applying filters:', error);
            this.showNotification('Error', 'No se pudieron aplicar los filtros', 'error');
          }
        });
      }
    }
  }
  
  // Gestión de documentos de prospectos
  openDocumentsModal() {
    if (!this.selectedProspect) {
      this.showNotification('Atención', 'Selecciona un prospecto primero', 'warning');
      return;
    }
    
    this.loadProspectDocuments();
    this.modalService.open(this.documentsModal, {
      centered: true,
      size: 'lg'
    });
  }
  
  // Cargar documentos asociados al prospecto seleccionado
  loadProspectDocuments() {
    if (!this.selectedProspect) {
      this.showNotification('Error', 'No hay prospecto seleccionado', 'error');
      return;
    }

    if (this.useMockData) {
      // Generar documentos de ejemplo
      this.documentsList = [
        {
          id: 'doc1',
          title: 'Propuesta comercial',
          type: 'Propuesta',
          uploadDate: new Date(new Date().setDate(new Date().getDate() - 3)),
          fileName: 'propuesta_comercial.pdf',
          description: 'Propuesta inicial enviada al cliente',
          isPrivate: false
        },
        {
          id: 'doc2',
          title: 'Cotización inicial',
          type: 'Cotización',
          uploadDate: new Date(new Date().setDate(new Date().getDate() - 5)),
          fileName: 'cotizacion_v1.pdf',
          description: 'Primera cotización en base a requerimientos iniciales',
          isPrivate: true
        }
      ];
    } else {
      // Código para API real
      this.prospectosService.getProspectDocuments(this.selectedProspect.id).subscribe({
        next: (data) => {
          this.documentsList = data;
        },
        error: (error) => {
          console.error('Error loading documents:', error);
          this.showNotification('Error', 'No se pudieron cargar los documentos', 'error');
        }
      });
    }
  }
  
  // Subir nuevo documento
  uploadDocument() {
    if (this.documentsForm.valid && this.selectedProspect) {
      const docData = this.documentsForm.value;
      
      if (this.useMockData) {
        // Simular subida de documento
        const newDoc = {
          id: `doc-${Date.now()}`,
          title: docData.title,
          type: docData.type,
          uploadDate: new Date(),
          fileName: docData.file.name,
          description: docData.description,
          isPrivate: docData.isPrivate
        };
        
        this.documentsList.unshift(newDoc);
        this.documentsForm.reset();
        
        this.showNotification('Documento subido', 'El documento ha sido asociado al prospecto correctamente', 'success');
      } else {
        // Código para API real
        const formData = new FormData();
        formData.append('title', docData.title);
        formData.append('type', docData.type);
        formData.append('file', docData.file);
        formData.append('description', docData.description);
        formData.append('isPrivate', docData.isPrivate);
        
        this.prospectosService.uploadDocument(this.selectedProspect.id, formData).subscribe({
          next: (response) => {
            this.loadProspectDocuments();
            this.documentsForm.reset();
            this.showNotification('Documento subido', 'El documento ha sido asociado al prospecto correctamente', 'success');
          },
          error: (error) => {
            console.error('Error uploading document:', error);
            this.showNotification('Error', 'No se pudo subir el documento', 'error');
          }
        });
      }
    }
  }
  
  // Eliminar documento
  deleteDocument(docId: string) {
    if (!this.selectedProspect) {
      this.showNotification('Error', 'No hay prospecto seleccionado', 'error');
      return;
    }

    const selectedProspect = this.selectedProspect; // Guardar referencia local

    Swal.fire({
      title: '¿Eliminar documento?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        if (this.useMockData) {
          // Eliminar documento de la lista local
          this.documentsList = this.documentsList.filter(doc => doc.id !== docId);
          this.showNotification('Documento eliminado', 'El documento ha sido eliminado correctamente', 'success');
        } else {
          // Código para API real
          this.prospectosService.deleteDocument(selectedProspect.id, docId).subscribe({
            next: () => {
              this.loadProspectDocuments();
              this.showNotification('Documento eliminado', 'El documento ha sido eliminado correctamente', 'success');
            },
            error: (error) => {
              console.error('Error deleting document:', error);
              this.showNotification('Error', 'No se pudo eliminar el documento', 'error');
            }
          });
        }
      }
    });
  }
  
  // Ver calendario de tareas
  openCalendarView() {
    // Generar eventos de calendario basados en tareas programadas
    this.calendarEvents = [];
    
    if (this.pendingTasks && this.pendingTasks.length > 0) {
      this.pendingTasks.forEach(task => {
        const eventDate = new Date(task.dueDate);
        const [hours, minutes] = task.dueTime.split(':').map(Number);
        eventDate.setHours(hours, minutes);
        
        const eventColor = task.completed ? '#28a745' : 
                          (new Date() > eventDate ? '#dc3545' : '#007bff');
        
        this.calendarEvents.push({
          id: task.id,
          title: `${this.getTaskTypeLabel(task.taskType)} - ${task.prospectName}`,
          start: eventDate,
          description: task.description,
          color: eventColor,
          completed: task.completed
        });
      });
    }
    
    // Si hay eventos, mostrar el calendario
    if (this.calendarEvents.length > 0) {
      this.modalService.open(this.calendarModal, {
        centered: true,
        size: 'lg'
      });
    } else {
      this.showNotification('Sin tareas', 'No hay tareas programadas para mostrar en el calendario', 'info');
    }
  }

  // Métodos auxiliares para valores aleatorios
  getRandomPriority(): string {
    const priorities = ['Alta', 'Media', 'Baja'];
    return priorities[Math.floor(Math.random() * priorities.length)];
  }

  getRandomLeadSource(): string {
    const sources = ['Sitio Web', 'Referido', 'Redes Sociales', 'Email Marketing', 'Evento', 'Otro'];
    return sources[Math.floor(Math.random() * sources.length)];
  }

  getRandomBudget(): string {
    const budgets = ['Menos de $1M', '$1M - $5M', '$5M - $10M', '$10M - $50M', 'Más de $50M'];
    return budgets[Math.floor(Math.random() * budgets.length)];
  }

  // Método para exportar a CSV
  exportToCSV() {
    if (!this.selectedProspect) {
      this.showNotification('Error', 'No hay prospecto seleccionado', 'error');
      return;
    }

    const prospect = this.selectedProspect;
    const headers = [
      'ID',
      'Empresa',
      'Contacto',
      'Teléfono',
      'Email',
      'Estado',
      'Fecha de Contacto'
    ];

    const data = [
      [
        prospect.id,
        prospect.companyName,
        prospect.contactInfo.name,
        prospect.contactInfo.phone,
        prospect.contactInfo.email,
        this.getStatusLabel(prospect.status),
        this.formatDate(prospect.contactDate)
      ]
    ];

    let csvContent = headers.join(',') + '\n';
    data.forEach(row => {
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `prospecto_${prospect.companyName}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Método para calcular el progreso general del prospecto
  getOverallProgress(): number {
    if (!this.selectedProspect) return 0;

    const statusWeights = {
      'new': 0,
      'contacted': 20,
      'meeting-scheduled': 40,
      'demo-completed': 60,
      'started': 80,
      'closed': 100
    };

    // Calcular progreso basado en el estado actual
    const baseProgress = statusWeights[this.selectedProspect.status] || 0;

    // Ajustar progreso basado en actividades completadas
    const timelineItems = this.selectedProspect.timeline || [];
    const completedActivities = timelineItems.filter(item => 
      item.status === this.selectedProspect?.status
    ).length;

    // Ajustar progreso basado en documentos
    const hasDocuments = this.documentsList.length > 0;
    const documentBonus = hasDocuments ? 5 : 0;

    // Calcular progreso final (máximo 100%)
    const finalProgress = Math.min(
      baseProgress + (completedActivities * 5) + documentBonus,
      100
    );

    return finalProgress;
  }

  // Método para obtener el color de la barra de progreso
  getProgressColor(): string {
    const progress = this.getOverallProgress();
    if (progress >= 80) return 'success';
    if (progress >= 50) return 'info';
    if (progress >= 20) return 'warning';
    return 'danger';
  }
}