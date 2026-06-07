import React from "react";
import ReactDOM from "react-dom/client";
import { PrivyProvider } from "@privy-io/react-auth";
import { sepolia } from "viem/chains";
import App from "./App";
import "./index.css";

// Reemplaza esto con tu App ID del Dashboard de Privy
const PRIVY_APP_ID = "cmq2a5f5801bm0cjstmh8yogw";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["email", "google"], // Login rápido por email o Gmail
        defaultChain: sepolia,
        supportedChains: [sepolia],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets", // Crea una wallet Sepolia automáticamente si el usuario no tiene una
          },
        },
        appearance: {
          theme: "dark",
          accentColor: "#aa3bff", // Sintonizado con tu color de acento morado
          showWalletLoginFirst: false,
        },
      }}
    >
      <App />
    </PrivyProvider>
  </React.StrictMode>,
);
