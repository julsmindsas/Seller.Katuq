/**
 * Motor de medidas calculadas frontend-only.
 *
 * Sintaxis soportada:
 *   - Aritmética: + - * / ( )
 *   - Negación unaria: -[Total]
 *   - Números literales: 1, 0.19, 1000
 *   - Refs por label: [Total Pedido (sum)] (exact match con ReportColumn.label)
 *
 * Las calcs se evalúan en orden contra las filas YA agregadas del backend.
 * Soporta cross-refs entre calcs siempre que la calc referenciada aparezca
 * antes en el array de definiciones.
 *
 * División por cero retorna null (renderizado como '-' por las vizes).
 */

import { CalculatedMeasureDef, ReportColumn, ReportResult } from './report-spec.interfaces';

type CalcOp = '+' | '-' | '*' | '/' | '(' | ')' | ',';
interface CalcNumToken { kind: 'num'; value: number; }
interface CalcRefToken { kind: 'ref'; label: string; }
interface CalcOpToken  { kind: 'op'; value: CalcOp; }
interface CalcFnToken  { kind: 'fn'; name: string; }
interface CalcStrToken { kind: 'str'; value: string; }
export type CalcToken = CalcNumToken | CalcRefToken | CalcOpToken | CalcFnToken | CalcStrToken;

/** Whitelist de funciones soportadas en v1. */
export const CALC_FUNCTIONS = ['total', 'pct_of_total', 'running_total', 'rank'] as const;
export type CalcFunctionName = typeof CALC_FUNCTIONS[number];

/**
 * Metadata de un function call extraído de los tokens.
 * Restricciones v1: arg0 obligatorio y debe ser un ref, arg1 opcional string.
 */
interface CalcFunctionCall {
  /** Id sintético usado como ref-name en los tokens reescritos. */
  syntheticId: string;
  name: CalcFunctionName;
  refLabel: string;
  arg2?: string;
}

export function tokenizeCalc(expr: string): CalcToken[] {
  const tokens: CalcToken[] = [];
  let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    if (c === ' ' || c === '\t' || c === '\n') { i++; continue; }
    if (c === '[') {
      const end = expr.indexOf(']', i + 1);
      if (end === -1) throw new Error('Falta "]" para cerrar referencia');
      tokens.push({ kind: 'ref', label: expr.slice(i + 1, end).trim() });
      i = end + 1;
      continue;
    }
    if (c === "'" || c === '"') {
      // String literal — usado como segundo arg de funciones (ej: rank(..., 'asc'))
      const quote = c;
      const end = expr.indexOf(quote, i + 1);
      if (end === -1) throw new Error(`Falta ${quote} para cerrar string`);
      tokens.push({ kind: 'str', value: expr.slice(i + 1, end) });
      i = end + 1;
      continue;
    }
    if ('+-*/(),'.includes(c)) {
      tokens.push({ kind: 'op', value: c as CalcOp });
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < expr.length && /[0-9.]/.test(expr[j])) j++;
      const n = Number(expr.slice(i, j));
      if (!Number.isFinite(n)) throw new Error(`Número inválido: ${expr.slice(i, j)}`);
      tokens.push({ kind: 'num', value: n });
      i = j;
      continue;
    }
    if (/[a-z_]/i.test(c)) {
      // Identificador: solo válido si va seguido de '(' → es una función.
      let j = i;
      while (j < expr.length && /[a-z0-9_]/i.test(expr[j])) j++;
      const name = expr.slice(i, j).toLowerCase();
      // Saltar espacios entre nombre y '('
      let k = j;
      while (k < expr.length && (expr[k] === ' ' || expr[k] === '\t')) k++;
      if (expr[k] !== '(') {
        throw new Error(`Identificador "${name}" debe ser una función seguida de "(" — referencias a columnas van entre corchetes [Label].`);
      }
      if (!(CALC_FUNCTIONS as readonly string[]).includes(name)) {
        throw new Error(`Función desconocida: "${name}". Disponibles: ${CALC_FUNCTIONS.join(', ')}.`);
      }
      tokens.push({ kind: 'fn', name });
      i = j;
      continue;
    }
    throw new Error(`Caracter inesperado en posición ${i}: "${c}"`);
  }
  return tokens;
}

