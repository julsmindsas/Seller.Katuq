import {
  agruparLineasCombo,
  cantidadDeCombos,
  comboDeLinea,
  iniciaComboAbierto,
  lineasDelGrupo,
  valorComun,
} from "./combo-lineas";

// Ticket 1097: un combo se ve en una sola línea hasta que el comercial lo abre.
describe("combo-lineas", () => {
  const combo = (grupo: string, extra: any = {}) => ({
    id: "c1",
    nombre: "ENSAMBLE MONOBLOQUE",
    grupo,
    cantidadPorCombo: 1,
    ...extra,
  });
  const linea = (titulo: string, cantidad = 1, c?: any) => ({ titulo, cantidad, ...(c ? { combo: c } : {}) });

  it("junta un combo cerrado en una fila, donde iba su primer producto", () => {
    const items = [linea("SUELTO"), linea("A", 1, combo("g1")), linea("B", 1, combo("g1")), linea("OTRO")];
    const filas = agruparLineasCombo(items);
    expect(filas.map((f) => f.tipo)).toEqual(["linea", "combo", "linea"]);
    const fila: any = filas[1];
    expect(fila.lineas.map((l: any) => l.titulo)).toEqual(["A", "B"]);
    expect(fila.indices).toEqual([1, 2]);
    expect(fila.cantidad).toBe(1);
    expect((filas[2] as any).indice).toBe(3);
  });

  it("un combo abierto devuelve cada producto en su fila", () => {
    const items = [linea("A", 1, combo("g1", { abierto: true })), linea("B", 1, combo("g1", { abierto: true }))];
    expect(agruparLineasCombo(items).map((f) => f.tipo)).toEqual(["linea", "linea"]);
    expect(iniciaComboAbierto(items, 0)).toBe(true);
    expect(iniciaComboAbierto(items, 1)).toBe(false);
  });

  it("el mismo combo agregado dos veces son dos filas", () => {
    const items = [linea("A", 1, combo("g1")), linea("A", 1, combo("g2"))];
    expect(agruparLineasCombo(items).length).toBe(2);
    expect(lineasDelGrupo(items, "g1")).toBe(1);
  });

  it("cuenta los combos por el factor común de sus productos", () => {
    expect(cantidadDeCombos([linea("A", 3, combo("g")), linea("B", 3, combo("g"))])).toBe(3);
    expect(cantidadDeCombos([linea("A", 4, combo("g", { cantidadPorCombo: 2 })), linea("B", 2, combo("g"))])).toBe(2);
    // Alguien cambió un solo producto: se cuenta como un paquete.
    expect(cantidadDeCombos([linea("A", 3, combo("g")), linea("B", 1, combo("g"))])).toBe(1);
  });

  it("una marca incompleta no agrupa", () => {
    expect(comboDeLinea({ combo: { grupo: "g" } })).toBeNull();
    expect(comboDeLinea({ combo: { nombre: "X" } })).toBeNull();
    expect(agruparLineasCombo([linea("A", 1, { grupo: "g" })])[0].tipo).toBe("linea");
  });

  it("valor común o null si varía", () => {
    expect(valorComun([19, 19])).toBe(19);
    expect(valorComun([19, 0])).toBeNull();
    expect(valorComun([])).toBeNull();
  });
});
