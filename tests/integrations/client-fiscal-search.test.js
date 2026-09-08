'use strict';
const { test, before } = require('node:test');const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path'),vm=require('vm'),ts=require('typescript');
const { Subject, of }=require('rxjs');const { debounceTime, distinctUntilChanged }=require('rxjs/operators');
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS'}});
const {clientBillingProfiles,matchesClientSearch}=require('../../src/app/shared/utils/client-search.ts');
const client={cd:'client-unit',company:'ShopA',nombres_completos:'Jairo Alberto  Arango Gómez',documento:'Empresa Ejemplo SAS',estado:'activo',datosFacturacionElectronica:[null,{nombres:'Empresa Ejemplo SAS',documento:'901072822-4',correoElectronico:'facturas@example.invalid'}]};
let FormBuilder;
before(async()=>{await import('@angular/compiler');({FormBuilder}=await import('@angular/forms'));});
test('Clientes encuentra datos fiscales y NIT con separadores sin mutar ni agregar campos a la ficha',()=>{
 const initial=JSON.stringify(client);
 for(const query of ['empresa ejemplo','ejemplo empresa','901072822','901.072.822-4','9010728224','facturas@example.invalid','Jairo Alberto Arango Gomez']) assert.ok(matchesClientSearch(client,query),query);
 assert.equal(matchesClientSearch(client,'901.072.822-4','document'),true);
 assert.equal(matchesClientSearch(client,'empresa ejemplo','name'),true);
 assert.equal(matchesClientSearch(client,'facturas@example.invalid','email'),true);
 assert.equal(matchesClientSearch(client,'otra empresa'),false);
 assert.equal(clientBillingProfiles(client)[0].index,1);assert.equal(JSON.stringify(client),initial);
});
function listFixture() {
 const file=path.resolve(__dirname,'../../src/app/components/ventas/clientes/lista/clientes-lista.component.ts');
 const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
 const cls=source.statements.find(ts.isClassDeclaration);
 const js=ts.transpileModule(cls.getText(source),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,experimentalDecorators:true}}).outputText;
 const globals={exports:{},Component:()=>c=>c,ViewChild:()=>()=>{},HostListener:()=>()=>{},DatePipe:{},MessageService:{},Subject,debounceTime,distinctUntilChanged,
  clientBillingProfiles,matchesClientSearch,localStorage:{getItem:()=>null,setItem(){},removeItem(){}},console};
 vm.runInNewContext(js,globals);const List=Object.values(globals.exports)[0];
 const list=new List({}, {}, {queryParams:of({invoiceCustomer:'901.072.822-4'})},
 {obtenerClientes:()=>of([client,{cd:'other',nombres_completos:'Otro',documento:'12345678',estado:'activo'}]),consultarTiposClienteActivos:()=>of([])}, {},new FormBuilder(),{}, {add(){}},{}, {loadClientTags:()=>of([])},{});
 list.dt={first:10};return list;
}
test('listado filtra empresa fiscal y enlace del facturador encuentra la ficha aunque no exista p-table todavía',()=>{
 const list=listFixture();list.dt=undefined;list.ngOnInit();
 assert.equal(list.clientes.length,1);assert.equal(list.clientes[0].cd,'client-unit');
 list.globalFilterValue='901.072.822-4';list.aplicarFiltros(false);assert.equal(list.totalRecords,1);
 list.globalFilterValue='';list.formFiltros.patchValue({cliente:'empresa ejemplo'});list.aplicarFiltros(false);assert.equal(list.totalRecords,1);
 list.ngOnDestroy();
});
test('cambiar estado conserva la búsqueda y limpiar filtros recupera todos los registros',()=>{
 const list=listFixture();list.ngOnInit();list.applyEstadoFilter('activo');assert.equal(list.clientes.length,1);
 list.applyEstadoFilter('todos');assert.equal(list.clientes.length,1);
 list.limpiarFiltros();assert.equal(list.clientes.length,2);list.ngOnDestroy();
});
