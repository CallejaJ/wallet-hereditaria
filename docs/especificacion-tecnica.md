# InheritanceModule · Especificación técnica ERC-4337

## Resumen ejecutivo

El **InheritanceModule** es un módulo ERC-4337 que implementa lógica de herencia digital con:

- Dead-man's switch (inactividad dispara reclamación)
- Múltiples beneficiarios con pesos (%)
- Validación de certificado PKI notarial
- Quórum de co-firmantes (herederos)
- Payout atómico (batch múltiples transferencias, ETH + ERC-20)
- Compatibilidad con Paymaster (heredero firma sin ETH)

---

## Flujo de estados

```
1. INITIALIZATION
   └─ configureInheritance() [solo oráculo, post-validación PKI]
      └─ Módulo instalado, herencia ACTIVA

2. ACTIVE STATE
   ├─ Titular vivo: submitProofOfLife() periódicamente
   └─ Heredero: espera

3. CLAIM PHASE (inactividad > umbral)
   ├─ initiateClaim() [heredero inicia]
   ├─ signClaim() [herederos firman hasta quórum]
   └─ Período de gracia (14 días para cancelar)

4. EXECUTION PHASE
   ├─ executePayout() [batch distribute a beneficiarios]
   ├─ Desinstalar módulo automáticamente
   └─ FIN

5. CANCELLATION (cualquier momento)
   └─ cancelClaim() [titular vivo]
      └─ Reset a ACTIVE STATE
```

---

## Funciones principales

### `configureInheritance()`

**Llamada por:** Oráculo (post-validación notarial)
**Cuándo:** Usuario carga certificado PKI válido

```solidity
function configureInheritance(
    address account,
    address[] calldata beneficiaries,   // [0xLucía, 0xMarc, 0xPau]
    uint256[] calldata weights,         // [5000, 3000, 2000] = 100%
    uint256 inactivityThreshold,        // 6 meses = 15552000 segundos
    uint256 quorumRequired,             // 2 de 3 herederos
    bytes32 certificateHash,            // Hash del cert. notarial
    uint256 certExpiryTimestamp         // Cuándo caduca
) external
```

**Validaciones:**

- Pesos suman exactamente 10000 BPS (100%)
- Quórum ≤ nº de beneficiarios
- Certificado no expirado
- Oráculo autorizado

**Postcondiciones:**

- Herencia ACTIVA
- `lastProofOfLife = now` (marca timestamp inicial)
- Beneficiarios registrados

---

### `submitProofOfLife()`

**Llamada por:** Titular
**Frecuencia:** Periódicamente (ej: cada mes o a demanda)

```solidity
function submitProofOfLife(address account) external
```

**Efecto:**

- Actualiza `lastProofOfLife = block.timestamp`
- Si hay reclamación en curso → la cancela automáticamente
- Resetea el contador de inactividad

**Caso de uso:** Titular abre la app cada X meses para "comprobar que sigue vivo"

---

### `initiateClaim()`

**Llamada por:** Uno de los beneficiarios
**Cuándo:** Cree que el titular ha fallecido

```solidity
function initiateClaim(address account) external onlyBeneficiary(account)
```

**Precondiciones:**

- `block.timestamp > lastProofOfLife + inactivityThreshold`
- Certificado no expirado
- No hay reclamación anterior en curso

**Postcondiciones:**

- `claimInitiated = true`
- `claimInitiatedAt = block.timestamp`
- Inicia período de gracia (14 días)
- Otros herederos pueden ahora firmar

**Evento:**

```solidity
emit ClaimInitiated(beneficiary, account, block.timestamp);
```

---

### `signClaim()`

**Llamada por:** Cada heredero (co-firmantes)
**UserOp validado por:** EntryPoint (ERC-4337)

```solidity
function signClaim(
    address account,
    bytes calldata signature
) external onlyBeneficiary(account) onlyDuringClaim(account)
```

**Lógica:**

- Registra que este beneficiario firmó
- Incrementa contador de firmas
- Verifica firma en EntryPoint (no aquí)

**Postcondiciones:**

- `hasSigned[beneficiary] = true`
- `signaturesReceived.push(beneficiary)`

**¿Quórum alcanzado?**

```
signaturesReceived.length >= quorumRequired
```

---

### `executePayout()`

**Llamada por:** Cualquier beneficiario (con firma valid)
**Cuándo:** Quórum alcanzado + dentro de período de gracia

