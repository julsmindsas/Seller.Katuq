import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { PromoCampanaRoutingModule } from "./promo-campana-routing.module";
import { PromoCampanaComponent } from "./promo-campana.component";

@NgModule({
  imports: [CommonModule, PromoCampanaRoutingModule],
  declarations: [PromoCampanaComponent],
})
export class PromoCampanaModule {}
