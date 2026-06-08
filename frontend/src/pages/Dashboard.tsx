import { useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useSafe } from "../hooks/usesSafe";
import { useInheritance } from "../hooks/useInheritance";
import {
  Heart,
  Shield,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Key,
} from "lucide-react";

export function Dashboard() {
  const { authenticated } = usePrivy();
  const isConnected = authenticated;

  const [safeAddress, setSafeAddress] = useState(
    () => localStorage.getItem("safeAddress") || "",
  );
  const [moduleAddress, setModuleAddress] = useState(
    () => localStorage.getItem("moduleAddress") || "",
  );
  const [showGuide, setShowGuide] = useState(false);

  const {
    isModuleEnabled,
    pendingTxs,
    loading: safeLoading,
    error: safeError,
    checkModuleAndTxs,
    confirmAndExecuteTx,
  } = useSafe(safeAddress);

  const {
    loading: contractLoading,
    error: contractError,
    getContractState,
    submitProofOfLife,
  } = useInheritance(moduleAddress);

  type ContractState = Awaited<ReturnType<typeof getContractState>>;
  const [contractState, setContractState] = useState<ContractState>(null);

  // Guardar direcciones en localStorage para evitar re-escribir
  useEffect(() => {
    localStorage.setItem("safeAddress", safeAddress);
  }, [safeAddress]);

  useEffect(() => {
    localStorage.setItem("moduleAddress", moduleAddress);
  }, [moduleAddress]);

  // Cargar estado
  const reloadData = useCallback(async () => {
    if (safeAddress && moduleAddress) {
      await checkModuleAndTxs(moduleAddress);
      const state = await getContractState();
      setContractState(state);
    }
  }, [safeAddress, moduleAddress, checkModuleAndTxs, getContractState]);

  useEffect(() => {
    if (safeAddress && moduleAddress) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void reloadData();
    }
  }, [safeAddress, moduleAddress, isConnected, reloadData]);

  // Buscar si hay una tx propuesta por el oráculo para habilitar el módulo
  const enableModuleTx = pendingTxs.find((tx) => {
    return (
      tx.data &&
      tx.to.toLowerCase() === safeAddress.toLowerCase() &&
      tx.data.toLowerCase().includes(moduleAddress.toLowerCase())
    );
  });

  const handleProofOfLife = async () => {
    try {
      await submitProofOfLife();
      alert("¡Fe de vida registrada con éxito en blockchain!");
      await reloadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEnableModule = async () => {
    if (!enableModuleTx) return;
    try {
      await confirmAndExecuteTx(enableModuleTx.safeTxHash);
      alert("¡Módulo habilitado con éxito en tu Safe!");
      await reloadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="page-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 className="title-gradient" style={{ margin: 0 }}>Mi Bóveda Hereditaria</h1>
          <p className="subtitle" style={{ margin: 0 }}>
            Mantenimiento de fe de vida, configuración y activación de Safe.
          </p>
        </div>
        <button 
          className="btn btn-secondary" 
          onClick={() => setShowGuide(true)}
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
        >
          📖 Guía de Despliegue
        </button>
      </div>

      <div className="grid-layout">
        {/* Panel de Configuración de Direcciones */}
        <div className="card shadow-premium">
          <h2>
            <Key className="icon-title" /> Direcciones de Trabajo
          </h2>
          <div className="form-group">
            <label>Dirección de tu Safe Account:</label>
            <input
              type="text"
              placeholder="0x..."
              value={safeAddress}
              onChange={(e) => setSafeAddress(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Dirección del Módulo de Herencia:</label>
            <input
              type="text"
              placeholder="0x..."
              value={moduleAddress}
              onChange={(e) => setModuleAddress(e.target.value)}
            />
          </div>
          <button className="btn btn-secondary w-full" onClick={reloadData}>
            <RefreshCw className="icon-btn" /> Sincronizar Estado
          </button>
        </div>

        {/* Panel de Estado e Integridad */}
        <div className="card shadow-premium">
          <h2>
            <Shield className="icon-title" /> Estado del Módulo
          </h2>

          {safeError && (
            <div className="alert alert-error">
              <AlertCircle /> {safeError}
            </div>
          )}

          {!isConnected ? (
            <div className="alert alert-warning">
              <AlertCircle /> Conecta tu wallet en la barra superior.
            </div>
          ) : !safeAddress || !moduleAddress ? (
            <div className="alert alert-info">
              <AlertCircle /> Configura las direcciones a la izquierda para
              cargar el estado.
            </div>
          ) : (
            <div className="status-details">
              <div className="status-row">
                <span>Safe conectada:</span>
                <span className="badge badge-success">
                  {safeAddress.slice(0, 6)}...{safeAddress.slice(-4)}
                </span>
              </div>
              <div className="status-row">
                <span>Estado de Habilitación:</span>
                {isModuleEnabled ? (
                  <span className="badge badge-success-filled">
                    <CheckCircle /> Habilitado (Activo)
                  </span>
                ) : (
                  <span className="badge badge-warning-filled">
                    <AlertCircle /> Pendiente de Habilitación
                  </span>
                )}
              </div>

              {/* Botón para habilitar si el oráculo propuso la transacción */}
              {!isModuleEnabled && enableModuleTx && (
                <div className="enable-action-box">
                  <p>
                    El oráculo propuso habilitar el módulo. Firma y ejecútalo
                    para activarlo:
                  </p>
                  <button
                    className="btn btn-primary w-full"
                    onClick={handleEnableModule}
                    disabled={safeLoading}
                  >
                    {safeLoading ? (
                      <RefreshCw className="spin" />
                    ) : (
                      "Confirmar & Activar Módulo en Safe"
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Control de Fe de Vida / Proof of Life */}
      {isModuleEnabled && contractState && (
        <div className="card shadow-premium mt-6 text-center">
          <h2>
            <Heart className="icon-title text-red" /> Fe de Vida (Proof of Life)
          </h2>
          <p className="description">
            Mientras interactúes con este panel o realices llamadas a este
            botón, tu bóveda se considerará segura. Si no lo haces durante más
            del umbral establecido, tus herederos podrán iniciar la reclamación.
          </p>

          <div className="proof-metrics">
            <div className="metric">
              <span className="metric-label">Último Proof of Life:</span>
              <span className="metric-value">
                {new Date(
                  contractState.lastProofOfLife * 1000,
                ).toLocaleString()}
              </span>
            </div>
            <div className="metric">
              <span className="metric-label">
                Período de Inactividad Permitido:
              </span>
              <span className="metric-value">
                {(contractState.inactivityThreshold / 86400).toFixed(1)} días (
                {contractState.inactivityThreshold} seg)
              </span>
            </div>
            <div className="metric">
              <span className="metric-label">Quórum de Herederos:</span>
              <span className="metric-value">
                {contractState.quorumRequired} firmas necesarias
              </span>
            </div>
          </div>

          <button
            className="btn btn-primary btn-large mt-6"
            onClick={handleProofOfLife}
            disabled={contractLoading}
          >
            {contractLoading ? (
              <RefreshCw className="spin" />
            ) : (
              "Declarar Fe de Vida (Submit Proof of Life)"
            )}
          </button>
          {contractError && (
            <p className="error-text">
              <AlertCircle /> {contractError}
            </p>
          )}
        </div>
      )}

      {/* Modal de Guía de Configuración */}
      {showGuide && (
        <div className="modal-overlay" onClick={() => setShowGuide(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowGuide(false)}>
              &times;
            </button>
            <h2 style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
              📖 Guía de Configuración y Despliegue
            </h2>
            <p className="description" style={{ marginBottom: "24px" }}>
              Sigue estos pasos para desplegar tu Módulo de Herencia y configurar tu Safe en Sepolia Testnet.
            </p>

            <div className="guide-step">
              <h3 style={{ color: "var(--accent)" }}>1. Obtener Sepolia ETH de Prueba</h3>
              <p>
                Tu cuenta de Privy necesita ETH de pruebas para pagar las transacciones. Copia tu dirección de la barra superior e introduce fondos de prueba usando un grifo gratuito:
              </p>
              <ul style={{ margin: "8px 0 0 20px", padding: 0 }}>
                <li><a href="https://sepoliafaucet.com/" target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>Alchemy Sepolia Faucet</a></li>
                <li><a href="https://faucet.quicknode.com/drip" target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>QuickNode Sepolia Faucet</a></li>
              </ul>
            </div>

            <div className="guide-step">
              <h3 style={{ color: "var(--accent)" }}>2. Exportar Clave Privada a MetaMask</h3>
              <p>
                Haz clic en el botón <strong>"Exportar Clave"</strong> en la esquina superior derecha de esta app. Sigue las instrucciones de Privy para ver y copiar tu clave privada. Luego, impórtala en MetaMask en la opción "Importar Cuenta".
              </p>
            </div>

            <div className="guide-step">
              <h3 style={{ color: "var(--accent)" }}>3. Crear tu Safe Account</h3>
              <p>
                Ve a la web de Safe: <a href="https://app.safe.global/" target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>app.safe.global</a>. Conecta tu MetaMask (con tu cuenta de Privy seleccionada). Elige la red <strong>Sepolia</strong>, haz clic en "Create account" y sigue los pasos para crear tu Safe 1/1. Al finalizar, copia la dirección de tu Safe.
              </p>
            </div>

            <div className="guide-step">
              <h3 style={{ color: "var(--accent)" }}>4. Desplegar el Contrato del Módulo de Herencia</h3>
              <p>
                En tu terminal, navega al directorio de contratos y despliega el contrato en Sepolia indicando tu clave privada de MetaMask y las direcciones correspondientes como argumentos:
              </p>
              <code className="guide-code" style={{ whiteSpace: "pre-wrap", display: "block", background: "var(--bg)", border: "1px solid var(--border)", padding: "10px", borderRadius: "6px", margin: "10px 0" }}>
                cd contracts{"\n"}
                forge create src/InheritanceModule.sol:InheritanceModule --rpc-url https://ethereum-sepolia-rpc.publicnode.com --private-key &lt;TU_CLAVE_PRIVADA_METAMASK&gt; --broadcast --constructor-args 0x1343c2E7F8b234af7676C8D45faFAB9ce7532686 &lt;DIRECCIÓN_DE_TU_SAFE&gt;
              </code>
              <p style={{ marginTop: "8px", fontSize: "12px", opacity: 0.8 }}>
                * Nota: 0x1343...2686 es tu dirección de Gmail que actúa como oráculo de firmas.
              </p>
            </div>

            <div className="guide-step">
              <h3 style={{ color: "var(--accent)" }}>5. Activar el Módulo en la dApp</h3>
              <p>
                Pega la dirección de tu Safe y la dirección del módulo recién desplegado en el panel "Direcciones de Trabajo". Luego ve a "Registrar Herencia", configura tus herederos y pulsa registrar. Finalmente, vuelve a "Mi Safe", sincroniza y pulsa "Confirmar &amp; Activar Módulo en Safe" para culminar la activación.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
