/**
 * Runtime configuration. The Supabase publishable key is meant to live in the
 * browser; real protection comes from row level security (see claimregister/supabase-beveiliging.sql).
 */
export const CONFIG = {
  SUPABASE_URL: "https://xpktjqdtwmqznhgcicim.supabase.co",
  SUPABASE_KEY: "sb_publishable_Pg8KNp50y2EzGkYurn117w_4Llr27bI",
  TABEL: "claims",
  /** sha256(wachtwoord + ZOUT). Ordinary password: view (or everything if BEHEER_HASH is empty). */
  WACHTWOORD_HASH: "1360561d88563bcbd4716c3e1dc928fc6275afe52d64e830ef5c025446d567a9",
  /** Admin password hash. Empty = everyone with the ordinary password may edit. */
  BEHEER_HASH: "",
  ZOUT: "medipoint-meppel",
  /** New claims are mailed here via FormSubmit. Empty = no e-mail. */
  MELDING_EMAIL: "s.kok@medipoint.nl",
  LGAR_FORMULIER:
    "https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=lNlTLdkSZ06NbuTxZ3lQ-h5l1KWN4khFmEPmfPxlgCFUN1NQU003VEEwTzBZQjg1ODhIMVZVUUNFVyQlQCN0PWcu",
} as const;

export const INST_ID = "_instellingen";
