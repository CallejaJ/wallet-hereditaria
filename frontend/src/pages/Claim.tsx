import { useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";

import { useInheritance } from "../hooks/useInheritance";
import {
  Clock,
  Users,
  AlertCircle,
  RefreshCw,
  Key,
  HelpCircle,
  Coins,
} from "lucide-react";

export function Claim() {
  const { ready, authenticated } = usePrivy();
  const isConnected = ready && authenticated;
  const [moduleAddress, setModuleAddress] = useState(
    () => localStorage.getItem("moduleAddress") || "",
  );

  const {
    loading,
    error: contractError,
    getContractState,
    initiateClaim,
    signClaim,
    executePayout,
  } = useInheritance(moduleAddress);

  type ContractState = Awaited<ReturnType<typeof getContractState>>;
  const [contractState, setContractState] = useState<ContractState>(null);
  const [now, setNow] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Sincronizar dirección del módulo en localStorage
  useEffect(() => {
    localStorage.setItem("moduleAddress", moduleAddress);
  }, [moduleAddress]);

  // Cargar estado de la blockchain
  const reloadData = useCallback(async () => {
    if (moduleAddress) {
      setError(null);
      const state = await getContractState();
      if (state) {
        setContractState(state);
        setNow(Math.floor(Date.now() / 1000));
      } else {
        setError("No se pudo conectar con el contrato. Verifica la dirección.");
      }
    }
  }, [moduleAddress, getContractState]);

  useEffect(() => {
    if (moduleAddress) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void reloadData();
    }
  }, [moduleAddress, isConnected, reloadData]);

  // Funciones de acción de herencia
  const handleInitiate = async () => {
    try {
      setError(null);
      await initiateClaim();
      alert("¡Reclamación de herencia iniciada en blockchain!");
      await reloadData();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al iniciar la reclamación.",
      );
    }
  };

  const handleSign = async () => {
    try {
      setError(null);
      await signClaim();
      alert("¡Firma registrada con éxito en el contrato!");
      await reloadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al firmar.");
    }
  };

  const handleExecute = async () => {
    try {
      setError(null);
      await executePayout();
      alert("¡Herencia ejecutada! Los fondos se han distribuido.");
      await reloadData();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al ejecutar la distribución.",
      );
    }
  };

  // Cálculos de inactividad
  const secondsElapsed = contractState
    ? now - contractState.lastProofOfLife
    : 0;
  const isInactive = contractState
    ? secondsElapsed > contractState.inactivityThreshold
    : false;

  // Período de gracia de 14 días (1,209,600 segundos)
  const GRACE_PERIOD = 14 * 86400;
  const graceEnd =
    contractState && contractState.claimStartTimestamp > 0
      ? contractState.claimStartTimestamp + GRACE_PERIOD
      : 0;
  const isGraceFinished = graceEnd > 0 && now > graceEnd;

  return (
    <div className="page-container">
      <h1 className="title-gradient">Portal de Reclamaciones</h1>
      <p className="subtitle">
        Espacio para que los beneficiarios configuren, co-firmen y ejecuten
        herencias.
      </p>

      {error && (
        <div className="alert alert-error">
          <AlertCircle /> {error}
        </div>
      )}
      {contractError && (
        <div className="alert alert-error">
          <AlertCircle /> {contractError}
        </div>
      )}

      <div className="grid-layout">
        {/* Panel de sincronización del módulo */}
        <div className="card shadow-premium">
          <h2>
            <Key className="icon-title" /> Módulo de Referencia
          </h2>
          <div className="form-group">
            <label>Dirección del Módulo de Herencia:</label>
            <input
              type="text"
              placeholder="0x..."
              value={moduleAddress}
              onChange={(e) => setModuleAddress(e.target.value)}
            />
          </div>
          <button
            className="btn btn-secondary w-full"
            onClick={reloadData}
            disabled={loading}
          >
            <RefreshCw className={`icon-btn ${loading ? "spin" : ""}`} />{" "}
            Sincronizar Contrato
          </button>
        </div>

        {/* Panel de Reglas del Contrato */}
        <div className="card shadow-premium">
          <h2>
            <Clock className="icon-title" /> Estado de Inactividad
          </h2>

          {!moduleAddress ? (
            <div className="alert alert-info">
              <HelpCircle /> Ingresa la dirección del módulo para ver el estado
              del titular.
            </div>
          ) : !contractState ? (
            <div className="alert alert-warning">
              <RefreshCw className="spin" /> Cargando estado desde blockchain...
            </div>
          ) : (
            <div className="status-details">
              <div className="status-row">
                <span>Tiempo de Inactividad Actual:</span>
                <span
                  className={`badge ${isInactive ? "badge-error" : "badge-success"}`}
                >
                  {(secondsElapsed / 86400).toFixed(1)} días transcurridos
                </span>
              </div>
              <div className="status-row">
                <span>Umbral de Seguridad:</span>
                <span>
                  {(contractState.inactivityThreshold / 86400).toFixed(1)} días
                </span>
              </div>
              <div className="status-row">
                <span>Último contacto:</span>
                <span>
                  {new Date(
                    contractState.lastProofOfLife * 1000,
                  ).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fase de Reclamación Activa */}
      {contractState && (
        <div className="card shadow-premium mt-6">
          <h2>
            <Users className="icon-title" /> Fase de Reclamación y Quórum
          </h2>

          {contractState.claimStartTimestamp === 0 ? (
            <div className="text-center py-6">
              <h3>Bóveda en Estado Seguro</h3>
              <p className="description">
                El titular se encuentra activo. No se ha iniciado ninguna
                reclamación.
              </p>
              {isInactive ? (
                <button
                  className="btn btn-primary mt-4 btn-large"
                  onClick={handleInitiate}
                  disabled={loading}
                >
                  {loading ? (
                    <RefreshCw className="spin" />
                  ) : (
                    "Iniciar Reclamación de Herencia"
                  )}
                </button>
              ) : (
                <div className="alert alert-info mt-4 inline-block">
                  <Clock /> La reclamación podrá iniciarse si el titular pasa{" "}
                  {(
                    (contractState.inactivityThreshold - secondsElapsed) /
                    86400
                  ).toFixed(1)}{" "}
                  días más inactivo.
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="claim-active-badge">
                <AlertCircle className="icon-alert text-orange" />
                <div>
                  <strong>Reclamación en Curso (Fase de Gracia Activa)</strong>
                  <p>
                    Iniciada el:{" "}
                    {new Date(
                      contractState.claimStartTimestamp * 1000,
                    ).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="proof-metrics mt-6">
                <div className="metric">
                  <span className="metric-label">Firmas Registradas:</span>
                  <span className="metric-value">
                    {contractState.signedHeirsCount} /{" "}
                    {contractState.quorumRequired}
                  </span>
                </div>
                <div className="metric">
                  <span className="metric-label">
                    Fin del Período de Gracia:
                  </span>
                  <span
                    className={`metric-value ${isGraceFinished ? "text-red" : "text-green"}`}
                  >
                    {new Date(graceEnd * 1000).toLocaleString()}
                  </span>
                </div>
                <div className="metric">
                  <span className="metric-label">Tu Configuración:</span>
                  <span className="metric-value">
                    {contractState.userHeirConfig &&
                    contractState.userHeirConfig.weight > 0 ? (
                      <span className="badge badge-success-filled">
                        Heredero (
                        {(contractState.userHeirConfig.weight / 100).toFixed(1)}
                        %)
                      </span>
                    ) : (
                      <span className="badge badge-error">No designado</span>
                    )}
                  </span>
                </div>
              </div>

              <div className="action-buttons-group mt-6">
                {/* Botón para Firmar */}
                {contractState.userHeirConfig &&
                  contractState.userHeirConfig.weight > 0 &&
                  !contractState.userHeirConfig.hasSigned && (
                    <button
                      className="btn btn-secondary w-full"
                      onClick={handleSign}
                      disabled={loading}
                    >
                      {loading ? (
                        <RefreshCw className="spin" />
                      ) : (
                        "Co-firmar Reclamación"
                      )}
                    </button>
                  )}

                {/* Botón para Ejecutar Payout */}
                {contractState.signedHeirsCount >=
                  contractState.quorumRequired && (
                  <div className="payout-box text-center w-full">
                    {!isGraceFinished ? (
                      <div className="alert alert-info">
                        <Clock /> El quórum está completo. Los fondos podrán
                        liberarse cuando finalice el período de gracia.
                      </div>
                    ) : (
                      <button
                        className="btn btn-primary w-full btn-large"
                        onClick={handleExecute}
                        disabled={loading}
                      >
                        <Coins className="icon-btn" />{" "}
                        {loading ? (
                          <RefreshCw className="spin" />
                        ) : (
                          "Ejecutar Payout y Cerrar Herencia"
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
