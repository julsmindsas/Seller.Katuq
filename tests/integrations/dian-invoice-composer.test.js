'use strict';
const assert = require('node:assert/strict');
const { test, before } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { of, Subject, throwError, defer } = require('rxjs');
const { finalize } = require('rxjs/operators');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });
const models = require('../../src/app/components/facturacion-electronica/composer/invoice-composer.models.ts');
const dane = require('../../src/app/shared/data/colombia-dane-codes.ts');
let forms, EventEmitter;
before(async () => {
  await import('@angular/compiler');
  forms = await import('@angular/forms');
  ({ EventEmitter } = await import('@angular/core'));
});
function storageFixture() {
  const values = new Map();
  return { getItem: key => values.get(key) || null, setItem: (key,value) => values.set(key,value), removeItem: key => values.delete(key), values };
}
function loadClass(file, extras = {}) {
  const filename = path.resolve(__dirname, '../../src/app/components/facturacion-electronica/composer', file);
  const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true);
  const cls = source.statements.find(ts.isClassDeclaration);
  const js = ts.transpileModule(cls.getText(source), { compilerOptions: {
    target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, experimentalDecorators: true,
  } }).outputText;
  const globals = { exports: {}, ...forms, EventEmitter, ...dane, ...models,
    Component: () => value => value, Input: () => () => {}, Output: () => () => {}, ViewChild: () => () => {},
    ManualInvoiceFormComponent: {}, InvoiceCustomerPickerComponent: {},
    crypto: require('node:crypto').webcrypto, localStorage: storageFixture(),
    defer, finalize, Date, ...extras };
  vm.runInNewContext(js, globals);
  return Object.values(globals.exports)[0];
}
function formFixture() {
  const Form = loadClass('manual-invoice-form.component.ts');
  const form = new Form(new forms.FormBuilder());
  form.chooseCustomer({customerId:'client-unit',billingProfile:-1});
  form.form.patchValue({
    payment: { meansId: '1', meansCode: '42' },
  });
  form.items.at(0).patchValue({ description: 'Servicio', quantity: 2, unitPrice: 1000, taxRate: 19 });
  return form;
}

test('Nueva factura espera la consulta inicial y abre limpio, sin borrar el borrador o documento guardado', () => {
  for (const status of ['draft','ready','accepted','rejected','failed']) {
    const local=storageFixture(), id='previous-invoice-0001', response=new Subject();let reads=0, resets=0;
    local.setItem('katuq.dian.invoice-request.ShopA',JSON.stringify({requestId:id,phase:'submit'}));
    const stored={requestId:id,status,source:'order',preview:{observations:'Observación anterior'},invoice:{number:'UNIT1'}};
    const before=JSON.stringify(stored);
    const Composer=loadClass('invoice-composer.component.ts',{localStorage:local});
    const composer=new Composer({status:()=>{reads++;return response;}},{getActiveCompanyId:()=> 'ShopA'});
    composer.manualForm={form:{dirty:false},resetDraft(){resets++;}};
    composer.ngOnInit();composer.requestNewInvoice();composer.requestNewInvoice();
    assert.equal(reads,1);assert.equal(resets,0);assert.equal(composer.requestId,id);
    response.next(stored);response.complete();
    assert.equal(composer.restored,false);assert.equal(composer.editorDisabled,false);
    assert.equal(composer.record,null);assert.equal(composer.preview,null);assert.equal(composer.requestId,'');
    assert.equal(composer.mode,'manual');assert.equal(composer.phase,'review');assert.equal(composer.observations,'');
    assert.equal(resets,1);assert.equal(local.getItem(composer.storageKey),null);
    assert.equal(JSON.stringify(stored),before,'no actualiza ni elimina la factura guardada');
    assert.equal(composer.canEmit,false);
  }
});

test('Nueva factura también funciona si la consulta inicial terminó antes del clic', () => {
  const local=storageFixture(), id='previous-invoice-0001';
  local.setItem('katuq.dian.invoice-request.ShopA',JSON.stringify({requestId:id,phase:'review'}));
  const Composer=loadClass('invoice-composer.component.ts',{localStorage:local});
  const composer=new Composer({status:()=>of({requestId:id,status:'ready',source:'manual',preview:{}})},{getActiveCompanyId:()=> 'ShopA'});
  composer.ngOnInit();assert.equal(composer.restored,true);
  composer.requestNewInvoice();assert.equal(composer.restored,false);assert.equal(composer.record,null);
  composer.requestNewInvoice();assert.equal(composer.editorDisabled,false);assert.equal(composer.requestId,'');
});

test('Nueva factura no oculta envíos en proceso, inciertos ni una consulta de estado fallida', () => {
  for (const outcome of ['processing','uncertain','timeout','submit-not-found']) {
    const local=storageFixture(), id='pending-invoice-0001', response=new Subject();let resets=0;
    const saved=JSON.stringify({requestId:id,phase:'submit'});
    local.setItem('katuq.dian.invoice-request.ShopA',saved);
    const Composer=loadClass('invoice-composer.component.ts',{localStorage:local});
    const composer=new Composer({status:()=>response},{getActiveCompanyId:()=> 'ShopA'});
    composer.manualForm={form:{dirty:false},resetDraft(){resets++;}};
    composer.ngOnInit();composer.requestNewInvoice();
    if(outcome==='timeout') response.error({name:'TimeoutError'});
    else if(outcome==='submit-not-found') response.error({status:404,error:{code:'DIAN_REQUEST_NOT_FOUND'}});
    else {response.next({requestId:id,status:outcome,source:'manual',preview:{}});response.complete();}
    assert.equal(resets,0);assert.equal(composer.requestId,id);assert.equal(composer.pending,true);
    assert.equal(composer.restored,true);assert.equal(composer.editorDisabled,true);assert.equal(composer.canEmit,false);
    assert.equal(local.getItem(composer.storageKey),saved);assert.ok(composer.error);
  }
});

