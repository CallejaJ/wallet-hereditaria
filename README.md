# Fortris

<div align="left">
    <img src="https://img.shields.io/badge/Solidity-0.8-363636?style=for-the-badge&logo=solidity" alt="Solidity" />
    <img src="https://img.shields.io/badge/ERC--4337-Account%20Abstraction-3C3C3D?style=for-the-badge&logo=ethereum" alt="ERC-4337" />
    <img src="https://img.shields.io/badge/Ethereum-Mainnet-627EEA?style=for-the-badge&logo=ethereum" alt="Ethereum" />
    <img src="https://img.shields.io/badge/Polygon-PoS-8247E5?style=for-the-badge&logo=polygon" alt="Polygon" />
    <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=nodedotjs" alt="Node.js" />
    <img src="https://img.shields.io/badge/Passkeys-WebAuthn-FF6B35?style=for-the-badge" alt="Passkeys" />
</div>

<p align="left">
    <i>Módulo ERC-4337 de herencia digital que combina validación notarial PKI, quórum multi-firma y reclamaciones gasless para herederos sin ETH propio.</i>
</p>

## Actores del Sistema

El modelo de Fortris tiene cuatro tipos de participantes con responsabilidades distintas. El **Titular** es el propietario de la smart account; los **Beneficiarios** son los herederos designados con pesos porcentuales; el **Oráculo** valida documentación notarial off-chain; el **Paymaster** cubre el gas de las operaciones de herencia.

| Actor            | Rol                                | Acción principal                                    | Necesita ETH |
| ---------------- | ---------------------------------- | --------------------------------------------------- | ------------ |
| **Titular**      | Propietario de la smart account    | `submitProofOfLife()` periódicamente                | Sí           |
| **Beneficiario** | Heredero designado con peso (%)    | `signClaim()`, `executePayout()`                    | No — gasless |
| **Oráculo PKI**  | Validador del certificado notarial | `configureInheritance()`, `revalidateCertificate()` | No           |
| **Paymaster**    | Patrocinador de gas                | Cubre `UserOperation` de herederos                  | Sí (propio)  |

## InheritanceModule

El **InheritanceModule** es el contrato central del sistema. Se instala como módulo en cualquier smart account compatible con ERC-4337 y gestiona el ciclo completo de herencia sin custodiar fondos directamente. La activación requiere un certificado notarial validado por el oráculo; sin él, el módulo no puede configurarse.

| Función                   | Llamada por  | Efecto                                                                |
| ------------------------- | ------------ | --------------------------------------------------------------------- |
| `configureInheritance()`  | Oráculo      | Instala herencia: beneficiarios, pesos, umbral de inactividad, quórum |
| `submitProofOfLife()`     | Titular      | Resetea contador de inactividad; cancela reclamación activa si existe |
| `initiateClaim()`         | Beneficiario | Abre fase de reclamación tras superar `inactivityThreshold`           |
| `signClaim()`             | Beneficiario | Registra co-firma; desbloquea `executePayout()` al alcanzar quórum    |
| `executePayout()`         | Beneficiario | Distribuye ETH y ERC-20 atómicamente según pesos; desinstala módulo   |
| `cancelClaim()`           | Titular      | Cancela reclamación activa dentro del período de gracia (14 días)     |
| `revalidateCertificate()` | Oráculo      | Actualiza certificado y beneficiarios sin reinstalar el módulo        |
| `uninstallModule()`       | Titular      | Revoca la herencia completamente                                      |

## Flujo de Herencia

El ciclo de vida del módulo sigue cinco estados secuenciales. El paso de ACTIVE a CLAIM PHASE es permissionless: cualquier beneficiario puede iniciarlo si el tiempo de inactividad supera el umbral configurado. El período de gracia de 14 días es la ventana en la que el titular puede cancelar si sigue vivo.

| Estado             | Condición de entrada                                          | Quién actúa                       |
| ------------------ | ------------------------------------------------------------- | --------------------------------- |
| **INITIALIZATION** | Oráculo llama `configureInheritance()` con certificado válido | Oráculo                           |
| **ACTIVE**         | Módulo instalado y herencia configurada                       | Titular (proof of life periódico) |
| **CLAIM PHASE**    | `block.timestamp > lastProofOfLife + inactivityThreshold`     | Beneficiarios (initiate + sign)   |
| **EXECUTION**      | Quórum de firmas alcanzado dentro del período de gracia       | Cualquier beneficiario            |
| **CANCELLED**      | Titular llama `cancelClaim()` durante el período de gracia    | Titular                           |

## Integración Gasless

Los herederos no necesitan ETH para reclamar. El **Paymaster** valida que el firmante es un beneficiario registrado con reclamación activa y patrocina el gas de `signClaim()` y `executePayout()`. Las firmas se realizan con **Passkeys** (WebAuthn / Face ID), eliminando la necesidad de gestionar claves privadas.

