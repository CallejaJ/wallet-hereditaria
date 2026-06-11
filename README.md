# Wallet hereditaria con Safe

<div align="left">
    <img src="https://img.shields.io/badge/Solidity-0.8-363636?style=for-the-badge&logo=solidity" alt="Solidity" />
    <img src="https://img.shields.io/badge/Safe-Smart%20Account-121212?style=for-the-badge&logo=gnosis" alt="Safe Smart Account" />
    <img src="https://img.shields.io/badge/Ethereum-Sepolia%20Testnet-627EEA?style=for-the-badge&logo=ethereum" alt="Sepolia" />
    <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=nodedotjs" alt="Node.js" />
</div>

<p align="left">
    <i>Módulo para Safe que combina validación notarial PKI, quórum multi-firma de herederos y reclamaciones gasless patrocinadas mediante Safe Relay Kit en Ethereum Sepolia Testnet.</i>
</p>

## Actores del Sistema

El modelo de Wallet hereditaria con Safe tiene cuatro tipos de participantes con responsabilidades distintas:

| Actor            | Rol                                | Acción principal                                    | Necesita ETH |
| ---------------- | ---------------------------------- | --------------------------------------------------- | ------------ |
| **Titular**      | Propietario de la Safe Account     | `submitProofOfLife()` periódicamente                | Sí (para configurar) |
| **Beneficiario** | Heredero designado con peso (%)    | `signClaim()`, `executePayout()`                    | No — gasless |
| **Oráculo PKI**  | Validador del certificado notarial | `configureInheritance()`, `revalidateCertificate()` | No           |
| **Relay / Sponsor** | Patrocinador de gas             | Sponsorea `UserOperation` vía Safe Relay Kit        | Sí (propio)  |

## InheritanceModule

El **InheritanceModule** es el contrato de herencia que se instala como un **Safe Module** (implementa `ISafe` / `IModule`) en la cuenta Safe del titular. Delegando la smart account en la infraestructura probada de Safe, el módulo se encarga exclusivamente de la lógica de inactividad, quórum de herederos y distribución de activos.

| Función                   | Llamada por  | Efecto                                                                |
| ------------------------- | ------------ | --------------------------------------------------------------------- |
| `configureInheritance()`  | Oráculo      | Configura beneficiarios, pesos (BPS), umbral de inactividad y quórum   |
| `submitProofOfLife()`     | Titular      | Resetea inactividad; cancela reclamación activa si existe             |
| `initiateClaim()`         | Beneficiario | Inicia el período de gracia tras superar el umbral de inactividad     |
| `signClaim()`             | Beneficiario | Registra la firma y co-firma de reclamaciones vía Safe API Kit        |
| `executePayout()`         | Beneficiario | Distribuye ETH + ERC-20 atómicamente y desinstala el módulo            |
| `cancelClaim()`           | Titular      | Cancela reclamación activa dentro del período de gracia (14 días)     |
| `revalidateCertificate()` | Oráculo      | Actualiza certificado y beneficiarios sin reinstalar el módulo        |

## Flujo de Herencia

El ciclo de vida del módulo sigue cinco estados secuenciales on-chain:

1. **INITIALIZATION**: Oráculo llama `configureInheritance()` con certificado notarial verificado.
2. **ACTIVE**: Módulo instalado. El titular envía prueba de vida periódicamente (`submitProofOfLife()`).
3. **CLAIM PHASE**: La inactividad supera el umbral. Beneficiarios inician y co-firman la reclamación.
4. **EXECUTION**: Quórum alcanzado dentro del período de gracia de 14 días. Ejecución atómica del payout.
5. **CANCELLED**: El titular cancela la reclamación durante el período de gracia si fue un falso positivo.

## Integración Gasless y Safe SDKs

Para optimizar la experiencia de usuario y eliminar la necesidad de que los herederos posean ETH para reclamar sus activos:

* **Safe Relay Kit (Gelato / ERC-4337)**: Sponsoriza el gas de las transacciones ejecutadas por los beneficiarios (`signClaim()`, `executePayout()`).
* **Safe API Kit / Transaction Service**: Permite coordinar y recolectar las firmas off-chain de los beneficiarios antes de ejecutar el payout on-chain.
* **Safe Protocol Kit**: Se utiliza en el frontend para inicializar la Safe, desplegarla y gestionar la instalación del módulo de herencia.

## System Architecture

| Component             | Role                                                                               |
| --------------------- | ---------------------------------------------------------------------------------- |
| **Safe Account**      | Smart Account multifirma estándar del titular que custodia los activos.            |
| **InheritanceModule** | Módulo de herencia instalado en la Safe para gestionar la inactividad y los payouts.|
| **Oráculo PKI**       | Servidor backend off-chain que verifica firmas criptográficas de certificados.     |
| **Safe API Kit**      | Conector con el Safe Transaction Service para proponer transacciones y firmas.    |
| **Safe Relay Kit**    | Sponsorizador de transacciones gasless para los beneficiarios.                     |
| **Frontend React**    | dApp para el titular (gestión de fe de vida, configuración) y herederos (reclamos).|

## Technology Stack