/**
 * Pre-pass: encuentra llamadas a funciones (`fn ( [ref] (, str)? )`),
 * las reemplaza con un ref-sintético (`__fn_<n>__`) que luego se resuelve
 * via pre-cómputo en `precomputeFunctions`. Devuelve los tokens reescritos
 * y la lista de calls extraídos.
 *
 * v1 restrictivo: arg0 debe ser un ref, arg1 (opcional) debe ser string literal.
 * Esto evita anidamiento (rank(total(...))) que no tiene semántica clara.
 */
export function extractFunctionCalls(tokens: CalcToken[]): { rewritten: CalcToken[]; calls: CalcFunctionCall[] } {
  const rewritten: CalcToken[] = [];
  const calls: CalcFunctionCall[] = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t.kind !== 'fn') {
      rewritten.push(t);
      i++;
      continue;
    }
    const name = t.name as CalcFunctionName;
    // Espera "(" siguiente
    const lparen = tokens[i + 1];
    if (!lparen || lparen.kind !== 'op' || lparen.value !== '(') {
      throw new Error(`Función "${name}" debe ir seguida de "("`);
    }
    // Espera ref como primer arg
    const ref = tokens[i + 2];
    if (!ref || ref.kind !== 'ref') {
      throw new Error(`Función "${name}" requiere una referencia [Label] como primer argumento`);
    }
    // Segundo arg opcional: coma + string
    let arg2: string | undefined;
    let j = i + 3;
    if (tokens[j] && tokens[j].kind === 'op' && (tokens[j] as CalcOpToken).value === ',') {
      const strTok = tokens[j + 1];
      if (!strTok || strTok.kind !== 'str') {
        throw new Error(`Función "${name}" — el segundo argumento debe ser un string entre comillas (ej: 'asc')`);
      }
      arg2 = strTok.value;
      j += 2;
    }
    // Espera ")"
    const rparen = tokens[j];
    if (!rparen || rparen.kind !== 'op' || rparen.value !== ')') {
      throw new Error(`Función "${name}" — falta ")" al cerrar argumentos`);
    }

    const syntheticId = `__fn_${calls.length}__`;
    calls.push({ syntheticId, name, refLabel: ref.label, arg2 });
    // Reemplaza el slice de tokens [fn, (, [ref], (,, str)?, )] con un single ref-token sintético
    rewritten.push({ kind: 'ref', label: syntheticId });
    i = j + 1;
  }
  return { rewritten, calls };
}

/**
 * Pre-computa el valor de cada function call sobre el result completo.
 * - total: escalar (mismo valor para todas las filas)
 * - pct_of_total: vector indexado por fila
 * - running_total: vector indexado por fila
 * - rank: vector indexado por fila (1-based)
 *
 * Retorna `Record<syntheticId, number[]>` (siempre array; los escalares son
 * array con el mismo valor en cada posición — simplifica el consumer).
 */
function precomputeFunctions(
  calls: CalcFunctionCall[],
  rows: Record<string, unknown>[],
  labelToField: Map<string, string>,
): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const call of calls) {
    const field = labelToField.get(call.refLabel);
    if (!field) {
      console.warn(`[calc-engine] función ${call.name}: ref "${call.refLabel}" no encontrada`);
      out[call.syntheticId] = rows.map(() => 0);
      continue;
    }
    const colVals = rows.map((r) => {
      const v = Number(r[field]);
      return Number.isFinite(v) ? v : 0;
    });

    if (call.name === 'total') {
      const sum = colVals.reduce((a, b) => a + b, 0);
      out[call.syntheticId] = rows.map(() => sum);
    } else if (call.name === 'pct_of_total') {
      const sum = colVals.reduce((a, b) => a + b, 0);
      out[call.syntheticId] = colVals.map((v) => (sum === 0 ? 0 : (v / sum) * 100));
    } else if (call.name === 'running_total') {
      let acc = 0;
      out[call.syntheticId] = colVals.map((v) => { acc += v; return acc; });
    } else if (call.name === 'rank') {
      const dir = call.arg2 === 'asc' ? 1 : -1; // default desc (mayor = rank 1)
      const indexed = colVals.map((v, idx) => ({ v, idx }));
      indexed.sort((a, b) => (a.v - b.v) * dir);
      const ranks = new Array(rows.length).fill(0);
      indexed.forEach((entry, rankIdx) => { ranks[entry.idx] = rankIdx + 1; });
      out[call.syntheticId] = ranks;
    }
  }
  return out;
}