```solidity
function executePayout(
    address account,
    address[] calldata assets,   // [ETH, USDC, DAI]
    uint256[] calldata amounts   // [4.217 ETH, 12000 USDC, 5000 DAI]
) external payable onlyDuringClaim(account)
```

**Precondiciones:**

- `signaturesReceived.length >= quorumRequired`
- `block.timestamp <= claimInitiatedAt + gracePeriod` (14 días)
- No ejecutado previamente

**Distribución:**
Para cada asset, calcula share por beneficiario:

```
share[beneficiary] = asset_amount * weight[beneficiary] / 10000
```

Ejemplo (ETH):

```
Total: 4.217 Ξ
Lucía (50%):  2.1085 Ξ
Marc (30%):   1.2651 Ξ
Pau (20%):    0.8434 Ξ
```

**Postcondiciones:**

- Assets distribuidos atómicamente
- Módulo desinstalado automáticamente
- Herencia cerrada

**Evento:**

```solidity
emit PayoutExecuted(account, totalValue, recipients);
```

---

### `cancelClaim()`

**Llamada por:** Titular (si sigue vivo)
**Cuándo:** Detecta que hay una reclamación abierta

```solidity
function cancelClaim(address account) external
```

**Precondiciones:**

- `msg.sender == account` (solo titular)
- `claimInitiated == true`

**Postcondiciones:**

- Reset firmas, estado vuelve a ACTIVE
- Período de gracia termina
- Herederos deben esperar otro `inactivityThreshold`

---

### `revalidateCertificate()`

**Llamada por:** Oráculo
**Cuándo:** Usuario renueva certificado notarial

```solidity
function revalidateCertificate(
    address account,
    bytes32 newCertificateHash,
    uint256 newExpiryTimestamp
) external onlyOracle
```

**Casos:**

- Certificado original expirando → subir uno nuevo
- Testamento modificado → nuevo certificado con PKI nueva

---

### `uninstallModule()`

**Llamada por:** Titular
**Cuándo:** Quiere revocar herencia completamente

```solidity
function uninstallModule(address account) external
```

---

## Integración con ERC-4337

### UserOperation para firmar reclamación

```javascript
// Heredero Lucía firma la reclamación
const userOp = {
  sender: smartAccount.address,
  nonce: await smartAccount.getNonce(),
  initCode: "0x", // Ya instalado el módulo
  callData: inheritanceModule.interface.encodeFunctionData("signClaim", [
    account,
    signature,
  ]),
  accountGasLimits: encodeGasLimits(100000, 100000),
  preVerificationGas: 50000,
  gasPricesAndWeights: encodeGasPrices(1, 1), // Paymasters lo cubre
  signature: luciaSignature, // Paskey signature
};
```

### Validación en EntryPoint

1. EntryPoint recibe UserOp
2. Valida firma (passkey de Lucía)
3. Llama a `validateUserOp()` del módulo
4. Si válido: ejecuta `signClaim()`
5. Paymaster paga gas (sin ETH del heredero)

---

## Integración con Paymaster

### Flow para heredero gasless

```
1. Heredero firma con passkey (Face ID)
   ↓
2. Crea UserOp (signClaim) con paymasterAddress
   ↓
3. Envía UserOp a bundler
   ↓
4. Bundler verifica paymasterAddress es válido
   ↓
5. Paymaster.validatePaymasterUserOp() valida:
   - ¿Es beneficiario?
   - ¿Hay reclamación en curso?
   - ¿Es sensato pagar gas?
   ↓
6. Si OK: Paymaster sponsoriza, TransactionFee = 0 para heredero
   ↓
7. ExecutePayout() también covered por paymaster
```

---

## Seguridad

### Ataques mitigados

| Ataque                     | Mitigación                                                   |
| -------------------------- | ------------------------------------------------------------ |
| Heredero falso reclama     | Múltiples beneficiarios = quórum requerido                   |
| Reclamación prematura      | Inactividad > threshold (no antes)                           |
| Período de gracia ignorado | `require(block.timestamp <= claimInitiatedAt + gracePeriod)` |
| Certificado expirado       | `require(block.timestamp <= certExpiryTimestamp)`            |
| Payout múltiple            | `require(!executed)`                                         |
| Titular vivo pero inactivo | `submitProofOfLife()` cancela cualquier reclamación          |
| Heredero con poca fe       | Puede firmar tardío (hasta fin de gracia)                    |

### Validaciones críticas