- **Smart Accounts**: Safe Accounts (on-chain contracts)
- **Blockchain Contracts**: Solidity 0.8, Foundry (entorno de pruebas en `contracts/`)
- **Frontend**: React 18, TypeScript 5, `@safe-global/protocol-kit`, `@safe-global/relay-kit`, `@safe-global/api-kit`, wagmi, viem
- **Backend/Oráculo**: Node.js 20, TypeScript, validación de certificados PKI X.509
- **Testnet**: Ethereum Sepolia Testnet
## Documentación del Proyecto

Toda la documentación conceptual, estratégica y técnica está disponible tanto en formato markdown local como compilada visualmente en el sitio de **GitHub Pages**:

**Sitio Web de Documentación**: [https://callejaj.github.io/legacy-wallet/](https://callejaj.github.io/legacy-wallet/)

### Índice de Guías y Especificaciones

| Documento | Enlace GitHub Pages (Recomendado) | Enlace Archivo Local (Markdown) |
| :--- | :--- | :--- |
| **Guía de Despliegue de la dApp** | [Ver en GitHub Pages](https://callejaj.github.io/legacy-wallet/GUIA_DESPLIEGUE.html) | [GUIA_DESPLIEGUE.md](GUIA_DESPLIEGUE.md) |
| **Inicio y Concepto** | [Ver en GitHub Pages](https://callejaj.github.io/legacy-wallet/docs/inicio/) | [docs/inicio.md](docs/inicio.md) |
| **Brainstorming Estratégico** | [Ver en GitHub Pages](https://callejaj.github.io/legacy-wallet/docs/brainstorming/) | [docs/brainstorming.md](docs/brainstorming.md) |
| **Especificación Técnica** | [Ver en GitHub Pages](https://callejaj.github.io/legacy-wallet/docs/especificacion-tecnica/) | [docs/especificacion-tecnica.md](docs/especificacion-tecnica.md) |
| **ERC-4337 (EOA vs Smart Accounts)** | [Ver en GitHub Pages](https://callejaj.github.io/legacy-wallet/docs/erc4337-flujos/) | [docs/erc4337-flujos.md](docs/erc4337-flujos.md) |
| **Roadmap del Monorrepo** | [Ver en GitHub Pages](https://callejaj.github.io/legacy-wallet/docs/roadmap/) | [docs/roadmap.md](docs/roadmap.md) |
| **Planificación y Arquitectura con Safe** | [Ver en GitHub Pages](https://callejaj.github.io/legacy-wallet/docs/planificacion/) | [docs/planificacion.md](docs/planificacion.md) |
| **Presentación (Formato Slides/Obsidian)** | [Ver en GitHub Pages](https://callejaj.github.io/legacy-wallet/docs/presentacion-obsidian/) | [docs/presentacion-obsidian.md](docs/presentacion-obsidian.md) |
| **Flujo Comparativo Detallado** | [Ver en GitHub Pages](https://callejaj.github.io/legacy-wallet/docs/ERC4337_EOA_vs_SmartAccounts/) | [docs/ERC4337_EOA_vs_SmartAccounts.md](docs/ERC4337_EOA_vs_SmartAccounts.md) |

---

## Project Setup

El proyecto está organizado de forma monorrepo:
- `contracts/`: Suite de contratos Foundry.
- `backend/`: API Oráculo Node.js y validación PKI.
- `frontend/`: Aplicación cliente React + Safe SDKs.

### Configuración del Entorno

1. Instala dependencias del monorrepo:
   ```bash
   npm install
   ```

2. Configura el archivo `.env` en cada componente según sus necesidades (por ejemplo, `PRIVATE_KEY`, `RPC_URL_SEPOLIA`, etc.).

3. Para trabajar con smart contracts:
   ```bash
   cd contracts
   forge install
   forge test
   ```

---

## Deployment

El proyecto está desplegado con arquitectura separada: frontend estático en **Vercel** y backend API en **Render**.

| Servicio | Plataforma | URL |
| --- | --- | --- |
| Frontend | Vercel | [https://legacy-wallet-uma.vercel.app](https://legacy-wallet-uma.vercel.app) |
| Backend / Oráculo | Render | [https://legacy-wallet-backend.onrender.com](https://legacy-wallet-backend.onrender.com) |

### Frontend (Vercel)

- **Root Directory**: `frontend`
- **Framework**: Vite
- **Install Command**: `npm install --legacy-peer-deps` (o usar `.npmrc` con `legacy-peer-deps=true`)
- **Build Command**: `tsc -b && vite build`
- **Variables de entorno**:
  | Variable | Descripción |
  | --- | --- |
  | `VITE_ORACLE_API_URL` | URL del backend/oráculo (ej: `https://legacy-wallet-backend.onrender.com`) |

### Backend (Render)

- **Root Directory**: `backend`
- **Runtime**: Node
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start`
- **Variables de entorno**:
  | Variable | Descripción |
  | --- | --- |
  | `PORT` | Puerto del servidor (default: `3001`) |
  | `RPC_URL_SEPOLIA` | URL del nodo RPC de Sepolia |
  | `ORACLE_PRIVATE_KEY` | Clave privada de la wallet del oráculo |

---

Built for Ethereum / Safe — Jorge Calleja.
