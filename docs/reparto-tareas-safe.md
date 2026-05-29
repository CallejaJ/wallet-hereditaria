# Reparto de Tareas: Implementación con Safe (3 alumnos · 3 semanas)

## Contexto

Fortris es una wallet de herencia digital. El plan original usaba ERC-4337 puro con un `InheritanceModule` custom. El profesor pide reutilizar **Safe** como infraestructura de smart account.

**Qué cambia con Safe:**
- La smart account no se construye desde cero; se despliega una **Safe Account** estándar
- El `InheritanceModule` pasa a ser un **Safe Module** (implementa la interfaz `ISafe`)
- El quórum de herederos se gestiona a nivel de módulo (o aprovechando el multisig nativo de Safe)
- Las transacciones gasless de herederos usan el **Safe Relay Kit** (ERC-4337 / Gelato) en vez de un Paymaster custom
- La coordinación de firmas entre herederos usa el **Safe Transaction Service** vía **API Kit**

**Stack Safe utilizado:**

| SDK | Uso |
|-----|-----|
| `@safe-global/protocol-kit` | Desplegar Safe account, instalar/desinstalar módulo |
| `@safe-global/api-kit` | Coordinar firmas entre herederos (Transaction Service) |
| `@safe-global/relay-kit` | Transacciones gasless para herederos |
| Contrato Safe (on-chain) | Smart account del titular + multisig |

---

## Reparto de roles

| Alumno | Rol | Área principal |
|--------|-----|----------------|
| **Alumno A** | Smart Contracts | `InheritanceModule.sol` + tests Foundry |
| **Alumno B** | Backend / Oráculo | Validación PKI + Safe API Kit + oracle service |
| **Alumno C** | Frontend / Safe SDK | React + Protocol Kit + Relay Kit + UI flows |

*(Jaime / Martina / Jorge pueden asignarse a cada rol según preferencia)*

---

## Semana 1 — Fundamentos y setup

### Alumno A — Smart Contracts
- Leer: Safe Module interface (`ISafe`, `IModule`) en docs.safe.global/advanced/smart-account-modules
- Inicializar proyecto Foundry: `forge init contracts/`
- Crear stub `InheritanceModule.sol` con estructura de datos y funciones vacías: `configureInheritance`, `submitProofOfLife`, `initiateClaim`, `signClaim`, `executePayout`, `cancelClaim`
- Desplegar Safe de prueba en Sepolia para validar que el módulo se puede instalar

**Entregable:** `InheritanceModule.sol` compila + Safe de prueba desplegada en Sepolia

### Alumno B — Backend / Oráculo
- Inicializar proyecto Node.js 20 + TypeScript: `backend/`
- Instalar `@safe-global/api-kit`, `ethers`, OpenSSL bindings
- Crear endpoint `POST /validate-certificate` (mock por ahora)
- Conectar `api-kit` a Sepolia Transaction Service y listar transacciones de la Safe del Alumno A

**Entregable:** Servidor corriendo, endpoint de mock, conexión API Kit verificada

### Alumno C — Frontend
- Inicializar proyecto React 18 + TypeScript + Vite: `frontend/`
- Instalar `@safe-global/protocol-kit`, `@safe-global/relay-kit`, `wagmi`, `viem`
- Implementar conexión de wallet (MetaMask / WalletConnect) con wagmi
- Pantalla de inicio + pantalla "Mi Safe" que muestra saldo usando Protocol Kit

**Entregable:** App corre, conecta wallet, muestra Safe account en Sepolia

---

## Semana 2 — Implementación core

### Alumno A — Smart Contracts
- Implementar lógica completa de `InheritanceModule.sol`:
  - `configureInheritance()` — validar pesos (BPS 10000), quórum, certificado no expirado, solo oráculo
  - `submitProofOfLife()` — actualizar timestamp, cancelar claim abierto
  - `initiateClaim()` — verificar inactividad > threshold, iniciar grace period 14 días
  - `signClaim()` — registrar firma, contar quórum
  - `executePayout()` — distribuir ETH + ERC-20 proporcionalmente, desinstalar módulo
  - `cancelClaim()` / `uninstallModule()` / `revalidateCertificate()`