1. **PKI del certificado:** Validado por oráculo (offchain)
2. **Firma de heredero:** Validada por EntryPoint (onchain, cryptográficamente)
3. **Quórum:** Enforced antes de `executePayout()`
4. **Período de gracia:** Hardcoded 14 días (configurable)

---

## Casos de uso detallados

### Caso 1: Flujo normal (fallecimiento)

```
Día 1:  Usuario registra herencia (cert. notarial validado)
        └─ submitProofOfLife() cada 30 días automático

Día 200: Usuario muere, no abre app
        └─ No hay submitProofOfLife()
        └─ lastProofOfLife se queda en Día 1

Día 181: Pasa inactivityThreshold (6 meses = 180 días)
        └─ Heredero puede iniciar reclamación

Día 181: Lucía llama initiateClaim()
        └─ claimInitiated = true, gracePeriod = 14 días

Día 181-186: Marc y Pau firman (signClaim)
        └─ quorumRequired = 2, alcanzado

Día 186: Lucía ejecuta executePayout()
        └─ 4.217 Ξ distribuidos: 50% Lucía, 30% Marc, 20% Pau
        └─ Módulo desinstalado
        └─ FIN
```

### Caso 2: Falso positivo (usuario vivo)

```
Día 200: Usuario no abre app por viaje, pérdida teléfono, etc.
        └─ Heredero inicia reclamación

Día 202: Usuario se da cuenta, abre app
        └─ Llama cancelClaim()
        └─ claimInitiated = false
        └─ Período de gracia termina
        └─ Vuelve a ACTIVE

Día 203: Usuario hace submitProofOfLife() preventivamente
        └─ lastProofOfLife = now
        └─ Contador resetea
```

### Caso 3: Testamento modificado

```
Día 100: Usuario quiere cambiar herederos
        └─ Va a notario, hace nuevo testamento
        └─ Obtiene nuevo certificado (PKI nueva)

Día 101: Usuario sube nuevo certificado a Fortris
        └─ Oráculo valida, llama revalidateCertificate()
        └─ certificateHash y beneficiarios actualizados
        └─ Nueva configuración en vigencia
```

---

## Interoperabilidad

### Cadenas soportadas

- Ethereum Mainnet (alto costo gas, máxima seguridad)
- Polygon (bajo costo, rápido)
- Arbitrum (optimistic rollup, bajo costo)
- Cualquier rollup compatible ERC-4337

### Tokens soportados

- ETH nativo
- ERC-20 (USDC, USDT, DAI, etc.)
- Batch múltiples en una sola `executePayout()`

### Wallets compatibles

- Cualquier smart account que soporte módulos ERC-4337
- Recomendación: Rhinestone, Alchemy's Light Account, ZeroDev

---

## Testing

### Unit tests

```solidity
// Instalación
test_ConfigureInheritance_Valid()
test_ConfigureInheritance_InvalidWeights()
test_ConfigureInheritance_QuorumTooHigh()

// Proof of Life
test_SubmitProofOfLife_UpdatesTimestamp()
test_SubmitProofOfLife_CancelsClaim()

// Claim flow
test_InitiateClaim_BeforeThreshold_Fails()
test_InitiateClaim_Valid()
test_SignClaim_Counts()
test_ExecutePayout_QuorumNotReached_Fails()
test_ExecutePayout_WithinGracePeriod_Works()
test_ExecutePayout_GracePeriodExpired_Fails()

// Edge cases
test_CancelClaim_ByOwner()
test_CancelClaim_NotOwner_Fails()
test_RevalidateCertificate()
test_UninstallModule()
```

### Integration tests (con EntryPoint)

```javascript
// Heredero firma sin ETH
test_SignClaim_Gasless_WithPaymaster();

// Batch payout atómico
test_ExecutePayout_MultipleCurrencies();
test_ExecutePayout_AllOrNothing();
```

---

## Gas optimization

- Usar `mapping` en lugar de arrays para beneficiarios (si es posible)
- Cache `weights` en storage durante `executePayout()`
- Usar `SSTORE2` para certificateHash si se archiva
- Considerar delegatecall para lógica pesada

---

## Evolución futura

1. **Conditional inheritance:** "Si X condición, Y beneficiario hereda más"
2. **Staged payout:** Distribuir en tranches (ej: 25% cada trimestre)
3. **Guardianship:** Guardianes que pueden activar fallecimiento si múltiples herederos no firman
4. **Cross-chain messaging:** CCIPPayout a múltiples cadenas
5. **Vesting:** Herederos jóvenes reciben en tranches según edad
