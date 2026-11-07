'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Paperclip, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  CATEGORIES,
  type Attachment,
  type Category,
  type Product,
} from '@/lib/garantie/types';
import { formatBytes, readFileAsDataUrl } from '@/lib/garantie/utils';

const MAX_FILE_BYTES = 8 * 1024 * 1024;

export const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

function Field({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const WARRANTY_PRESETS = [6, 12, 24, 36, 60];

export function ProductForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Product;
  onSave: (p: Product) => void | Promise<void>;
  onCancel: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState(initial?.name ?? '');
  const [brand, setBrand] = useState(initial?.brand ?? '');
  const [model, setModel] = useState(initial?.model ?? '');
  const [serialNumber, setSerialNumber] = useState(initial?.serialNumber ?? '');
  const [category, setCategory] = useState<Category>(
    initial?.category ?? 'Elektronica',
  );
  const [store, setStore] = useState(initial?.store ?? '');
  const [storeContact, setStoreContact] = useState(initial?.storeContact ?? '');
  const [orderNumber, setOrderNumber] = useState(initial?.orderNumber ?? '');
  const [purchaseDate, setPurchaseDate] = useState(
    initial?.purchaseDate ?? today,
  );
  const [price, setPrice] = useState(
    initial?.price !== undefined ? String(initial.price) : '',
  );
  const [warrantyMonths, setWarrantyMonths] = useState(
    String(initial?.warrantyMonths ?? 24),
  );
  const [extendedWarrantyMonths, setExtendedWarrantyMonths] = useState(
    initial?.extendedWarrantyMonths ? String(initial.extendedWarrantyMonths) : '',
  );
  const [extendedWarrantyProvider, setExtendedWarrantyProvider] = useState(
    initial?.extendedWarrantyProvider ?? '',
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [attachments, setAttachments] = useState<Attachment[]>(
    initial?.attachments ?? [],
  );
  const [saving, setSaving] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const added: Attachment[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_BYTES) {
        toast.error(`${file.name} is groter dan 8 MB`);
        continue;
      }
      added.push({
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        size: file.size,
        data: await readFileAsDataUrl(file),
        addedAt: new Date().toISOString(),
      });
    }
    setAttachments((a) => [...a, ...added]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Vul een productnaam in');
      return;
    }
    const months = Number(warrantyMonths);
    if (!Number.isFinite(months) || months < 0) {
      toast.error('Ongeldige garantieduur');
      return;
    }
    const priceNum = price.trim()
      ? Number(price.replace(',', '.'))
      : undefined;
    if (priceNum !== undefined && Number.isNaN(priceNum)) {
      toast.error('Ongeldige prijs');
      return;
    }
    const now = new Date().toISOString();
    const ext = Number(extendedWarrantyMonths);
    setSaving(true);
    try {
      await onSave({
        id: initial?.id ?? crypto.randomUUID(),
        name: name.trim(),
        brand: brand.trim() || undefined,
        model: model.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        category,
        store: store.trim() || undefined,
        storeContact: storeContact.trim() || undefined,
        orderNumber: orderNumber.trim() || undefined,
        purchaseDate,
        price: priceNum,
        warrantyMonths: months,
        extendedWarrantyMonths: ext > 0 ? ext : undefined,
        extendedWarrantyProvider:
          ext > 0 ? extendedWarrantyProvider.trim() || undefined : undefined,
        notes: notes.trim() || undefined,
        attachments,
        claims: initial?.claims ?? [],
        archived: initial?.archived ?? false,
        createdAt: initial?.createdAt ?? now,
        updatedAt: now,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Product
        </h3>
        <Field label="Productnaam *" htmlFor="name">
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Bijv. Wasmachine"
            autoFocus
            required
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Merk" htmlFor="brand">
            <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
          </Field>
          <Field label="Model / type" htmlFor="model">
            <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} />
          </Field>
          <Field label="Serienummer" htmlFor="serial">
            <Input
              id="serial"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
            />
          </Field>
          <Field label="Categorie" htmlFor="category">
            <select
              id="category"
              className={selectClass}
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Aankoop
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Aankoopdatum *" htmlFor="date">
            <Input
              id="date"
              type="date"
              value={purchaseDate}
              max={today}
              onChange={(e) => setPurchaseDate(e.target.value)}
              required
            />
          </Field>
          <Field label="Prijs (€)" htmlFor="price">
            <Input
              id="price"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0,00"
            />
          </Field>
          <Field label="Winkel" htmlFor="store">
            <Input id="store" value={store} onChange={(e) => setStore(e.target.value)} />
          </Field>
          <Field label="Ordernummer / bonnummer" htmlFor="order">
            <Input
              id="order"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
            />
          </Field>
        </div>
        <Field
          label="Contact winkel / klantenservice"
          htmlFor="contact"
          hint="Telefoonnummer, e-mail of website"
        >
          <Input
            id="contact"
            value={storeContact}
            onChange={(e) => setStoreContact(e.target.value)}
          />
        </Field>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Garantie
        </h3>
        <Field label="Fabrieksgarantie (maanden) *" htmlFor="months">
          <div className="flex flex-col gap-2">
            <Input
              id="months"
              type="number"
              min={0}
              value={warrantyMonths}
              onChange={(e) => setWarrantyMonths(e.target.value)}
              required
            />
            <div className="flex flex-wrap gap-2">
              {WARRANTY_PRESETS.map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setWarrantyMonths(String(m))}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    Number(warrantyMonths) === m
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  {m < 12 ? `${m} mnd` : `${m / 12} jaar`}
                </button>
              ))}
            </div>
          </div>
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Extra / verlengde garantie (maanden)" htmlFor="ext">
            <Input
              id="ext"
              type="number"
              min={0}
              value={extendedWarrantyMonths}
              onChange={(e) => setExtendedWarrantyMonths(e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="Aanbieder extra garantie" htmlFor="extprov">
            <Input
              id="extprov"
              value={extendedWarrantyProvider}
              onChange={(e) => setExtendedWarrantyProvider(e.target.value)}
              disabled={!(Number(extendedWarrantyMonths) > 0)}
            />
          </Field>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Bonnen & documenten
        </h3>
        <label
          htmlFor="files"
          className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-6 text-center text-sm text-muted-foreground transition-colors hover:bg-muted/50"
        >
          <Paperclip className="size-5" />
          <span>Kassabon, factuur of garantiebewijs toevoegen</span>
          <span className="text-xs">Afbeelding of PDF, max. 8 MB per bestand</span>
          <input
            id="files"
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="sr-only"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
        {attachments.length > 0 && (
          <ul className="flex flex-col gap-2">
            {attachments.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-3 rounded-md border p-2 text-sm"
              >
                {a.type.startsWith('image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.data} alt="" className="size-10 rounded object-cover" />
                ) : (
                  <div className="flex size-10 items-center justify-center rounded bg-muted text-xs font-medium">
                    PDF
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(a.size)}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Verwijder ${a.name}`}
                  onClick={() =>
                    setAttachments((list) => list.filter((x) => x.id !== a.id))
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Field label="Notities" htmlFor="notes">
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Bijv. waar de doos ligt, voorwaarden, accessoires…"
        />
      </Field>

      <div className="sticky bottom-0 -mx-6 flex justify-end gap-2 border-t bg-background px-6 py-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuleren
        </Button>
        <Button type="submit" disabled={saving}>
          {initial ? 'Opslaan' : 'Product toevoegen'}
        </Button>
      </div>
    </form>
  );
}