test('una revisión perdida que nunca se envió permite abrir una nueva, sin reintento fiscal', () => {
  const local=storageFixture(), id='missing-review-0001', response=new Subject();
  local.setItem('katuq.dian.invoice-request.ShopA',JSON.stringify({requestId:id,phase:'review'}));
  const Composer=loadClass('invoice-composer.component.ts',{localStorage:local});
  const composer=new Composer({status:()=>response},{getActiveCompanyId:()=> 'ShopA'});
  composer.ngOnInit();composer.requestNewInvoice();
  response.error({status:404,error:{code:'DIAN_REQUEST_NOT_FOUND'}});
  assert.equal(composer.pending,false);assert.equal(composer.restored,false);assert.equal(composer.requestId,'');
  assert.equal(composer.error,'');assert.equal(composer.editorDisabled,false);
});

test('un clic durante un envío real no lo cancela ni borra su resultado al terminar', () => {
  const Composer=loadClass('invoice-composer.component.ts');const response=new Subject();let sends=0;
  const composer=new Composer({submit:()=>{sends++;return response;}},{getActiveCompanyId:()=> 'ShopA'});
  composer.integration={enabled:true,config:{environment:'produccion'}};
  composer.requestId='current-invoice-0001';composer.record={status:'ready'};composer.preview={fingerprint:'unit'};composer.confirmed=true;
  composer.emitInvoice();composer.requestNewInvoice();
  assert.equal(sends,1);assert.equal(composer.loading,true);
  response.next({requestId:'current-invoice-0001',status:'accepted',source:'manual',preview:{},invoice:{number:'UNIT1'}});response.complete();
  assert.equal(composer.record.status,'accepted');assert.equal(composer.requestId,'current-invoice-0001');
});

test('Nueva factura protege datos sin guardar y limpia sólo después de confirmar', () => {
  let approved=false,resets=0,confirms=0;
  const Composer=loadClass('invoice-composer.component.ts',{window:{confirm:()=>{confirms++;return approved;}}});
  const composer=new Composer({}, {getActiveCompanyId:()=> 'ShopA'});
  composer.manualForm={form:{dirty:true},resetDraft(){resets++;}};composer.observations='Pendiente';
  composer.requestNewInvoice();assert.equal(resets,0);assert.equal(composer.observations,'Pendiente');
  approved=true;composer.requestNewInvoice();assert.equal(resets,1);assert.equal(composer.observations,'');assert.equal(confirms,2);
});

test('cambio de comercio o cierre durante recuperación no ejecuta el inicio nuevo aplazado', () => {
  for(const stop of ['tenant','destroy']) {
    const local=storageFixture(),id='stored-invoice-0001',response=new Subject();let tenant='ShopA',resets=0;
    const saved=JSON.stringify({requestId:id,phase:'submit'});
    local.setItem('katuq.dian.invoice-request.ShopA',saved);
    const Composer=loadClass('invoice-composer.component.ts',{localStorage:local});
    const composer=new Composer({status:()=>response},{getActiveCompanyId:()=>tenant});
    composer.manualForm={form:{dirty:false},resetDraft(){resets++;}};
    composer.ngOnInit();composer.requestNewInvoice();
    if(stop==='tenant') tenant='ShopB'; else composer.ngOnDestroy();
    response.next({requestId:id,status:'accepted',source:'manual',preview:{}});response.complete();
    assert.equal(resets,0);assert.equal(local.getItem(composer.storageKey),saved);
  }
});

test('abrir explícitamente una revisión desde Borradores sigue mostrando su resumen', () => {
  const Composer=loadClass('invoice-composer.component.ts');const id='draft-review-00001';
  const composer=new Composer({status:()=>of({requestId:id,status:'ready',source:'manual',preview:{observations:'Guardado'}})},
    {getActiveCompanyId:()=> 'ShopA'});
  composer.requestNewInvoice();composer.openDraft(id);
  assert.equal(composer.restored,true);assert.equal(composer.requestId,id);assert.equal(composer.observations,'Guardado');
});

test('la recuperación explica el pendiente y ofrece crear nueva cuando el estado ya está confirmado', () => {
  const html=fs.readFileSync(path.resolve(__dirname,'../../src/app/components/facturacion-electronica/composer/invoice-composer.component.html'),'utf8');
  assert.doesNotMatch(html,/<h3>Revisión recuperada<\/h3>/);
  assert.match(html,/Hay una operación por confirmar/);assert.match(html,/Crear una factura nueva/);
  assert.match(html,/\(click\)="requestNewInvoice\(\)"/);
});

test('observaciones se guardan con borrador y llegan a revisión de factura libre y pedido sin emitir', () => {
  const Composer=loadClass('invoice-composer.component.ts'); const calls=[];
  const composer=new Composer({saveDraft(id,invoice,version,observations){calls.push({kind:'draft',observations});return of({version:1,selection:{source:'manual',invoice,observations}});},
    createReview(id,selection){calls.push(selection);return of({requestId:id,status:'ready',source:selection.source,preview:{observations:selection.observations}});}},
    {getActiveCompanyId:()=> 'ShopA'});
  composer.changeObservations('  Agosto\r\nReferencia & pago  ');
  composer.saveDraft({items:[]}); composer.reviewManual({items:[]});
  assert.equal(calls[0].observations,'Agosto\nReferencia & pago');
  assert.equal(calls[1].observations,calls[0].observations);
  assert.equal(composer.preview.observations,calls[0].observations);
  composer.setMode('order'); composer.reviewOrder('order-unit');
  assert.equal(calls[2].source,'order'); assert.equal(calls[2].observations,calls[0].observations);
  assert.equal(composer.canEmit,false);
});

