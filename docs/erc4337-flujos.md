---
layout: default
title: ERC-4337 - EOA vs Smart Accounts
nav_order: 5
description: Análisis técnico detallado de los flujos de Externally Owned Accounts versus Smart Accounts en ERC-4337
---

# ERC-4337: EOA vs Smart Accounts - Flujos Detallados

## Tabla de Contenidos
1. [Introducción](#introducción)
2. [Componentes Clave](#componentes-clave)
3. [Flujo EOA (Externally Owned Account)](#flujo-eoa)
4. [Flujo Smart Account (ERC-4337)](#flujo-smart-account)
5. [Arquitectura del EntryPoint](#arquitectura-del-entrypoint)
6. [Comparación Técnica](#comparación-técnica)
7. [Casos de Uso](#casos-de-uso)

---

## Introducción

**ERC-4337** es un estándar de Ethereum que introduce cuentas inteligentes (Smart Accounts) sin requerir cambios en el protocolo base. Permite que los usuarios ejecuten transacciones a través de contratos inteligentes en lugar de depender exclusivamente de Externally Owned Accounts (EOA).

### Diferencias Fundamentales

| Aspecto | EOA | Smart Account |
|--------|-----|----------------|
| **Control** | Clave privada única | Contrato inteligente personalizable |
| **Validación** | ECDSA nativa | Lógica personalizada |
| **Flujo** | Directo al mempool | Através de Bundler → EntryPoint |
| **Gas Patrocinio** | No disponible | Paymaster puede pagar |
| **Recuperación** | Manual | Social recovery, guardianes |

---

## Componentes Clave

### 1. **UserOperation (UserOp)**
La estructura fundamental de ERC-4337. Reemplaza la transacción tradicional.

```solidity
struct UserOperation {
    address sender;                    // Cuenta del smart account
    uint256 nonce;                     // Anti-replay nonce
    bytes initCode;                    // Código para crear la cuenta
    bytes callData;                    // Datos de la llamada
    uint256 callGasLimit;              // Gas para la ejecución
    uint256 verificationGasLimit;      // Gas para validación
    uint256 preVerificationGas;        // Gas overhead
    uint256 maxFeePerGas;              // Precio máximo de gas
    uint256 maxPriorityFeePerGas;      // Prioridad de gas
    bytes paymasterAndData;            // Paymaster (si aplica)
    bytes signature;                   // Firma del usuario
}
```

### 2. **EntryPoint**
Contrato central que orquesta la ejecución de UserOperations.

```solidity
interface IEntryPoint {
    function handleOps(
        UserOperation[] calldata ops,
        address payable beneficiary
    ) external;
    
    function depositTo(address account) external payable;
    
    function withdrawTo(
        address payable withdrawAddress,
        uint256 amount
    ) external;
}
```

### 3. **Bundler**
Componente off-chain que:
- Recibe UserOperations de usuarios
- Valida su viabilidad
- Las agrupa en transacciones
- Las envía al EntryPoint

### 4. **Paymaster**
Contrato que puede patrocinar gas:

```solidity
interface IPaymaster {
    function validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external view returns (bytes memory context, uint256 validationData);
    
    function postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) external;
}
```

---

## Flujo EOA

### Arquitectura General

```
Usuario
  ↓
[Firma con clave privada]
  ↓
Mempool de Ethereum
  ↓
[Validadores verifican firma ECDSA]
  ↓
Bloque incluido
  ↓
Ejecución on-chain
  ↓
Confirmación (≈12 bloques)
```

### Proceso Detallado

#### 1. **Creación de Transacción**
```solidity
// Usuario prepara una transacción normal
Transaction {
    to: 0x123...,
    from: 0xEOA...,        // Clave privada del usuario
    value: 1 ether,
    data: 0x...,
    nonce: 42,
    gasPrice: 20 gwei
}
```

**Qué sucede:**
- El nonce debe ser exactamente el `nonce` actual de la EOA
- El `from` es derivado de la firma ECDSA
- La firma es verificada contra la clave privada

#### 2. **Firma ECDSA**
```solidity
// Pseudocódigo del proceso de firma
privateKey = 0xab...cd
message = keccak256(rlp(transaction))
signature = sign(message, privateKey)  // v, r, s

// La EOA es derivada así:
address = ecrecover(message, v, r, s)
```

**Validación en blockchain:**
```solidity
// El protocolo verifica
ecrecover(message, v, r, s) == tx.from
```

#### 3. **Propagación al Mempool**
- La transacción firmada se envía a nodos de Ethereum
- Los validadores reciben la transacción
- Se verifica:
  - `tx.from` es una EOA válida
  - `nonce` es secuencial
  - `balance >= value + gasPrice * gasLimit`
  - Firma ECDSA válida

#### 4. **Validación por Protocolo**
```solidity
// Validaciones en Ethereum
require(nonce == account.nonce, "Invalid nonce");
require(balance >= value + maxGasPrice * gasLimit, "Insufficient balance");
require(signature es válida, "Invalid signature");
```

#### 5. **Ejecución**
```solidity
// En el EVM
nonce++;                    // Incrementar nonce
balance -= value;           // Transferir valor
balance -= gasUsed * gasPrice;  // Pagar gas
execute(callData);          // Ejecutar la llamada
```

#### 6. **Confirmación**
- Transacción incluida en bloque
- Esperar ~12 bloques para seguridad final (finality)
- **Tiempo total:** 12-60 segundos
- **Costo:** Gas en ETH (volátil)

### Ejemplo Completo EOA

```solidity
// Transacción EOA típica
{
  "from": "0x742d35Cc6634C0532925a3b844Bc8e9d2314A0d6",
  "to": "0x1234567890123456789012345678901234567890",
  "value": "1000000000000000000",  // 1 ETH
  "data": "0x",
  "nonce": 42,
  "gasPrice": "20000000000",       // 20 gwei
  "gasLimit": "21000",
  "v": 27,
  "r": "0xabc...",
  "s": "0xdef..."
}

// Validación
address recovered = ecrecover(hash, v, r, s);
require(recovered == from, "Invalid signature");
require(nonce == account.nonce[from], "Invalid nonce");
require(account.balance[from] >= value + gasPrice * gasLimit, "Insufficient balance");
```

### Limitaciones de EOA

1. **Una sola clave = total control**
   - Pérdida de clave = pérdida permanente
   - Compromiso de clave = acceso total

2. **Sin lógica personalizada**
   - No hay validación adicional
   - No hay restricciones de gasto
   - No hay condiciones

3. **Sin gas patrocinio**
   - El usuario SIEMPRE paga gas en ETH
   - No hay forma de usar stablecoins
   - No hay descuentos por volumen

4. **UX Web3 nativa**
   - Exposición de clave privada en MetaMask
   - Firmar cada transacción manualmente
   - Riesgo de phishing

---

## Flujo Smart Account (ERC-4337)

### Arquitectura General

```
Usuario
  ↓
[Crea UserOperation]
  ↓
Bundler (off-chain)
  ↓
[Agrupa múltiples UserOps]
  ↓
Envía a EntryPoint
  ↓
[EntryPoint valida y ejecuta]
  ↓
Smart Account ejecuta
  ↓
Paymaster paga (opcional)
  ↓
Confirmación
```

### Proceso Detallado

#### 1. **Creación de UserOperation**
```solidity
UserOperation memory userOp = UserOperation({
    sender: 0x123...456,               // Dirección del smart account
    nonce: 42,                         // Nonce del smart account
    initCode: 0x,                      // Vacío si la cuenta existe
    callData: abi.encodeWithSelector(
        ISmartAccount.execute.selector,
        target,
        value,
        data
    ),
    callGasLimit: 100_000,
    verificationGasLimit: 150_000,
    preVerificationGas: 21_000,
    maxFeePerGas: 20 gwei,
    maxPriorityFeePerGas: 2 gwei,
    paymasterAndData: paymasterAddress,
    signature: abi.encodePacked(
        bytes32(r), bytes32(s), uint8(v)
    )
});
```

**Diferencias con EOA:**
- `sender` es un contrato (smart account)
- `callData` incluye la lógica deseada
- `paymasterAndData` permite gas patrocinio
- Firma puede ser multi-sig, ECDSA, WebAuthn, etc.

#### 2. **Envío al Bundler**
```solidity
// El usuario envía la UserOp al bundler (off-chain, vía RPC)
POST /bundler
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "eth_sendUserOperation",
  "params": [userOp, entryPointAddress]
}
```

**Validación por el Bundler:**
```solidity
// El bundler verifica (simulación estática)
1. Smart account existe o puede ser creado
2. callData es válido
3. Paymaster es válido (si existe)
4. Signature es válida
5. Gas estimación es correcta
6. No hay conflictos con otras UserOps
```

#### 3. **Agregación en el Bundler**

```solidity
// Bundler agrupa múltiples UserOps
UserOperation[] batch = [
    userOp1,  // Usuario A
    userOp2,  // Usuario B
    userOp3,  // Usuario C
    userOp4   // Usuario D
];

// Combina en una transacción normal:
entryPoint.handleOps(batch, beneficiary);
```

**Ventaja:** Amortiza gas overhead entre múltiples usuarios.

#### 4. **Envío al EntryPoint**

La transacción normal se envía a Ethereum:

```solidity
function handleOps(
    UserOperation[] calldata ops,
    address payable beneficiary
) external {
    // 1. Validar cada UserOp
    for (uint256 i = 0; i < ops.length; i++) {
        _validateUserOp(ops[i]);
    }
    
    // 2. Ejecutar cada UserOp
    for (uint256 i = 0; i < ops.length; i++) {
        _executeUserOp(ops[i]);
    }
    
    // 3. Pagar al bundler
    (bool success, ) = beneficiary.call{value: refund}("");
    require(success, "Payment failed");
}
```

#### 5. **Validación en EntryPoint**

```solidity
function _validateUserOp(UserOperation calldata userOp) internal {
    address account = userOp.sender;
    
    // Si la cuenta no existe, crearla
    if (code(account).length == 0) {
        _createAccount(userOp.initCode);
    }
    
    // Reservar gas
    _allocateGas(userOp);
    
    // Validar con el contrato de la cuenta
    (uint256 validationData) = ISmartAccount(account).validateUserOp(
        userOp,
        userOpHash,
        missingAccountFunds
    );
    
    // Procesar validationData
    require(_parseValidationData(validationData).sigFailed == false, "Invalid signature");
}
```

#### 6. **Validación en Smart Account**

```solidity
// El smart account implementa la lógica de validación
contract SimpleSmartAccount is ISmartAccount {
    address public owner;
    
    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external override returns (uint256 validationData) {
        // Validar nonce
        require(nonce == userOp.nonce, "Invalid nonce");
        nonce++;
        
        // Validar firma (ejemplo: ECDSA simple)
        address recovered = ecrecover(
            userOpHash.toEthSignedMessageHash(),
            v, r, s
        );
        require(recovered == owner, "Invalid signature");
        
        // Retornar éxito (0 = válido, 1 = inválido)
        return 0;
    }
    
    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) external {
        // Lógica de ejecución
        (bool success, ) = target.call{value: value}(data);
        require(success, "Execution failed");
    }
}
```

#### 7. **Consulta a Paymaster (Opcional)**

```solidity
function _validatePaymaster(UserOperation calldata userOp) internal {
    address paymaster = _getPaymaster(userOp.paymasterAndData);
    
    (bytes memory context, uint256 validationData) = 
        IPaymaster(paymaster).validatePaymasterUserOp(
            userOp,
            userOpHash,
            missingAccountFunds
        );
    
    // El paymaster aprobó pagar el gas
    require(_parseValidationData(validationData).sigFailed == false, "Paymaster rejected");
}

// Paymaster típico
contract TokenPaymaster is IPaymaster {
    IERC20 public token;
    uint256 public exchangeRate;  // 1 token = X wei
    
    function validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external view override returns (bytes memory context, uint256 validationData) {
        // Calcular costo en tokens
        uint256 gasCost = userOp.callGasLimit + userOp.verificationGasLimit;
        uint256 tokenCost = gasCost * userOp.maxFeePerGas / exchangeRate;
        
        // Verificar que el smart account tiene suficientes tokens
        uint256 balance = token.balanceOf(userOp.sender);
        require(balance >= tokenCost, "Insufficient token balance");
        
        // Retornar contexto para postOp
        return (abi.encode(userOp.sender, tokenCost), 0);
    }
    
    function postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) external override {
        (address account, uint256 estimatedCost) = abi.decode(context, (address, uint256));
        
        // Retirar tokens del smart account
        uint256 tokenCost = actualGasCost / exchangeRate;
        token.transferFrom(account, address(this), tokenCost);
    }
}
```

#### 8. **Ejecución en Smart Account**

```solidity
function _executeUserOp(UserOperation calldata userOp) internal {
    address account = userOp.sender;
    uint256 gasStart = gasleft();
    
    // Ejecutar callData del smart account
    (bool success, bytes memory result) = account.call{
        gas: userOp.callGasLimit
    }(userOp.callData);
    
    uint256 gasUsed = gasStart - gasleft();
    require(success, "Execution failed");
    
    // Reembolsar gas restante
    uint256 refund = (userOp.callGasLimit - gasUsed) * userOp.maxFeePerGas;
    (bool refundSuccess, ) = account.call{value: refund}("");
    require(refundSuccess, "Refund failed");
}
```

#### 9. **Pago de Gas**

```solidity
// Si hay paymaster, ya pagó en postOp()
// Si no hay paymaster, el smart account paga

if (paymaster != address(0)) {
    // Paymaster ya pagó en postOp()
    // EntryPoint no necesita hacer nada
} else {
    // Smart account paga gas
    uint256 totalGasCost = gasUsed * userOp.maxFeePerGas;
    (bool success, ) = msg.sender.call{value: totalGasCost}("");
    require(success, "Gas payment failed");
}
```

#### 10. **Confirmación Final**

- EntryPoint finaliza la ejecución
- Estado se actualiza on-chain
- Bundler recibe reembolso de gas
- **Tiempo total:** 6-30 segundos
- **Costo:** ETH, stablecoins, o nada (si hay paymaster)

### Ejemplo Completo Smart Account

```solidity
// Smart Account implementación simple
contract SimpleSmartAccount {
    address public owner;
    uint256 public nonce;
    mapping(address => bool) public authorized;
    
    constructor(address _owner) {
        owner = _owner;
    }
    
    // Validar UserOp
    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256
    ) external override returns (uint256) {
        require(msg.sender == entryPoint, "Only EntryPoint");
        
        // Nonce check
        require(userOp.nonce == nonce, "Invalid nonce");
        nonce++;
        
        // Firma check (ECDSA simple)
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        address recovered = ecrecover(hash, v, r, s);
        require(recovered == owner, "Invalid signature");
        
        return 0;  // 0 = válido
    }
    
    // Ejecutar llamada
    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) external {
        require(msg.sender == entryPoint, "Only EntryPoint");
        
        (bool success, ) = target.call{value: value}(data);
        require(success, "Execution failed");
    }
}
```

---

## Arquitectura del EntryPoint

### Flujo Completo en el EntryPoint

```solidity
// Entrada principal
entryPoint.handleOps(userOps, beneficiary)
    ↓
┌─────────────────────────────────┐
│ Phase 1: Validation             │
├─────────────────────────────────┤
│ Para cada UserOp:               │
│ 1. Create account (si no existe)│
│ 2. Call validateUserOp          │
│ 3. Check signature validity     │
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│ Phase 2: Execution              │
├─────────────────────────────────┤
│ Para cada UserOp:               │
│ 1. Call execute() en la cuenta  │
│ 2. Track actual gas usage       │
│ 3. Refund excess gas            │
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│ Phase 3: Settlement             │
├─────────────────────────────────┤
│ 1. Collect gas costs            │
│ 2. Call Paymaster.postOp        │
│ 3. Transfer refund to bundler   │
└─────────────────────────────────┘
    ↓
Transacción completada
```

### Diagrama de Interacciones

```
┌──────────────┐
│   Usuario    │
└──────┬───────┘
       │ Crea UserOp
       ↓
┌──────────────────┐
│   Bundler (RPC)  │
└──────┬───────────┘
       │ Agrupa UserOps
       ↓
┌──────────────────────────────────┐
│  Transacción Normal a Ethereum   │
│  entryPoint.handleOps(ops, ...)  │
└──────┬───────────────────────────┘
       ↓
┌──────────────────────────────────┐
│     EntryPoint (on-chain)        │
├──────────────────────────────────┤
│ ┌────────────────────────────┐   │
│ │  SmartAccount.validateOp   │   │
│ └────────────────────────────┘   │
│           ↓                       │
│ ┌────────────────────────────┐   │
│ │  SmartAccount.execute      │   │
│ └────────────────────────────┘   │
│           ↓                       │
│ ┌────────────────────────────┐   │
│ │  Paymaster.validateOp      │   │
│ └────────────────────────────┘   │
│           ↓                       │
│ ┌────────────────────────────┐   │
│ │  Paymaster.postOp (pago)   │   │
│ └────────────────────────────┘   │
└──────────────────────────────────┘
```

---

## Comparación Técnica

### Nonce y Replay Protection

**EOA:**
```solidity
// Nonce global, único por usuario
eoa.nonce = 0, 1, 2, 3, ...  // Secuencial y obligatorio
require(tx.nonce == account.nonce[eoa], "Invalid nonce");
```

**Smart Account:**
```solidity
// Nonce manejado por el smart account
smartAccount.nonce = 0, 1, 2, 3, ...  // Flexible
require(userOp.nonce == smartAccount.nonce, "Invalid nonce");
smartAccount.nonce++;  // Incrementado manualmente

// Posibilidad de nonces por "canal"
mapping(uint192 channel => uint64 nonce) public nonces;
```

### Validación de Firma

**EOA:**
```solidity
// Siempre ECDSA nativa
require(
    ecrecover(txHash, v, r, s) == tx.from,
    "Invalid signature"
);
```

**Smart Account:**
```solidity
// Totalmente flexible
function validateUserOp(...) {
    // Opción 1: ECDSA simple
    require(isValidSignature(userOp.signature), "Invalid");
    
    // Opción 2: Multi-sig
    require(multiSigVerify(userOp.signature), "Invalid");
    
    // Opción 3: WebAuthn
    require(webAuthnVerify(userOp.signature), "Invalid");
    
    // Opción 4: Social recovery
    require(socialRecoveryVerify(userOp.signature), "Invalid");
}
```

### Pago de Gas

**EOA:**
```solidity
// Siempre el usuario paga en ETH
require(
    balance >= value + gasPrice * gasLimit,
    "Insufficient balance"
);

// En ejecución
balance -= gasUsed * gasPrice;
```

**Smart Account:**
```solidity
// Opción 1: Smart Account paga en ETH
// (igual que EOA)

// Opción 2: Paymaster paga
// El smart account autoriza al paymaster
require(
    token.balanceOf(address(this)) >= estimatedCost,
    "Insufficient token balance"
);
// Paymaster transfiere en postOp()

// Opción 3: Gratuito (para aplicaciones)
// Paymaster paga sin cobrar al usuario
```

### Tiempo de Confirmación

**EOA:**
```
Firma → Mempool → Validador → Bloque → 12 confirmaciones
  0ms     1-60s     0-60s      2-30s      20-120s
Total: 23-210 segundos (promedio 60s)
```

**Smart Account:**
```
UserOp → Bundler → Agrupa → EntryPoint → Confirmación
  0ms     1-30s      2-10s     2-30s       20-120s
Total: 25-190 segundos (promedio 50s)
```

### Overhead de Gas

**EOA:**
```
Transacción base: 21,000 gas (always)
Transferencia simple: 21,000 gas
Interacción con contrato: 21,000 + ejecución

Ejemplo: Transfer 21,000 gas
```

**Smart Account:**
```
UserOperation overhead: ~10,000-50,000 gas
Validación: ~5,000-50,000 gas (depende de implementación)
Ejecución: variable
Paymaster check: ~10,000 gas (si aplica)

Ejemplo: Transfer a través de smart account: 40,000-100,000 gas
Pero amortizado entre 10 usuarios: 4,000-10,000 por usuario
```

---

## Casos de Uso

### Ideal para EOA

1. **Transacciones simples y frecuentes**
   - Transferencias de ETH
   - Swaps en DEX
   - Staking

2. **Usuarios con baja frecuencia**
   - Hodlers
   - Inversores a largo plazo

3. **Máxima compatibilidad**
   - Aplicaciones antiguas
   - Protocolos establecidos

### Ideal para Smart Accounts (ERC-4337)

1. **Recuperación Social**
   ```solidity
   // Usuarios pierden clave
   // Guardianes pueden recuperar
   smartAccount.recoverWithGuardians([guardian1, guardian2]);
   ```

2. **Restricciones de Gasto**
   ```solidity
   // Límite de gasto diario
   mapping(uint256 day => uint256 spent) public dailySpent;
   
   function executeWithLimit(...) {
       require(dailySpent[today()] + amount <= DAILY_LIMIT);
       dailySpent[today()] += amount;
   }
   ```

3. **Multi-sig Empresarial**
   ```solidity
   // 3 de 5 firmas requeridas
   function approveTransaction(uint256 txId) {
       require(isApproved[msg.sender] && approvals[txId] < 3);
       approvals[txId]++;
       if (approvals[txId] == 3) {
           execute(txId);
       }
   }
   ```

4. **Gas Patrocinio**
   ```solidity
   // Aplicación de trading paga gas
   // Usuario solo firma
   paymaster.sponsorGasFor(userOp);
   ```

5. **UX Web2**
   ```solidity
   // Login con email/social
   // Recuperación con teléfono
   // Sin exposición de clave privada
   smartAccount.linkEmailRecovery(email);
   ```

6. **Automatización On-Chain**
   ```solidity
   // Órdenes limitadas autoejecuables
   // Refinancing automático de deuda
   // Rebalanceo de cartera
   ```

---

## Resumen de Flujos

### EOA (Rápido pero limitado)

```
1. Usuario firma con clave privada
   ↓
2. Transacción al mempool
   ↓
3. Validadores verifican ECDSA + nonce + balance
   ↓
4. Bloque incluye transacción
   ↓
5. Ejecución y confirmación
```

**Ventajas:**
- Simple y directo
- Máxima compatibilidad
- Rápido (en mempool)
- Gas mínimo

**Desventajas:**
- Una clave = todo
- Sin recuperación
- Sin patrocinio de gas
- Sin lógica personalizada

### Smart Account (Flexible pero complejo)

```
1. Usuario crea UserOperation
   ↓
2. Envía a Bundler (off-chain)
   ↓
3. Bundler agrupa múltiples UserOps
   ↓
4. Bundler envía transacción normal a EntryPoint
   ↓
5. EntryPoint valida cada UserOp
   ↓
6. EntryPoint ejecuta lógica en Smart Account
   ↓
7. Paymaster paga (opcional)
   ↓
8. Confirmación on-chain
```

**Ventajas:**
- Lógica personalizable
- Recuperación social
- Gas patrocinio
- UX Web2
- Multi-sig flexible
- Batching reduce costo

**Desventajas:**
- Más complejo
- Gas overhead mayor
- Dependencia del bundler
- Requiere contrato deployed

---

## Referencias

- [ERC-4337 Spec](https://eips.ethereum.org/EIPS/eip-4337)
- [Ethereum Book - Transactions](https://github.com/ethereumbook/ethereumbook)
- [Smart Contract Security](https://www.secureum.xyz/)
