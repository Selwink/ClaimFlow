import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Claim, Instellingen, Rol, Status } from "../lib/types";
import { STATUS_LABEL } from "../lib/types";
import { bewaarClaims, bewaarInstellingen, haalAlles, pas, REMOTE, Uitgelogd, verwijderClaim, type PasInfo } from "../lib/api";
import { INST_STANDAARD, leesInstellingen } from "../lib/instellingen";
import { metRegel, metStatus, statusVan } from "../lib/claims";
import { ls, meervoud, vandaag } from "../lib/format";
import { mailNotitie, mailStatus, verstuurWachtrij } from "../lib/mail";
import { useToast } from "./Toast";

/** Pre-2026-11 sessions stored a password hash here; it is no longer accepted and is cleaned up. */
const OUDE_SLEUTEL = "garanties-meppel-toegang";
/** Login-screen figures from an earlier design; no longer kept on the device. */
const OUDE_TELLER = "claimflow-teller";
const VERVERS_MS = 90_000;
const SLEUTEL_NAAM = "claimregister-naam";
const SLEUTEL_CACHE = "claimflow-cache";

function geldigeRol(): Rol | null {
  const p = pas.get();
  return p && p.verloopt > Date.now() ? p.rol : null;
}

interface StoreWaarde {
  rol: Rol | null;
  magBewerken: boolean;
  /** Name of the logged-in account; used in the timeline. */
  naam: string;
  /** Call after a successful login, sign-up or password change. */
  naInloggen: (p: PasInfo) => void;
  uitloggen: () => void;

  claims: Claim[];
  actief: Claim[];
  prullenbak: Claim[];
  inst: Instellingen;
  geladen: boolean;
  online: boolean;
  syncTijd?: number;
  vernieuw: () => Promise<void>;

  bewaar: (claims: Claim[], melding?: string, terug?: Claim[] | { verwijder: string }) => Promise<boolean>;
  zetStatus: (ids: string[], naar: Status) => Promise<void>;
  notitie: (id: string, tekst: string, naar?: Status) => Promise<void>;
  naarPrullenbak: (ids: string[]) => Promise<void>;
  terugzetten: (id: string) => Promise<void>;
  definitiefWeg: (id: string) => Promise<void>;
  bewaarInst: (i: Instellingen) => Promise<void>;
}

const StoreContext = createContext<StoreWaarde | null>(null);
export function useStore() {
  const s = useContext(StoreContext);
  if (!s) throw new Error("useStore buiten StoreProvider");
  return s;
}

const kopie = (c: Claim): Claim => JSON.parse(JSON.stringify(c));