test('editar observaciones invalida confirmación y no permite editar aceptados, pendientes o restaurados', () => {
  const Composer=loadClass('invoice-composer.component.ts',{window:{confirm:()=>true}});
  const composer=new Composer({}, {getActiveCompanyId:()=> 'ShopA'});
  composer.record={status:'ready'};composer.preview={observations:'Original'};composer.confirmed=true;
  composer.changeObservations('Nuevo');
  assert.equal(composer.record,null);assert.equal(composer.preview,null);assert.equal(composer.confirmed,false);
  for (const status of ['accepted','processing','uncertain']) {
    composer.record={status};composer.changeObservations('No permitido');assert.equal(composer.observations,'Nuevo');
  }
  composer.record=null;composer.restored=true;composer.changeObservations('No permitido');assert.equal(composer.observations,'Nuevo');
  composer.restored=false;composer.startNew();assert.equal(composer.observations,'');
});

test('reabrir borrador y corregir rechazo conserva observaciones; protege cambios sin guardar', () => {
  let approved=false, reads=0;
  const Composer=loadClass('invoice-composer.component.ts',{window:{confirm:()=>approved}});
  const invoice={items:[]};
  const composer=new Composer({status:id=>{reads++;return of({requestId:id,status:'draft',version:1,selection:{source:'manual',invoice,observations:'Guardada'}});}},
    {getActiveCompanyId:()=> 'ShopA'});
  composer.manualForm={form:{dirty:false},restoreDraft:()=>{}};
  composer.changeObservations('Sin guardar');composer.openDraft('draft-notes-00001');assert.equal(reads,0);
  approved=true;composer.openDraft('draft-notes-00001');assert.equal(composer.observations,'Guardada');
  composer.record={status:'rejected',selection:{source:'manual',invoice,observations:'Rechazada'}};composer.correctInvoice();
  assert.equal(composer.observations,'Rechazada');assert.equal(composer.canEmit,false);
});

test('validación de observaciones bloquea revisión y guardado; vacío conserva payload anterior', () => {
  const Composer=loadClass('invoice-composer.component.ts');const calls=[];
  const composer=new Composer({saveDraft:()=>{throw Error('No debe guardar');},createReview:(id,selection)=>{calls.push(selection);return of({requestId:id,status:'ready',source:'manual',preview:{}});}},
    {getActiveCompanyId:()=> 'ShopA'});
  for(const value of ['x'.repeat(1001),'Inválido\u0000','\uD800']) {
    composer.changeObservations(value);composer.saveDraft({items:[]});composer.reviewManual({items:[]});
    assert.ok(composer.observationsError);assert.equal(calls.length,0);
  }
  composer.changeObservations(' \n ');composer.reviewManual({items:[]});
  assert.equal(Object.hasOwn(calls[0],'observations'),false);
});

test('servicio incluye observaciones en el guardado del borrador únicamente cuando existen', () => {
  const calls=[];
  const Service=loadClass('dian-invoice.service.ts',{Injectable:()=>value=>value,
    BaseService:class {put(url,body){calls.push(body);return of({success:true,data:{version:1}});}},
    ...require('rxjs/operators')});
  const service=new Service({});
  service.saveDraft('draft-notes-00001',{items:[]},0,'Agosto\nPago').subscribe();
  service.saveDraft('draft-notes-00002',{items:[]},0).subscribe();
  assert.equal(calls[0].observations,'Agosto\nPago');assert.equal(Object.hasOwn(calls[1],'observations'),false);
});

test('campo de observaciones es visible antes de revisar, accesible y su resumen no interpreta HTML', () => {
  const base=path.resolve(__dirname,'../../src/app/components/facturacion-electronica/composer');
  const html=fs.readFileSync(path.join(base,'invoice-composer.component.html'),'utf8');
  const form=fs.readFileSync(path.join(base,'manual-invoice-form.component.html'),'utf8');
  assert.match(html,/for="invoice-observations"/);assert.match(html,/\[maxlength\]="maxObservationsLength"/);
  assert.match(html,/\{\{ preview.observations \}\}/);assert.doesNotMatch(html,/\[innerHTML\]/);
  assert.ok(form.indexOf('<ng-content>')<form.indexOf('class="draft-footer"'));
});

test('backend desactualizado no puede descartar observaciones y permitir emitir o anunciar guardado completo', () => {
  const Composer=loadClass('invoice-composer.component.ts');
  const composer=new Composer({saveDraft:()=>of({version:1,selection:{source:'manual',invoice:{}}}),
    createReview:id=>of({requestId:id,status:'ready',source:'manual',preview:{}})}, {getActiveCompanyId:()=> 'ShopA'});
  composer.changeObservations('No perder este texto');composer.saveDraft({items:[]});
  assert.match(composer.error,/no confirmó las observaciones/);assert.equal(composer.observations,'No perder este texto');
  assert.equal(composer.draftMessage,'');composer.reviewManual({items:[]});
  assert.match(composer.error,/no coinciden/);assert.equal(composer.observations,'No perder este texto');
  composer.integration={enabled:true,config:{environment:'produccion'}};composer.confirmed=true;
  assert.equal(composer.canEmit,false);assert.equal(composer.preview,null);
});

test('recuperar archivos no emite, requiere aceptación y bloquea doble clic',()=>{
 const Composer=loadClass('invoice-composer.component.ts');const response=new Subject();let calls=0;
 const composer=new Composer({recoverDocuments:()=>{calls++;return response;}},{getActiveCompanyId:()=> 'ShopA'});
 composer.record={status:'rejected'};composer.recoverDocuments();assert.equal(calls,0);
 composer.record={status:'accepted',invoice:{artifactsAvailable:false}};composer.requestId='accepted-unit';
 composer.recoverDocuments();composer.recoverDocuments();assert.equal(calls,1);
 response.next({status:'accepted',requestId:'accepted-unit',source:'manual',invoice:{artifactsAvailable:true}});response.complete();
 assert.equal(composer.record.invoice.artifactsAvailable,true);assert.equal(composer.canEmit,false);
});

