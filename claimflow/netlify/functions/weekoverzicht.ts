// Scheduled Netlify function: every Monday morning, e-mails the warranty-claims summary.
import { haalAlles, INST_STANDAARD } from "../../src/lib/api";
import { weekOverzicht } from "../../src/lib/overzicht";
import { verzend } from "../lib/verzend";

const SITE = process.env.URL || "https://garantieclaims-meppel.netlify.app";

export const handler = async () => {
  const { claims, inst } = await haalAlles();
  const instellingen = inst || INST_STANDAARD;
  if (!instellingen.weekmail) return { statusCode: 200, body: "weekmail staat uit" };
  const r = await verzend(weekOverzicht(claims, instellingen, SITE).velden, SITE);
  console.log(`weekoverzicht via ${r.dienst}: ${r.bericht}`);
  return { statusCode: r.ok ? 200 : 502, body: r.bericht };
};
