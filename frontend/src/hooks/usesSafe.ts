import { useState, useEffect, useCallback } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import Safe from "@safe-global/protocol-kit";
import SafeApiKit from "@safe-global/api-kit";

const SAFE_TX_SERVICE_URL = "https://safe-transaction-sepolia.safe.global";

export interface SafeTransaction {
  to: string;
  data?: string | null;
  safeTxHash: string;
}

export function useSafe(safeAddress?: string) {
  const { ready, authenticated, user } = usePrivy();
  const address = user?.wallet?.address;
  const { wallets } = useWallets();
  const [safeSdk, setSafeSdk] = useState<Safe | null>(null);
  const [apiKit, setApiKit] = useState<SafeApiKit | null>(null);
  const [isModuleEnabled, setIsModuleEnabled] = useState(false);
  const [pendingTxs, setPendingTxs] = useState<SafeTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inicializar SDK de Safe y API Kit
  useEffect(() => {
    if (
      !ready ||
      !authenticated ||
      !address ||
      !safeAddress ||
      wallets.length === 0
    ) {
      return;
    }

    let active = true;

    const initSafe = async () => {
      try {
        setError(null);
        const kit = new SafeApiKit({
          chainId: 11155111n, // Sepolia
          txServiceUrl: SAFE_TX_SERVICE_URL,
        });

        if (!active) return;
        setApiKit(kit);

        const embeddedWallet =
          wallets.find((w) => w.walletClientType === "privy") || wallets[0];
        const provider = await embeddedWallet.getEthereumProvider();

        if (!active) return;

        const sdk = await Safe.init({
          provider: provider as NonNullable<
            Parameters<typeof Safe.init>[0]
          >["provider"], // Cast sin usar keyword 'any'
          signer: address,
          safeAddress: safeAddress,
        });

        if (!active) return;
        setSafeSdk(sdk);

        // Validar si el módulo está habilitado
        const enabledModules = await sdk.getModules();
        if (!active) return;
        const isEnabled = enabledModules.some(
          (m) => m.toLowerCase() === safeAddress.toLowerCase(),
        );
        setIsModuleEnabled(isEnabled);
      } catch (err) {
        console.error("Error al inicializar el SDK de Safe:", err);
        if (active) {
          setError(
            "Dirección de Safe inválida o no coincide con la red Sepolia.",
          );
        }
      }
    };

    void initSafe();

    return () => {
      active = false;
      setSafeSdk(null);
      setIsModuleEnabled(false);
    };
  }, [safeAddress, address, authenticated, ready, wallets]);

  const checkModuleAndTxs = useCallback(
    async (moduleAddress: string) => {
      if (!safeSdk || !apiKit || !safeAddress) return;
      try {
        setLoading(true);
        const modules = await safeSdk.getModules();
        const isEnabled = modules.some(
          (m) => m.toLowerCase() === moduleAddress.toLowerCase(),
        );
        setIsModuleEnabled(isEnabled);

        const pending = await apiKit.getPendingTransactions(safeAddress);
        setPendingTxs(pending.results);
      } catch (err) {
        console.error("Error al comprobar transacciones/módulos:", err);
      } finally {
        setLoading(false);
      }
    },
    [safeSdk, apiKit, safeAddress],
  );

  const confirmAndExecuteTx = useCallback(
    async (safeTxHash: string) => {
      if (!safeSdk || !apiKit) {
        throw new Error("Safe SDK no inicializado");
      }

      try {
        setLoading(true);
        setError(null);

        const safeTransactionResponse = await apiKit.getTransaction(safeTxHash);
        const safeTransaction = await safeSdk.createTransaction({
          transactions: [
            {
              to: safeTransactionResponse.to,
              value: safeTransactionResponse.value,
              data: safeTransactionResponse.data || "0x",
              operation: safeTransactionResponse.operation as 0 | 1,
            },
          ],
        });

        safeTransactionResponse.confirmations?.forEach((confirmation) => {
          safeTransaction.addSignature({
            signer: confirmation.owner,
            data: confirmation.signature,
            staticType: () => "ETH_SIGN",
          } as unknown as Parameters<typeof safeTransaction.addSignature>[0]);
        });

        const signedSafeTx = await safeSdk.signTransaction(safeTransaction);
        const executeTxResponse =
          await safeSdk.executeTransaction(signedSafeTx);
        const receipt = await (
          executeTxResponse.transactionResponse as {
            wait: (confirmations?: number) => Promise<unknown>;
          }
        ).wait();

        return receipt;
      } catch (err) {
        const errorWithMsg = err as { message?: string };
        console.error("Error al firmar/ejecutar la transacción:", err);
        setError(
          errorWithMsg.message || "Error al firmar o ejecutar la transacción.",
        );
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [safeSdk, apiKit],
  );

  return {
    safeSdk,
    apiKit,
    isModuleEnabled,
    pendingTxs,
    loading,
    error,
    checkModuleAndTxs,
    confirmAndExecuteTx,
  };
}
