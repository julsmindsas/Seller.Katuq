import {
  Component,
  OnInit,
  TemplateRef,
  ViewChild,
  ElementRef,
} from "@angular/core";
import { NgbModal, ModalDismissReasons } from "@ng-bootstrap/ng-bootstrap";
import { Producto } from "../../../shared/models/productos/Producto";
import { CartSingletonService } from "../../../shared/services/ventas/cart.singleton.service";

@Component({
  selector: "app-quick-view",
  templateUrl: "./quick-view.component.html",
  styleUrls: ["./quick-view.component.scss"],
})
export class QuickViewComponent implements OnInit {
  @ViewChild("quickView", { static: false }) QuickView: TemplateRef<any>;
  @ViewChild("quantity") quantity: ElementRef<HTMLInputElement>;

  public cantidad: any = 1;

  public closeResult: string;
  public modalOpen: boolean = false;

  public producto: Producto;

  constructor(
    private modalService: NgbModal,
    private carsingleton: CartSingletonService
  ) { }

  ngOnInit(): void { }
  
  openModal(producto: Producto) {
    this.producto = producto;
    this.cantidad = producto.disponibilidad.cantidadMinVenta
    this.modalOpen = true;
    this.modalService
      .open(this.QuickView, {
        size: "xl",
        ariaLabelledBy: "modal-basic-title",
        centered: true,
        windowClass: "Quickview",
      })
      .result.then(
        (result) => {
          `Result ${result}`;
        },
        (reason) => {
          this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
        }
      );
  }

  private getDismissReason(reason: any): string {
    if (reason === ModalDismissReasons.ESC) {
      return "by pressing ESC";
    } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return "by clicking on a backdrop";
    } else {
      return `with: ${reason}`;
    }
  }

  addToCar() {
    console.log("Agregado al carrito");
    let ProductoCompra = {
      producto: this.producto,
      configuracion: null,
      cantidad: this.cantidad,
    };
    this.carsingleton.addToCart(ProductoCompra);
    this.modalService.dismissAll();
  }

  handleInput(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    this.cantidad = inputElement.value;
  }

  masCantidad() {
    this.cantidad++;
    document.getElementById("cantidad").setAttribute("value", this.cantidad);
  }

  menosCantidad() {
    if (this.cantidad > 1) {
      this.cantidad--;
    }
    document.getElementById("cantidad").setAttribute("value", this.cantidad);

  }

}