test('corregir rechazo recupera datos sin emitir, conserva descuento y exige nueva revisión', () => {
  const Composer=loadClass('invoice-composer.component.ts',{window:{confirm:()=>true}});
  const composer=new Composer({}, {getActiveCompanyId:()=> 'ShopA'});
  let restored;
  composer.manualForm={restoreDraft(value){restored=value;}};
  const invoice={customerId:'client-unit',items:[{description:'Mensualidad',discountPercent:10}],payment:{meansId:'1',meansCode:'42'}};
  composer.record={status:'rejected',message:'Regla: 90, Documento procesado anteriormente',selection:{source:'manual',invoice}};
  composer.restored=true;composer.requestId='old-request';composer.confirmed=true;
  composer.correctInvoice();
  assert.equal(restored,invoice);assert.equal(composer.requestId,'');assert.equal(composer.record,null);
  assert.equal(composer.canEmit,false);assert.equal(composer.confirmed,false);assert.equal(composer.restored,false);
});
test('corregir no permite aceptados o pendientes ni evita confirmar duplicados', () => {
  const Composer=loadClass('invoice-composer.component.ts',{window:{confirm:()=>false}});
  const composer=new Composer({}, {getActiveCompanyId:()=> 'ShopA'});
  for(const status of ['accepted','processing','uncertain','rejected']) {
    const record={status,message:'Regla: 90',selection:{source:'manual',invoice:{}}};composer.record=record;
    composer.correctInvoice();assert.equal(composer.record,record);
  }
});

test('guardar borrador permite formulario incompleto, pero revisar no', () => {
  const Form = loadClass('manual-invoice-form.component.ts');
  const form = new Form(new forms.FormBuilder()); let draft, reviews=0;
  form.saveDraft.subscribe(value=>draft=value); form.review.subscribe(()=>reviews++);
  form.storeDraft(); form.reviewInvoice();
  assert.equal(draft.customerId,''); assert.equal(draft.items[0].unitPrice,null); assert.equal(reviews,0);
  form.disabled=true; draft=null; form.storeDraft(); assert.equal(draft,null); form.ngOnDestroy();
});
test('recupera conceptos, descuento y pago sin emitir ni revisar automáticamente', () => {
  const form=formFixture(); let reviews=0, refreshed='';
  form.review.subscribe(()=>reviews++);
  form.customerPicker={reset(){},refresh(id){refreshed=id;}};
  const value=form.form.getRawValue(); value.items[0].discountPercent=10;
  value.payment={meansId:'2',meansCode:'42',dueDate:'2099-12-01'};
  form.restoreDraft(value);
  assert.equal(form.items.at(0).value.discountPercent,10);
  assert.equal(form.form.get('payment.dueDate').value,'2099-12-01');
  assert.equal(refreshed,'client-unit'); assert.equal(reviews,0); form.ngOnDestroy();
});
test('guardado reutiliza ID y versión; revisar promueve el borrador, sin enviar', () => {
  const Composer=loadClass('invoice-composer.component.ts'); const calls=[];
  const composer=new Composer({saveDraft(id,invoice,version){calls.push([id,version]);return of({version:version+1});},
    createReview(id,selection,version){calls.push([id,version,'review']);return of({requestId:id,status:'ready',source:'manual',preview:{}});}},
    {getActiveCompanyId:()=> 'ShopA'});
  composer.saveDraft({items:[]}); const id=composer.draftId;
  composer.saveDraft({items:[]}); composer.reviewManual({items:[]});
  assert.equal(calls.length,3); assert.ok(calls.every(c=>c[0]===id));
  assert.deepEqual(calls.map(c=>c[1]),[0,1,2]); assert.equal(composer.confirmed,false);
});
test('lista de borradores ignora respuesta de otro comercio', () => {
  const List=loadClass('invoice-drafts.component.ts'); const response=new Subject();let tenant='ShopA';
  const list=new List({drafts:()=>response},{getActiveCompanyId:()=>tenant});list.companyId=tenant;
  list.load();tenant='ShopB';response.next({items:[{requestId:'private'}]});response.complete();
  assert.equal(list.items.length,0);list.ngOnDestroy();
});
test('factura libre válida emite datos de revisión, no un pedido', () => {
  const form = formFixture();
  let emitted;
  form.review.subscribe(data => emitted = data);
  form.reviewInvoice();
  assert.equal(emitted.customerId, 'client-unit');
  assert.equal(emitted.customer, undefined);
  assert.equal(emitted.items[0].taxRate, 19);
  assert.equal(emitted.carrito, undefined);
  assert.equal(form.totals.total, 2380);
  form.ngOnDestroy();
});
test('cliente no seleccionado, IVA no elegido y fila vacía impiden revisar', () => {
  const form = formFixture(); let calls = 0;
  form.review.subscribe(() => calls++);
  form.chooseCustomer(null);
  form.reviewInvoice();
  assert.equal(form.invalid('customerId'), true);
  form.chooseCustomer({customerId:'client-unit',billingProfile:-1});
  form.items.at(0).get('taxRate').setValue(null); form.reviewInvoice();
  form.items.at(0).get('taxRate').setValue(19); form.addItem(); form.reviewInvoice();
  assert.equal(calls, 0);
  form.ngOnDestroy();
});
test('recargar o cambiar cliente invalida la selección hasta obtener datos actuales', () => {
  const form = formFixture();
  assert.equal(form.form.valid, true);
  form.chooseCustomer(null);
  assert.equal(form.form.get('customerId').value, '');
  assert.equal(form.form.valid, false);
  form.ngOnDestroy();
});
test('crédito exige vencimiento y volver a contado lo limpia', () => {
  const form = formFixture();
  form.form.get('payment.meansId').setValue('2'); form.changePayment();
  assert.equal(form.form.valid, false);
  form.form.get('payment.dueDate').setValue('2099-12-01');
  assert.equal(form.form.valid, true);
  form.form.get('payment.meansId').setValue('1'); form.changePayment();
  assert.equal(form.form.get('payment.dueDate').value, '');
  form.ngOnDestroy();
});
test('bloqueo de carga impide revisar y modificar filas', () => {
  const form = formFixture(); let calls = 0;
  form.review.subscribe(() => calls++); form.disabled = true;
  form.reviewInvoice(); form.addItem(); form.removeItem(0);
  assert.equal(calls, 0);
  assert.equal(form.items.length, 1);
  form.ngOnDestroy();
});
test('redondeo por línea coincide con el servidor para cantidades fraccionarias', () => {
  const items = [{ description: 'A', quantity: 0.333, unitPrice: 12.34, taxRate: 19 },
    { description: 'B', quantity: 3, unitPrice: 1.11, taxRate: 5 }];
  const result = models.invoiceTotals(items);
  assert.deepEqual(result, { subtotal: 7.44, tax: 0.95, total: 8.39, discount: 0 });
});
test('compositor sólo revisa, bloquea doble clic e ignora resultado de otro comercio', () => {
  const Composer = loadClass('invoice-composer.component.ts');
  const response = new Subject(); let company = 'ShopA'; let calls = 0;
  const composer = new Composer({ createReview() { calls++; return response; } }, { getActiveCompanyId: () => company });
  composer.reviewOrder('unit'); composer.reviewOrder('unit');
  assert.equal(calls, 1);
  company = 'ShopB'; response.next({ fingerprint: 'unit', totals: { payable: 1 } }); response.complete();
  assert.equal(composer.preview, null);
  assert.equal(composer.companyChanged, true);
  assert.equal(composer.loading, false);
  composer.ngOnDestroy();
});
test('editar invalida revisión anterior y errores de consulta quedan visibles', () => {
  const Composer = loadClass('invoice-composer.component.ts');
  const composer = new Composer({ createReview: () => throwError(() => ({ status:400, error: { message: 'Total no coincide' } })) }, { getActiveCompanyId: () => 'ShopA' });
  composer.reviewOrder('unit');
  assert.equal(composer.error, 'Total no coincide');
  assert.equal(composer.loading, false);
  composer.preview = { fingerprint: 'old' }; composer.invalidate();
  assert.equal(composer.preview, null);
  composer.ngOnDestroy();
});
test('buscador usa paginación y búsqueda global del listado de pedidos', () => {
  const Picker = loadClass('invoice-order-picker.component.ts'); const calls = [];
  const picker = new Picker({ getOrdersByFilterOptimized(...args) {
    calls.push(args); return of({ orders: [], pagination: { totalItems: 50, hasNextPage: true } });
  } }, { getActiveCompanyId: () => 'ShopA' });
  picker.companyId = 'ShopA'; picker.search = 'P-001'; picker.load(2);
  assert.equal(calls[0][0].globalFilter, 'P-001');
  assert.equal(calls[0][0].company, 'ShopA');
  assert.deepEqual(calls[0].slice(1), [2, 15, false]);
  assert.equal(picker.hasNext, true);
  assert.equal(picker.page, 2);
  picker.ngOnDestroy();
});
test('selector no elige pedidos facturados ni de una sesión cambiada', () => {
  const Picker = loadClass('invoice-order-picker.component.ts'); let company = 'ShopA'; let chosen = 0;
  const picker = new Picker({}, { getActiveCompanyId: () => company });
  picker.companyId = company; picker.selected.subscribe(() => chosen++);
  const order = { _id: 'unit', carrito: [{}] };
  picker.choose({ ...order, nroFactura: 'UNIT1' });
  picker.choose({ ...order, facturacionElectronica: { invoiceId: 'cufe' } });
  picker.choose({ ...order, facturacionEnProceso: {} });
  company = 'ShopB'; picker.choose(order);
  assert.equal(chosen, 0);
  company = 'ShopA'; picker.choose(order);
  assert.equal(chosen, 1);
});

