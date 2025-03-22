import { Injectable } from '@angular/core';
import * as crypto from 'crypto-js';

@Injectable({
    providedIn: 'root'
})
export class UtilsService {

    constructor() {
    }

    toISO8601(date) {
        let day = '' + date.getDate()
        let month = '' + (date.getMonth() + 1)
        const year = date.getFullYear()

        if (month.length < 2) month = '0' + month
        if (day.length < 2) day = '0' + day

        return [year, month, day].join('-')
    }

    startsWith(str, prefix) {
        return str ? str.indexOf(prefix) === 0 : false
    }

    endsWith(str, suffix) { return str ? str.indexOf(suffix, str.length - suffix.length) !== -1 : false }

    contains(str, element) { return str ? str.includes(element) : false }

    containsEscaped(str, element) {
        return this.contains(str, element.replace(/"/g, '\\"'))
    }

    containsOrEscaped(str, element) {
        return this.contains(str, element) || this.containsEscaped(str, element)
    }

    hash(data) {
        const res = crypto.SHA256(data);
        return res.toString(crypto.enc.Base64)
    }

    deepClone<T>(object: T): T {
        // Manejo de tipos primitivos y nulos
        if (object === null || typeof object !== 'object') {
            return object;
        }

        // Manejo de fechas
        if (object instanceof Date) {
            return new Date(object.getTime()) as unknown as T;
        }

        // Manejo de expresiones regulares
        if (object instanceof RegExp) {
            return new RegExp(object.source, object.flags) as unknown as T;
        }

        // Manejo de arrays
        if (Array.isArray(object)) {
            const clonedArray = object.map(item => this.deepClone(item));
            return clonedArray as unknown as T;
        }

        // Creación de una instancia del objeto con la misma cadena de prototipo
        const clonedObj = Object.create(Object.getPrototypeOf(object));

        // Manejo de objetos (incluyendo Map, Set, etc. si es necesario)
        Object.keys(object).forEach(key => {
            clonedObj[key] = this.deepClone(object[key]);
        });

        return clonedObj;
    }

    // Ejemplo de uso permanece igual


}