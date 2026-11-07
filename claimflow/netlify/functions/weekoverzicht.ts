// Scheduled Netlify function: every Monday morning, e-mails the warranty-claims summary.
import { haalAlles, INST_STANDAARD } from "../../src/lib/api";
import { weekOverzicht } from "../../src/lib/overzicht";
import { CONFIG } from "../../src/lib/config";

const SITE = process.env.URL || "https://garantieclaims-meppel.netlify.app";

export const handler = async () => {
  if (!CONFIG.MELDING_EMAIL) return { statusCode: 200, body: "geen e-mailadres ingesteld" };
  const { claims, inst } = await haalAlles();
  const instellingen = inst || INST_STANDAARD;
  if (!instellingen.weekmail) return { statusCode: 200, body: "weekmail staat uit" };

  const { velden } = weekOverzicht(claims, instellingen, SITE);
  const r = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(CONFIG.MELDING_EMAIL)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", Origin: SITE, Referer: `${SITE}/` },
    body: JSON.stringify({ _template: "table", _captcha: "false", ...velden }),
  });
  const tekst = await r.text();
  console.log(`weekoverzicht: ${r.status} ${tekst.slice(0, 200)}`);
  return { statusCode: r.ok ? 200 : 502, body: tekst };
};
