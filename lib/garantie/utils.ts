import {
  addMonths,
  differenceInCalendarDays,
  format,
  parseISO,
} from 'date-fns';
import { nl } from 'date-fns/locale';
import type { Product, WarrantyStatus } from './types';

export function expiryDate(p: Product): Date {
  const months = p.warrantyMonths + (p.extendedWarrantyMonths ?? 0);
  return addMonths(parseISO(p.purchaseDate), months);
}

export function standardExpiryDate(p: Product): Date {
  return addMonths(parseISO(p.purchaseDate), p.warrantyMonths);
}

export function daysLeft(p: Product, today = new Date()): number {
  return differenceInCalendarDays(expiryDate(p), today);
}

export function warrantyStatus(
  p: Product,
  warningDays: number,
  today = new Date(),
): WarrantyStatus {
  const d = daysLeft(p, today);
  if (d < 0) return 'verlopen';
  if (d <= warningDays) return 'verloopt';
  return 'actief';
}

/** Fraction (0..1) of the total warranty period that has elapsed. */
export function warrantyProgress(p: Product, today = new Date()): number {
  const start = parseISO(p.purchaseDate);
  const total = differenceInCalendarDays(expiryDate(p), start);
  if (total <= 0) return 1;
  const elapsed = differenceInCalendarDays(today, start);
  return Math.min(1, Math.max(0, elapsed / total));
}

export function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? parseISO(d) : d;
  return format(date, 'd MMM yyyy', { locale: nl });
}

const euro = new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
});

export function formatEuro(n: number | undefined): string {
  return n === undefined || Number.isNaN(n) ? '—' : euro.format(n);
}

export function formatDaysLeft(days: number): string {
  if (days < 0) {
    const n = Math.abs(days);
    return `${n} ${n === 1 ? 'dag' : 'dagen'} geleden verlopen`;
  }
  if (days === 0) return 'Verloopt vandaag';
  if (days < 62) return `Nog ${days} ${days === 1 ? 'dag' : 'dagen'}`;
  const months = Math.floor(days / 30.44);
  if (months < 24) return `Nog ${months} maanden`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return `Nog ${years} jaar${rest ? ` en ${rest} mnd` : ''}`;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(v: unknown): string {
  const s = v === undefined || v === null ? '' : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV with ";" separator so Dutch Excel opens it correctly. */
export function productsToCsv(products: Product[]): string {
  const header = [
    'Naam',
    'Merk',
    'Model',
    'Serienummer',
    'Categorie',
    'Winkel',
    'Ordernummer',
    'Aankoopdatum',
    'Prijs',
    'Garantie (mnd)',
    'Extra garantie (mnd)',
    'Vervaldatum',
    'Dagen resterend',
    'Aantal claims',
    'Notities',
  ];
  const rows = products.map((p) => [
    p.name,
    p.brand,
    p.model,
    p.serialNumber,
    p.category,
    p.store,
    p.orderNumber,
    p.purchaseDate,
    p.price?.toFixed(2).replace('.', ','),
    p.warrantyMonths,
    p.extendedWarrantyMonths ?? 0,
    format(expiryDate(p), 'yyyy-MM-dd'),
    daysLeft(p),
    p.claims.length,
    p.notes,
  ]);
  return `\uFEFF${[header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n')}`;
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/** iCalendar file with an all-day event on each expiry date + reminder. */
export function productsToIcs(products: Product[], warningDays: number): string {
  const stamp = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");
  const events = products.map((p) => {
    const day = format(expiryDate(p), 'yyyyMMdd');
    const desc = [
      p.brand && `Merk: ${p.brand}`,
      p.model && `Model: ${p.model}`,
      p.serialNumber && `Serienummer: ${p.serialNumber}`,
      p.store && `Winkel: ${p.store}`,
      `Aankoopdatum: ${p.purchaseDate}`,
    ]
      .filter(Boolean)
      .join('\n');
    return [
      'BEGIN:VEVENT',
      `UID:${p.id}@garantie-app`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${day}`,
      `SUMMARY:${icsEscape(`Garantie verloopt: ${p.name}`)}`,
      `DESCRIPTION:${icsEscape(desc)}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${icsEscape(`Garantie van ${p.name} verloopt binnenkort`)}`,
      `TRIGGER:-P${Math.max(1, warningDays)}D`,
      'END:VALARM',
      'END:VEVENT',
    ].join('\r\n');
  });
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Garantie App//NL',
    'CALSCALE:GREGORIAN',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}
