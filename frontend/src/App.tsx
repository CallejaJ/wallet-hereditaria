import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Dashboard } from "./pages/Dashboard";
import { Register } from "./pages/Register";
import { Claim } from "./pages/Claim";
import "./App.css";

function App() {
  const { ready, authenticated, user, login, logout, exportWallet } = usePrivy();
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "register" | "claim"
  >("dashboard");
  const [copied, setCopied] = useState(false);

  // Mapeamos los estados de Privy a variables legibles
  const isConnected = authenticated;
  const address = user?.wallet?.address;

  const handleCopyAddress = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Error al copiar dirección:", err);
    }
  };

  return (
    <div className="app-container">
      {/* HEADER PRINCIPAL */}
      <header className="app-header">
        <div className="logo-area">
          <div className="logo-bullet"></div>
          <span className="logo-text">Legacy Wallet</span>
          <span className="network-tag">Sepolia Testnet</span>
        </div>

        <div className="wallet-area">
          {!ready ? (
            <button className="btn btn-connect" disabled>
              <RefreshCw className="spin" /> Cargando...
            </button>
          ) : isConnected && address ? (
            <div className="wallet-connected" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                className="address-display"
                onClick={handleCopyAddress}
                style={{ cursor: "pointer", textDecoration: "underline" }}
                title="Haz clic para copiar la dirección completa"
              >
                {copied ? "¡Copiado!" : `${address.slice(0, 6)}...${address.slice(-4)}`}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={exportWallet}
                style={{ padding: "4px 8px", fontSize: "0.8rem", borderRadius: "4px" }}
              >
                Exportar Clave
              </button>
              <button
                className="btn btn-disconnect"
                onClick={() => void logout()}
              >
                Cerrar Sesión
              </button>
            </div>
          ) : (
            <button className="btn btn-connect" onClick={() => void login()}>
              Iniciar Sesión / Conectar
            </button>
          )}
        </div>
      </header>

      {/* MENÚ DE NAVEGACIÓN */}
      <nav className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === "dashboard" ? "active" : ""}`}
          onClick={() => setActiveTab("dashboard")}
        >
          Mi Safe
        </button>
        <button
          className={`tab-btn ${activeTab === "register" ? "active" : ""}`}
          onClick={() => setActiveTab("register")}
        >
          Registrar Herencia
        </button>
        <button
          className={`tab-btn ${activeTab === "claim" ? "active" : ""}`}
          onClick={() => setActiveTab("claim")}
        >
          Portal Herederos
        </button>
      </nav>

      {/* CONTENIDO DE LA PÁGINA */}
      <main className="main-content-area">
        {activeTab === "dashboard" && <Dashboard />}
        {activeTab === "register" && <Register />}
        {activeTab === "claim" && <Claim />}
      </main>

      {/* FOOTER */}
      <footer className="app-footer">
        <p>
          Legacy Wallet — Prototipo MVP de Herencia Digital Criptográfica basado
          en Safe
        </p>
        <p className="footer-credits">Desarrollado por Jorge Calleja</p>
      </footer>
    </div>
  );
}

// Pequeño helper para el icono de carga de cabecera si el usuario no tiene lucide-react importado aquí
import { RefreshCw } from "lucide-react";

export default App;
