import { Component, OnInit } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { ServiciosService } from '../../../shared/services/servicios.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-mis-ideas',
  templateUrl: './mis-ideas.component.html',
  styleUrls: ['./mis-ideas.component.scss']
})
export class MisIdeasComponent implements OnInit {

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
              task.motivo === 'idea' // Filter only ideas
            );
          })
          .sort((a: any, b: any) => 
            new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime()
          );
        
        // Initialize filtered tasks with all tasks
        this.tasks = [...this.originalTasks];
        this.filterIdeas();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al obtener ideas:', error);
        this.isLoading = false;
      }
    });
  }

  toggleTicket(index: number): void {
    this.expandedTickets[index] = !this.expandedTickets[index];
  }

  filterIdeas(): void {
    // Start with all original tasks
    let filteredResults = [...this.originalTasks];

    // Filter by status if selected
    if (this.selectedStatus) {
      filteredResults = filteredResults.filter(idea => 
        idea.status && idea.status.toLowerCase() === this.selectedStatus.toLowerCase()
      );
    }

    // Filter by date range
    filteredResults = this.applyDateFilter(filteredResults);

    // Filter by search text if provided
    if (this.searchText && this.searchText.trim() !== '') {
      const searchLower = this.searchText.toLowerCase().trim();
      filteredResults = filteredResults.filter(idea => {
        // Search in asunto, ticketComments and other relevant fields
        return (
          (idea.asunto && idea.asunto.toLowerCase().includes(searchLower)) ||
          (idea.nombreUsuarioReporta && idea.nombreUsuarioReporta.toLowerCase().includes(searchLower)) ||
          (idea.ticketComments && idea.ticketComments.some((comment: any) => 
            comment.contenido && comment.contenido.toLowerCase().includes(searchLower))
          )
        );
      });
    }

    // Update filtered tasks
    this.filteredTasks = filteredResults;
  }

  // Apply date filtering based on selected option
  applyDateFilter(ideas: any[]): any[] {
    if (!this.dateFilter || this.dateFilter === 'all') {
      return ideas;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1); // Start of current month

    return ideas.filter(idea => {
      const ideaDate = new Date(idea.fechaRegistro);
      ideaDate.setHours(0, 0, 0, 0);

      switch (this.dateFilter) {
        case 'today':
          return ideaDate.getTime() === today.getTime();
        case 'week':
          return ideaDate >= weekStart;
        case 'month':
          return ideaDate >= monthStart;
        default:
          return true;
      }
    });
  }

  // Handle search input changes
  onSearchChange(event: any): void {
    this.searchText = event.target.value;
    this.filterIdeas();
  }

  // Clear search
  clearSearch(): void {
    this.searchText = '';
    this.filterIdeas();
  }

  // Add a new comment to an idea
  async addNewComment(idea: any) {
    if (this.newComment.trim() || this.imagePreviews.length > 0) {
      this.isLoading = true;
      const maxId = idea.ticketComments.length > 0 ? Math.max(...idea.ticketComments.map((c: any) => c.id)) : 0;

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
        ticketId: idea.cd,
        estado: 1,
        respuestas: [],
        ultimaModificacion: new Date().toISOString(),
        version: 1,
        adjuntos: adjuntosUrls,
      };

      idea.ticketComments.push(newCommentObj);
      this.newComment = '';
      this.imagePreviews = [];
      this.selectedFiles = [];
      
      try {
        await this.saveChanges(idea);
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

  // Upload images to Firebase
  async subirImagenesAFirebase(): Promise<string[]> {
    const urls = await Promise.all(
      this.selectedFiles.map((file: any, index) => {
        const fileName = `idea_${Date.now()}_${index + 1}.jpg`;
        return this.subirImagenFirebase(file, fileName);
      })
    );
    return urls;
  }

  subirImagenFirebase(file: File, fileName: string): Promise<string> {
    const ref = this.storage.ref(`ideas/${fileName}`);
    const task = this.storage.upload(`ideas/${fileName}`, file);

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
    this.imagePreviews.splice(index, 1);
    this.selectedFiles.splice(index, 1);
  }

  saveChanges(idea: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.ticketService.editTicket(idea).subscribe({
        next: (response) => {
          console.log('Idea actualizada:', response);
          resolve(response);
        },
        error: (err) => {
          console.error('Error actualizando la idea:', err);
          reject(err);
        }
      });
    });
  }

  // Filter methods to replace pipe usage
  getIdeasByStatus(status: string): any[] {
    if (!this.filteredTasks) {
      return [];
    }
    return this.filteredTasks.filter(idea => 
      idea.status && idea.status.toLowerCase() === status.toLowerCase()
    );
  }

  // Method to count ideas by status
  getIdeaCountByStatus(status: string): number {
    return this.getIdeasByStatus(status).length;
  }

  // Open attachment in new tab
  openInNewTab(url: string): void {
    window.open(url, '_blank');
  }

  // Handle image error
  handleImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    target.src = 'assets/icons/image-placeholder.png';
  }
}