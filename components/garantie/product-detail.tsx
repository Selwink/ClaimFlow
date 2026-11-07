'use client';

import { useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  Copy,
  Download,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  CLAIM_STATUS_LABELS,
  type Claim,
  type ClaimStatus,
  type Product,
} from '@/lib/garantie/types';
import {
  daysLeft,
  expiryDate,
  formatDate,
  formatDaysLeft,
  formatEuro,
  standardExpiryDate,
  warrantyProgress,
  warrantyStatus,
} from '@/lib/garantie/utils';
import { StatusBadge, statusBarColor } from './status-badge';
import { selectClass } from './product-form';

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium break-all">{value}</dd>
    </div>
  );
}

const claimStatusStyle: Record<ClaimStatus, string> = {
  open: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300',
  in_behandeling:
    'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  afgerond:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  afgewezen: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
};

function ClaimEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Claim;
  onSave: (c: Claim) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(
    initial?.date ?? new Date().toISOString().slice(0, 10),
  );
  const [description, setDescription] = useState(initial?.description ?? '');
  const [status, setStatus] = useState<ClaimStatus>(initial?.status ?? 'open');
  const [reference, setReference] = useState(initial?.reference ?? '');
  const [resolution, setResolution] = useState(initial?.resolution ?? '');
  const [cost, setCost] = useState(
    initial?.cost !== undefined ? String(initial.cost) : '',
  );

  return (
    <form
      className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!description.trim()) {
          toast.error('Beschrijf het probleem');
          return;
        }
        const c = cost.trim() ? Number(cost.replace(',', '.')) : undefined;
        onSave({
          id: initial?.id ?? crypto.randomUUID(),
          date,
          description: description.trim(),
          status,
          reference: reference.trim() || undefined,
          resolution: resolution.trim() || undefined,
          cost: c !== undefined && !Number.isNaN(c) ? c : undefined,
        });
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="c-date">Datum melding</Label>
          <Input id="c-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="c-status">Status</Label>
          <select
            id="c-status"
            className={selectClass}
            value={status}
            onChange={(e) => setStatus(e.target.value as ClaimStatus)}
          >
            {Object.entries(CLAIM_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="c-desc">Probleem / defect *</Label>
        <Textarea
          id="c-desc"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="c-ref">Dossier-/RMA-nummer</Label>
          <Input id="c-ref" value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="c-cost">Kosten (€)</Label>
          <Input
            id="c-cost"
            inputMode="decimal"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="0,00"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="c-res">Oplossing / uitkomst</Label>
        <Input
          id="c-res"
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          placeholder="Bijv. gerepareerd, vervangen, geld terug"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Annuleren
        </Button>
        <Button type="submit" size="sm">
          Claim opslaan
        </Button>
      </div>
    </form>
  );
}

