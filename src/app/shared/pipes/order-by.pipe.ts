import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'orderBy'
})
export class OrderByPipe implements PipeTransform {
  transform(array: any[], field: string, direction: string = 'asc'): any[] {
    if (!Array.isArray(array) || !field) {
      return array;
    }
    
    // Hacemos una copia para no mutar el array original
    return [...array].sort((a, b) => {
      const aValue = a[field];
      const bValue = b[field];
      
      if (aValue === bValue) {
        return 0;
      }
      
      // Manejo de valores nulos o indefinidos para evitar errores
      if (aValue == null) {
        return direction === 'asc' ? -1 : 1;
      }
      if (bValue == null) {
        return direction === 'asc' ? 1 : -1;
      }
      
      // Comparación estándar
      if (direction === 'asc') {
        return aValue < bValue ? -1 : 1;
      } else {
        return aValue > bValue ? -1 : 1;
      }
    });
  }
} 