- Escribir **tests Foundry** (según `docs/especificacion-tecnica.md`):
  - `test_ConfigureInheritance_Valid/InvalidWeights/QuorumTooHigh`
  - `test_SubmitProofOfLife_UpdatesTimestamp/CancelsClaim`
  - `test_InitiateClaim_BeforeThreshold_Fails/Valid`
  - `test_SignClaim_Counts`, `test_ExecutePayout_*`, `test_CancelClaim_*`
- Deploy `InheritanceModule.sol` verificado en Sepolia

**Entregable:** Módulo deployado, 15+ tests passing

### Alumno B — Backend / Oráculo
- Implementar validación PKI real con OpenSSL (parsear cert X.509, verificar firma notarial)
- Implementar `POST /oracle/configure` que:
  1. Valida el certificado PKI recibido
  2. Construye la tx `configureInheritance()` con el ABI del módulo
  3. Propone la tx a la Safe vía API Kit (`safeApiKit.proposeTransaction`)
- Implementar `POST /oracle/revalidate` para renovación de certificado
- Documentar API con OpenAPI / Swagger

**Entregable:** Oracle valida PKI real + propone tx a Safe en Sepolia

### Alumno C — Frontend
- Pantalla **"Registrar herencia"**: subir cert PKI → llamar `/oracle/configure`
- Pantalla **"Mis herederos"**: listar beneficiarios con pesos desde el módulo
- Pantalla **"Proof of Life"**: botón que ejecuta `submitProofOfLife()` gasless vía Relay Kit
- Pantalla **"Reclamar herencia"** (vista heredero): `initiateClaim()` + lista de firmantes + `signClaim()` coordinado vía API Kit

**Entregable:** Flujos de registro y reclamación funcionales en testnet

---

## Semana 3 — Integración, tests E2E y demo

### Días 1-2: Integración end-to-end
- Alumno C conecta frontend con módulo (A) y oracle (B)
- Alumno B conecta oracle con el módulo deployado real
- Alumno A escribe integration tests (JS/Vitest):
  - `test_SignClaim_Gasless_WithRelayKit`
  - `test_ExecutePayout_MultipleCurrencies`

### Días 3-4: PoC completo
- Flujo completo: subir cert → oracle configura → inactividad → heredero reclama → payout ejecutado
- Fix de bugs de integración
- Alumno B: `executePayout()` también relayed (gasless para el heredero ejecutor)

### Día 5: Demo y entregables finales
- Alumno A: NatSpec del contrato + diagrama de arquitectura final
- Alumno B: README de la API + guía de despliegue
- Alumno C: Refinamiento UI, responsive, pantalla de estado de herencia
- Grabación del **video demo** (flujo completo en Sepolia, ~5 min)

---

## Dependencias críticas

```
S1: Alumno A despliega Safe + stub módulo
         ↓
S2: Alumno B usa ABI para oracle  |  Alumno C usa address para Protocol Kit
         ↓
S3: Integración E2E conjunta
```

Al final de S1, el Alumno A publica `/contracts/deployments/sepolia.json` con el ABI y address del módulo. Ese fichero desbloquea a B y C para trabajar en paralelo durante S2.

---

## Estructura de archivos

```
contracts/
  src/InheritanceModule.sol          ← Alumno A
  test/InheritanceModule.t.sol       ← Alumno A
  deployments/sepolia.json           ← compartido (desbloquea S2)

backend/
  src/oracle.ts                      ← Alumno B
  src/pki-validator.ts               ← Alumno B
  openapi.yaml                       ← Alumno B

frontend/
  src/pages/RegisterInheritance.tsx  ← Alumno C
  src/pages/ClaimInheritance.tsx     ← Alumno C
  src/hooks/useSafe.ts               ← Alumno C
  src/hooks/useInheritanceModule.ts  ← Alumno C
```

---

## Verificación final

1. `forge test --fork-url $SEPOLIA_RPC` → todos los tests Foundry en verde
2. `curl -X POST /oracle/configure` con cert PKI de prueba → tx propuesta en Safe Transaction Service
3. Frontend → conectar MetaMask Sepolia → subir cert → ver herederos configurados on-chain
4. Simular inactividad (threshold = 1h en testnet) → heredero inicia y firma reclamación gasless
5. `executePayout()` → verificar en Sepolia Etherscan que ETH se distribuyó en proporción correcta
