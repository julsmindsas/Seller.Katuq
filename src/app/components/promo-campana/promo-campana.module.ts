import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { PromoCampanaRoutingModule } from "./promo-campana-routing.module";
import { PromoCampanaComponent } from "./promo-campana.component";
import { PublicaModule } from "../../shared/components/publica/publica.module";

@NgModule({
  imports: [CommonModule, PromoCampanaRoutingModule, PublicaModule],
  declarations: [PromoCampanaComponent],
})
export class PromoCampanaModule {}
