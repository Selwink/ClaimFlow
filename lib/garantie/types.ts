export const CATEGORIES = [
  'Elektronica',
  'Huishoudelijk',
  'Computer & IT',
  'Telefoon & tablet',
  'Audio & video',
  'Keuken',
  'Tuin & gereedschap',
  'Meubels',
  'Kleding & schoenen',
  'Vervoer',
  'Sport',
  'Overig',
] as const;

export type Category = (typeof CATEGORIES)[number];

export type ClaimStatus = 'open' | 'in_behandeling' | 'afgerond' | 'afgewezen';

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  open: 'Open',
  in_behandeling: 'In behandeling',
  afgerond: 'Afgerond',
  afgewezen: 'Afgewezen',
};

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  /** data: URL */
  data: string;
  addedAt: string;
}

export interface Claim {
  id: string;
  date: string; // yyyy-MM-dd
  description: string;
  status: ClaimStatus;
  reference?: string;
  resolution?: string;
  cost?: number;
}

export interface Product {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  category: Category;
  store?: string;
  storeContact?: string;
  orderNumber?: string;
  purchaseDate: string; // yyyy-MM-dd
  price?: number;
  warrantyMonths: number;
  extendedWarrantyMonths?: number;
  extendedWarrantyProvider?: string;
  notes?: string;
  attachments: Attachment[];
  claims: Claim[];
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type WarrantyStatus = 'actief' | 'verloopt' | 'verlopen';

export interface Settings {
  /** Number of days before expiry a product counts as "verloopt binnenkort". */
  warningDays: number;
  notifications: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  warningDays: 60,
  notifications: false,
};
