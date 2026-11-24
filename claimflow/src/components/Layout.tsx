import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useStore } from "../state/Store";
import { overTermijn } from "../lib/claims";
import { geleden } from "../lib/format";
import { Icon, type IconNaam } from "./Icon";
import { Logo } from "./ui";
import { Welkom } from "./Welkom";
import { TakenPopup } from "./Taken";
import { DoelGehaald } from "./Team";
import { PfBand } from "./Portfolio";

interface NavItem { naar: string; label: string; kort?: string; icoon: IconNaam; einde?: boolean }
const NAV: NavItem[] = [
  { naar: "/", label: "Home", kort: "Home", icoon: "huis", einde: true },
  { naar: "/claims", label: "Claims", icoon: "lijst" },
  { naar: "/notities", label: "Notities", icoon: "notitie" },
  { naar: "/leveranciers", label: "Leveranciers", icoon: "fabriek" },
  { naar: "/uitbesteed", label: "Uitbesteed", icoon: "extern" },
  { naar: "/rapportage", label: "Rapportage", kort: "Cijfers", icoon: "grafiek" },
  { naar: "/assistent", label: "Assistent", icoon: "robot" },
  { naar: "/beheer", label: "Profiel", kort: "Profiel", icoon: "persoon" },
];

/** App frame: sidebar on desktop, top bar + bottom tab bar on phone and tablet. */
export function Layout() {
  const { actief, inst, online, syncTijd, naam, magBewerken, rol, vernieuw, uitloggen } = useStore();
  const nav = useNavigate();
  const loc = useLocation();
  const aandacht = actief.filter((c) => overTermijn(c, inst.dagen)).length;
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  // the phone menu: opens from the left, closes on a choice, outside tap or Escape
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { setMenuOpen(false); }, [loc.pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [menuOpen]);

  const badge = (n: NavItem) => (n.naar === "/claims" && aandacht ? <em className="nav-badge" aria-label={`${aandacht} over termijn`}>{aandacht}</em> : null);
  const initialen = (naam || "?").split(/\s+/).map((d) => d[0]).join("").slice(0, 2).toUpperCase();
  const onder = NAV.filter((n) => !["/leveranciers", "/uitbesteed", "/rapportage", "/assistent"].includes(n.naar));

  return (
    <div className="frame">
      <aside className="zijbalk" aria-label="Navigatie">
        <NavLink to="/" className="zijbalk-logo" aria-label="ClaimFlow Medipoint — naar Home"><Logo /></NavLink>
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
          <button type="button" className="zij-uit" onClick={() => uitloggen()}>
            <Icon naam="uitloggen" maat={16} /> Uitloggen
          </button>
        </div>
      </aside>

      <header className="topbalk">
        <button type="button" className="menu-knop" aria-label="Menu openen" aria-expanded={menuOpen} aria-controls="menu-lade" onClick={() => setMenuOpen(true)}>
          <svg className={`menu-ikoon${menuOpen ? " open" : ""}`} width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <line className="l1" x1="4" y1="7" x2="20" y2="7" />
            <line className="l2" x1="4" y1="12" x2="14" y2="12" />
            <line className="l3" x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </button>
        <NavLink to="/" aria-label="ClaimFlow Medipoint — naar Home"><Logo /></NavLink>
        <div className="topbalk-rechts">
          <i className={`stip ${online ? "aan" : "uit"}`} title={online ? "Verbonden" : "Offline"} />
          <NavLink to="/beheer" className="avatar" aria-label="Beheer en profiel">{initialen}</NavLink>
        </div>
      </header>

      <div id="menu-lade" className={`lade${menuOpen ? " open" : ""}`} aria-hidden={!menuOpen}>
        <div className="lade-bedekking" onClick={() => setMenuOpen(false)} aria-hidden="true" />
        <nav className="lade-paneel" aria-label="Hoofdmenu, alle pagina's">
          <div className="lade-kop">
            <Logo />
            <button type="button" className="lade-sluit" aria-label="Menu sluiten" onClick={() => setMenuOpen(false)}><Icon naam="kruis" maat={18} /></button>
          </div>
          <div className="lade-groep">Werk</div>
          <NavLink to="/" end className="lade-link"><Icon naam="huis" maat={18} />Home{aandacht ? <em className="nav-badge">{aandacht}</em> : null}</NavLink>
          <NavLink to="/claims" className="lade-link"><Icon naam="lijst" maat={18} />Claims</NavLink>
          {magBewerken && <NavLink to="/nieuw" className="lade-link"><Icon naam="plus" maat={18} />Nieuwe claim</NavLink>}
          <NavLink to="/leveranciers" className="lade-link"><Icon naam="fabriek" maat={18} />Leveranciers</NavLink>
          <NavLink to="/uitbesteed" className="lade-link"><Icon naam="extern" maat={18} />Uitbesteed</NavLink>
          <NavLink to="/notities" className="lade-link"><Icon naam="notitie" maat={18} />Notities</NavLink>
          <NavLink to="/assistent" className="lade-link"><Icon naam="robot" maat={18} />Assistent Flow</NavLink>
          <div className="lade-groep">Overzicht</div>
          <NavLink to="/rapportage" className="lade-link"><Icon naam="grafiek" maat={18} />Rapportage</NavLink>
          <NavLink to="/datums" className="lade-link"><Icon naam="agenda" maat={18} />Datums</NavLink>
          <div className="lade-groep">Beheer</div>
          <NavLink to="/beheer" className="lade-link"><Icon naam="persoon" maat={18} />Ik · account en instellingen</NavLink>
          <NavLink to="/prullenbak" className="lade-link"><Icon naam="prullenbak" maat={18} />Prullenbak</NavLink>
          <div className="lade-voet">
            <span className="avatar-klein">{initialen}</span>
            <span><b>{naam || "Naam niet ingesteld"}</b><small>{rol === "beheer" ? "beheerder" : "alleen kijken"}</small></span>
          </div>
          <button type="button" className="lade-uit" onClick={() => { setMenuOpen(false); uitloggen(); }}>
            <Icon naam="uitloggen" maat={18} /> Uitloggen
          </button>
        </nav>
      </div>

      <Welkom />
      <TakenPopup />
      <DoelGehaald />
      <main className="inhoud" id="inhoud">
        <PfBand />
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
