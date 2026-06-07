import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";

import {
  UploadCloud,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Key,
  Users,
} from "lucide-react";

export function Register() {
  const { authenticated } = usePrivy();
  const isConnected = authenticated;

  const [safeAddress, setSafeAddress] = useState(
    () => localStorage.getItem("safeAddress") || "",
  );
  const [moduleAddress, setModuleAddress] = useState(
    () => localStorage.getItem("moduleAddress") || "",
  );

  // Parámetros de la Herencia
  const [certificatePem, setCertificatePem] = useState("");
  const [certFileName, setCertFileName] = useState("");
  const [heirs, setHeirs] = useState<string[]>([""]);
  const [weights, setWeights] = useState<number[]>([10000]); // En puntos básicos (BPS), ej: 10000 = 100%
  const [inactivityDays, setInactivityDays] = useState(180); // Defecto 6 meses (180 días)
  const [quorum, setQuorum] = useState(1);

  // Estados de carga e info
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  interface OracleConfigureResponse {
    isValid: boolean;
    subject: string;
    configTxHash?: string;
    safeTxHash?: string;
    dryRun?: boolean;
    message: string;
  }

  const [successData, setSuccessData] =
    useState<OracleConfigureResponse | null>(null);

  // Sincronizar localStorage
  useEffect(() => {
    localStorage.setItem("safeAddress", safeAddress);
  }, [safeAddress]);

  useEffect(() => {
    localStorage.setItem("moduleAddress", moduleAddress);
  }, [moduleAddress]);

  // Manejar subida de archivo PEM
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCertFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCertificatePem(text);
    };
    reader.readAsText(file);
  };

  // Añadir / remover herederos
  const addHeir = () => {
    setHeirs([...heirs, ""]);
    setWeights([...weights, 0]);
  };

  const removeHeir = (index: number) => {
    const newHeirs = heirs.filter((_, i) => i !== index);
    const newWeights = weights.filter((_, i) => i !== index);
    setHeirs(newHeirs);
    setWeights(newWeights);
  };

  const updateHeirAddress = (index: number, val: string) => {
    const newHeirs = [...heirs];
    newHeirs[index] = val;
    setHeirs(newHeirs);
  };

  const updateHeirWeight = (index: number, percent: number) => {
    const newWeights = [...weights];
    newWeights[index] = Math.round(percent * 100); // Guardar en BPS
    setWeights(newWeights);
  };

  // Enviar configuración al Oráculo
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessData(null);

    // Validaciones locales rápidas
    if (!safeAddress || !moduleAddress) {
      setError("La dirección de la Safe y del Módulo son obligatorias.");
      return;
    }
    if (!certificatePem) {
      setError("Debes cargar el certificado notarial digital (PEM).");
      return;
    }

    const totalWeight = weights.reduce((acc, curr) => acc + curr, 0);
    if (totalWeight !== 10000) {
      setError(
        `Los porcentajes deben sumar exactamente 100% (Suma actual: ${totalWeight / 100}%).`,
      );
      return;
    }

    if (quorum < 1 || quorum > heirs.length) {
      setError(
        `El quórum debe estar entre 1 y el número de herederos configurados (${heirs.length}).`,
      );
      return;
    }

    try {
      setLoading(true);
      const inactivityThresholdSeconds = inactivityDays * 86400; // Días a segundos

      const response = await fetch("http://localhost:3001/oracle/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          certificatePem,
          safeAddress,
          moduleAddress,
          heirs,
          weights,
          inactivityThreshold: inactivityThresholdSeconds,
          quorum,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error || "Error al configurar la herencia en el Oráculo.",
        );
      }

      setSuccessData(data);
    } catch (err) {
      console.error(err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Error de comunicación con el Oráculo.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <h1 className="title-gradient">Registrar Herencia</h1>
      <p className="subtitle">
        Configura tus herederos y vincula el certificado notarial validador.
      </p>

      {error && (
        <div className="alert alert-error">
          <AlertCircle /> {error}
        </div>
      )}

      {successData && (
        <div className="alert alert-success mt-4">
          <CheckCircle />
          <div>
            <strong>¡Configuración Registrada con Éxito!</strong>
            <p>Sujeto validado: {successData.subject}</p>
            <p className="small">
              Hash Tx Configuración:{" "}
              <span className="mono">
                {successData.configTxHash || "Simulado"}
              </span>
            </p>
            <p className="mt-2">
              <strong>Siguiente paso:</strong> Ve a "Mi Safe" (Dashboard) para
              firmar y habilitar la instalación del módulo.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleRegister} className="grid-layout">
        {/* Sección 1: Datos Base y Certificado */}
        <div className="card shadow-premium">
          <h2>
            <Key className="icon-title" /> Parámetros Técnicos
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

          <div className="form-group mt-6">
            <label>Certificado Notarial PKI (.pem):</label>
            <div className="file-upload-box">
              <UploadCloud className="upload-icon" />
              <span>{certFileName || "Selecciona tu certificado digital"}</span>
              <input
                title="Selecciona tu certificado digital en formato PEM"
                type="file"
                accept=".pem,.crt"
                onChange={handleFileUpload}
              />
            </div>
            {certificatePem && (
              <span className="badge badge-success mt-2">
                Certificado cargado correctamente
              </span>
            )}
          </div>
        </div>

        {/* Sección 2: Herederos y Distribución */}
        <div className="card shadow-premium">
          <h2>
            <Users className="icon-title" /> Herederos y Reglas
          </h2>

          <div className="form-group">
            <label>Tiempo de Inactividad para Desencadenar (Días):</label>
            <input
              title="Número de días sin actividad para que el Oráculo considere la cuenta inactiva y permita el retiro por parte de los herederos."
              type="number"
              min="1"
              value={inactivityDays}
              onChange={(e) => setInactivityDays(Number(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label>Quórum de Firmas para Retiro:</label>
            <input
              title="Número mínimo de herederos que deben firmar para autorizar el retiro de los activos. Debe ser al menos 1 y no puede exceder el número total de herederos configurados."
              type="number"
              min="1"
              max={heirs.length}
              value={quorum}
              onChange={(e) => setQuorum(Number(e.target.value))}
            />
          </div>

          <div className="heirs-header mt-6">
            <h3>Distribución de Activos</h3>
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={addHeir}
            >
              + Heredero
            </button>
          </div>

          <div className="heirs-list">
            {heirs.map((heir, idx) => (
              <div key={idx} className="heir-row">
                <div className="form-group flex-3">
                  <input
                    type="text"
                    placeholder="Dirección del heredero 0x..."
                    value={heir}
                    onChange={(e) => updateHeirAddress(idx, e.target.value)}
                  />
                </div>
                <div className="form-group flex-1">
                  <input
                    type="number"
                    placeholder="Peso %"
                    min="0"
                    max="100"
                    value={Math.round(weights[idx] / 100)}
                    onChange={(e) =>
                      updateHeirWeight(idx, Number(e.target.value))
                    }
                  />
                </div>
                {heirs.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-error btn-small"
                    onClick={() => removeHeir(idx)}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full mt-6 btn-large"
            disabled={loading || !isConnected}
          >
            {loading ? (
              <RefreshCw className="spin" />
            ) : (
              "Registrar y Proponer Herencia"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
