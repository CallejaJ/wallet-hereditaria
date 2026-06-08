import { useState, useCallback } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  parseAbi,
} from "viem";
import { sepolia } from "viem/chains";

const INHERITANCE_MODULE_ABI = parseAbi([
  "function lastProofOfLife() external view returns (uint256)",
  "function inactivityThreshold() external view returns (uint256)",
  "function claimStartTimestamp() external view returns (uint256)",
  "function quorumRequired() external view returns (uint256)",
  "function signedHeirsCount() external view returns (uint256)",
  "function heirs(address heir) external view returns (uint256 weight, bool hasSigned)",
  "function submitProofOfLife() external",
  "function initiateClaim() external",
  "function signClaim() external",
  "function executePayout() external",
]);

// Cliente público estático para lecturas instantáneas en Sepolia (sin depender de Wagmi)
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
});

export function useInheritance(moduleAddress?: string) {
  const { user } = usePrivy();
  const address = user?.wallet?.address;
  const { wallets } = useWallets();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Obtiene el cliente de firma de la wallet embebida de Privy
  const getWalletClient = async () => {
    const embeddedWallet =
      wallets.find((w) => w.walletClientType === "privy") || wallets[0];
    if (!embeddedWallet) throw new Error("No hay wallet embebida conectada");

    const provider = await embeddedWallet.getEthereumProvider();
    return createWalletClient({
      account: embeddedWallet.address as `0x${string}`,
      chain: sepolia,
      transport: custom(provider),
    });
  };

  // Leer estado del contrato on-chain
  const getContractState = useCallback(async () => {
    if (!moduleAddress) return null;
    try {
      const [
        lastProofOfLife,
        inactivityThreshold,
        claimStartTimestamp,
        quorumRequired,
        signedHeirsCount,
      ] = await Promise.all([
        publicClient.readContract({
          address: moduleAddress as `0x${string}`,
          abi: INHERITANCE_MODULE_ABI,
          functionName: "lastProofOfLife",
        }),
        publicClient.readContract({
          address: moduleAddress as `0x${string}`,
          abi: INHERITANCE_MODULE_ABI,
          functionName: "inactivityThreshold",
        }),
        publicClient.readContract({
          address: moduleAddress as `0x${string}`,
          abi: INHERITANCE_MODULE_ABI,
          functionName: "claimStartTimestamp",
        }),
        publicClient.readContract({
          address: moduleAddress as `0x${string}`,
          abi: INHERITANCE_MODULE_ABI,
          functionName: "quorumRequired",
        }),
        publicClient.readContract({
          address: moduleAddress as `0x${string}`,
          abi: INHERITANCE_MODULE_ABI,
          functionName: "signedHeirsCount",
        }),
      ]);

      let userHeirConfig = null;
      if (address) {
        const result = await publicClient.readContract({
          address: moduleAddress as `0x${string}`,
          abi: INHERITANCE_MODULE_ABI,
          functionName: "heirs",
          args: [address as `0x${string}`],
        });

        const [weight, hasSigned] = result;
        userHeirConfig = { weight: Number(weight), hasSigned };
      }

      return {
        lastProofOfLife: Number(lastProofOfLife),
        inactivityThreshold: Number(inactivityThreshold),
        claimStartTimestamp: Number(claimStartTimestamp),
        quorumRequired: Number(quorumRequired),
        signedHeirsCount: Number(signedHeirsCount),
        userHeirConfig,
      };
    } catch (err) {
      console.error("Error al leer estado del módulo:", err);
      return null;
    }
  }, [moduleAddress, address, publicClient]);

  // Enviar Proof of Life (Titular)
  const submitProofOfLife = async () => {
    if (!moduleAddress || !address) throw new Error("No conectado");
    try {
      setLoading(true);
      setError(null);

      const walletClient = await getWalletClient();
      const { request } = await publicClient.simulateContract({
        account: address as `0x${string}`,
        address: moduleAddress as `0x${string}`,
        abi: INHERITANCE_MODULE_ABI,
        functionName: "submitProofOfLife",
      });

      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    } catch (err) {
      const errorWithMsg = err as { shortMessage?: string; message?: string };
      setError(
        errorWithMsg.shortMessage ||
          errorWithMsg.message ||
          "Error al enviar fe de vida",
      );
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Iniciar reclamación (Heredero)
  const initiateClaim = async () => {
    if (!moduleAddress || !address) throw new Error("No conectado");
    try {
      setLoading(true);
      setError(null);

      const walletClient = await getWalletClient();
      const { request } = await publicClient.simulateContract({
        account: address as `0x${string}`,
        address: moduleAddress as `0x${string}`,
        abi: INHERITANCE_MODULE_ABI,
        functionName: "initiateClaim",
      });

      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    } catch (err) {
      const errorWithMsg = err as { shortMessage?: string; message?: string };
      setError(
        errorWithMsg.shortMessage ||
          errorWithMsg.message ||
          "Error al iniciar reclamación",
      );
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Firmar/Co-firmar reclamación activa (Heredero)
  const signClaim = async () => {
    if (!moduleAddress || !address) throw new Error("No conectado");
    try {
      setLoading(true);
      setError(null);

      const walletClient = await getWalletClient();
      const { request } = await publicClient.simulateContract({
        account: address as `0x${string}`,
        address: moduleAddress as `0x${string}`,
        abi: INHERITANCE_MODULE_ABI,
        functionName: "signClaim",
      });

      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    } catch (err) {
      const errorWithMsg = err as { shortMessage?: string; message?: string };
      setError(
        errorWithMsg.shortMessage ||
          errorWithMsg.message ||
          "Error al co-firmar",
      );
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Ejecutar Payout de herencia (Heredero)
  const executePayout = async () => {
    if (!moduleAddress || !address) throw new Error("No conectado");
    try {
      setLoading(true);
      setError(null);

      const walletClient = await getWalletClient();
      const { request } = await publicClient.simulateContract({
        account: address as `0x${string}`,
        address: moduleAddress as `0x${string}`,
        abi: INHERITANCE_MODULE_ABI,
        functionName: "executePayout",
      });

      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    } catch (err) {
      const errorWithMsg = err as { shortMessage?: string; message?: string };
      setError(
        errorWithMsg.shortMessage ||
          errorWithMsg.message ||
          "Error al ejecutar la distribución",
      );
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    getContractState,
    submitProofOfLife,
    initiateClaim,
    signClaim,
    executePayout,
  };
}
