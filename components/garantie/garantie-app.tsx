'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Bell,
  CalendarPlus,
  CheckCircle2,
  Download,
  FileJson,
  FileSpreadsheet,
  LayoutDashboard,
  ListChecks,
  Moon,
  Package,
  Plus,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Sun,
  Trash2,
  Upload,
  Wallet,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  CATEGORIES,
  CLAIM_STATUS_LABELS,
  DEFAULT_SETTINGS,
  type Claim,
  type ClaimStatus,
  type Product,
  type Settings,
  type WarrantyStatus,
} from '@/lib/garantie/types';
import {
  deleteProduct,
  getAllProducts,
  getSettings,
  normalizeProduct,
  replaceAllProducts,
  saveProduct,
  saveSettings,
} from '@/lib/garantie/storage';
import {
  daysLeft,
  downloadFile,
  expiryDate,
  formatDate,
  formatDaysLeft,
  formatEuro,
  productsToCsv,
  productsToIcs,
  warrantyProgress,
  warrantyStatus,
} from '@/lib/garantie/utils';
import { ProductForm, selectClass } from './product-form';
import { ProductDetail } from './product-detail';
import { StatusBadge, statusBarColor } from './status-badge';

type Tab = 'overzicht' | 'producten' | 'claims' | 'instellingen';
type SheetState =
  | { mode: 'closed' }
  | { mode: 'new'; template?: Product }
  | { mode: 'edit'; id: string }
  | { mode: 'view'; id: string };
type SortKey = 'vervaldatum' | 'naam' | 'aankoopdatum' | 'prijs';

const TABS: { id: Tab; label: string; icon: typeof Package }[] = [
  { id: 'overzicht', label: 'Overzicht', icon: LayoutDashboard },
  { id: 'producten', label: 'Producten', icon: Package },
  { id: 'claims', label: 'Claims', icon: ListChecks },
  { id: 'instellingen', label: 'Instellingen', icon: SettingsIcon },
];

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Thema wisselen"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="size-5 dark:hidden" />
      <Moon className="hidden size-5 dark:block" />
    </Button>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  onClick,
}: {
  label: string;
  value: string | number;
  icon: typeof Package;
  tone: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="flex size-full items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors enabled:hover:bg-muted/50 sm:gap-4"
    >
      <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-lg', tone)}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-sm leading-tight text-muted-foreground">{label}</p>
      </div>
    </button>
  );
}

