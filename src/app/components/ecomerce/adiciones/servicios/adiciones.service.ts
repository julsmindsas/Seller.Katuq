import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AdicionSiigo } from '../model/adicion_siigo';
import { HttpClient } from '@angular/common/http';
import { BaseService } from '../../../../shared/services/base.service';
@Injectable({ providedIn: 'root' })
export class AdicionesService extends BaseService {


    constructor(http: HttpClient) {
        super(http);
    }

    createAdicionInSiigo(adicion:AdicionSiigo){

    }

}
