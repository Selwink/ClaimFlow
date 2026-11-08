import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useStore } from "../state/Store";
import { overTermijn } from "../lib/claims";
import { geleden } from "../lib/format";
import { Icon, type IconNaam } from "./Icon";
import { Logo } from "./ui";
import { Welkom } from "./Welkom";
import { DoelGehaald } from "./Team";

interface NavItem { naar: string; label: string; kort?: string; icoon: IconNaam; einde?: boolean }
const NAV: NavItem[] = [
  { naar: "/vandaag", label: "Vandaag", icoon: "huis", einde: true },
  { naar: "/claims", label: "Claims", icoon: "lijst" },
  { naar: "/leveranciers", label: "Leveranciers", icoon: "fabriek" },
  { naar: "/rapportage", label: "Rapportage", kort: "Cijfers", icoon: "grafiek" },
  { naar: "/beheer", label: "Beheer", kort: "Ik", icoon: "persoon" },
];

/** App frame: sidebar on desktop, top bar + bottom tab bar on phone and tablet. */
export function Layout() {
  const { actief, inst, online, syncTijd, naam, magBewerken, rol, vernieuw } = useStore();
  const nav = useNavigate();
  const loc = useLocation();
  const aandacht = actief.filter((c) => overTermijn(c, inst.dagen)).length;
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);

  const badge = (n: NavItem) => (n.naar === "/claims" && aandacht ? <em className="nav-badge" aria-label={`${aandacht} over termijn`}>{aandacht}</em> : null);
  const initialen = (naam || "?").split(/\s+/).map((d) => d[0]).join("").slice(0, 2).toUpperCase();
  const onder = NAV.filter((n) => n.naar !== "/leveranciers");

  return (
    <div className="frame">
      <aside className="zijbalk" aria-label="Navigatie">
        <NavLink to="/" end className="zijbalk-logo" aria-label="ClaimFlow Medipoint — terug naar start (LGAR of Logistiek)"><Logo /></NavLink>
        <nav aria-label="Hoofdmenu zijbalk">
          {NAV.map((n) => (
            <NavLink key={n.naar} to={n.naar} end={n.einde} className="zij-link">
              <Icon naam={n.icoon} maat={18} /><span>{n.label}</span>{badge(n)}
            </NavLink>
          ))}
        </nav>
        {magBewerken && (
          <button type="button" className="knop knop-rood zij-nieuw" onClick={() => nav("/nieuw")}>
            <Icon naam="plus" maat={18} /> Nieuwe claim
          </button>
        )}
        <div className="zijbalk-voet">
          <button type="button" className="sync" onClick={() => void vernieuw()} title="Nu verversen">
            <i className={online ? "aan" : "uit"} />{online ? "Verbonden" : "Offline"} · {inst.vestiging}
          </button>
          <span>{naam || "Naam niet ingesteld"} · {rol === "beheer" ? "beheerder" : "alleen kijken"}</span>
          {syncTijd && <span className="mono">Bijgewerkt {geleden(syncTijd)}</span>}
        </div>
      </aside>

      <header className="topbalk">
        <NavLink to="/" end aria-label="ClaimFlow Medipoint — terug naar start (LGAR of Logistiek)"><Logo /></NavLink>
        <div className="topbalk-rechts">
          <i className={`stip ${online ? "aan" : "uit"}`} title={online ? "Verbonden" : "Offline"} />
          <NavLink to="/beheer" className="avatar" aria-label="Beheer en profiel">{initialen}</NavLink>
        </div>
      </header>

      <Welkom />
      <DoelGehaald />
      <main className="inhoud" id="inhoud">
        {!online && <div className="offline-band">Geen verbinding — je ziet de laatst opgehaalde gegevens.</div>}
        <Outlet />
      </main>

      <nav className="tabbalk" aria-label="Hoofdmenu onderbalk">
        {onder.slice(0, 2).map((n) => (
          <NavLink key={n.naar} to={n.naar} end={n.einde} className="tab">
            <Icon naam={n.icoon} /><span>{n.kort || n.label}</span>{badge(n)}
          </NavLink>
        ))}
        {magBewerken ? (
          <NavLink to="/nieuw" className="tab-plus" aria-label="Nieuwe claim"><Icon naam="plus" maat={24} /></NavLink>
        ) : <span className="tab-plus-leeg" />}
        {onder.slice(2).map((n) => (
          <NavLink key={n.naar} to={n.naar} className="tab">
            <Icon naam={n.icoon} /><span>{n.kort || n.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
