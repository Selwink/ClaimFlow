import { useId } from "react";

/** The ClaimFlow mark: an arrow that comes back around, with a check. "Wat kapot gaat, komt terug." */
export function LogoMerk({ maat = 30 }: { maat?: number }) {
  // Own gradient id per copy: a copy inside a hidden sidebar would otherwise blank out the visible one.
  const id = `cf-logo-${useId().replace(/:/g, "")}`;
  return (
    <svg width={maat} height={maat} viewBox="0 0 512 512" aria-hidden="true" className="logo-svg">
      <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4CC75A" /><stop offset="1" stopColor="#1E7A2C" /></linearGradient></defs>
      <rect width="512" height="512" rx="116" fill={`url(#${id})`} />
      <path d="M349 170a128 128 0 1 0 9 180" fill="none" stroke="#fff" strokeWidth="44" strokeLinecap="round" />
      <path d="M392 210 L378 126 L306 180 Z" fill="#fff" stroke="#fff" strokeWidth="14" strokeLinejoin="round" />
      <path d="M206 258l36 36 72-78" fill="none" stroke="#D9F99D" strokeWidth="38" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
