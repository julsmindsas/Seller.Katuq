import { armarLink, cambiosCatalogo, catalogoVencido, diaLocal, estadoCatalogo, finDelDia } from "./catalogo-link.reglas";
import { CatalogoLink } from "./catalogo-link.modelos";

describe("catalogo-link.reglas", () => {
  const ahora = new Date(2026, 9, 13, 12, 0, 0);

  it("deriva el estado como el backend", () => {
    expect(estadoCatalogo({ activo: true, fechaVencimiento: null }, ahora)).toBe("activo");
    expect(estadoCatalogo({ activo: false, fechaVencimiento: null }, ahora)).toBe("apagado");
    expect(estadoCatalogo({ activo: true, fechaVencimiento: new Date(2026, 9, 1).toISOString() }, ahora)).toBe("vencido");
    expect(estadoCatalogo({ activo: false, fechaVencimiento: new Date(2026, 9, 1).toISOString() }, ahora)).toBe("apagado");
    expect(catalogoVencido({ fechaVencimiento: "basura" }, ahora)).toBeFalse();
  });

  it("vence al terminar el día elegido, no al empezarlo", () => {
    const iso = finDelDia("2026-10-13")!;
    expect(catalogoVencido({ fechaVencimiento: iso }, ahora)).toBeFalse();
    expect(diaLocal(iso)).toBe("2026-10-13");
    expect(finDelDia("")).toBeNull();
  });

  it("arma el link con el dominio actual", () => {
    expect(armarLink("abc", "https://sellercenter.katuq.com/")).toBe("https://sellercenter.katuq.com/cat/abc");
    expect(armarLink(undefined, "https://x")).toBe("");
  });

  it("manda solo lo que cambió", () => {
    const original: CatalogoLink = {
      id: "1", nombre: "Navidad", descripcion: "", activo: true,
      fechaVencimiento: null, productoIds: ["a", "b"],
    };
    expect(cambiosCatalogo(original, { nombre: "Navidad ", descripcion: "", fechaVencimiento: null, productoIds: ["a", "b"] })).toEqual({});
    expect(cambiosCatalogo(original, { nombre: "Navidad", descripcion: "", fechaVencimiento: null, productoIds: ["b", "a"] }))
      .toEqual({ productoIds: ["b", "a"] });
    expect(cambiosCatalogo(original, { nombre: "Año nuevo", descripcion: "x", fechaVencimiento: null, productoIds: ["a", "b"] }))
      .toEqual({ nombre: "Año nuevo", descripcion: "x" });
  });
});
