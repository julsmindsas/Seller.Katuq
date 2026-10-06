// Genera src/assets/geo/colombia.json a partir de Natural Earth 1:10m (dominio público)
// y de los códigos DANE del backend. Uso:
//   node scripts/build-mapa-colombia.js <ne_10m_admin_1_states_provinces.geojson> \
//     <ne_10m_populated_places_simple.geojson> <ruta a functions/data/colombia-dane-codes.js> src/assets/geo/colombia.json
// Solo lee datos; no ejecuta nada descargado.
const fs = require('fs');
const [,, ADMIN1, PLACES, DANE_JS, OUT] = process.argv;
const { MUNICIPIOS_COLOMBIA: M } = require(DANE_JS);

const ISO_DANE = { 'CO-ANT':'05','CO-ATL':'08','CO-DC':'11','CO-BOL':'13','CO-BOY':'15','CO-CAL':'17','CO-CAQ':'18','CO-CAU':'19','CO-CES':'20','CO-COR':'23','CO-CUN':'25','CO-CHO':'27','CO-HUI':'41','CO-LAG':'44','CO-MAG':'47','CO-MET':'50','CO-NAR':'52','CO-NSA':'54','CO-QUI':'63','CO-RIS':'66','CO-SAN':'68','CO-SUC':'70','CO-TOL':'73','CO-VAC':'76','CO-ARA':'81','CO-CAS':'85','CO-PUT':'86','CO-SAP':'88','CO-AMA':'91','CO-GUA':'94','CO-GUV':'95','CO-VAU':'97','CO-VID':'99' };
const DANE_NOMBRE = {}; for (const m of M) DANE_NOMBRE[m.codigo.slice(0, 2)] = m.departamento;
// San Andrés queda lejos del continente: se dibuja como recuadro corrido (fuera de escala).
const INSET = { dx: 2.6, dy: -0.9 };
const TOL = 0.012;
const q = (v) => Math.round(v * 1000) / 1000;
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

function dp(pts, tol) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let max = 0, idx = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b]; const dx = bx - ax, dy = by - ay; const L = Math.hypot(dx, dy);
    for (let i = a + 1; i < b; i++) {
      // Anillo cerrado (a == b): distancia al punto, no a la recta
      const d = L < 1e-12 ? Math.hypot(pts[i][0] - ax, pts[i][1] - ay) : Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / L;
      if (d > max) { max = d; idx = i; }
    }
    if (max > tol && idx > 0) { keep[idx] = 1; st.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
function area(r) { let s = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += (r[j][0] - r[i][0]) * (r[j][1] + r[i][1]); return s / 2; }
function centroide(r) { let x = 0, y = 0, a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const f = r[j][0] * r[i][1] - r[i][0] * r[j][1]; x += (r[j][0] + r[i][0]) * f; y += (r[j][1] + r[i][1]) * f; a += f; } a *= 3; return [x / a, y / a]; }

const admin = JSON.parse(fs.readFileSync(ADMIN1));
const deptos = [];
let puntos = 0;
for (const f of admin.features) {
  const p = f.properties;
  if (p.adm0_a3 !== 'COL') continue;
  let iso = p.iso_3166_2;
  if (p.name === 'Bogota') iso = 'CO-DC';
  if (!ISO_DANE[iso]) continue; // zona sin departamento (bancos/cayos)
  const g = f.geometry; const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  const inset = iso === 'CO-SAP';
  const poligonos = [];
  for (const pl of polys) {
    const anillos = pl.map((r) => {
      let rr = r.map(([x, y]) => inset ? [x + INSET.dx, y + INSET.dy] : [x, y]);
      const simple = dp(rr, inset ? TOL / 6 : TOL);
      return (simple.length >= 4 ? simple : rr).map(([x, y]) => [q(x), q(y)]);
    }).filter((r) => r.length >= 4 && Math.abs(area(r)) > (inset ? 1e-6 : 2e-4));
    if (anillos.length) { poligonos.push(anillos); anillos.forEach((r) => puntos += r.length); }
  }
  if (!poligonos.length) { console.log('SIN POLIGONOS', iso, p.name); continue; }
  const mayor = poligonos.map((pl) => pl[0]).sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)))[0];
  const dane = ISO_DANE[iso];
  deptos.push({ iso, dane, nombre: DANE_NOMBRE[dane] || p.name, centro: centroide(mayor).map(q), inset: inset || undefined, poligonos });
}