| Paso | Componente        | Acción                                                      |
| ---- | ----------------- | ----------------------------------------------------------- |
| 1    | Heredero          | Firma `UserOperation` con Passkey biométrico                |
| 2    | Bundler           | Recibe y valida la `UserOperation`                          |
| 3    | Paymaster         | Verifica beneficiario activo; aprueba sponsorización de gas |
| 4    | EntryPoint        | Ejecuta operación; Paymaster paga el fee                    |
| 5    | InheritanceModule | Registra firma; evalúa si se alcanzó el quórum              |

## System Architecture

| Component             | Role                                                                               |
| --------------------- | ---------------------------------------------------------------------------------- |
| **InheritanceModule** | Módulo ERC-4337 que gestiona el ciclo completo de herencia on-chain                |
| **EntryPoint**        | Contrato estándar ERC-4337 que valida firmas y despacha `UserOperation`            |
| **Oráculo PKI**       | Servicio off-chain que valida certificados notariales y configura el módulo        |
| **Paymaster**         | Contrato que sponsoriza el gas de operaciones de herencia para herederos           |
| **Bundler**           | Nodo que agrega y envía `UserOperation` al EntryPoint                              |
| **Frontend React**    | Interfaz del titular: gestión de herencia, proof of life y estado de reclamaciones |
| **Backend Node.js**   | API que conecta frontend con oráculo, bundler y validación PKI                     |

## Technology Stack

- **Blockchain**: Solidity 0.8, ERC-4337, Ethereum Mainnet / Polygon / Arbitrum
- **Smart Accounts**: Rhinestone, ZeroDev, Alchemy Light Account
- **Frontend**: React 18, TypeScript 5, Passkeys (WebAuthn)
- **Backend/API**: Node.js 20, validación PKI notarial
- **Oráculo**: Chainlink o implementación custom (a definir en Sprint 1)
- **Testing**: Foundry (contratos Solidity), Hardhat (integración JavaScript)
- **Despliegue**: GitHub Pages (documentación), testnet antes de Mainnet

## Key Features

1. **Gasless inheritance claims** — herederos firman con Passkeys y el Paymaster cubre el gas sin requerir ETH propio
2. **Dead-man's switch configurable** — la inactividad del titular más allá del umbral definido activa automáticamente la fase de reclamación
3. **Quórum multi-firma** — `executePayout()` requiere N co-firmas de herederos, eliminando reclamaciones unilaterales
4. **Validación notarial PKI** — el oráculo valida el certificado off-chain antes de poder configurar el módulo on-chain
5. **Payout atómico multi-asset** — una sola transacción distribuye ETH y múltiples ERC-20 en proporción a los pesos en BPS
6. **Período de gracia cancelable** — el titular puede revertir cualquier reclamación con `cancelClaim()` durante 14 días
7. **Revalidación de testamento** — el oráculo actualiza beneficiarios y certificado sin reinstalar el módulo
8. **Compatibilidad multi-chain** — desplegable en Ethereum, Polygon y Arbitrum sin cambios de interfaz

## Testing Strategy

La suite de tests está dividida en tests unitarios en Solidity con **Foundry** y tests de integración en JavaScript con **Hardhat**. Los tests unitarios cubren cada función del `InheritanceModule`, incluyendo casos límite de quórum, expiración de certificados, períodos de gracia y distribución de pesos en BPS. Los tests de integración verifican el flujo completo de `UserOperation` con EntryPoint real en testnet y el flujo gasless con Paymaster activo. Los contratos no han sido auditados; la auditoría de seguridad está prevista antes del despliegue en Mainnet.

## Project Setup

1. Consulta la documentación del proyecto:
   - [Especificación Técnica](docs/especificacion-tecnica.md)
   - [Roadmap: 4 Sprints](docs/roadmap.md)
   - [Brainstorming Estratégico](docs/brainstorming.md)
   - [Tareas y Seguimiento](docs/tareas.md)

2. Instala dependencias:

   ```bash
   npm install
   ```

3. Crea `.env.local`:

   ```env
   # Blockchain
   RPC_URL_ETHEREUM=
   RPC_URL_POLYGON=
   RPC_URL_ARBITRUM=
   PRIVATE_KEY=

   # ERC-4337
   ENTRYPOINT_ADDRESS=
   BUNDLER_URL=
   PAYMASTER_URL=

   # Oráculo PKI
   ORACLE_PRIVATE_KEY=
   PKI_VALIDATION_ENDPOINT=
   ```

4. Despliega contratos en testnet:

   ```bash
   forge script script/Deploy.s.sol --rpc-url $RPC_URL_ETHEREUM --broadcast
   ```

5. Inicia el frontend:

   ```bash
   npm run dev
   ```

---

Built for Ethereum / ERC-4337.