function ProductCard({
  product,
  status,
  onClick,
}: {
  product: Product;
  status: WarrantyStatus;
  onClick: () => void;
}) {
  const days = daysLeft(product);
  const openClaims = product.claims.filter(
    (c) => c.status === 'open' || c.status === 'in_behandeling',
  ).length;
  const thumb = product.attachments.find((a) => a.type.startsWith('image/'));
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col gap-3 rounded-xl border bg-card p-4 text-left transition-shadow hover:shadow-md',
        product.archived && 'opacity-60',
      )}
    >
      <div className="flex items-start gap-3">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb.data} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Package className="size-5 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{product.name}</p>
          <p className="truncate text-sm text-muted-foreground">
            {[product.brand, product.model].filter(Boolean).join(' · ') ||
              product.category}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full', statusBarColor[status])}
          style={{ width: `${Math.round(warrantyProgress(product) * 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatDaysLeft(days)}</span>
        <span>t/m {formatDate(expiryDate(product))}</span>
      </div>
      {(openClaims > 0 || product.archived) && (
        <div className="flex gap-2 text-xs">
          {openClaims > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300">
              {openClaims} open claim{openClaims > 1 ? 's' : ''}
            </span>
          )}
          {product.archived && (
            <span className="rounded-full bg-muted px-2 py-0.5">Gearchiveerd</span>
          )}
        </div>
      )}
    </button>
  );
}

function EmptyState({ onAdd, onDemo }: { onAdd: () => void; onDemo: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
        <ShieldCheck className="size-7" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">Nog geen producten</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Voeg je eerste aankoop toe en bewaar de kassabon, zodat je nooit meer
          zoekt wanneer er iets kapotgaat.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={onAdd}>
          <Plus className="size-4" /> Product toevoegen
        </Button>
        <Button variant="outline" onClick={onDemo}>
          Voorbeelddata laden
        </Button>
      </div>
    </div>
  );
}

function demoProducts(): Product[] {
  const d = (monthsAgo: number) => {
    const x = new Date();
    x.setMonth(x.getMonth() - monthsAgo);
    return x.toISOString().slice(0, 10);
  };
  return [
    { name: 'Wasmachine', brand: 'Bosch', model: 'Serie 6 WAU28', category: 'Huishoudelijk', store: 'Coolblue', purchaseDate: d(20), price: 749, warrantyMonths: 24, extendedWarrantyMonths: 36, extendedWarrantyProvider: 'Coolblue', serialNumber: 'FD9812-00451' },
    { name: 'Laptop', brand: 'Lenovo', model: 'ThinkPad X1 Carbon', category: 'Computer & IT', store: 'Bol', purchaseDate: d(23), price: 1499, warrantyMonths: 24 },
    { name: 'Smartphone', brand: 'Samsung', model: 'Galaxy S24', category: 'Telefoon & tablet', store: 'MediaMarkt', purchaseDate: d(8), price: 899, warrantyMonths: 24 },
    { name: 'Koptelefoon', brand: 'Sony', model: 'WH-1000XM5', category: 'Audio & video', store: 'Coolblue', purchaseDate: d(30), price: 349, warrantyMonths: 24 },
    { name: 'Koffiemachine', brand: 'De\'Longhi', model: 'Magnifica S', category: 'Keuken', store: 'Blokker', purchaseDate: d(11), price: 329, warrantyMonths: 12, claims: [{ id: crypto.randomUUID(), date: d(1), description: 'Lekt water aan de onderkant', status: 'in_behandeling', reference: 'RMA-55120' }] },
    { name: 'Accuboormachine', brand: 'Makita', model: 'DHP482', category: 'Tuin & gereedschap', store: 'Gamma', purchaseDate: d(5), price: 179, warrantyMonths: 36 },
  ].map((p) => normalizeProduct(p as Partial<Product>));
}

export function GarantieApp() {
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>('overzicht');
  const [sheet, setSheet] = useState<SheetState>({ mode: 'closed' });

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<WarrantyStatus | 'alle'>('alle');
  const [categoryFilter, setCategoryFilter] = useState<string>('alle');
  const [sortKey, setSortKey] = useState<SortKey>('vervaldatum');
  const [showArchived, setShowArchived] = useState(false);
  const [claimFilter, setClaimFilter] = useState<ClaimStatus | 'alle'>('alle');
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([getAllProducts(), getSettings()])
      .then(([p, s]) => {
        setProducts(p);
        setSettings(s);
      })
      .catch(() => toast.error('Kon gegevens niet laden'))
      .finally(() => setLoaded(true));
  }, []);

  const statusOf = useCallback(
    (p: Product) => warrantyStatus(p, settings.warningDays),
    [settings.warningDays],
  );

  // Daily browser notification for warranties about to expire.
  useEffect(() => {
    if (!loaded || !settings.notifications) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const today = new Date().toISOString().slice(0, 10);
    try {
      if (localStorage.getItem('garantie-last-notified') === today) return;
      localStorage.setItem('garantie-last-notified', today);
    } catch {
      return;
    }
    const soon = products.filter((p) => !p.archived && statusOf(p) === 'verloopt');
    if (soon.length === 0) return;
    new Notification('Garantie verloopt binnenkort', {
      body:
        soon.length === 1
          ? `${soon[0].name}: ${formatDaysLeft(daysLeft(soon[0])).toLowerCase()}`
          : `${soon.length} producten: ${soon.map((p) => p.name).join(', ')}`,
    });
  }, [loaded, settings.notifications, products, statusOf]);

  const active = useMemo(() => products.filter((p) => !p.archived), [products]);

  const stats = useMemo(() => {
    const s = { actief: 0, verloopt: 0, verlopen: 0, value: 0, openClaims: 0 };
    for (const p of active) {
      const st = statusOf(p);
      s[st]++;
      if (st !== 'verlopen') s.value += p.price ?? 0;
      s.openClaims += p.claims.filter(
        (c) => c.status === 'open' || c.status === 'in_behandeling',
      ).length;
    }
    return s;
  }, [active, statusOf]);

  const upcoming = useMemo(
    () =>
      active
        .filter((p) => daysLeft(p) >= 0)
        .sort((a, b) => daysLeft(a) - daysLeft(b))
        .slice(0, 5),
    [active],
  );

  const byCategory = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>();
    for (const p of active) {
      const cur = map.get(p.category) ?? { count: 0, value: 0 };
      cur.count++;
      cur.value += p.price ?? 0;
      map.set(p.category, cur);
    }
    return [...map.entries()].sort((a, b) => b[1].count - a[1].count);
  }, [active]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter((p) => showArchived || !p.archived)
      .filter((p) => statusFilter === 'alle' || statusOf(p) === statusFilter)
      .filter((p) => categoryFilter === 'alle' || p.category === categoryFilter)
      .filter(
        (p) =>
          !q ||
          [p.name, p.brand, p.model, p.serialNumber, p.store, p.orderNumber, p.notes]
            .filter(Boolean)
            .some((v) => v?.toLowerCase().includes(q)),
      )
      .sort((a, b) => {
        switch (sortKey) {
          case 'naam':
            return a.name.localeCompare(b.name, 'nl');
          case 'aankoopdatum':
            return b.purchaseDate.localeCompare(a.purchaseDate);
          case 'prijs':
            return (b.price ?? 0) - (a.price ?? 0);
          default:
            return expiryDate(a).getTime() - expiryDate(b).getTime();
        }
      });
  }, [products, query, statusFilter, categoryFilter, sortKey, showArchived, statusOf]);

  const allClaims = useMemo(
    () =>
      products
        .flatMap((p) => p.claims.map((c) => ({ claim: c, product: p })))
        .filter((x) => claimFilter === 'alle' || x.claim.status === claimFilter)
        .sort((a, b) => b.claim.date.localeCompare(a.claim.date)),
    [products, claimFilter],
  );

  async function upsert(p: Product) {
    await saveProduct(p);
    setProducts((list) => {
      const i = list.findIndex((x) => x.id === p.id);
      if (i === -1) return [...list, p];
      const copy = [...list];
      copy[i] = p;
      return copy;
    });
  }

  async function remove(id: string) {
    const p = products.find((x) => x.id === id);
    if (!p || !confirm(`"${p.name}" definitief verwijderen?`)) return;
    await deleteProduct(id);
    setProducts((list) => list.filter((x) => x.id !== id));
    setSheet({ mode: 'closed' });
    toast.success('Product verwijderd');
  }

  async function updateSettings(next: Settings) {
    setSettings(next);
    await saveSettings(next);
  }

  async function loadDemo() {
    const demo = demoProducts();
    for (const p of demo) await saveProduct(p);
    setProducts((list) => [...list, ...demo]);
    toast.success('Voorbeelddata geladen');
  }

  function exportJson() {
    downloadFile(
      `garantie-backup-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), settings, products }, null, 2),
      'application/json',
    );
  }

  async function importJson(file: File) {
    try {
      const data = JSON.parse(await file.text());
      const list: Partial<Product>[] = Array.isArray(data) ? data : data.products;
      if (!Array.isArray(list)) throw new Error('invalid');
      const replace = confirm(
        `${list.length} producten gevonden.\n\nOK = huidige gegevens vervangen\nAnnuleren = toevoegen aan bestaande`,
      );
      const incoming = list.map(normalizeProduct);
      if (replace) {
        await replaceAllProducts(incoming);
        setProducts(incoming);
      } else {
        const ids = new Set(products.map((p) => p.id));
        const merged = incoming.map((p) => (ids.has(p.id) ? { ...p, id: crypto.randomUUID() } : p));
        for (const p of merged) await saveProduct(p);
        setProducts((cur) => [...cur, ...merged]);
      }
      if (!Array.isArray(data) && data.settings) {
        await updateSettings({ ...DEFAULT_SETTINGS, ...data.settings });
      }
      toast.success('Backup geïmporteerd');
    } catch {
      toast.error('Ongeldig backupbestand');
    }
  }

  async function toggleNotifications(on: boolean) {
    if (on) {
      if (typeof Notification === 'undefined') {
        toast.error('Je browser ondersteunt geen meldingen');
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        toast.error('Meldingen zijn geblokkeerd in je browser');
        return;
      }
    }
    await updateSettings({ ...settings, notifications: on });
    toast.success(on ? 'Meldingen ingeschakeld' : 'Meldingen uitgeschakeld');
  }

  const sheetProduct =
    sheet.mode === 'edit' || sheet.mode === 'view'
      ? products.find((p) => p.id === sheet.id)
      : undefined;

  const openNew = () => setSheet({ mode: 'new' });

  return (
    <div className="min-h-dvh bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="size-5" />
            </div>
            <span className="text-lg font-semibold">Garantie</span>
          </div>
          <nav className="ml-6 hidden gap-1 md:flex">
            {TABS.map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                  tab === t.id
                    ? 'bg-muted font-medium'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <t.icon className="size-4" />
                {t.label}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Button onClick={openNew} className="hidden sm:inline-flex">
              <Plus className="size-4" /> Toevoegen
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 md:pb-10">
        {!loaded ? (
          <p className="py-20 text-center text-muted-foreground">Laden…</p>
        ) : tab === 'overzicht' ? (
          products.length === 0 ? (
            <EmptyState onAdd={openNew} onDemo={loadDemo} />
          ) : (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <StatCard
                  label="Actief"
                  value={stats.actief}
                  icon={CheckCircle2}
                  tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                  onClick={() => {
                    setStatusFilter('actief');
                    setTab('producten');
                  }}
                />
                <StatCard
                  label="Verloopt binnenkort"
                  value={stats.verloopt}
                  icon={AlertTriangle}
                  tone="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                  onClick={() => {
                    setStatusFilter('verloopt');
                    setTab('producten');
                  }}
                />
                <StatCard
                  label="Verlopen"
                  value={stats.verlopen}
                  icon={XCircle}
                  tone="bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                  onClick={() => {
                    setStatusFilter('verlopen');
                    setTab('producten');
                  }}
                />
                <StatCard
                  label="Open claims"
                  value={stats.openClaims}
                  icon={ListChecks}
                  tone="bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                  onClick={() => setTab('claims')}
                />
                <div className="col-span-2 lg:col-span-1">
                  <StatCard
                    label="Waarde onder garantie"
                    value={formatEuro(stats.value)}
                    icon={Wallet}
                    tone="bg-primary/10"
                  />
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <section className="rounded-xl border bg-card p-5 lg:col-span-2">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-semibold">Eerstvolgend verlopend</h2>
                    <Button variant="ghost" size="sm" onClick={() => setTab('producten')}>
                      Alles bekijken
                    </Button>
                  </div>
                  {upcoming.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Geen actieve garanties.
                    </p>
                  ) : (
                    <ul className="divide-y">
                      {upcoming.map((p) => {
                        const st = statusOf(p);
                        return (
                          <li key={p.id}>
                            <button
                              type="button"
                              onClick={() => setSheet({ mode: 'view', id: p.id })}
                              className="flex w-full items-center gap-3 py-3 text-left hover:opacity-80"
                            >
                              <span className={cn('size-2.5 shrink-0 rounded-full', statusBarColor[st])} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{p.name}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {[p.brand, p.store].filter(Boolean).join(' · ')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm tabular-nums">{formatDaysLeft(daysLeft(p))}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(expiryDate(p))}
                                </p>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>

                <section className="rounded-xl border bg-card p-5">
                  <h2 className="mb-4 font-semibold">Per categorie</h2>
                  <ul className="flex flex-col gap-3">
                    {byCategory.map(([cat, v]) => (
                      <li key={cat}>
                        <button
                          type="button"
                          className="w-full text-left"
                          onClick={() => {
                            setCategoryFilter(cat);
                            setStatusFilter('alle');
                            setTab('producten');
                          }}
                        >
                          <div className="flex justify-between text-sm">
                            <span>{cat}</span>
                            <span className="tabular-nums text-muted-foreground">
                              {v.count} · {formatEuro(v.value)}
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{
                                width: `${(v.count / (byCategory[0]?.[1].count || 1)) * 100}%`,
                              }}
                            />
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>

              <section className="rounded-xl border bg-card p-5 text-sm">
                <h2 className="mb-2 font-semibold">Goed om te weten</h2>
                <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                  <li>
                    Naast fabrieksgarantie heb je recht op <strong>wettelijke garantie</strong>:
                    een product moet de levensduur hebben die je redelijkerwijs mag verwachten.
                  </li>
                  <li>
                    In de eerste 12 maanden na aankoop moet de verkoper bewijzen dat een defect
                    níet al bij levering aanwezig was.
                  </li>
                  <li>Je kunt de verkoper aanspreken, niet alleen de fabrikant.</li>
                </ul>
              </section>
            </div>
          )
        ) : tab === 'producten' ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Zoek op naam, merk, serienummer, winkel…"
                  className="pl-9"
                  aria-label="Zoeken"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 md:flex">
                <select
                  aria-label="Status"
                  className={cn(selectClass, 'md:w-40')}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as WarrantyStatus | 'alle')}
                >
                  <option value="alle">Alle statussen</option>
                  <option value="actief">Actief</option>
                  <option value="verloopt">Verloopt binnenkort</option>
                  <option value="verlopen">Verlopen</option>
                </select>
                <select
                  aria-label="Categorie"
                  className={cn(selectClass, 'md:w-40')}
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="alle">Alle categorieën</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Sorteren"
                  className={cn(selectClass, 'md:w-40')}
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                >
                  <option value="vervaldatum">Vervaldatum</option>
                  <option value="naam">Naam</option>
                  <option value="aankoopdatum">Nieuwste aankoop</option>
                  <option value="prijs">Hoogste prijs</option>
                </select>
              </div>
              <label className="flex items-center gap-2 whitespace-nowrap px-1 text-sm">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                />
                Archief tonen
              </label>
            </div>

            {products.length === 0 ? (
              <EmptyState onAdd={openNew} onDemo={loadDemo} />
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                Geen producten gevonden.{' '}
                <button
                  type="button"
                  className="underline"
                  onClick={() => {
                    setQuery('');
                    setStatusFilter('alle');
                    setCategoryFilter('alle');
                  }}
                >
                  Filters wissen
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {filtered.length} product{filtered.length === 1 ? '' : 'en'}
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      status={statusOf(p)}
                      onClick={() => setSheet({ mode: 'view', id: p.id })}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : tab === 'claims' ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {(['alle', ...Object.keys(CLAIM_STATUS_LABELS)] as (ClaimStatus | 'alle')[]).map(
                (s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setClaimFilter(s)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm transition-colors',
                      claimFilter === s
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'bg-card hover:bg-muted',
                    )}
                  >
                    {s === 'alle' ? 'Alle' : CLAIM_STATUS_LABELS[s]}
                  </button>
                ),
              )}
            </div>
            {allClaims.length === 0 ? (
              <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
                Geen claims. Open een product en kies &quot;+ Claim&quot; om een
                garantiemelding te registreren.
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {allClaims.map(({ claim, product }: { claim: Claim; product: Product }) => (
                  <li key={claim.id}>
                    <button
                      type="button"
                      onClick={() => setSheet({ mode: 'view', id: product.id })}
                      className="flex w-full flex-col gap-1 rounded-xl border bg-card p-4 text-left hover:bg-muted/40"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{product.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(claim.date)}
                        </span>
                      </div>
                      <p className="text-sm">{claim.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {CLAIM_STATUS_LABELS[claim.status]}
                        {claim.reference && ` · ${claim.reference}`}
                        {claim.resolution && ` · ${claim.resolution}`}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-6">
            <section className="flex flex-col gap-4 rounded-xl border bg-card p-5">
              <h2 className="font-semibold">Waarschuwingen</h2>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="warn">
                  &quot;Verloopt binnenkort&quot; vanaf {settings.warningDays} dagen voor het einde
                </Label>
                <input
                  id="warn"
                  type="range"
                  min={7}
                  max={180}
                  step={1}
                  value={settings.warningDays}
                  onChange={(e) =>
                    updateSettings({ ...settings, warningDays: Number(e.target.value) })
                  }
                />
              </div>
              <label className="flex items-center justify-between gap-4 text-sm">
                <span className="flex items-center gap-2">
                  <Bell className="size-4" /> Browsermelding als een garantie bijna verloopt
                </span>
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) => toggleNotifications(e.target.checked)}
                />
              </label>
              <Button
                variant="outline"
                className="w-fit"
                onClick={() =>
                  downloadFile(
                    'garantie-vervaldatums.ics',
                    productsToIcs(active, settings.warningDays),
                    'text/calendar',
                  )
                }
                disabled={active.length === 0}
              >
                <CalendarPlus className="size-4" /> Vervaldatums naar agenda (.ics)
              </Button>
            </section>

            <section className="flex flex-col gap-4 rounded-xl border bg-card p-5">
              <h2 className="font-semibold">Gegevens</h2>
              <p className="text-sm text-muted-foreground">
                Alles wordt lokaal in deze browser opgeslagen. Maak regelmatig een backup,
                zeker voordat je je browsergegevens wist of van apparaat wisselt.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={exportJson} disabled={products.length === 0}>
                  <FileJson className="size-4" /> Backup exporteren
                </Button>
                <Button variant="outline" onClick={() => importRef.current?.click()}>
                  <Upload className="size-4" /> Backup importeren
                </Button>
                <Button
                  variant="outline"
                  disabled={products.length === 0}
                  onClick={() =>
                    downloadFile(
                      `garantie-overzicht-${new Date().toISOString().slice(0, 10)}.csv`,
                      productsToCsv(products),
                      'text/csv;charset=utf-8',
                    )
                  }
                >
                  <FileSpreadsheet className="size-4" /> Exporteren naar Excel (CSV)
                </Button>
                <Button variant="outline" onClick={() => window.print()} disabled={products.length === 0}>
                  <Download className="size-4" /> Afdrukken / PDF
                </Button>
                <input
                  ref={importRef}
                  type="file"
                  accept="application/json,.json"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) importJson(f);
                    e.target.value = '';
                  }}
                />
              </div>
            </section>

            <section className="flex flex-col gap-3 rounded-xl border border-red-200 bg-card p-5 dark:border-red-900">
              <h2 className="font-semibold text-red-600">Gevarenzone</h2>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={loadDemo}>
                  Voorbeelddata toevoegen
                </Button>
                <Button
                  variant="destructive"
                  disabled={products.length === 0}
                  onClick={async () => {
                    if (!confirm('Alle producten, bonnen en claims definitief verwijderen?')) return;
                    await replaceAllProducts([]);
                    setProducts([]);
                    toast.success('Alle gegevens verwijderd');
                  }}
                >
                  <Trash2 className="size-4" /> Alles verwijderen
                </Button>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {TABS.slice(0, 2).map((t) => (
            <MobileTab key={t.id} tab={t} active={tab === t.id} onClick={() => setTab(t.id)} />
          ))}
          <button
            type="button"
            onClick={openNew}
            aria-label="Product toevoegen"
            className="flex items-center justify-center"
          >
            <span className="flex size-12 -translate-y-3 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
              <Plus className="size-6" />
            </span>
          </button>
          {TABS.slice(2).map((t) => (
            <MobileTab key={t.id} tab={t} active={tab === t.id} onClick={() => setTab(t.id)} />
          ))}
        </div>
      </nav>

      <Sheet
        open={sheet.mode !== 'closed'}
        onOpenChange={(open) => !open && setSheet({ mode: 'closed' })}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {sheet.mode === 'new' || (sheet.mode === 'edit' && sheetProduct) ? (
            <>
              <SheetHeader className="mb-6">
                <SheetTitle>
                  {sheet.mode === 'new' ? 'Product toevoegen' : 'Product bewerken'}
                </SheetTitle>
                <SheetDescription>
                  Vul de gegevens van je aankoop en garantie in.
                </SheetDescription>
              </SheetHeader>
              <ProductForm
                key={sheet.mode === 'edit' ? sheet.id : 'new'}
                initial={sheet.mode === 'edit' ? sheetProduct : sheet.template}
                onCancel={() =>
                  setSheet(
                    sheet.mode === 'edit' ? { mode: 'view', id: sheet.id } : { mode: 'closed' },
                  )
                }
                onSave={async (p) => {
                  await upsert(p);
                  toast.success(sheet.mode === 'new' ? 'Product toegevoegd' : 'Wijzigingen opgeslagen');
                  setSheet({ mode: 'view', id: p.id });
                }}
              />
            </>
          ) : sheet.mode === 'view' && sheetProduct ? (
            <>
              <SheetHeader className="mb-6 pr-6">
                <SheetTitle className="text-xl">{sheetProduct.name}</SheetTitle>
                <SheetDescription>
                  {[sheetProduct.brand, sheetProduct.model].filter(Boolean).join(' · ') ||
                    sheetProduct.category}
                </SheetDescription>
              </SheetHeader>
              <ProductDetail
                product={sheetProduct}
                warningDays={settings.warningDays}
                onEdit={() => setSheet({ mode: 'edit', id: sheetProduct.id })}
                onUpdate={(p) => upsert(p)}
                onDelete={() => remove(sheetProduct.id)}
                onDuplicate={() =>
                  setSheet({
                    mode: 'new',
                    template: {
                      ...sheetProduct,
                      id: crypto.randomUUID(),
                      name: `${sheetProduct.name} (kopie)`,
                      serialNumber: undefined,
                      attachments: [],
                      claims: [],
                      archived: false,
                      createdAt: new Date().toISOString(),
                    },
                  })
                }
              />
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function MobileTab({
  tab,
  active,
  onClick,
}: {
  tab: (typeof TABS)[number];
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-0.5 py-2 text-[11px]',
        active ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      <tab.icon className="size-5" />
      {tab.label}
    </button>
  );
}
