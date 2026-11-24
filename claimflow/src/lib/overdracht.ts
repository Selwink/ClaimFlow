/** Hands a file (dropped on the Home LGAR card) over to the New claim page, which reads it straight away. */
let wachtend: File | null = null;
export const geefBestand = (f: File) => { wachtend = f; };
export const neemBestand = (): File | null => { const f = wachtend; wachtend = null; return f; };
