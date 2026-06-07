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
      <h1 className="title-gradient">Mi Bóveda Hereditaria</h1>
      <p className="subtitle">
        Mantenimiento de fe de vida, configuración y activación de Safe.
      </p>

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
    </div>
  );
}