export function ProductDetail({
  product,
  warningDays,
  onEdit,
  onUpdate,
  onDelete,
  onDuplicate,
}: {
  product: Product;
  warningDays: number;
  onEdit: () => void;
  onUpdate: (p: Product) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const [editingClaim, setEditingClaim] = useState<Claim | 'new' | null>(null);
  const status = warrantyStatus(product, warningDays);
  const days = daysLeft(product);
  const progress = warrantyProgress(product);

  function saveClaim(c: Claim) {
    const exists = product.claims.some((x) => x.id === c.id);
    const claims = exists
      ? product.claims.map((x) => (x.id === c.id ? c : x))
      : [c, ...product.claims];
    onUpdate({ ...product, claims, updatedAt: new Date().toISOString() });
    setEditingClaim(null);
    toast.success(exists ? 'Claim bijgewerkt' : 'Claim toegevoegd');
  }

  function removeClaim(id: string) {
    if (!confirm('Deze claim verwijderen?')) return;
    onUpdate({
      ...product,
      claims: product.claims.filter((c) => c.id !== id),
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Status */}
      <div className="rounded-xl border p-4">
        <div className="flex items-center justify-between gap-2">
          <StatusBadge status={status} />
          <span className="text-sm font-medium">{formatDaysLeft(days)}</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${statusBarColor[status]}`}
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{formatDate(product.purchaseDate)}</span>
          <span>{formatDate(expiryDate(product))}</span>
        </div>
        {status === 'verlopen' && (
          <p className="mt-3 rounded-md bg-muted p-3 text-xs text-muted-foreground">
            Fabrieksgarantie verlopen? In Nederland en België heb je vaak nog
            recht op <strong>wettelijke garantie (conformiteit)</strong>: een
            product moet zo lang meegaan als je redelijkerwijs mag verwachten.
            Neem contact op met de verkoper.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onEdit}>
          <Pencil className="size-4" /> Bewerken
        </Button>
        <Button size="sm" variant="outline" onClick={onDuplicate}>
          <Copy className="size-4" /> Dupliceren
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            onUpdate({
              ...product,
              archived: !product.archived,
              updatedAt: new Date().toISOString(),
            })
          }
        >
          {product.archived ? (
            <>
              <ArchiveRestore className="size-4" /> Terugzetten
            </>
          ) : (
            <>
              <Archive className="size-4" /> Archiveren
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-red-600 hover:text-red-700"
          onClick={onDelete}
        >
          <Trash2 className="size-4" /> Verwijderen
        </Button>
      </div>

      {/* Details */}
      <dl className="divide-y rounded-xl border px-4">
        <Row label="Categorie" value={product.category} />
        <Row label="Merk" value={product.brand} />
        <Row label="Model" value={product.model} />
        <Row
          label="Serienummer"
          value={
            product.serialNumber && (
              <button
                type="button"
                className="underline decoration-dotted"
                title="Kopiëren"
                onClick={() => {
                  navigator.clipboard?.writeText(product.serialNumber ?? '');
                  toast.success('Serienummer gekopieerd');
                }}
              >
                {product.serialNumber}
              </button>
            )
          }
        />
        <Row label="Aankoopdatum" value={formatDate(product.purchaseDate)} />
        <Row
          label="Prijs"
          value={product.price !== undefined ? formatEuro(product.price) : undefined}
        />
        <Row label="Winkel" value={product.store} />
        <Row label="Ordernummer" value={product.orderNumber} />
        <Row label="Contact" value={product.storeContact} />
        <Row
          label="Fabrieksgarantie"
          value={`${product.warrantyMonths} mnd (t/m ${formatDate(standardExpiryDate(product))})`}
        />
        {product.extendedWarrantyMonths ? (
          <Row
            label="Extra garantie"
            value={`${product.extendedWarrantyMonths} mnd${
              product.extendedWarrantyProvider
                ? ` via ${product.extendedWarrantyProvider}`
                : ''
            }`}
          />
        ) : null}
      </dl>

      {product.notes && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Notities</h3>
          <p className="whitespace-pre-wrap rounded-xl border p-4 text-sm">
            {product.notes}
          </p>
        </div>
      )}

      {/* Attachments */}
      <div>
        <h3 className="mb-2 text-sm font-semibold">
          Bonnen & documenten ({product.attachments.length})
        </h3>
        {product.attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nog geen documenten. Voeg via &quot;Bewerken&quot; een kassabon of
            factuur toe.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {product.attachments.map((a) => (
              <a
                key={a.id}
                href={a.data}
                download={a.name}
                className="group flex flex-col overflow-hidden rounded-lg border text-xs hover:ring-2 hover:ring-ring"
              >
                {a.type.startsWith('image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.data} alt={a.name} className="aspect-square w-full object-cover" />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center bg-muted text-lg font-semibold text-muted-foreground">
                    PDF
                  </div>
                )}
                <span className="flex items-center gap-1 truncate p-2">
                  <Download className="size-3 shrink-0" />
                  <span className="truncate">{a.name}</span>
                </span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Claims */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            Garantieclaims ({product.claims.length})
          </h3>
          {editingClaim === null && (
            <Button size="sm" variant="outline" onClick={() => setEditingClaim('new')}>
              <Plus className="size-4" /> Claim
            </Button>
          )}
        </div>
        {editingClaim === 'new' && (
          <ClaimEditor onSave={saveClaim} onCancel={() => setEditingClaim(null)} />
        )}
        {product.claims.length === 0 && editingClaim === null && (
          <p className="text-sm text-muted-foreground">
            Geen claims. Gaat er iets kapot? Registreer hier je melding en houd
            de status bij.
          </p>
        )}
        <ul className="mt-3 flex flex-col gap-3">
          {product.claims.map((c) =>
            editingClaim !== 'new' && editingClaim?.id === c.id ? (
              <li key={c.id}>
                <ClaimEditor
                  initial={c}
                  onSave={saveClaim}
                  onCancel={() => setEditingClaim(null)}
                />
              </li>
            ) : (
              <li key={c.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <span
                      className={`w-fit rounded-full px-2 py-0.5 text-xs font-medium ${claimStatusStyle[c.status]}`}
                    >
                      {CLAIM_STATUS_LABELS[c.status]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(c.date)}
                      {c.reference && ` · ${c.reference}`}
                      {c.cost !== undefined && ` · ${formatEuro(c.cost)}`}
                    </span>
                  </div>
                  <div className="flex">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Claim bewerken"
                      onClick={() => setEditingClaim(c)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Claim verwijderen"
                      onClick={() => removeClaim(c.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap">{c.description}</p>
                {c.resolution && (
                  <p className="mt-1 text-muted-foreground">
                    Uitkomst: {c.resolution}
                  </p>
                )}
              </li>
            ),
          )}
        </ul>
      </div>
    </div>
  );
}
