import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ToastProvider } from "./state/Toast";
import { StoreProvider, useStore } from "./state/Store";
import { Layout } from "./components/Layout";
import { Splash } from "./components/Splash";
import { Login } from "./pages/Login";
import { Vandaag } from "./pages/Vandaag";
import { Claims } from "./pages/Claims";
import { ClaimDetail } from "./pages/ClaimDetail";
import { Bewerken } from "./pages/Bewerken";
import { NieuweClaim } from "./pages/NieuweClaim";
import { LeverancierDetail, Leveranciers } from "./pages/Leveranciers";
import { Rapportage } from "./pages/Rapportage";
import { Beheer } from "./pages/Beheer";
import { Prullenbak } from "./pages/Prullenbak";
import { Datums } from "./pages/Datums";
import { NietGevonden } from "./pages/NietGevonden";

function AppRoutes() {
  const { rol, geladen } = useStore();
  return (
    <>
      <Splash klaar={!rol || geladen} kort={!!rol} />
      {!rol ? <Login /> : (
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Vandaag />} />
            <Route path="claims" element={<Claims />} />
            <Route path="claims/:id" element={<ClaimDetail />} />
            <Route path="claims/:id/bewerken" element={<Bewerken />} />
            <Route path="nieuw" element={<NieuweClaim />} />
            <Route path="leveranciers" element={<Leveranciers />} />
            <Route path="leveranciers/:naam" element={<LeverancierDetail />} />
            <Route path="rapportage" element={<Rapportage />} />
            <Route path="beheer" element={<Beheer />} />
            <Route path="prullenbak" element={<Prullenbak />} />
            <Route path="datums" element={<Datums />} />
            <Route path="*" element={<NietGevonden />} />
          </Route>
        </Routes>
      )}
    </>
  );
}

export function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <StoreProvider>
          <AppRoutes />
        </StoreProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
