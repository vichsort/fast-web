// Formatação para a tela (pt-BR). Horários sempre no fuso da empresa (companies.timezone), com Intl.
// Funções puras: recebem o fuso e, quando comparam com "agora", o instante de referência.

const LOCALE = 'pt-BR';

const formatters = new Map<string, Intl.DateTimeFormat>();

/** Intl.DateTimeFormat em cache por fuso e opções (criar um a cada linha de tabela é caro). */
function dateFormatter(timeZone: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${timeZone}|${JSON.stringify(options)}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(LOCALE, { timeZone, ...options });
    formatters.set(key, formatter);
  }
  return formatter;
}

const toDate = (value: string | Date) => (typeof value === 'string' ? new Date(value) : value);

/** "13/11/2026" */
export function formatDate(value: string | Date, timeZone: string): string {
  return dateFormatter(timeZone, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(toDate(value));
}

/** "13 nov." (sem o ano quando é o ano corrente no fuso; com o ano, "13 nov. 2025"). */
export function formatDateShort(value: string | Date, timeZone: string, now: Date = new Date()): string {
  const date = toDate(value);
  const sameYear = yearIn(date, timeZone) === yearIn(now, timeZone);
  return dateFormatter(timeZone, { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) }).format(
    date,
  );
}

/** "14:05" */
export function formatTime(value: string | Date, timeZone: string): string {
  return dateFormatter(timeZone, { hour: '2-digit', minute: '2-digit' }).format(toDate(value));
}

/** "13/11/2026 14:05" */
export function formatDateTime(value: string | Date, timeZone: string): string {
  return `${formatDate(value, timeZone)} ${formatTime(value, timeZone)}`;
}

/** "qui., 13 de nov." para cabeçalhos de dia. */
export function formatWeekday(value: string | Date, timeZone: string): string {
  return dateFormatter(timeZone, { weekday: 'short', day: 'numeric', month: 'short' }).format(toDate(value));
}

function yearIn(date: Date, timeZone: string): string {
  return dateFormatter(timeZone, { year: 'numeric' }).format(date);
}

/** Data do calendário no fuso ("2026-11-13"): compara dias sem se enganar com o fuso do aparelho. */
export function calendarDay(value: string | Date, timeZone: string): string {
  // en-CA formata como AAAA-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    toDate(value),
  );
}

/** Diferença em dias de calendário (no fuso) entre `value` e `now`: 0 hoje, 1 amanhã, -1 ontem. */
export function dayDiff(value: string | Date, timeZone: string, now: Date = new Date()): number {
  const a = Date.parse(`${calendarDay(value, timeZone)}T00:00:00Z`);
  const b = Date.parse(`${calendarDay(now, timeZone)}T00:00:00Z`);
  return Math.round((a - b) / 86_400_000);
}

const relative = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto', style: 'short' });

/**
 * Data relativa curta: "agora", "há 5 min.", "há 3 h", "ontem", "amanhã", "em 3 dias"; passa de uma semana,
 * vira a data curta ("13 nov.").
 */
export function formatRelative(value: string | Date, timeZone: string, now: Date = new Date()): string {
  const date = toDate(value);
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return relative.format(0, 'second');
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute');
  const days = dayDiff(date, timeZone, now);
  if (days === 0) return relative.format(Math.round(seconds / 3600), 'hour');
  if (Math.abs(days) <= 6) return relative.format(days, 'day');
  return formatDateShort(date, timeZone, now);
}

/** Prazo curto para listas: "hoje", "amanhã", "ontem", "em 3 dias" até uma semana; depois "13 nov.". */
export function formatDue(value: string | Date, timeZone: string, now: Date = new Date()): string {
  const days = dayDiff(value, timeZone, now);
  if (Math.abs(days) <= 6) return relative.format(days, 'day');
  return formatDateShort(value, timeZone, now);
}

/** Número da O.S.: "#0042". */
export function formatOrderNumber(orderNumber: number): string {
  return `#${String(orderNumber).padStart(4, '0')}`;
}

/** Só os dígitos, sem o 55 do Brasil quando vier com DDI. */
function nationalDigits(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length > 11 && digits.startsWith('55') ? digits.slice(2) : digits;
}

/** Telefone brasileiro: "(11) 98765-4321" ou "(11) 3456-7890". Fora do formato, volta como veio. */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const d = nationalDigits(phone);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
}

/** CEP: "01310-100". Fora do formato, volta como veio. */
export function formatZipCode(zip: string | null | undefined): string {
  if (!zip) return '';
  const d = zip.replace(/\D/g, '');
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : zip;
}

/** Link do WhatsApp (wa.me) com DDI 55 e mensagem opcional. */
export function whatsappUrl(phone: string, message?: string): string {
  const url = `https://wa.me/55${nationalDigits(phone)}`;
  return message ? `${url}?text=${encodeURIComponent(message)}` : url;
}

/** Link de ligação. */
export function telUrl(phone: string): string {
  return `tel:+55${nationalDigits(phone)}`;
}

/** Busca do endereço no app de mapas (no Android abre o Google Maps). */
export function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** Iniciais para o avatar: "Ana Paula Souza" → "AS". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

/** Primeiro nome: "Ana Paula Souza" → "Ana". */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** Tamanho de arquivo: "412 KB", "1,2 MB". */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 }).format(bytes / (1024 * 1024))} MB`;
}

/** Número com separador de milhar: "1.234". */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat(LOCALE).format(value);
}

/** Lista legível: "Ana, Bruno e Carla". */
export function formatList(items: string[]): string {
  return new Intl.ListFormat(LOCALE, { style: 'long', type: 'conjunction' }).format(items);
}

/**
 * Endereço curto para listas, a partir do texto copiado na O.S. (03, R3: "Rua, nº, compl. - Bairro - Cidade/UF -
 * CEP ... (referência)"): "Rua das Acácias, 120 · Vila Mariana".
 */
export function shortAddress(address: string | null | undefined): string {
  if (!address) return '';
  const parts = address
    .replace(/\s*\([^)]*\)\s*$/, '')
    .split(' - ')
    .map((p) => p.trim());
  const [street, district] = parts;
  const streetShort = street?.split(', ').slice(0, 2).join(', ') ?? '';
  return district && !district.includes('/') ? `${streetShort} · ${district}` : streetShort;
}
