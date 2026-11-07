import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore } from "../state/Store";
import { metRegel, titelVan, wijzigingTekst } from "../lib/claims";
import { ClaimForm } from "../components/ClaimForm";
import { Leeg, PaginaKop } from "../components/ui";

export function Bewerken() {
  const { id } = useParams();
  const nav = useNavigate();
  const { claims, bewaar, naam, magBewerken } = useStore();
  const [bezig, setBezig] = useState(false);
  const c = claims.find((x) => x.id === id);
  if (!c) return <div className="pagina"><Leeg titel="Claim niet gevonden"><Link className="knop knop-zacht" to="/claims">Naar alle claims</Link></Leeg></div>;
  if (!magBewerken) return <div className="pagina"><Leeg titel="Alleen voor beheerders" tekst="Log in als beheerder om claims te wijzigen." /></div>;
  return (
    <div className="pagina pagina-smal">
      <PaginaKop boven="Bewerken" titel={titelVan(c)} />
      <ClaimForm start={c} knop="Wijzigingen opslaan" bezig={bezig} onAnnuleer={() => nav(-1)}
        onBewaar={async (n) => {
          const t = wijzigingTekst(c, n);
          if (!t) { nav(`/claims/${c.id}`); return; }
          setBezig(true);
          const ok = await bewaar([metRegel(n, t, naam)], "Wijzigingen opgeslagen", [c]);
          setBezig(false);
          if (ok) nav(`/claims/${c.id}`);
        }} />
    </div>
  );
}
