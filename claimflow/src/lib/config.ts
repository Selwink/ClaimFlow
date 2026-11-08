/**
 * Public runtime configuration. Nothing secret lives here: the database key and password checks
 * moved to the Netlify functions (netlify/lib), so they are not shipped to the browser.
 */
export const CONFIG = {
  /** New claims and the weekly summary are mailed here. Empty = no e-mail. */
  MELDING_EMAIL: "s.kok@medipoint.nl",
  LGAR_FORMULIER:
    "https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=lNlTLdkSZ06NbuTxZ3lQ-h5l1KWN4khFmEPmfPxlgCFUN1NQU003VEEwTzBZQjg1ODhIMVZVUUNFVyQlQCN0PWcu",
} as const;