/**
 * Recursive descent eval:
 *   expr   = term ( ('+'|'-') term )*
 *   term   = factor ( ('*'|'/') factor )*
 *   factor = num | ref | '(' expr ')' | '-' factor
 */
export function evalCalcTokens(tokens: CalcToken[], vars: Record<string, number>): number | null {
  let pos = 0;
  const peek = (): CalcToken | undefined => tokens[pos];

  const parseFactor = (): number => {
    const t = peek();
    if (!t) throw new Error('Expresión incompleta');
    if (t.kind === 'op' && t.value === '-') { pos++; return -parseFactor(); }
    if (t.kind === 'op' && t.value === '(') {
      pos++;
      const v = parseExpr();
      const closing = peek();
      if (!closing || closing.kind !== 'op' || closing.value !== ')') throw new Error('Falta ")"');
      pos++;
      return v;
    }
    if (t.kind === 'num') { pos++; return t.value; }
    if (t.kind === 'ref') {
      pos++;
      if (vars[t.label] === undefined) throw new Error(`Ref no resuelta: ${t.label}`);
      return vars[t.label];
    }
    throw new Error(`Token inesperado: ${JSON.stringify(t)}`);
  };

  const parseTerm = (): number => {
    let v = parseFactor();
    while (true) {
      const t = peek();
      if (!t || t.kind !== 'op' || (t.value !== '*' && t.value !== '/')) break;
      const op = t.value; pos++;
      const r = parseFactor();
      if (op === '*') v = v * r;
      else v = r === 0 ? NaN : v / r;
    }
    return v;
  };

  const parseExpr = (): number => {
    let v = parseTerm();
    while (true) {
      const t = peek();
      if (!t || t.kind !== 'op' || (t.value !== '+' && t.value !== '-')) break;
      const op = t.value; pos++;
      const r = parseTerm();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  };

  const result = parseExpr();
  if (pos < tokens.length) throw new Error('Tokens sobrantes al final');
  return Number.isFinite(result) ? result : null;
}

/**
 * Valida una expresión sin evaluar contra datos reales. Útil para feedback
 * en tiempo de edición (modal Swal). Retorna null si OK, mensaje de error si no.
 */
export function validateCalcExpression(expression: string): string | null {
  try {
    const tokens = tokenizeCalc(expression);
    const { rewritten } = extractFunctionCalls(tokens);
    const dryVars: Record<string, number> = {};
    for (const t of rewritten) if (t.kind === 'ref') dryVars[t.label] = 0;
    evalCalcTokens(rewritten, dryVars);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

/**
 * Muta `result` agregando columnas + cells para cada calc. Sin efecto si
 * `calculated` está vacío. Calcs en orden de definición; cross-refs sólo
 * hacia atrás. Si una calc falla, su columna se llena con null.
 */
export function applyCalculatedMeasures(result: ReportResult, calculated: CalculatedMeasureDef[]): void {
  if (!result) return;

  // Limpiar columnas y celdas de calcs previas (re-evaluación tras edición/borrado).
  // El backend nunca produce field names con prefijo `calc_`, así que es seguro filtrar por eso.
  result.columns = result.columns.filter((c) => !c.field.startsWith('calc_'));
  for (const row of result.rows) {
    for (const key of Object.keys(row)) {
      if (key.startsWith('calc_')) delete row[key];
    }
  }

  if (!calculated || calculated.length === 0) return;

  const labelToField = new Map<string, string>();
  for (const col of result.columns) labelToField.set(col.label, col.field);

  for (const calc of calculated) {
    const calcField = `calc_${calc.id}`;
    let rawTokens: CalcToken[];
    try {
      rawTokens = tokenizeCalc(calc.expression);
    } catch (e) {
      console.warn(`[calc-engine] "${calc.label}" tokenize falló:`, e);
      fillCalcColumn(result, calcField, calc, null);
      labelToField.set(calc.label, calcField);
      continue;
    }

    // Extraer y pre-computar function calls (total, pct_of_total, running_total, rank).
    // Reemplaza el slice de tokens por una ref sintética (`__fn_N__`) que se resuelve
    // contra vectores pre-calculados sobre la columna entera.
    let tokens: CalcToken[];
    let fnCalls: CalcFunctionCall[];
    try {
      const extracted = extractFunctionCalls(rawTokens);
      tokens = extracted.rewritten;
      fnCalls = extracted.calls;
    } catch (e) {
      console.warn(`[calc-engine] "${calc.label}" función inválida:`, e);
      fillCalcColumn(result, calcField, calc, null);
      labelToField.set(calc.label, calcField);
      continue;
    }

    // Validar refs no sintéticas — las sintéticas se resuelven via fnVectors.
    const unknownRefs = tokens
      .filter((t): t is CalcRefToken => t.kind === 'ref' && !t.label.startsWith('__fn_'))
      .map((t) => t.label)
      .filter((label) => !labelToField.has(label));
    // También validar que los refs DENTRO de funciones existan
    const unknownFnRefs = fnCalls
      .map((c) => c.refLabel)
      .filter((label) => !labelToField.has(label));
    if (unknownRefs.length > 0 || unknownFnRefs.length > 0) {
      console.warn(`[calc-engine] "${calc.label}" refs no encontradas:`, [...unknownRefs, ...unknownFnRefs]);
      fillCalcColumn(result, calcField, calc, null);
      labelToField.set(calc.label, calcField);
      continue;
    }

    // Pre-computar los vectores de funciones una sola vez por calc.
    const fnVectors = precomputeFunctions(fnCalls, result.rows, labelToField);

    for (let rowIdx = 0; rowIdx < result.rows.length; rowIdx++) {
      const row = result.rows[rowIdx];
      const vars: Record<string, number> = {};
      for (const t of tokens) {
        if (t.kind !== 'ref') continue;
        if (t.label.startsWith('__fn_')) {
          // Synthetic ref → leer del vector pre-computado
          vars[t.label] = fnVectors[t.label]?.[rowIdx] ?? 0;
        } else {
          const field = labelToField.get(t.label)!;
          const v = Number(row[field]);
          vars[t.label] = Number.isFinite(v) ? v : 0;
        }
      }
      try {
        row[calcField] = evalCalcTokens(tokens, vars);
      } catch {
        row[calcField] = null;
      }
    }

    result.columns.push({
      field: calcField,
      label: calc.label,
      type: 'measure',
      dataType: 'number',
      format: calc.format,
      axis: 'measure',
    });
    labelToField.set(calc.label, calcField);
  }
}

function fillCalcColumn(result: ReportResult, field: string, calc: CalculatedMeasureDef, value: number | null): void {
  for (const row of result.rows) row[field] = value;
  result.columns.push({
    field,
    label: calc.label,
    type: 'measure',
    dataType: 'number',
    format: calc.format,
    axis: 'measure',
  });
}

/**
 * Lista de refs disponibles para el modal de edición de calcs.
 * Construye los labels EXACTAMENTE como los produce el backend en inferColumns
 * (`{measure.label} ({agg})`) más los calcs anteriores en el array.
 */
export function availableCalcRefs(
  values: Array<{ label: string; agg?: string }>,
  calculated: CalculatedMeasureDef[],
  excludeCalcId?: string,
): Array<{ label: string; kind: 'measure' | 'calc' }> {
  const refs: Array<{ label: string; kind: 'measure' | 'calc' }> = [];
  for (const v of values) {
    refs.push({ label: `${v.label} (${v.agg || 'sum'})`, kind: 'measure' });
  }
  for (const c of calculated) {
    if (c.id === excludeCalcId) break;
    refs.push({ label: c.label, kind: 'calc' });
  }
  return refs;
}
