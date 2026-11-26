import { useEffect } from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router-dom";
import { BASIS } from "./config";

type MetOvergang = Document & { startViewTransition?: (cb: () => void) => unknown };

/** Smooth page changes: clicks on links inside the app go through the browser's view transition (where supported).
 *  The bars stay put (they have their own transition names); the page itself fades and slides. */
export function usePaginaOvergang() {
  const nav = useNavigate();
  useEffect(() => {
    const doc = document as MetOvergang;
    if (!doc.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const basis = BASIS.replace(/\/$/, "");
    const klik = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target && a.target !== "_self" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || (basis && !url.pathname.startsWith(basis))) return;
      const pad = (basis ? url.pathname.slice(basis.length) : url.pathname) || "/";
      if (pad + url.search === location.pathname.slice(basis.length) + location.search) return;
      e.preventDefault();
      doc.startViewTransition!(() => { flushSync(() => nav(pad + url.search + url.hash)); });
    };
    document.addEventListener("click", klik, true);
    return () => document.removeEventListener("click", klik, true);
  }, [nav]);
}
