'use client';

import { DEFAULT_SETTINGS, type Product, type Settings } from './types';

/**
 * Small IndexedDB wrapper. IndexedDB is used instead of localStorage because
 * receipts/invoices (images, PDFs) quickly exceed the ~5MB localStorage limit.
 */

const DB_NAME = 'garantie-app';
const DB_VERSION = 1;
const PRODUCTS = 'products';
const META = 'meta';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PRODUCTS)) {
        db.createObjectStore(PRODUCTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(META)) {
        db.createObjectStore(META);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T> | undefined,
): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(store, mode);
        const request = fn(t.objectStore(store));
        t.oncomplete = () => resolve(request ? request.result : undefined);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      }),
  );
}

export async function getAllProducts(): Promise<Product[]> {
  const items = await tx<Product[]>(PRODUCTS, 'readonly', (s) => s.getAll());
  return (items ?? []).map(normalizeProduct);
}

export async function saveProduct(product: Product): Promise<void> {
  await tx(PRODUCTS, 'readwrite', (s) => s.put(product));
}

export async function deleteProduct(id: string): Promise<void> {
  await tx(PRODUCTS, 'readwrite', (s) => s.delete(id));
}

export async function replaceAllProducts(products: Product[]): Promise<void> {
  await tx(PRODUCTS, 'readwrite', (s) => {
    s.clear();
    for (const p of products) s.put(normalizeProduct(p));
    return undefined;
  });
}

export async function getSettings(): Promise<Settings> {
  const s = await tx<Settings>(META, 'readonly', (st) => st.get('settings'));
  return { ...DEFAULT_SETTINGS, ...(s ?? {}) };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await tx(META, 'readwrite', (s) => s.put(settings, 'settings'));
}

export function normalizeProduct(p: Partial<Product>): Product {
  const now = new Date().toISOString();
  return {
    id: p.id ?? crypto.randomUUID(),
    name: p.name ?? 'Onbekend product',
    brand: p.brand,
    model: p.model,
    serialNumber: p.serialNumber,
    category: p.category ?? 'Overig',
    store: p.store,
    storeContact: p.storeContact,
    orderNumber: p.orderNumber,
    purchaseDate: p.purchaseDate ?? now.slice(0, 10),
    price: p.price,
    warrantyMonths: Number(p.warrantyMonths ?? 24),
    extendedWarrantyMonths: p.extendedWarrantyMonths,
    extendedWarrantyProvider: p.extendedWarrantyProvider,
    notes: p.notes,
    attachments: p.attachments ?? [],
    claims: p.claims ?? [],
    archived: p.archived ?? false,
    createdAt: p.createdAt ?? now,
    updatedAt: p.updatedAt ?? now,
  };
}
