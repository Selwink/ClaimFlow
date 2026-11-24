import { LogoMerk } from "./LogoMerk";

/** Public start page (design "Element"): what ClaimFlow does, with the way in. */
export function Voorpagina({ onInloggen }: { onInloggen: () => void }) {
  return (
    <main className="vp">
      <div className="vp-merk"><LogoMerk maat={30} /> claimflow <i aria-hidden="true" /></div>

      <section className="vp-blok">
        <nav className="vp-nav"><b>CLAIMFLOW</b><a href="#vp-soorten">Werkwijze</a><a href="#vp-functies" className="a">Functies</a><button type="button" className="vp-kn" onClick={onInloggen}>Inloggen ➤</button></nav>
        <div className="vp-hero">
          <div>
            <p className="vp-kl">ClaimFlow — garantieclaims van Medipoint Meppel</p>
            <h1><span className="g">Claims</span> zonder <span className="o">gedoe.</span> Geld terug.</h1>
            <p className="vp-p">Scan de LGAR, bewaak de termijn van 42 dagen en haal het geld terug bij je leveranciers. <b>Inlezen, indienen, opvolgen en rapporteren — allemaal in één app.</b></p>
            <button type="button" className="vp-cta" onClick={onInloggen}>Start met claimen</button>
            <p className="vp-noot">Back-ups en termijnbewaking — automatisch, elke nacht.</p>
          </div>
          <div className="vp-toetsen" aria-hidden="true">
            <div className="vp-bord"><span>Scan</span><span>VAM</span><span>Termijn</span><span className="s">Start</span></div>
            <p className="vp-tags">LGAR-SCAN<br />TERMIJN 42 D<br />VAM-OPVOLGING<br />RAPPORTAGE</p>
          </div>
        </div>
        <p className="vp-logos">Eureva · Umotion · Mercado · Aleidis Fitform · UnitedCare</p>
      </section>

      <section className="vp-blok" id="vp-soorten">
        <div className="vp-kop2"><div><p className="vp-kl">Soorten claims</p><h2><span className="g">Twee soorten claims.</span><br /><span className="o">Eén register</span> voor alles</h2></div>
          <p>ClaimFlow is gemaakt voor de werkplaats van Medipoint. Claims die we zelf maken én claims die we uitbesteden — alles op één plek, met dezelfde termijnbewaking.</p></div>
        <div className="vp-r2">
          <div className="vp-kaart"><p className="vp-kl vp-stip">Hoofdzaak</p><h3>Eigen werkplaats</h3><p>Binnen- en buitenmonteurs, onderdelen, leveranciers en termijnen die bewaakt moeten worden.</p>
            <div className="vp-tg"><div className="o"><b>LGAR inlezen</b><small>Foto of pdf — velden vullen zich vanzelf.</small></div><div className="g"><b>Termijn & VAM</b><small>Na 42 dagen een seintje: VAM vragen.</small></div><div className="g"><b>Foto's als bewijs</b><small>Schade vastleggen bij de claim.</small></div><div className="g"><b>Rapportage</b><small>Per leverancier, maand en monteur.</small></div></div>
            <p className="vp-noot">Vaste bedragen per onderdeel — speling, jukmotor, seat support.</p></div>
          <div className="vp-kaart"><p className="vp-kl vp-stip">Daarnaast</p><h3>Uitbesteed</h3><p>Claims die een leverancier zelf oplost.</p>
            <ol className="vp-stappen"><li><b>Vastleggen</b><small>Claim en leverancier noteren.</small></li><li><b>Doorgeven</b><small>Leverancier lost het op.</small></li><li><b>Afronden</b><small>Bedrag telt mee in het jaartotaal.</small></li><li><b>Rapporteren</b><small>Zichtbaar onder Uitbesteed.</small></li></ol></div>
        </div>
      </section>

      <section className="vp-blok vp-zwart" id="vp-functies">
        <div className="vp-kop2"><div><p className="vp-kl">Functies</p><h2><span className="g">Wat zit er</span><br />in ClaimFlow</h2></div><p>Van de pakbon tot het geld op de rekening: ClaimFlow sluit het hele traject af.</p></div>
        <div className="vp-drie"><div><b>Termijnbewaking</b><small>Elke ochtend een melding van claims die over de termijn gaan.</small></div><div><b>Assistent Flow</b><small>Vraag welke claims te laat zijn of wat een maand opleverde.</small></div><div><b>Altijd een back-up</b><small>Elke nacht automatisch, 30 dagen bewaard.</small></div></div>
        <button type="button" className="vp-cta vp-cta-onder" onClick={onInloggen}>Inloggen</button>
      </section>
    </main>
  );
}
