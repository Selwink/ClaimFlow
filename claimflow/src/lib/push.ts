import { pas } from "./api";
import { BASIS, functie } from "./config";

/** Phone notifications (Web Push) in the browser: support checks, turning on and off, a test message. */

const FUNCTIE = functie("data");
export type PushSoort = "termijn" | "leverancier" | "accounts";

export const ondersteund = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
export const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const opBeginscherm = () => matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

async function vraag<T>(actie: string, body?: unknown, query: Record<string, string> = {}): Promise<T> {
  const p = pas.get();
  const r = await fetch(`${FUNCTIE}?${new URLSearchParams({ actie, ...query })}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", ...(p ? { Authorization: `Bearer ${p.token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const j = (await r.json().catch(() => ({}))) as T & { fout?: string };
  if (!r.ok) throw new Error(j.fout || `Fout ${r.status}`);
  return j;
}

export async function registreer(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try { return await navigator.serviceWorker.register(`${BASIS}sw.js`, { scope: BASIS }); } catch { return null; }
}

const naarSleutel = (b64: string) => {
  const s = atob(b64.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

async function huidigAbonnement(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration(BASIS);
  return reg ? reg.pushManager.getSubscription() : null;
}

export async function status(): Promise<{ aan: boolean; soorten: PushSoort[]; toestemming: NotificationPermission }> {
  const toestemming = Notification.permission;
  const sub = await huidigAbonnement();
  if (!sub) return { aan: false, soorten: [], toestemming };
  const r = await vraag<{ aan: boolean; soorten: PushSoort[] }>("pushstatus", undefined, { endpoint: sub.endpoint });
  return { aan: r.aan, soorten: r.soorten, toestemming };
}

export async function aanzetten(soorten: PushSoort[]): Promise<PushSoort[]> {
  const toestemming = await Notification.requestPermission();
  if (toestemming !== "granted") throw new Error(toestemming === "denied" ? "geweigerd" : "Geen toestemming gegeven");
  const reg = (await registreer()) || (await navigator.serviceWorker.ready);
  await navigator.serviceWorker.ready;
  const { sleutel } = await vraag<{ sleutel: string }>("pushsleutel");
  let sub = await reg.pushManager.getSubscription();
  // a subscription made with another key cannot receive our messages: start fresh
  if (sub && sub.options.applicationServerKey && btoa(String.fromCharCode(...new Uint8Array(sub.options.applicationServerKey))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") !== sleutel) {
    await sub.unsubscribe(); sub = null;
  }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: naarSleutel(sleutel) });
  const apparaat = isIOS() ? "iPhone/iPad" : /Android/.test(navigator.userAgent) ? "Android" : "Computer";
  const r = await vraag<{ soorten: PushSoort[] }>("pushaan", { sub: sub.toJSON(), soorten, apparaat });
  return r.soorten;
}

export async function uitzetten(): Promise<void> {
  const sub = await huidigAbonnement();
  await vraag("pushuit", { endpoint: sub?.endpoint || "" });
  await sub?.unsubscribe().catch(() => undefined);
}

export async function testmelding(): Promise<number> {
  const sub = await huidigAbonnement();
  return (await vraag<{ verstuurd: number }>("pushtest", { endpoint: sub?.endpoint || "" })).verstuurd;
}
