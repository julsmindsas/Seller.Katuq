import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { CrmService } from '../../services/crm.service';
import {
  CrmContact, CrmActivity, CrmTask,
  CONTACT_STATUS_OPTIONS, getStatusSeverity, getStatusLabel,
} from '../../models/crm.models';

@Component({
  selector: 'app-contact-detail',
  templateUrl: './contact-detail.component.html',
  styleUrls: ['./contact-detail.component.scss'],
})
export class ContactDetailComponent implements OnInit, OnDestroy {
  contact: CrmContact | null = null;
  activities: CrmActivity[] = [];
  tasks: CrmTask[] = [];
  loading = true;
  isEditing = false;
  activeTabIndex = 0;
  statusOptions = CONTACT_STATUS_OPTIONS;

  private contactId: string = '';
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private crmService: CrmService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.contactId = this.route.snapshot.paramMap.get('id') || '';
    if (this.contactId) {
      this.loadContact();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadContact(): void {
    this.loading = true;
    this.crmService.getContactById(this.contactId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((contact) => {
        if (!contact) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Contacto no encontrado' });
          this.router.navigate(['/crm/contacts']);
          return;
        }
        this.contact = contact;
        this.activities = contact.recentActivities || [];
        this.loading = false;
        this.loadTasks();
      });
  }

  loadActivities(): void {
    this.crmService.getActivities(this.contactId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => {
        this.activities = res.data;
      });
  }

  loadTasks(): void {
    this.crmService.getContactTasks(this.contactId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => {
        this.tasks = res.data;
      });
  }

  onContactSaved(data: any): void {
    this.crmService.updateContact(this.contactId, data)
      .pipe(takeUntil(this.destroy$))
      .subscribe((updated) => {
        if (updated) {
          this.contact = updated;
          this.isEditing = false;
          this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Contacto actualizado' });
        }
      });
  }

  onActivityAdded(): void {
    this.loadActivities();
  }

  onTaskCreated(): void {
    this.loadTasks();
  }

  changeStatus(newStatus: string): void {
    this.crmService.updateContactStatus(this.contactId, newStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe((success) => {
        if (success) {
          this.loadContact();
          this.loadActivities();
          this.messageService.add({ severity: 'success', summary: 'Estado actualizado' });
        }
      });
  }

  convertToClient(): void {
    this.crmService.convertToClient(this.contactId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (result) {
          this.messageService.add({ severity: 'success', summary: 'Convertido', detail: 'Contacto convertido a cliente' });
          this.loadContact();
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/crm/contacts']);
  }

  getStatusSeverity = getStatusSeverity;
  getStatusLabel = getStatusLabel;
}