function readyRecord(id) { return {requestId:id,status:'ready',source:'manual',preview:{fingerprint:'unit-fingerprint',customer:{name:'Unit client'},totals:{payable:2380}}}; }
test('SMTP faltante bloquea el botón aunque haya confirmación y producción', () => {
  const Composer=loadClass('invoice-composer.component.ts'); let sends=0;
  const composer=new Composer({submit:()=>{sends++;return new Subject();}}, {getActiveCompanyId:()=> 'ShopA'});
  composer.integration={enabled:true,config:{environment:'produccion'}};
  composer.record={...readyRecord('unit-request-0001'),delivery:{requested:true,ready:false,message:'SMTP pendiente'}};
  composer.confirmed=true;
  assert.equal(composer.canEmit,false); composer.emitInvoice(); assert.equal(sends,0);
  composer.record.delivery.ready=true; assert.equal(composer.canEmit,true);
});
test('confirmación y producción obligatorias; revisar nunca emite automáticamente', () => {
  const Composer=loadClass('invoice-composer.component.ts'); let sends=0;
  const composer=new Composer({createReview:id=>of(readyRecord(id)),submit:()=>{sends++;return new Subject();}},{getActiveCompanyId:()=> 'ShopA'});
  composer.reviewManual({customerId:'client-unit',items:[]});
  assert.equal(sends,0);
  composer.emitInvoice(); assert.equal(sends,0);
  composer.integration={enabled:true,config:{environment:'habilitacion'}};composer.confirmed=true;composer.emitInvoice();
  assert.equal(sends,0);
  composer.integration.config.environment='produccion';composer.emitInvoice();composer.emitInvoice();
  assert.equal(sends,1);
  composer.ngOnDestroy();
});
test('timeout de envío bloquea otra factura y consulta el mismo identificador', () => {
  const Composer=loadClass('invoice-composer.component.ts'); const ids=[];let sends=0;
  const composer=new Composer({createReview:id=>of(readyRecord(id)),
    submit:()=>{sends++;return throwError(()=>({name:'TimeoutError'}));},
    status:id=>{ids.push(id);return of({...readyRecord(id),status:'accepted',invoice:{number:'UNIT1'}});}
  },{getActiveCompanyId:()=> 'ShopA'});
  composer.integration={enabled:true,config:{environment:'produccion'}};composer.reviewOrder('unit');
  const id=composer.requestId;composer.confirmed=true;composer.emitInvoice();
  assert.equal(composer.pending,true);composer.startNew();composer.reviewOrder('other');
  assert.equal(composer.requestId,id);assert.equal(sends,1);
  composer.refreshStatus();assert.equal(ids[0],id);assert.equal(composer.record.status,'accepted');
});
test('F5 recupera sólo la referencia y consulta; nunca repite PUT automáticamente', () => {
  const local=storageFixture();const id='unit-request-00001';
  local.setItem('katuq.dian.invoice-request.ShopA',JSON.stringify({requestId:id,phase:'submit'}));
  const Composer=loadClass('invoice-composer.component.ts',{localStorage:local});let gets=0,sends=0;
  const composer=new Composer({status:key=>{gets++;return of({...readyRecord(key),status:'processing'});},submit:()=>{sends++;}},{getActiveCompanyId:()=> 'ShopA'});
  composer.ngOnInit();
  assert.equal(gets,1);assert.equal(sends,0);assert.equal(composer.pending,true);
  assert.equal(composer.requestId,id);
  assert.doesNotMatch(local.getItem(composer.storageKey),/cliente|customer|email|2380/);
});
test('rechazo de revisión por datos desactualizados permite revisar, sin declararla aceptada', () => {
  const Composer=loadClass('invoice-composer.component.ts');
  const composer=new Composer({createReview:id=>of(readyRecord(id)),submit:()=>throwError(()=>({status:409,error:{code:'DIAN_PREVIEW_STALE',message:'Cliente actualizado'}}))},{getActiveCompanyId:()=> 'ShopA'});
  composer.integration={enabled:true,config:{environment:'produccion'}};composer.reviewOrder('unit');composer.confirmed=true;composer.emitInvoice();
  assert.equal(composer.record.status,'ready');assert.equal(composer.pending,false);assert.equal(composer.confirmed,false);
  assert.match(composer.error,/Cliente actualizado/);
});
test('buscar empresa muestra cada perfil fiscal y reconsulta el seleccionado, sin emitir ni crear clientes', () => {
  const Picker=loadClass('invoice-customer-picker.component.ts');const reads=[],selected=[];
  const row={cd:'contact-unit',nombres_completos:'Representante',documento:'Empresa Uno',matchedBillingProfiles:[
    {index:0,name:'Empresa Uno SAS',document:'900111111',email:'uno@example.invalid'},
    {index:2,name:'Empresa Dos SAS',document:'900222222',email:'dos@example.invalid'}]};
  const picker=new Picker({searchClients:()=>of([row])},{customer:(id,profile)=>{
    reads.push({id,profile});return of({id,billingProfiles:[],addresses:[],fiscal:{name:'Empresa Dos SAS',documentType:'NIT',documentNumber:'900222222',email:'actual@example.invalid'}});
  }},{getActiveCompanyId:()=> 'ShopA'});
  picker.companyId='ShopA';picker.search='empresa';picker.selected.subscribe(x=>selected.push(x));picker.find();
  assert.equal(picker.results.length,2);assert.equal(picker.results[1].searchName,'Empresa Dos SAS');
  assert.equal(picker.results[1].searchOwner,'Representante');assert.equal(reads.length,0);
  picker.choose(picker.results[1]);assert.deepEqual(reads,[{id:'contact-unit',profile:2}]);
  assert.equal(selected.at(-1).billingProfile,2);assert.equal(picker.customer.fiscal.email,'actual@example.invalid');
});

