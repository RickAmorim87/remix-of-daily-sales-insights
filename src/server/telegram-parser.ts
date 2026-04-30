// Parser robusto para mensagens de fechamento (manual, EXE C#, ou Telegram).

export interface ParsedFechamento {
  data: string; // YYYY-MM-DD
  caixa: number;
  totem: number;
  food99: number;
  ifood: number;
  cartoes: number;
  pix: number;
  total: number;
}

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function toNumberBR(value: string | undefined | null): number {
  if (value == null) return 0;
  const match = String(value).match(/-?(?:R\$\s*)?\d{1,3}(?:\.\d{3})*(?:,\d{1,2})|-?\d+(?:[,.]\d{1,2})?/i);
  if (!match) return 0;
  const cleaned = match[0]
    .replace(/r\$/gi, "")
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

// Normaliza linha: remove emojis/símbolos no começo e espaços extras.
function normalizeLine(line: string): string {
  return line
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\u{1F000}-\u{1FFFF}\u2600-\u27BF\u2300-\u23FF\u25A0-\u25FF]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Extrai valor numérico de uma linha que contém um dos rótulos.
// Aceita "Caixa: 10,00", "Caixa 10,00", "💰Caixa R$ 10,00", "99 Food: 1.000,00".
function extractValue(lines: string[], aliasPatterns: RegExp[]): number {
  for (const raw of lines) {
    const line = normalizeLine(raw);
    const searchable = stripDiacritics(line).toLowerCase();
    const hit = aliasPatterns.map((pattern) => searchable.match(pattern)).find(Boolean);
    if (!hit || hit.index == null) continue;
    const tail = line.slice(hit.index + hit[0].length).replace(/^\s*[:\-–—]?\s*/, "");
    const v = toNumberBR(tail);
    if (v || /\d/.test(tail)) return v;
  }
  return 0;
}

export function parseFechamento(text: string | undefined | null): ParsedFechamento | null {
  if (!text) return null;
  const normalizedText = stripDiacritics(text).toUpperCase();
  if (!/(FECHAMENTO\s+DO\s+DIA|RELATORIO\s+DE\s+FECHAMENTO|FECHAMENTO\s+DE\s+CAIXA)/.test(normalizedText)) {
    return null;
  }

  const rawLines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (rawLines.length < 2) return null;

  // Data: aceita dd/mm/yyyy em qualquer linha (com ou sem emoji antes).
  const dateLine = rawLines.find((l) => /\d{2}\/\d{2}\/\d{4}/.test(l));
  if (!dateLine) return null;
  const m = dateLine.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  const [, dia, mes, ano] = m;
  const dataISO = `${ano}-${mes}-${dia}`;

  const caixa = extractValue(rawLines, [/\bcaixa\b/]);
  const totem = extractValue(rawLines, [/\btotem\b/]);
  const food99 = extractValue(rawLines, [/\b99\s*food\b/, /\bfood\s*99\b/]);
  const ifood = extractValue(rawLines, [/\bi\s*food\b/, /\bifood\b/]);
  const cartoes = extractValue(rawLines, [/\bcart(?:ao|oes|oes|o|oes)?\b/, /\bcartoes\b/, /\bcartao\b/]);
  const pix = extractValue(rawLines, [/\bpix\b/]);

  let total = extractValue(rawLines, [/\btotal\b/, /\btotal\s+do\s+fechamento\b/]);
  if (!total) total = caixa + totem + food99 + ifood + cartoes + pix;

  return { data: dataISO, caixa, totem, food99, ifood, cartoes, pix, total };
}
