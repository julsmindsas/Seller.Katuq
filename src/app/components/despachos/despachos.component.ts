initForms() {

    this.transportadorForm = this.formBuilder.group({
      nombres: ['', Validators.required],
      apellidos: ['', Validators.required],
      cedula: ['', Validators.required],
      telefono: ['', Validators.required],
      whatsapp: [''],
      correo: ['', [Validators.required, Validators.email]],
      fechaNacimiento: ['', Validators.required],
      eps: [''],
      arl: [''],
      marcaMoto: [''],
      lineaMoto: [''],
      modeloMoto: [''],
      placa: [''],
      capacidadCarga: [5, [Validators.required, Validators.min(1), Validators.max(50)]],
      pwd: ['', Validators.required],
    });

    this.ordenEnvioForm = this.formBuilder.group({
      fechaEnvio: ['', Validators.required],
      metodoEnvio: ['', Validators.required]
    });


  } 