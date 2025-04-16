export interface Bodega {
  id?: string;
  nombre: string;
  idBodega: string;
  direccion?: string;
  coordenadas?: string;
  ciudad?: string;
  departamento?: string;
  pais?: string;
  tipo: 'Física' | 'Transaccional';
}