/** Renders notification fields as a professional HTML e-mail (plus a plain-text fallback). Pure: used by the server functions.
 *  Fields starting with "_" steer the layout: _subject, _soort (label above the title), _intro, _bedrag + _bedraglabel (highlight),
 *  _knop (button text). All other fields become rows; values with "•" lines become lists. */
export type Velden = Record<string, string>;

const META = ["_soort", "_intro", "_bedrag", "_bedraglabel", "_knop"];
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const isUrl = (s: string) => /^https?:\/\/\S+$/.test(s.trim());

/** The same fields for FormSubmit: its own layout fields only, with the intro as the first row. */
export function voorFormSubmit(velden: Velden): Velden {
  const uit: Velden = { _template: "box", _captcha: "false" };
  if (velden._subject) uit._subject = velden._subject;
  if (velden._intro) uit.Bericht = velden._intro;
  if (velden._bedrag) uit[velden._bedraglabel || "Bedrag"] = velden._bedrag;
  for (const [k, v] of Object.entries(velden)) if (!k.startsWith("_") && String(v ?? "").trim()) uit[k] = v;
  return uit;
}

export function mailInhoud(velden: Velden): { onderwerp: string; html: string; tekst: string } {
  const onderwerp = velden._subject || "Melding ClaimFlow Medipoint";
  const soort = velden._soort || "Melding";
  const rijen = Object.entries(velden).filter(([k, v]) => !k.startsWith("_") && !META.includes(k) && String(v ?? "").trim());
  const link = rijen.find(([, v]) => isUrl(v))?.[1];
  const gewoon = rijen.filter(([, v]) => !isUrl(v));

  const waarde = (v: string) => {
    const regels = v.split("\n").map((r) => r.trim()).filter(Boolean);
    if (regels.length > 1 && regels.every((r) => r.startsWith("•"))) {
      return regels.map((r) => `<div style="padding:6px 0;border-top:1px solid #EFEAF2">${esc(r.replace(/^•\s*/, ""))}</div>`).join("").replace('border-top:1px solid #EFEAF2"', 'border-top:0"');
    }
    return esc(regels.length === 1 ? v.replace(/^\s*•\s*/, "") : v).replace(/\n/g, "<br>");
  };

  const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(onderwerp)}</title></head>
<body style="margin:0;padding:0;background:#EEF0F5;font-family:'Segoe UI',Inter,Arial,sans-serif;color:#151826;-webkit-font-smoothing:antialiased">
<div style="display:none;max-height:0;overflow:hidden">${esc(velden._intro || onderwerp)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF0F5;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#FFFFFF;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(21,24,38,.08)">
  <tr><td style="background:#0B0D1A;background-image:linear-gradient(120deg,#0E5E73 0%,#1B2A6B 40%,#5A1E6E 75%,#DA2F24 100%);padding:26px 28px 22px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:middle">
        <span style="display:inline-block;width:30px;height:30px;border-radius:9px;background:#22B455;color:#fff;text-align:center;font-weight:800;line-height:30px;font-size:16px;vertical-align:middle">C</span>
        <span style="color:#FFFFFF;font-weight:700;font-size:19px;vertical-align:middle;margin-left:9px;letter-spacing:-.2px">ClaimFlow</span>
      </td>
      <td align="right" style="vertical-align:middle;color:rgba(255,255,255,.75);font-size:12px;letter-spacing:.12em;text-transform:uppercase">Medipoint Meppel</td>
    </tr></table>
    <div style="margin-top:22px;display:inline-block;padding:4px 11px;border-radius:999px;background:rgba(255,255,255,.16);color:#FFFFFF;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase">${esc(soort)}</div>
    <h1 style="margin:10px 0 0;color:#FFFFFF;font-size:24px;line-height:1.25;font-weight:700;letter-spacing:-.4px">${esc(onderwerp)}</h1>
  </td></tr>
  ${velden._intro ? `<tr><td style="padding:24px 28px 0;font-size:15px;line-height:1.6;color:#3A3F55">${esc(velden._intro)}</td></tr>` : ""}
  ${velden._bedrag ? `<tr><td style="padding:20px 28px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F7FB;border:1px solid #E6E8F0;border-radius:14px"><tr><td style="padding:16px 18px">
    <div style="font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#6B7088">${esc(velden._bedraglabel || "Bedrag")}</div>
    <div style="font-size:30px;font-weight:700;letter-spacing:-.8px;color:#151826;margin-top:2px">${esc(velden._bedrag)}</div>
  </td></tr></table></td></tr>` : ""}
  <tr><td style="padding:18px 28px 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.5">
${gewoon.map(([k, v]) => `    <tr><td style="padding:11px 14px 11px 0;border-bottom:1px solid #EFEAF2;color:#6B7088;width:36%;vertical-align:top">${esc(k)}</td><td style="padding:11px 0;border-bottom:1px solid #EFEAF2;vertical-align:top;font-weight:600;color:#151826">${waarde(String(v))}</td></tr>`).join("\n")}
  </table></td></tr>
  ${link ? `<tr><td style="padding:22px 28px 28px"><a href="${esc(link)}" style="display:inline-block;background:#DA2F24;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:15px;padding:13px 22px;border-radius:12px">${esc(velden._knop || "Openen in ClaimFlow")} &rarr;</a></td></tr>` : `<tr><td style="height:24px"></td></tr>`}
  <tr><td style="padding:16px 28px;background:#F6F7FB;border-top:1px solid #E6E8F0;font-size:12px;line-height:1.5;color:#6B7088">
    Automatisch verstuurd door ClaimFlow · Garantieclaims van Medipoint Meppel.<br>Je krijgt deze mail omdat meldingen voor dit adres aan staan.
  </td></tr>
</table>
</td></tr></table></body></html>`;

  const tekst = [onderwerp, "", velden._intro || "", velden._bedrag ? `${velden._bedraglabel || "Bedrag"}: ${velden._bedrag}` : "", "", ...gewoon.map(([k, v]) => `${k}: ${v}`), link ? `\n${velden._knop || "Openen in ClaimFlow"}: ${link}` : ""]
    .filter((r, i, a) => r !== "" || a[i - 1] !== "").join("\n");
  return { onderwerp, html, tekst };
}
