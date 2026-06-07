import { http, createConfig } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const config = createConfig({
  chains: [sepolia],
  connectors: [
    injected(), // Conexión a MetaMask, Rabby, Safe Wallet, etc.
  ],
  transports: {
    [sepolia.id]: http(),
  },
});