test('buscador descarta los resultados si cambió el comercio', () => {
  const Picker=loadClass('invoice-customer-picker.component.ts');const response=new Subject();let company='ShopA';
  const picker=new Picker({searchClients:()=>response},{},{getActiveCompanyId:()=>company});
  picker.companyId='ShopA';picker.search='empresa';picker.find();company='ShopB';
  response.next([{cd:'private-client',matchedBillingProfiles:[{index:0,name:'Privado'}]}]);response.complete();
  assert.equal(picker.results.length,0);
});

test('selector de clientes reconsulta el maestro y no selecciona fichas incompletas', () => {
  const Picker=loadClass('invoice-customer-picker.component.ts');const selected=[];
  const record={id:'client-unit',name:'Actual',documentNumber:'900123456',billingProfiles:[],addresses:[],
    fiscal:{documentType:'NIT',documentNumber:'900123456',name:'Actual',email:'updated@example.invalid',address:'Actual',municipalityCode:'11001'}};
  const picker=new Picker({}, {customer:()=>of(record)}, {getActiveCompanyId:()=> 'ShopA'});
  picker.companyId='ShopA';picker.selected.subscribe(x=>selected.push(x));
  picker.choose({cd:'client-unit',nombres_completos:'Viejo'});
  assert.equal(picker.customer.fiscal.name,'Actual');assert.equal(selected.at(-1).customerId,'client-unit');
  record.fiscal.email='';picker.refresh();
  assert.equal(selected.at(-1),null);assert.ok(picker.missingFields.includes('correo de facturación válido'));
});

test('correo de facturación muestra el perfil fiscal consultado, no el correo del buscador', () => {
  const Picker=loadClass('invoice-customer-picker.component.ts');
  const calls=[], selections=[];
  const picker=new Picker({}, {customer:(_id,profile)=>{
    calls.push(profile);
    return of({id:'client-unit',billingProfiles:[],addresses:[],fiscal:{documentType:'NIT',documentNumber:'900123456',name:'Cliente',address:'Calle 1',municipalityCode:'11001',email:profile===0?'facturas@example.invalid':'contacto@example.invalid'}});
  }}, {getActiveCompanyId:()=> 'ShopA'});
  picker.companyId='ShopA';picker.selected.subscribe(value=>selections.push(value));
  picker.choose({cd:'client-unit',correo_electronico_comprador:'antiguo@example.invalid'});
  picker.billingProfile=0;picker.refresh();
  assert.deepEqual(calls,[-1,0]);
  assert.equal(picker.customer.fiscal.email,'facturas@example.invalid');
  assert.deepEqual(Object.keys(selections.at(-1)).sort(),['billingProfile','customerId']);
  picker.reset();assert.equal(picker.customer,null);picker.ngOnDestroy();
});

