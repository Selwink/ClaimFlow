import { Link } from "react-router-dom";
import { Leeg } from "../components/ui";

export const NietGevonden = () => (
  <div className="pagina"><Leeg kop="h1" titel="Deze pagina bestaat niet" tekst="Misschien is de link verouderd."><Link to="/" className="knop knop-rood">Naar de Werkbak</Link></Leeg></div>
);
