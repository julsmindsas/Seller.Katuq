import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import Swal from 'sweetalert2';
import { NgbModalConfig, NgbModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';
import { Router } from '@angular/router';
import { UtilsService } from '../../../shared/services/utils.service';
import { Subscription } from 'rxjs';
import { Location } from '@angular/common';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';

@Component({
  selector: 'app-edit-profile',
  templateUrl: './edit-profile.component.html',
  styleUrls: ['./edit-profile.component.scss']
})
export class EditProfileComponent implements OnInit, OnDestroy {

  public editP: FormGroup;
  public name = '';
  public namestorage = '';
  public email = '';
  public file: File;
  public img = '';
  public empre = '';
  public adm = '';
  public fecha = Date.now();
  public fechact = new Date(this.fecha);


  public fileLogo;;
  public logo;
  public data: any;
  esCart = false;
  public setPreference: boolean = false
  private user: any

  closeResult: string;


  @ViewChild('subirfoto') subirfoto: ElementRef;
  @ViewChild('emaila') emaila: ElementRef;
  @ViewChild('emailn') emailn: ElementRef;
  @ViewChild('cemailn') cemailn: ElementRef;
  @ViewChild('addLogo') addLogo: ElementRef;

  cargando = false;
  public formCountry: FormGroup
  public settingsCountry: FormGroup
  private sus: Subscription
  private susf: Subscription;

  UserLogged: any;

  constructor(private fb: FormBuilder,
    private storage: AngularFireStorage,
    private service: MaestroService,
    private utils: UtilsService,
    private router: Router,
    config: NgbModalConfig,
    private modalService: NgbModal,
    private location: Location
  ) {

  }

  ngOnInit(): void {

    this.cargando = true;

    this.UserLogged = JSON.parse(localStorage.getItem('user')!);

    this.cargarDatos();
  }

  async cargarDatos() {

    this.name = this.UserLogged.name.split(' ')[0] + ' ' + this.UserLogged.name.split(' ')[1];
    this.empre = this.UserLogged.company;
    this.adm = this.UserLogged.rol;
    this.namestorage = this.name;
    this.email = this.UserLogged.email;
    this.img = this.UserLogged.image;

  }

  //*********************************** Foto de perfil ***************************************************/

  async uploadImage() {

    this.file = this.subirfoto.nativeElement.files[0];
    var referencia = this.storage.storage.ref('Perfil/' + `${this.namestorage}` + '/' + `${this.file.name}`);

    debugger;

    var uploadImg = referencia.put(this.file).then((res: any) => {
      referencia.getDownloadURL().then((data: any) => {

        const item = {
          "identificacion": this.UserLogged.nit,
          "image": data
        };

        this.service.updateUser(item).subscribe((res: any) => {

          if (res.error) {
            Swal.fire({
              icon: "error",
              title: 'Atención!',
              text: 'Inténtelo nuevamente',
              showConfirmButton: false,
              timer: 1500
            });

          } else {

            this.UserLogged = JSON.parse(localStorage.getItem('user')!);

            this.UserLogged.image = data;

            localStorage.setItem('user', JSON.stringify(this.UserLogged));
            Swal.fire({
              icon: 'success',
              title: 'Imagen de perfil cambiada!',
              showConfirmButton: false,
              timer: 1700
            });
            setTimeout(() => {
              this.cargarDatos();
            }, 100);
          }

        });
      });
    });
  }

  private getDismissReason(reason: any): string {

    if (reason === ModalDismissReasons.ESC) {
      return 'by pressing ESC';
    } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return 'by clicking on a backdrop';
    } else {
      return `with: ${reason}`;
    }
  }

  reloadPage() {
    this.location.go(this.location.path());
    window.location.reload();
  }

  savePreferences(): void {

    Swal.fire({
      icon: 'success',
      title: '¡ Cambios guardados con éxito !',
      showConfirmButton: false,
      timer: 1500
    });
  }

  get getcontrolPreferences(): FormControl {
    return this.settingsCountry?.get('defaultPreference') as FormControl
  }

  get getcontrolFilialCountry(): FormControl {
    return this.settingsCountry?.get('filialDefault') as FormControl
  }

  ngOnDestroy(): void {
    this.sus?.unsubscribe()
    this.susf?.unsubscribe()
  }

}
