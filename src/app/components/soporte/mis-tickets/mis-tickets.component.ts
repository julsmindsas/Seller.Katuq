import { Component, OnInit } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { ServiciosService } from '../../../shared/services/servicios.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-mis-tickets',
  templateUrl: './mis-tickets.component.html',
  styleUrls: ['./mis-tickets.component.scss']
})
export class MisTicketsComponent implements OnInit {

  tasks: any;
  comments: any[] = [];
  newComment: string = '';
  selectedFiles: File[] = [];
  imagePreviews: string[] = [];
  expandedTickets: boolean[] = [];
  selectedStatus: string = '';
  filteredTasks: any[] = [];
  searchText: string = '';
  dateFilter: string = 'all';
  originalTasks: any[] = []; // Store the original data
  isLoading: boolean = true;
  showCommentSuccess: boolean = false;

  constructor(private ticketService: ServiciosService, private storage: AngularFireStorage) {}

  ngOnInit(): void {
    const currentCompany = JSON.parse(sessionStorage.getItem('currentCompany') || '{}');
    this.isLoading = true;

    this.ticketService.getTickets().subscribe({
      next: (ticket: any) => {
        this.originalTasks = ticket.result
          .filter((task: any) => {
            return (
              task.tienda === currentCompany.nomComercial &&
              task.status !== 'Archivado' // Remove filtering for Resuelto to show in stats
            );
          })
          .sort((a: any, b: any) => 
            new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime()
          );
        
        // Initialize filtered tasks with all tasks
        this.tasks = [...this.originalTasks];
        this.filterTickets();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al obtener tickets:', error);
        this.isLoading = false;
      }
    });
  }

  toggleComments(ticket: any): void {
    ticket.showComments = !ticket.showComments;
  }
  
  toggleReplies(comment: any): void {
    comment.showReplies = !comment.showReplies;
  }
  
  isImage(url: string): boolean {
    return /\.(jpg|jpeg|png|gif)$/i.test(url);
  }
  
  isVideo(url: string): boolean {
    return /\.(mp4|webm|ogg)$/i.test(url);
  }
  
  getVideoThumbnail(videoUrl: string): string {
    // Puedes usar un servicio externo para obtener thumbnails de videos o una imagen genérica.
    return 'assets/icons/video-placeholder.png';
  }
  
  openInNewTab(url: string): void {
    window.open(url, '_blank'); // Abrir el adjunto en una nueva pestaña
  }
  
  handleImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    target.src = 'assets/icons/image-placeholder.png'; // Imagen genérica
  }
  
  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'pendiente':
        return '#d9534f';
      case 'haciendo':
        return '#f0ad4e';
      case 'resuelto':
        return '#5bc0de';
      default:
        return '#969696';
    }
  }
  toggleTicket(index: number): void {
    this.expandedTickets[index] = !this.expandedTickets[index];
  }
  async addNewComment(ticket: any) {
    if (this.newComment.trim() || this.imagePreviews.length > 0) {
      this.isLoading = true;
      const maxId = ticket.ticketComments.length > 0 ? Math.max(...ticket.ticketComments.map((c: any) => c.id)) : 0;

      const currentUserEmail = JSON.parse(localStorage.getItem('user') || '{}').email;
      const author = {
        id: '0',
        nombreCompleto: 'Desconocido',
        iniciales: 'UD',
        color: '#808080',
        email: 'anonimo@anonimo.com',
        celular: '0000',
      };

      const adjuntosUrls = await this.subirImagenesAFirebase();

      const newCommentObj = {
        id: maxId + 1,
        contenido: this.newComment,
        fechaCreacion: new Date().toISOString(),
        autor: author,
        ticketId: ticket.cd,
        estado: 1,
        respuestas: [],
        ultimaModificacion: new Date().toISOString(),
        version: 1,
        adjuntos: adjuntosUrls,
      };

      ticket.ticketComments.push(newCommentObj);
      this.newComment = '';
      this.imagePreviews = [];
      this.selectedFiles = [];
      
      try {
        await this.saveChanges(ticket);
        // Show success notification
        this.showCommentSuccess = true;
        setTimeout(() => {
          this.showCommentSuccess = false;
        }, 3000);
      } catch (error) {
        console.error('Error saving comment:', error);
        // Handle error
      } finally {
        this.isLoading = false;
      }
    }
  }
  filterTickets(): void {
    // Start with all original tasks
    let filteredResults = [...this.originalTasks];

    // Filter by status if selected
    if (this.selectedStatus) {
      filteredResults = filteredResults.filter(task => 
        task.status && task.status.toLowerCase() === this.selectedStatus.toLowerCase()
      );
    }

    // Filter by date range
    filteredResults = this.applyDateFilter(filteredResults);

    // Filter by search text if provided
    if (this.searchText && this.searchText.trim() !== '') {
      const searchLower = this.searchText.toLowerCase().trim();
      filteredResults = filteredResults.filter(task => {
        // Search in asunto, ticketComments and other relevant fields
        return (
          (task.asunto && task.asunto.toLowerCase().includes(searchLower)) ||
          (task.nombreUsuarioReporta && task.nombreUsuarioReporta.toLowerCase().includes(searchLower)) ||
          (task.ticketComments && task.ticketComments.some((comment: any) => 
            comment.contenido && comment.contenido.toLowerCase().includes(searchLower)
          ))
        );
      });
    }

    // Update filtered tasks
    this.filteredTasks = filteredResults;
  }

  // Apply date filtering based on selected option
  applyDateFilter(tasks: any[]): any[] {
    if (!this.dateFilter || this.dateFilter === 'all') {
      return tasks;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1); // Start of current month

    return tasks.filter(task => {
      const taskDate = new Date(task.fechaRegistro);
      taskDate.setHours(0, 0, 0, 0);

      switch (this.dateFilter) {
        case 'today':
          return taskDate.getTime() === today.getTime();
        case 'week':
          return taskDate >= weekStart;
        case 'month':
          return taskDate >= monthStart;
        default:
          return true;
      }
    });
  }

  // Handle search input changes
  onSearchChange(event: any): void {
    this.searchText = event.target.value;
    this.filterTickets();
  }
  
  // Handle date filter changes
  onDateFilterChange(event: any): void {
    this.dateFilter = event.target.value;
    this.filterTickets();
  }

  async subirImagenesAFirebase(): Promise<string[]> {
    const urls = await Promise.all(
      this.selectedFiles.map((file: any, index) => {
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
      task.snapshotChanges()
        .pipe(
          finalize(() => {
            ref.getDownloadURL().subscribe({
              next: (url) => resolve(url),
              error: (err) => reject(err),
            });
          })
        )
        .subscribe({
          error: (error) => reject(error),
        });
    });
  }

  onFileSelected(event: any) {
    const files = event.target.files;

    if (files && files.length > 0) {
      this.selectedFiles = Array.from(files) as File[];
      this.imagePreviews = [];

      for (const file of this.selectedFiles) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.imagePreviews.push(e.target.result);
        };
        reader.readAsDataURL(file);
      }
    }
  }
  removeImage(index: number) {
    // Eliminar la imagen de las vistas previas y de los archivos seleccionados
    this.imagePreviews.splice(index, 1);
    this.selectedFiles.splice(index, 1);
  }
  saveChanges(ticket: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.ticketService.editTicket(ticket).subscribe({
        next: (response) => {
          console.log('Ticket actualizado:', response);
          resolve(response);
        },
        error: (err) => {
          console.error('Error actualizando el ticket:', err);
          reject(err);
        }
      });
    });
  }

  // Filter methods to replace pipe usage
  getTicketsByStatus(status: string): any[] {
    if (!this.filteredTasks) {
      return [];
    }
    return this.filteredTasks.filter(task => 
      task.status && task.status.toLowerCase() === status.toLowerCase()
    );
  }

  // Method to count tickets by status
  getTicketCountByStatus(status: string): number {
    return this.getTicketsByStatus(status).length;
  }

  // Add a method to clear search
  clearSearch(): void {
    this.searchText = '';
    this.filterTickets();
  }
}
