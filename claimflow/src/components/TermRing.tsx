/** Circular indicator of how far a claim is into its reporting window. */
export function TermRing({ dagen, termijn, maat = 76, klaar }: { dagen: number | null; termijn: number; maat?: number; klaar?: boolean }) {
  const r = 30, omtrek = 2 * Math.PI * r;
  const deel = klaar ? 1 : dagen == null ? 0 : Math.min(1, dagen / termijn);
  const toon = klaar ? "turk" : dagen == null ? "grijs" : dagen >= termijn ? "rood" : dagen >= termijn * 0.75 ? "oker" : "turk";
  return (
    <svg className={`termring ring-${toon}`} width={maat} height={maat} viewBox="0 0 76 76" role="img"
      aria-label={klaar ? "Afgehandeld" : dagen == null ? "Geen datum" : `${dagen} van ${termijn} dagen`}>
      <circle cx="38" cy="38" r={r} className="ring-bodem" />
      <circle cx="38" cy="38" r={r} className="ring-boog" strokeDasharray={omtrek} strokeDashoffset={omtrek * (1 - deel)} transform="rotate(-90 38 38)" />
      <text x="38" y="38" dominantBaseline="central" textAnchor="middle">{klaar ? "✓" : dagen == null ? "–" : `${dagen}d`}</text>
    </svg>
  );
}