export function StoreProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [rol, setRol] = useState<Rol | null>(() => { ls.del(OUDE_SLEUTEL); ls.del(OUDE_TELLER); return geldigeRol(); });
  const magBewerken = rol === "beheer";
  const [naam, setNaam] = useState(() => pas.get()?.naam || "");
  const cache = ls.json<{ claims: Claim[]; inst: Instellingen; tijd: number }>(SLEUTEL_CACHE);
  const [claims, setClaims] = useState<Claim[]>(cache?.claims || []);
  const [inst, setInst] = useState<Instellingen>(cache?.inst ? leesInstellingen(cache.inst) : INST_STANDAARD);
  const instRef = useRef(inst);
  instRef.current = inst;
  const [geladen, setGeladen] = useState(!!cache);
  const [online, setOnline] = useState(true);
  const [syncTijd, setSyncTijd] = useState<number | undefined>(cache?.tijd);
  const claimsRef = useRef(claims);
  claimsRef.current = claims;

  const schrijfCache = (c: Claim[], i: Instellingen) => ls.set(SLEUTEL_CACHE, JSON.stringify({ claims: c, inst: i, tijd: Date.now() }));

  const vernieuw = useCallback(async () => {
    if (!REMOTE) { setGeladen(true); return; }
    try {
      const { claims: c, inst: i, rol: r, naam: n } = await haalAlles();
      setRol(r);
      setNaam(n);
      const p = pas.get();
      if (p && (p.rol !== r || p.naam !== n)) pas.zet({ ...p, rol: r, naam: n });
      setClaims(c);
      const nieuweInst = i || INST_STANDAARD;
      setInst(nieuweInst);
      setOnline(true);
      setSyncTijd(Date.now());
      schrijfCache(c, nieuweInst);
    } catch (e) {
      if (e instanceof Uitgelogd) { ls.del(SLEUTEL_CACHE); setRol(null); setClaims([]); }
      else setOnline(false);
    } finally {
      setGeladen(true);
    }
  }, []);

  useEffect(() => {
    if (!rol) return;
    void vernieuw();
    const t = window.setInterval(() => { if (!document.hidden) void vernieuw(); }, VERVERS_MS);
    const zicht = () => { if (!document.hidden) void vernieuw(); };
    document.addEventListener("visibilitychange", zicht);
    void verstuurWachtrij().then((n) => { if (n) toast(`${meervoud(n, "uitgestelde e-mail", "uitgestelde e-mails")} alsnog verstuurd`); });
    return () => { window.clearInterval(t); document.removeEventListener("visibilitychange", zicht); };
  }, [rol, vernieuw, toast]);

  const bewaar = useCallback<StoreWaarde["bewaar"]>(async (lijst, melding, terug) => {
    if (!magBewerken) { toast("Alleen een beheerder kan dit wijzigen"); return false; }
    const nu = vandaag();
    const bijgewerkt = lijst.map((c) => ({ ...c, bijgewerkt: nu }));
    setClaims((oud) => {
      const m = new Map(oud.map((c) => [c.id, c]));
      bijgewerkt.forEach((c) => m.set(c.id, c));
      return [...m.values()];
    });
    const ongedaan = terug ? {
      label: "Ongedaan maken",
      doe: () => {
        if (Array.isArray(terug)) void bewaarRef.current(terug, "Teruggedraaid");
        else void verwijderRef.current(terug.verwijder, true);
      },
    } : undefined;
    try {
      if (REMOTE) await bewaarClaims(bijgewerkt);
      if (melding) toast(melding, ongedaan);
      void vernieuw();
      return true;
    } catch (e) {
      toast(e instanceof Uitgelogd ? "Je bent uitgelogd — log opnieuw in" : e instanceof Error && /beheerder/.test(e.message) ? e.message : "Opslaan mislukt — controleer je verbinding");
      void vernieuw();
      return false;
    }
  }, [magBewerken, toast, vernieuw]);
  const bewaarRef = useRef(bewaar);
  bewaarRef.current = bewaar;

  const definitiefWeg = useCallback(async (id: string, stil?: boolean) => {
    if (!magBewerken) return;
    setClaims((oud) => oud.filter((c) => c.id !== id));
    try {
      if (REMOTE) await verwijderClaim(id);
      if (!stil) toast("Definitief verwijderd");
    } catch { toast("Verwijderen mislukt"); }
    void vernieuw();
  }, [magBewerken, toast, vernieuw]);
  const verwijderRef = useRef(definitiefWeg);
  verwijderRef.current = definitiefWeg;

  const vind = (ids: string[]) => ids.map((id) => claimsRef.current.find((c) => c.id === id)).filter(Boolean) as Claim[];

  const zetStatus = useCallback(async (ids: string[], naar: Status) => {
    const voor = vind(ids).filter((c) => statusVan(c) !== naar);
    if (!voor.length) return;
    const ok = await bewaar(voor.map((c) => metStatus(kopie(c), naar, naam)),
      `${voor.length === 1 ? "Claim" : `${voor.length} claims`} op ${STATUS_LABEL[naar].toLowerCase()} gezet`, voor.map(kopie));
    if (ok && instRef.current.mail) void mailStatus(voor, STATUS_LABEL[naar], naam);
  }, [bewaar, naam]);

  const notitie = useCallback(async (id: string, tekst: string, naar?: Status) => {
    const [c] = vind([id]);
    if (!c) return;
    let n = kopie(c);
    if (tekst) n = metRegel(n, tekst, naam);
    if (naar) n = metStatus(n, naar, naam);
    const ok = await bewaar([n], "Notitie toegevoegd", [kopie(c)]);
    if (ok && instRef.current.mail) {
      if (tekst) void mailNotitie(n, tekst, naam);
      if (naar && statusVan(c) !== naar) void mailStatus([n], STATUS_LABEL[naar], naam);
    }
  }, [bewaar, naam]);

  const naarPrullenbak = useCallback(async (ids: string[]) => {
    const voor = vind(ids);
    await bewaar(voor.map((c) => ({ ...metRegel(kopie(c), "Naar de prullenbak", naam), verwijderd: vandaag() })),
      `${voor.length === 1 ? "Claim" : `${voor.length} claims`} naar de prullenbak`, voor.map(kopie));
  }, [bewaar, naam]);

  const terugzetten = useCallback(async (id: string) => {
    const [c] = vind([id]);
    if (c) await bewaar([{ ...metRegel(kopie(c), "Teruggezet uit de prullenbak", naam), verwijderd: null }], "Claim teruggezet");
  }, [bewaar, naam]);

  const bewaarInst = useCallback(async (i: Instellingen) => {
    if (!magBewerken) return;
    setInst(i);
    try { if (REMOTE) await bewaarInstellingen(i); toast("Instellingen opgeslagen"); }
    catch { toast("Opslaan mislukt"); }
  }, [magBewerken, toast]);

  const naInloggen = useCallback((p: PasInfo) => { setRol(p.rol); setNaam(p.naam); ls.del(SLEUTEL_NAAM); }, []);
  const uitloggen = useCallback(() => { pas.wis(); ls.del(SLEUTEL_CACHE); setRol(null); setClaims([]); }, []);

  const actief = useMemo(() => claims.filter((c) => !c.verwijderd), [claims]);
  const prullenbak = useMemo(() => claims.filter((c) => c.verwijderd), [claims]);

  const waarde: StoreWaarde = {
    rol, magBewerken, naam, naInloggen, uitloggen,
    claims, actief, prullenbak, inst, geladen, online: online && REMOTE, syncTijd, vernieuw,
    bewaar, zetStatus, notitie, naarPrullenbak, terugzetten, definitiefWeg: (id) => definitiefWeg(id), bewaarInst,
  };
  return <StoreContext.Provider value={waarde}>{children}</StoreContext.Provider>;
}
