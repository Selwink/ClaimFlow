/** Renders notification fields as a branded HTML e-mail (plus a plain-text fallback). Pure: used by the Netlify functions. */
export type Velden = Record<string, string>;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const isUrl = (s: string) => /^https?:\/\/\S+$/.test(s.trim());

export function mailInhoud(velden: Velden): { onderwerp: string; html: string; tekst: string } {
  const onderwerp = velden._subject || "Melding ClaimFlow Medipoint";
  const rijen = Object.entries(velden).filter(([k, v]) => !k.startsWith("_") && String(v ?? "").trim());
  const link = rijen.find(([, v]) => isUrl(v))?.[1];

  const cel = (v: string) => (isUrl(v) ? `<a href="${esc(v)}" style="color:#B8231A;font-weight:600">${esc(v.replace(/^https?:\/\//, ""))}</a>` : esc(v).replace(/\n/g, "<br>"));
  const html = `<!doctype html><html lang="nl"><body style="margin:0;background:#F6F2EB;font-family:Inter,Segoe UI,Arial,sans-serif;color:#1C1418">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F2EB;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#FFFCF7;border-radius:20px;overflow:hidden;border:1px solid #E6DED1">
<tr><td style="background:#2A1024;padding:20px 24px">
  <span style="display:inline-block;width:22px;height:22px;border-radius:7px;background:#E8382B;color:#fff;text-align:center;font-weight:800;line-height:22px;font-size:13px">&#10003;</span>
  <span style="color:#fff;font-weight:800;font-size:18px;letter-spacing:-.3px;vertical-align:middle;margin-left:8px">ClaimFlow</span>
  <span style="color:rgba(255,255,255,.7);font-size:18px;vertical-align:middle"> Medipoint</span>
</td></tr>
<tr><td style="height:5px;background:linear-gradient(90deg,#E8382B 0 40%,#EFB13C 40% 60%,#3FB7B2 60% 80%,#2E4057 80%);background-color:#E8382B"></td></tr>
<tr><td style="padding:24px 24px 8px"><h1 style="margin:0;font-size:22px;line-height:1.25;letter-spacing:-.4px">${esc(onderwerp)}</h1></td></tr>
<tr><td style="padding:8px 24px 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.5">
${rijen.map(([k, v]) => `<tr><td style="padding:10px 0;border-bottom:1px solid #ECE5D9;color:#6E6268;width:38%;vertical-align:top">${esc(k)}</td><td style="padding:10px 0 10px 12px;border-bottom:1px solid #ECE5D9;vertical-align:top;font-weight:500">${cel(String(v))}</td></tr>`).join("\n")}
</table></td></tr>
${link ? `<tr><td style="padding:16px 24px 24px"><a href="${esc(link)}" style="display:inline-block;background:#E8382B;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:12px">Openen in ClaimFlow</a></td></tr>` : ""}
</table>
<p style="font-size:12px;color:#6E6268;margin:14px 0 0">Automatische melding van ClaimFlow Medipoint</p>
</td></tr></table></body></html>`;

  const tekst = [onderwerp, "", ...rijen.map(([k, v]) => `${k}: ${v}`)].join("\n");
  return { onderwerp, html, tekst };
}
