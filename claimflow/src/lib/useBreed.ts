import { useEffect, useState } from "react";

/** True from tablet width up (760px) — the same breakpoint as the CSS. Lets pages render only the list variant that is visible. */
export const BREED = "(min-width: 760px)";

export function useBreed(): boolean {
  const [breed, setBreed] = useState(() => typeof matchMedia === "function" && matchMedia(BREED).matches);
  useEffect(() => {
    const m = matchMedia(BREED);
    const kijk = () => setBreed(m.matches);
    m.addEventListener("change", kijk);
    return () => m.removeEventListener("change", kijk);
  }, []);
  return breed;
}
