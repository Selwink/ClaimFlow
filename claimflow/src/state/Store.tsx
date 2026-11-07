import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Claim, Instellingen, Rol, Status } from "../lib/types";
import { STATUS_LABEL } from "../lib/types";
import { CONFIG } from "../lib/config";
import { bewaarClaims, bewaarInstellingen, haalAlles, INST_STANDAARD, leesInstellingen, REMOTE, verwijderClaim } from "../lib/api";
import { metRegel, metStatus, statusVan } from "../lib/claims";
import { ls, meervoud, sha256, vandaag } from "../lib/format";
import { verstuurWachtrij } from "../lib/mail";
import { useToast } from "./Toast";

const SLEUTEL_PW = "garanties-meppel-toegang";
const SLEUTEL_NAAM = "claimregister-naam";
const SLEUTEL_CACHE = "claimflow-cache";

function bepaalRol(hash: string | null): Rol | null {
  if (!CONFIG.WACHTWOORD_HASH && !CONFIG.BEHEER_HASH) return "beheer";
  if (hash && CONFIG.BEHEER_HASH && hash === CONFIG.BEHEER_HASH) return "beheer";
  if (hash && hash === CONFIG.WACHTWOORD_HASH) return CONFIG.BEHEER_HASH ? "kijken" : "beheer";
  return null;
}

interface StoreWaarde {
  rol: Rol | null;
  magBewerken: boolean;
  naam: string;
  setNaam: (n: string) => void;
  login: (wachtwoord: string) => Promise<boolean>;
  loginBeheer: (wachtwoord: string) => Promise<boolean>;
  naarKijken: () => void;
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
  const [hash, setHash] = useState<string | null>(() => ls.get(SLEUTEL_PW));
  const rol = bepaalRol(hash);
  const magBewerken = rol === "beheer";
  const [naam, setNaamState] = useState(() => ls.get(SLEUTEL_NAAM) || "");
  const cache = ls.json<{ claims: Claim[]; inst: Instellingen; tijd: number }>(SLEUTEL_CACHE);
  const [claims, setClaims] = useState<Claim[]>(cache?.claims || []);
  const [inst, setInst] = useState<Instellingen>(cache?.inst ? leesInstellingen(cache.inst) : INST_STANDAARD);
  const [geladen, setGeladen] = useState(!!cache);
  const [online, setOnline] = useState(true);
  const [syncTijd, setSyncTijd] = useState<number | undefined>(cache?.tijd);
  const claimsRef = useRef(claims);
  claimsRef.current = claims;

  const schrijfCache = (c: Claim[], i: Instellingen) => ls.set(SLEUTEL_CACHE, JSON.stringify({ claims: c, inst: i, tijd: Date.now() }));

  const vernieuw = useCallback(async () => {
    if (!REMOTE) { setGeladen(true); return; }
    try {
      const { claims: c, inst: i } = await haalAlles();
      setClaims(c);
      const nieuweInst = i || INST_STANDAARD;
      setInst(nieuweInst);
      setOnline(true);
      setSyncTijd(Date.now());
      schrijfCache(c, nieuweInst);
    } catch {
      setOnline(false);
    } finally {
      setGeladen(true);
    }
  }, []);

  useEffect(() => {
    if (!rol) return;
    void vernieuw();
    const t = window.setInterval(() => { if (!document.hidden) void vernieuw(); }, 20000);
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
    } catch {
      toast("Opslaan mislukt — controleer je verbinding");
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
    await bewaar(voor.map((c) => metStatus(kopie(c), naar, naam)),
      `${voor.length === 1 ? "Claim" : `${voor.length} claims`} op ${STATUS_LABEL[naar].toLowerCase()} gezet`, voor.map(kopie));
  }, [bewaar, naam]);

  const notitie = useCallback(async (id: string, tekst: string, naar?: Status) => {
    const [c] = vind([id]);
    if (!c) return;
    let n = kopie(c);
    if (tekst) n = metRegel(n, tekst, naam);
    if (naar) n = metStatus(n, naar, naam);
    await bewaar([n], "Notitie toegevoegd", [kopie(c)]);
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

  const login = useCallback(async (pw: string) => {
    const h = await sha256(pw + CONFIG.ZOUT);
    if (!bepaalRol(h)) return false;
    ls.set(SLEUTEL_PW, h!);
    setHash(h);
    return true;
  }, []);
  const loginBeheer = useCallback(async (pw: string) => {
    const h = await sha256(pw + CONFIG.ZOUT);
    if (!h || h !== CONFIG.BEHEER_HASH) return false;
    ls.set(SLEUTEL_PW, h); setHash(h); return true;
  }, []);
  const naarKijken = useCallback(() => { ls.set(SLEUTEL_PW, CONFIG.WACHTWOORD_HASH); setHash(CONFIG.WACHTWOORD_HASH); }, []);
  const uitloggen = useCallback(() => { ls.del(SLEUTEL_PW); ls.del(SLEUTEL_CACHE); setHash(null); setClaims([]); }, []);
  const setNaam = useCallback((n: string) => { setNaamState(n); if (n) ls.set(SLEUTEL_NAAM, n); else ls.del(SLEUTEL_NAAM); }, []);

  const actief = useMemo(() => claims.filter((c) => !c.verwijderd), [claims]);
  const prullenbak = useMemo(() => claims.filter((c) => c.verwijderd), [claims]);

  const waarde: StoreWaarde = {
    rol, magBewerken, naam, setNaam, login, loginBeheer, naarKijken, uitloggen,
    claims, actief, prullenbak, inst, geladen, online: online && REMOTE, syncTijd, vernieuw,
    bewaar, zetStatus, notitie, naarPrullenbak, terugzetten, definitiefWeg: (id) => definitiefWeg(id), bewaarInst,
  };
  return <StoreContext.Provider value={waarde}>{children}</StoreContext.Provider>;
}
