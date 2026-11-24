import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { registreer } from "./lib/push";
import { leesKleur, startWeergave, zetKleur } from "./lib/kleur";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/pages.css";
import "./styles/beweging.css";
import "./styles/modern.css";
import "./styles/layout-c.css";
import "./styles/thema-eco.css";
import "./styles/thema-medi.css";
import "./styles/thema-prime.css";

zetKleur(leesKleur());
startWeergave();

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);

// Service worker for phone notifications (does not cache pages).
if (location.protocol === "https:") window.addEventListener("load", () => void registreer());