test('correo fiscal se identifica en el cliente y resumen sin permitir una copia editable', () => {
  const base=path.resolve(__dirname,'../../src/app/components/facturacion-electronica/composer');
  const picker=fs.readFileSync(path.join(base,'invoice-customer-picker.component.html'),'utf8');
  const composer=fs.readFileSync(path.join(base,'invoice-composer.component.html'),'utf8');
  assert.match(picker,/for="invoice-billing-email"/);
  assert.match(picker,/\[value\]="loading \? '' : customer.fiscal.email" readonly/);
  assert.match(picker,/Correo de facturación/);
  assert.match(composer,/Correo de facturación<\/span><b>\{\{ preview.customer.email \}\}/);
});

function createCustomerFixture() {
  const Picker = loadClass('invoice-customer-picker.component.ts', { CrearClienteModalComponent: {} });
  let resolve, reject, activeCompany = 'ShopA', opens = 0;
  const ref = { componentInstance: {}, result: new Promise((ok, fail) => { resolve = ok; reject = fail; }), dismiss() { reject('dismiss'); } };
  const reads = [], selected = [];
  const record = { id: 'new-client', billingProfiles: [], addresses: [], fiscal: {
    documentType: 'NIT', documentNumber: '900123456', name: 'Guardado', email: 'saved@example.invalid', address: 'Calle 1', municipalityCode: '11001',
  } };
  const picker = new Picker({ searchClients: () => of([]) }, { customer: id => { reads.push(id); return of(record); } },
    { getActiveCompanyId: () => activeCompany }, { open: () => { opens++; return ref; } });
  picker.companyId = 'ShopA'; picker.selected.subscribe(value => selected.push(value));
  return { picker, ref, reads, selected, record, resolve, reject, setCompany: value => activeCompany = value, opens: () => opens };
}

test('Crear cliente abre una sola vez el modal existente y relee el cliente persistido', async () => {
  const f = createCustomerFixture();
  f.picker.createCustomer(); f.picker.createCustomer();
  assert.equal(f.opens(), 1);
  assert.equal(f.ref.componentInstance.canPersist(), true);
  assert.equal(f.ref.componentInstance.emailLabel, 'Correo de facturación');
  assert.match(f.ref.componentInstance.emailHint, /ficha de cliente/);
  f.resolve({ action: 'created', cliente: { cd: 'new-client' } });
  await f.ref.result; await Promise.resolve();
  assert.deepEqual(f.reads, ['new-client']);
  assert.equal(f.selected.at(-1).customerId, 'new-client');
  assert.equal(f.picker.creating, false);
});

test('cliente con datos mínimos permite revisar sin dirección fiscal', async () => {
  const f = createCustomerFixture(); f.record.fiscal.address = ''; f.record.fiscal.municipalityCode = '';
  f.picker.createCustomer(); f.resolve({ action: 'created', cliente: { cd: 'new-client' } });
  await f.ref.result; await Promise.resolve();
  assert.equal(f.selected.at(-1).customerId, 'new-client');
  assert.equal(f.picker.missingFields.length, 0);
});

test('cancelar conserva el cliente previo y cambiar comercio impide guardar o seleccionar', async () => {
  const f = createCustomerFixture(); f.picker.customer = f.record;
  f.picker.createCustomer(); f.reject('cancel');
  await f.ref.result.catch(() => {}); await Promise.resolve();
  assert.equal(f.picker.customer, f.record); assert.equal(f.selected.length, 0);
  const changed = createCustomerFixture(); changed.picker.createCustomer(); changed.setCompany('ShopB');
  assert.equal(changed.ref.componentInstance.canPersist(), false);
  changed.resolve({ action: 'created', cliente: { cd: 'new-client' } });
  await changed.ref.result; await Promise.resolve();
  assert.equal(changed.reads.length, 0);
});

test('cliente existente se reutiliza y un formulario bloqueado no abre creación', async () => {
  const f = createCustomerFixture(); f.picker.disabled = true; f.picker.createCustomer();
  assert.equal(f.opens(), 0); f.picker.disabled = false; f.picker.createCustomer();
  f.resolve({ action: 'existing_found', cliente: { id: 'new-client' } });
  await f.ref.result; await Promise.resolve();
  assert.deepEqual(f.reads, ['new-client']);
});

test('el modal compartido comprueba el comercio también después de la búsqueda asíncrona', () => {
  const Modal = loadClass('../../ventas/clientes/crear-cliente-modal/crear-cliente-modal.component.ts', {
    throwError, Swal: { fire() {} },
  });
  const modal = Object.create(Modal.prototype);
  modal.canPersist = () => false;
  modal.maestroService = { createClient() { assert.fail('no debe persistir en otro comercio'); } };
  let error;
  modal.persistCreate({}).subscribe({ error: value => error = value });
  assert.match(error.message, /comercio activo cambió/);
});

test('Actualizar ficha abre el editor completo y su entrada sólo consulta el cliente', () => {
  const html=fs.readFileSync(path.resolve(__dirname,'../../src/app/components/facturacion-electronica/composer/invoice-customer-picker.component.html'),'utf8');
  assert.match(html,/routerLink="\/ventas\/clientes" \[queryParams\]="\{invoiceCustomer:customer.fiscal.documentNumber \|\| customer.documentNumber\}"/);
  const source=fs.readFileSync(path.resolve(__dirname,'../../src/app/components/ventas/clientes/clientes.component.ts'),'utf8');
  const start=source.indexOf('const invoiceCustomer = this.route.snapshot.queryParamMap');
  const entry=source.slice(start,source.indexOf('// Si ya tenemos clienteEdit',start));
  assert.match(entry,/this\.buscar\(\)/);
  assert.doesNotMatch(entry,/editClient|createClient|save|setTimeout/);
});
test('concepto sugerido conserva cantidad y permite editar sin modificar el catálogo', () => {
  const { Subscription } = require('rxjs');
  const { debounceTime, switchMap, catchError } = require('rxjs/operators');
  const Picker = loadClass('invoice-concept-picker.component.ts', { Subscription, Subject, debounceTime, switchMap, catchError, of });
  const picker = new Picker({}, { getActiveCompanyId: () => 'ShopA' });
  picker.companyId = 'ShopA'; picker.item = formFixture().items.at(0);
  const concept = { description: 'Mensualidad Katuq', reference: 'MES', unitPrice: 100000, taxRate: 19 };
  picker.results = [concept]; picker.choose(concept);
  assert.equal(picker.item.value.quantity, 2);
  assert.equal(picker.item.value.unitPrice, 100000);
  picker.item.patchValue({ description: 'Mensualidad septiembre', unitPrice: 90000 });
  assert.equal(concept.unitPrice, 100000); assert.equal(concept.description, 'Mensualidad Katuq');
  picker.ngOnDestroy();
});

