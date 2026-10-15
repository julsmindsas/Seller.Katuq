import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { BodegaService } from '../../shared/services/bodegas/bodega.service';
import { canManageKuvo } from './kuvo.guard';
import { KuvoService } from './kuvo.service';
import { bankPatch, KuvoBankConfiguration, KuvoBankDraft, KuvoPublication, KuvoPublicationDraft, KuvoStatement, publicationDraft, publicationPatch } from './kuvo.models';

@Component({selector: 'app-kuvo', standalone: true, imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './kuvo.component.html', styleUrls: ['./kuvo.component.scss'], changeDetection: ChangeDetectionStrategy.OnPush})
export class KuvoComponent implements OnInit, OnDestroy {
  authorized = false;
  publication: KuvoPublication | null = null;
  draft: KuvoPublicationDraft | null = null;
  statement: KuvoStatement | null = null;
  bank: KuvoBankConfiguration | null = null;
  bankDraft: KuvoBankDraft = this.emptyBank();
  warehouses: Array<{code: string; name: string}> = [];
  loadingPublication = false; loadingStatement = false; loadingBank = false;
  savingPublication = false; savingBank = false;
  publicationError = ''; statementError = ''; bankError = ''; warehouseError = '';
  publicationNotice = ''; bankNotice = '';
  readonly documentTypes = ['CC', 'NIT', 'PP', 'CE', 'TI', 'DNI'];
  readonly accountTypes = [{value: 'AHORROS', label: 'Ahorros'}, {value: 'CORRIENTE', label: 'Corriente'}, {value: 'DEPOSITO_ELECTRONICO', label: 'Depósito electrónico'}];
  private readonly destroyed = new Subject<void>();
  constructor(private readonly service: KuvoService, private readonly bodegas: BodegaService, private readonly cdr: ChangeDetectorRef) {}
  ngOnInit(): void {
    try {
      const role = JSON.parse(localStorage.getItem('user') || '{}').rol;
      this.authorized = canManageKuvo(role);
    } catch (_) { this.authorized = false; }
    if (this.authorized) this.load();
  }
  ngOnDestroy(): void { this.destroyed.next(); this.destroyed.complete(); }
  load(): void {
    if (!this.authorized || this.savingPublication || this.savingBank || this.loadingPublication || this.loadingStatement || this.loadingBank) return;
    this.loadingPublication = this.loadingStatement = this.loadingBank = true;
    this.publicationError = this.statementError = this.bankError = this.warehouseError = '';
    this.publicationNotice = this.bankNotice = '';
    this.service.publication().pipe(takeUntil(this.destroyed)).subscribe({
      next: value => {this.publication = value; this.draft = publicationDraft(value); this.loadingPublication = false; this.cdr.markForCheck();},
      error: error => {this.publicationError = this.message(error, 'No pudimos consultar tu publicación en Kuvo.'); this.loadingPublication = false; this.cdr.markForCheck();},
    });
    this.service.statement().pipe(takeUntil(this.destroyed)).subscribe({
      next: value => {this.statement = value; this.loadingStatement = false; this.cdr.markForCheck();},
      error: error => {this.statement = null; this.statementError = this.message(error, 'No pudimos consultar el saldo de Kuvo.'); this.loadingStatement = false; this.cdr.markForCheck();},
    });
    this.service.bankConfiguration().pipe(takeUntil(this.destroyed)).subscribe({
      next: value => {this.bank = value; this.loadingBank = false; this.cdr.markForCheck();},
      error: error => {this.bank = null; this.bankError = this.message(error, 'No pudimos consultar la cuenta de liquidación.'); this.loadingBank = false; this.cdr.markForCheck();},
    });
    this.bodegas.getActiveBodegas().pipe(takeUntil(this.destroyed)).subscribe({
      next: values => {this.warehouses = (values || []).filter(value => value?.idBodega || value?.codigo).map(value => ({code: String(value.idBodega || value.codigo), name: String(value.nombre || value.name || value.idBodega || value.codigo)})); this.cdr.markForCheck();},
      error: () => {this.warehouseError = 'No pudimos cargar las bodegas. Actualiza antes de cambiar la bodega de despacho.'; this.cdr.markForCheck();},
    });
  }
  savePublication(publish = false): void {
    if (!this.draft || this.savingPublication || !this.authorized) return;
    this.changePublication({...publicationPatch(this.draft), ...(publish ? {activo: true} : {})}, publish ? 'Tu comercio quedó publicado en Kuvo.' : 'Configuración guardada en Kuvo.');
  }
  withdraw(): void {
    if (!this.authorized || this.savingPublication) return;
    this.changePublication({activo: false}, 'Tu comercio se retiró de Kuvo. Puedes seguir atendiendo los pedidos anteriores.');
  }
  private changePublication(patch: object, notice: string): void {
    this.savingPublication = true; this.publicationError = this.publicationNotice = '';
    this.service.updatePublication(patch).pipe(takeUntil(this.destroyed)).subscribe({
      next: value => {
        this.publication = value; this.draft = publicationDraft(value); this.publicationNotice = notice;
        // PUT confirma la configuración; GET confirma la disponibilidad real para comprar.
        this.service.publication().pipe(takeUntil(this.destroyed)).subscribe({
          next: current => {this.publication = current; this.draft = publicationDraft(current); this.savingPublication = false; this.cdr.markForCheck();},
          error: () => {this.publicationError = 'Guardamos la configuración, pero no pudimos confirmar la disponibilidad de compras. Actualiza para consultar su estado.'; this.savingPublication = false; this.cdr.markForCheck();},
        });
      },
      error: error => {this.publicationError = this.message(error, 'No pudimos guardar la publicación.'); this.savingPublication = false; this.cdr.markForCheck();},
    });
  }
  saveBank(): void {
    if (!this.authorized || this.savingBank || !this.bank?.banks?.length) return;
    this.savingBank = true; this.bankError = this.bankNotice = '';
    this.service.requestBank(bankPatch(this.bankDraft)).pipe(takeUntil(this.destroyed)).subscribe({
      next: value => {
        // El estado lo entrega el servidor; solicitar una cuenta nunca la verifica aquí.
        this.bank = {...this.bank!, destination: value}; this.bankDraft = this.emptyBank();
        this.bankNotice = 'Cuenta enviada a revisión. Kuvo comprobará los datos antes de usarla para liquidar.';
        this.savingBank = false; this.cdr.markForCheck();
      },
      error: error => {this.bankError = this.message(error, 'No pudimos enviar la cuenta a revisión.'); this.savingBank = false; this.cdr.markForCheck();},
    });
  }
  private emptyBank(): KuvoBankDraft {return {legalIdType: 'NIT', legalId: '', bankId: '', accountType: 'AHORROS', accountNumber: '', name: '', email: ''};}
  private message(error: any, fallback: string): string {
    if (error?.error?.code === 'ONLINE_PAYMENT_UNAVAILABLE') return 'El pago en línea aún no está listo. Completa la revisión de tu cuenta y la configuración de pagos con Kuvo, o guarda contraentrega como método disponible.';
    return typeof error?.error?.message === 'string' ? error.error.message : fallback;
  }
}
