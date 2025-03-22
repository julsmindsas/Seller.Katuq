import { Component, OnInit } from '@angular/core';
import { ServiciosService } from '../../../shared/services/servicios.service';
@Component({
  selector: 'app-mis-ideas',
  templateUrl: './mis-ideas.component.html',
  styleUrls: ['./mis-ideas.component.scss']
})
export class MisIdeasComponent implements OnInit {
  tasks: any[] = [];
  filteredTasks: any[] = [];
  expandedTickets: boolean[] = [];
  newComment: string = '';
  imagePreviews: string[] = [];

  constructor(private ServiciosService: ServiciosService) {}
  ngOnInit() {
    const currentCompany = JSON.parse(sessionStorage.getItem('currentCompany') || '{}');
    this.ServiciosService.getTickets().subscribe({
        next: (ticket: any) => {
          this.tasks = ticket.result
            .filter((task: any) => {
              return (
                task.tienda === currentCompany.nomComercial &&
                task.status !== 'Resuelto' &&
                task.status !== 'Archivado' &&
                task.motivo !== 'idea'
              );
            })
            .sort((a: any, b: any) => 
              new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime()
            );
            
        },
        error: (error) => {
          console.error('Error al obtener tickets:', error);
        }
      });
  }

  loadTasks() {
    // Load tasks with motivo "idea"
    this.tasks = this.getTasks().filter((task: any) => task.motivo === 'idea');
    this.filteredTasks = [...this.tasks];
  }

  getTasks() {
    // Fetch tasks from the service (same logic as in Mis Tickets)
    return [
      {
        asunto: 'Idea 1',
        fechaRegistro: new Date(),
        nombreUsuarioReporta: 'Usuario 1',
        adjuntos: [],
        ticketComments: []
      },
      // ...other tasks
    ];
  }

  toggleTicket(index: number) {
    this.expandedTickets[index] = !this.expandedTickets[index];
  }

  addNewComment(ticket: any) {
    if (this.newComment.trim()) {
      ticket.ticketComments.push({
        autor: { iniciales: 'AB', nombreCompleto: 'Autor B', color: '#007bff' },
        fechaCreacion: new Date(),
        contenido: this.newComment
      });
      this.newComment = '';
      this.imagePreviews = [];
    }
  }

  onFileSelected(event: any) {
    const files = event.target.files;
    for (let file of files) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreviews.push(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(index: number) {
    this.imagePreviews.splice(index, 1);
  }

  openInNewTab(url: string) {
    window.open(url, '_blank');
  }
}
