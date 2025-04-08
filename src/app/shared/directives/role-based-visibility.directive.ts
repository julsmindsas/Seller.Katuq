import { Directive, Input, OnInit, TemplateRef, ViewContainerRef } from '@angular/core';
import { TypeCustomer } from '../models/roles/roles.type';

@Directive({
  selector: '[appRoleBasedVisibility]'
})
export class RoleBasedVisibilityDirective implements OnInit {

  @Input('appRoleBasedVisibility') typeCustomer!: TypeCustomer[]
  constructor(
    private viewContainerRef: ViewContainerRef,
    private templateRef: TemplateRef<any>
  ) {

  }
  ngOnInit(): void {
    this.hasRoleShow()
  }

  async hasRoleShow() {
    const userActive = JSON.parse(localStorage.getItem('user')!);
    if (userActive) {
      const isRole: boolean = Boolean(this.typeCustomer && this.typeCustomer.includes(userActive.tipo))
      if (isRole) {
        this.viewContainerRef.createEmbeddedView(this.templateRef)
      } else {
        this.viewContainerRef.clear();
      }
    }
  }
}
