// Server-side e-mail delivery. Resend when RESEND_API_KEY is set in Netlify, FormSubmit as fallback.
import { CONFIG } from "../../src/lib/config";
import { mailInhoud, type Velden } from "../../src/lib/mailHtml";

export type Dienst = "resend" | "formsubmit";
export const dienst = (): Dienst => (process.env.RESEND_API_KEY ? "resend" : "formsubmit");
const aan = () => process.env.MAIL_AAN || CONFIG.MELDING_EMAIL;

export async function verzend(velden: Velden, site: string): Promise<{ ok: boolean; dienst: Dienst; bericht: string }> {
  if (!aan()) return { ok: false, dienst: dienst(), bericht: "Geen e-mailadres ingesteld" };

  if (process.env.RESEND_API_KEY) {
    const { onderwerp, html, tekst } = mailInhoud(velden);
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.MAIL_VAN || "ClaimFlow Medipoint <onboarding@resend.dev>",
        to: aan().split(",").map((s) => s.trim()).filter(Boolean),
        subject: onderwerp, html, text: tekst,
      }),
    });
    const j = (await r.json().catch(() => ({}))) as { id?: string; message?: string };
    if (r.ok && j.id) return { ok: true, dienst: "resend", bericht: "Verstuurd" };
    console.error(`resend ${r.status}: ${j.message || ""}`);
    // Fall through to FormSubmit so a Resend problem never loses a notification.
  }

  try {
    const r = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(aan())}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Origin: site, Referer: `${site}/` },
      body: JSON.stringify({ _template: "table", _captcha: "false", ...velden }),
    });
    const j = (await r.json().catch(() => ({}))) as { success?: string | boolean; message?: string };
    if (j.success === true || j.success === "true") return { ok: true, dienst: "formsubmit", bericht: "Verstuurd via FormSubmit" };
    if (/activat/i.test(j.message || "")) return { ok: true, dienst: "formsubmit", bericht: "Activeer FormSubmit via de mail in je inbox" };
    return { ok: false, dienst: "formsubmit", bericht: j.message || `FormSubmit fout ${r.status}` };
  } catch {
    return { ok: false, dienst: "formsubmit", bericht: "Maildienst niet bereikbaar" };
  }
}
