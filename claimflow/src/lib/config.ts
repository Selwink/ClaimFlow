/**
 * Public runtime configuration. Nothing secret lives here: the database key and password checks
 * moved to the Netlify functions (netlify/lib), so they are not shipped to the browser.
 */
const API = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "");
/** Address of a server function. On GitHub Pages they run as one Supabase function (VITE_API_URL); on Netlify/Railway under /.netlify/functions. */
export const functie = (naam: string) => (API ? `${API}/${naam}` : `/.netlify/functions/${naam}`);
/** The folder the app is served from: "/" normally, "/<repo>/" on GitHub Pages. Always ends with "/". */
export const BASIS = import.meta.env.BASE_URL;
/** Full address of a page in the app, for links in mails, calendars and overviews. */
export const appUrl = (pad = "") => `${location.origin}${BASIS}${pad.replace(/^\//, "")}`;

export const CONFIG = {
  /** New claims and the weekly summary are mailed here. Empty = no e-mail. */
  MELDING_EMAIL: "s.kok@medipoint.nl",
  LGAR_FORMULIER:
    "https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=lNlTLdkSZ06NbuTxZ3lQ-h5l1KWN4khFmEPmfPxlgCFUN1NQU003VEEwTzBZQjg1ODhIMVZVUUNFVyQlQCN0PWcu",
} as const;
