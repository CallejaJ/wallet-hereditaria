# Guía de Despliegue y Configuración - Bóveda Hereditaria (Legacy Wallet)

Esta guía detalla los pasos necesarios para configurar, desplegar y activar el sistema de Bóveda Hereditaria (Safe + Módulo de Herencia + Oráculo PKI) en la red de pruebas **Ethereum Sepolia**.

---

## Índice
1. [Paso 1: Configurar Privy & Google OAuth](#paso-1-configurar-privy--google-oauth)
2. [Paso 2: Obtener Sepolia ETH y Clave Privada de Privy](#paso-2-obtener-sepolia-eth-y-clave-privada-de-privy)
3. [Paso 3: Crear la Safe Account (Bóveda)](#paso-3-crear-la-safe-account-bóveda)
4. [Paso 4: Desplegar el Contrato InheritanceModule](#paso-4-desplegar-el-contrato-inheritancemodule)
5. [Paso 5: Configuración y Activación final en el Frontend](#paso-5-configuración-y-activación-final-en-el-frontend)

---

## Paso 1: Configurar Privy & Google OAuth

Para utilizar el inicio de sesión con Gmail en producción (Vercel) y desarrollo local, se deben asociar credenciales de Google OAuth personalizadas en Privy.

### A. Configurar Google Cloud Console
1. Accede a **[Google Cloud Console](https://console.cloud.google.com/)** y crea o selecciona tu proyecto.
2. Ve a **APIs y servicios** > **Pantalla de consentimiento de OAuth** (*OAuth consent screen*).
   * Configura como tipo **Externo** y completa el formulario.
   * **Importante:** Haz clic en **Publish App** para pasarla a producción (evita que solo puedan loguearse tus correos de prueba).
3. Ve a **APIs y servicios** > **Credenciales**. Haz clic en **+ Crear credenciales** > **ID de cliente de OAuth**.
   * **Tipo de aplicación:** Aplicación web.
   * **Orígenes autorizados de JavaScript:**
     * `http://localhost:5173` (Desarrollo local)
     * `https://auth.privy.io`
     * `https://tu-app.vercel.app` (Dominio de producción en Vercel)
   * **URIs de redireccionamiento autorizados:**
     * `https://auth.privy.io/api/v1/oauth/callback`
4. Pulsa **Crear** y copia el **Client ID** y **Client secret** generados.

### B. Registrar Credenciales en Privy
1. Inicia sesión en el **[Dashboard de Privy](https://dashboard.privy.io/)**.
2. Selecciona tu aplicación y ve a **Settings** > **Login Methods** > **Google**.
3. Activa el interruptor, pega tu **Client ID** y **Client secret**, y guarda los cambios.

---

## Paso 2: Obtener Sepolia ETH y Clave Privada de Privy

1. Abre tu dApp en local (`http://localhost:5173`) e inicia sesión con Gmail.
2. En la barra superior, haz clic sobre tu dirección pública truncada para copiar tu dirección completa (ej: `0x1343c2E7F8b234af7676C8D45faFAB9ce7532686`).
3. Ve a un grifo gratuito y reclama fondos de prueba en Sepolia:
   * **[Alchemy Sepolia Faucet](https://sepoliafaucet.com/)**
   * **[QuickNode Sepolia Faucet](https://faucet.quicknode.com/drip)**
4. En la barra superior de tu app, pulsa el botón morado **"Exportar Clave"**. Sigue el flujo seguro de Privy, copia tu clave privada e impórtala en **MetaMask** (*Importar Cuenta*).

---

## Paso 3: Crear la Safe Account (Bóveda)

1. Ve a la aplicación oficial de Safe: **[Safe App (Sepolia)](https://app.safe.global/)**.
2. Conéctate con MetaMask seleccionando la cuenta importada de Privy (la que tiene los fondos de Sepolia ETH).
3. Haz clic en **Create account** (Crear cuenta).
4. Elige un nombre para tu Bóveda y asegúrate de que la red sea **Sepolia**.
5. Tu dirección de Privy aparecerá automáticamente como propietario (Threshold: 1/1).
6. Haz clic en **Crear**, firma la transacción en MetaMask y espera a que se confirme en blockchain.
7. Copia la dirección resultante del Safe (ej: `0x86D2cE648D08DDc481a878092ab51e7dc340b7E5`).

---

## Paso 4: Desplegar el Contrato InheritanceModule

El desplegador debe inyectar la dirección del oráculo y de la Safe en el constructor para asegurar que la Safe sea la dueña legítima de la lógica de herencia.

1. Abre tu terminal de comandos en la carpeta `contracts` de tu proyecto:
   ```bash
   cd contracts
   ```
2. Ejecuta el comando de despliegue en una sola línea continua, indicando tu clave privada de MetaMask y los argumentos del constructor (`_oracle` y `_safe`):
    ```bash
    forge create src/InheritanceModule.sol:InheritanceModule --rpc-url https://ethereum-sepolia-rpc.publicnode.com --private-key <TU_CLAVE_PRIVADA_METAMASK_CON_ETH> --broadcast --constructor-args <DIRECCIÓN_ORÁCULO> <DIRECCIÓN_SAFE>
    ```
    * *Ejemplo real:*
      ```bash
      forge create src/InheritanceModule.sol:InheritanceModule --rpc-url https://ethereum-sepolia-rpc.publicnode.com --private-key 6ee64fac7914503d502ee986db664d5b7df1bc01b9c21df91f9406fa7bafa2fd --broadcast --constructor-args 0x1343c2E7F8b234af7676C8D45faFAB9ce7532686 0x86D2cE648D08DDc481a878092ab51e7dc340b7E5
      ```
3. Copia el hash de dirección que aparezca en el log bajo la línea:
   `Deployed to: 0x...`

---

## Paso 5: Configuración y Activación final en el Frontend

1. Vuelve a tu dApp local (`http://localhost:5173`).
2. En la pestaña **"Mi Safe"**, rellena los dos campos de entrada:
   * **Dirección de tu Safe Account:** La dirección obtenida en el Paso 3.
   * **Dirección del Módulo de Herencia:** La dirección obtenida en el Paso 4.
3. Dirígete a la pestaña **"Registrar Herencia"**:
   * Sube un certificado notarial digital (`.pem`).
   * Configura las direcciones de los herederos y los pesos en porcentaje.
   * Pulsa en **"Registrar Herencia en Oráculo"** para enviar la propuesta al oráculo backend.
4. Vuelve a la pestaña **"Mi Safe"** y pulsa en **"Sincronizar Estado"**.
5. Verás aparecer un banner informativo que indica que el oráculo ha propuesto activar la herencia. Pulsa el botón **"Confirmar & Activar Módulo en Safe"** y firma la transacción con Privy.

**¡Felicidades!** Tu bóveda digital está activa y el Módulo de Herencia ya custodia tus fondos.