// Ciudades con coordenadas: Natural Earth + área metropolitana de las principales (aprox.).
const EXTRA = {
  '05266':[-75.585,6.171],'05360':[-75.612,6.184],'05631':[-75.616,6.151],'05380':[-75.643,6.158],'05129':[-75.634,6.091],
  '05212':[-75.509,6.348],'05308':[-75.444,6.377],'05615':[-75.374,6.155],'05440':[-75.338,6.174],'05045':[-76.625,7.883],
  '05376':[-75.433,6.031],'05607':[-75.502,6.061],'25754':[-74.217,4.579],'25175':[-74.058,4.862],'25899':[-74.004,5.022],
  '25473':[-74.213,4.706],'25286':[-74.212,4.716],'25430':[-74.264,4.733],'25269':[-74.354,4.814],'25126':[-74.026,4.919],
  '25290':[-74.364,4.337],'25758':[-73.943,4.908],'25377':[-73.968,4.721],'25817':[-73.913,4.965],'25214':[-74.103,4.810],
  '76364':[-76.540,3.261],'76520':[-76.303,3.539],'76892':[-76.491,3.585],'76111':[-76.298,3.901],'08433':[-74.774,10.860],
  '08573':[-74.954,10.988],'68276':[-73.090,7.064],'68307':[-73.169,7.071],'68547':[-73.050,6.988],'66170':[-75.672,4.839],
  '66682':[-75.621,4.868],'63130':[-75.643,4.519],'54874':[-72.474,7.834],'54405':[-72.505,7.837],'13836':[-75.428,10.330],
  '73268':[-74.884,4.149],'73449':[-74.642,4.204],'20011':[-73.616,8.309],'44430':[-72.243,11.378],'50006':[-73.763,3.987],
};
const porNombre = new Map();
for (const m of M) { const k = norm(m.nombre); if (!porNombre.has(k)) porNombre.set(k, []); porNombre.get(k).push(m); }
const ciudades = {};
const places = JSON.parse(fs.readFileSync(PLACES));
const sinCruce = [];
for (const f of places.features) {
  const p = f.properties; if (p.adm0_a3 !== 'COL') continue;
  let cands = porNombre.get(norm(p.name)) || [];
  const ALIAS = { bogota: '11001', 'san andres': '88001', tolu: '70820', tumaco: '52835' };
  if (ALIAS[norm(p.name)]) cands = M.filter((m) => m.codigo === ALIAS[norm(p.name)]);
  if (cands.length > 1) { const d = norm(p.adm1name); const f2 = cands.filter((m) => norm(m.departamento).startsWith(d.slice(0, 5))); if (f2.length) cands = f2; }
  if (cands.length !== 1) { sinCruce.push(p.name + '/' + p.adm1name + ' (' + cands.length + ')'); continue; }
  const m = cands[0]; let [x, y] = f.geometry.coordinates;
  if (m.codigo.startsWith('88')) { x += INSET.dx; y += INSET.dy; }
  ciudades[m.codigo] = [q(x), q(y), m.nombre];
}
for (const [c, [x, y]] of Object.entries(EXTRA)) { const m = M.find((k) => k.codigo === c); if (!m) { sinCruce.push('EXTRA ' + c); continue; } ciudades[c] = [x, y, m.nombre]; }

const out = { fuente: 'Natural Earth 1:10m (dominio público), simplificado; códigos DANE', inset: { departamento: 'CO-SAP', dx: INSET.dx, dy: INSET.dy }, departamentos: deptos, ciudades };
fs.writeFileSync(OUT, JSON.stringify(out));
console.log('departamentos', deptos.length, 'puntos', puntos, 'ciudades', Object.keys(ciudades).length, 'bytes', fs.statSync(OUT).size);
console.log('sin cruce:', sinCruce.join(', ') || 'ninguna');