test('referencia opcional conserva su valor por fila y llega intacta a la revisión', () => {
  const form = formFixture();
  form.items.at(0).patchValue({ reference: 'MENS-01' });
  form.addItem();
  form.items.at(1).patchValue({ description: 'Soporte', reference: 'SOP-02', quantity: 1, unitPrice: 500, taxRate: 19 });
  let result;
  form.review.subscribe(value => result = value);
  form.reviewInvoice();
  assert.deepEqual(Array.from(result.items, item => item.reference), ['MENS-01', 'SOP-02']);
  form.items.at(0).patchValue({ reference: '' });
  assert.equal(form.form.valid, true);
  form.removeItem(0);
  assert.equal(form.items.at(0).value.reference, 'SOP-02');
  form.ngOnDestroy();
});

test('referencia tiene etiqueta asociada por fila y guardar concepto no envía el formulario', () => {
  const html = fs.readFileSync(path.resolve(__dirname, '../../src/app/components/facturacion-electronica/composer/invoice-concept-picker.component.html'), 'utf8');
  assert.match(html, /\[attr\.for\]="'invoice-concept-reference-' \+ index"/);
  assert.match(html, /\[id\]="'invoice-concept-reference-' \+ index" formControlName="reference"/);
  assert.match(html, /Referencia <span>Opcional<\/span>/);
  assert.match(html, /<button type="button" class="btn concept-save"/);
});

test('guardar concepto no envía datos del cliente y bloquea duplicados o cambio de comercio', () => {
  const { Subscription } = require('rxjs');
  const { debounceTime, switchMap, catchError } = require('rxjs/operators');
  const Picker = loadClass('invoice-concept-picker.component.ts', { Subscription, Subject, debounceTime, switchMap, catchError, of });
  const pending = new Subject(), calls = []; let company = 'ShopA';
  const picker = new Picker({ saveConcept: item => { calls.push(item); return pending; } }, { getActiveCompanyId: () => company });
  picker.companyId = 'ShopA'; picker.item = formFixture().items.at(0);
  picker.save(); picker.save(); assert.equal(calls.length, 1);
  assert.deepEqual(Object.keys(calls[0]).sort(), ['description','reference','taxRate','unitPrice']);
  pending.next({}); company = 'ShopB'; picker.save(); assert.equal(calls.length, 1);
  picker.ngOnDestroy();
});

test('autocompletado descarta respuestas atrasadas al cambiar texto o comercio', async () => {
  const { Subscription } = require('rxjs');
  const { debounceTime, switchMap, catchError } = require('rxjs/operators');
  const Picker = loadClass('invoice-concept-picker.component.ts', { Subscription, Subject, debounceTime, switchMap, catchError, of });
  const pending = new Subject(); let company = 'ShopA';
  const picker = new Picker({ searchConcepts: () => pending }, { getActiveCompanyId: () => company });
  picker.companyId = 'ShopA'; picker.item = formFixture().items.at(0);
  picker.search(); await new Promise(resolve => setTimeout(resolve, 350));
  picker.item.patchValue({ description: 'Otro concepto' }); picker.search();
  pending.next({ items: [{ description:'Anterior' }] }); assert.equal(picker.results.length, 0);
  await new Promise(resolve => setTimeout(resolve, 350)); company = 'ShopB';
  pending.next({ items: [{ description:'Anterior' }] }); assert.equal(picker.results.length, 0);
  picker.ngOnDestroy();
});

test('descuento porcentual calcula base neta e IVA y se envía en la revisión', () => {
  const form=formFixture();form.items.at(0).patchValue({discountPercent:10});
  assert.deepEqual(form.totals,{subtotal:1800,tax:342,total:2142,discount:200});
  let result;form.review.subscribe(value=>result=value);form.reviewInvoice();
  assert.equal(result.items[0].discountPercent,10);
  for(const percent of [-1,100,1.111]) {form.items.at(0).patchValue({discountPercent:percent});assert.equal(form.form.valid,false);}
  form.resetDraft(); assert.equal(form.items.at(0).value.discountPercent,0);
  form.ngOnDestroy();
});

test('descuentos fraccionarios e IVA mixto respetan redondeo por línea', () => {
  for(const [discountPercent,total] of [[0,2380],[1,2356.2],[12.35,2086.07],[50,1190],[99.99,.24]]) {
    assert.equal(models.invoiceTotals([{quantity:2,unitPrice:1000,taxRate:19,discountPercent}]).total,total);
  }
  const totals=models.invoiceTotals([{quantity:1.375,unitPrice:9999.99,taxRate:19,discountPercent:12.35},{quantity:2,unitPrice:99.99,taxRate:5,discountPercent:12.35}]);
  assert.deepEqual(totals,{subtotal:12227.15,tax:2298.62,total:14525.77,discount:1722.82});
});

test('navegador sin generador seguro no inicia solicitudes', () => {
  const Composer=loadClass('invoice-composer.component.ts',{crypto:{}});let calls=0;
  const composer=new Composer({createReview:()=>calls++},{getActiveCompanyId:()=> 'ShopA'});
  composer.reviewOrder('unit');assert.equal(calls,0);assert.match(composer.error,/HTTPS/);
});
