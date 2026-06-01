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

type CalcOp = '+' | '-' | '*' | '/' | '(' | ')';
interface CalcNumToken { kind: 'num'; value: number; }
interface CalcRefToken { kind: 'ref'; label: string; }
interface CalcOpToken  { kind: 'op'; value: CalcOp; }
export type CalcToken = CalcNumToken | CalcRefToken | CalcOpToken;

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
    if ('+-*/()'.includes(c)) {
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
    throw new Error(`Caracter inesperado en posición ${i}: "${c}"`);
  }
  return tokens;
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
    const dryVars: Record<string, number> = {};
    for (const t of tokens) if (t.kind === 'ref') dryVars[t.label] = 0;
    evalCalcTokens(tokens, dryVars);
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
    let tokens: CalcToken[];
    try {
      tokens = tokenizeCalc(calc.expression);
    } catch (e) {
      console.warn(`[calc-engine] "${calc.label}" tokenize falló:`, e);
      fillCalcColumn(result, calcField, calc, null);
      labelToField.set(calc.label, calcField);
      continue;
    }

    const unknownRefs = tokens
      .filter((t): t is CalcRefToken => t.kind === 'ref')
      .map((t) => t.label)
      .filter((label) => !labelToField.has(label));
    if (unknownRefs.length > 0) {
      console.warn(`[calc-engine] "${calc.label}" refs no encontradas:`, unknownRefs);
      fillCalcColumn(result, calcField, calc, null);
      labelToField.set(calc.label, calcField);
      continue;
    }

    for (const row of result.rows) {
      const vars: Record<string, number> = {};
      for (const t of tokens) {
        if (t.kind === 'ref') {
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
