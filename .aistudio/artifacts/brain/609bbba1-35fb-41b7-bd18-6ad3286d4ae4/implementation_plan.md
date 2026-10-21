# Plan de Implementación: Seguridad .env, Soporte Bilingüe, Cifrado CLE y Ordenamiento de Categorías

Este plan define la hoja de ruta técnica y de diseño para robustecer la seguridad de credenciales en GitHub, habilitar localización bilingüe completa (Español / Inglés) sin alterar los datos almacenados, consolidar la arquitectura de protección criptográfica (AES-256-GCM + Ledger SHA-256) y permitir el ordenamiento inteligente de categorías según frecuencia de uso y prioridad personalizada.

> [!IMPORTANT]
> **Decisiones Confirmadas con el Usuario en Fase 1:**
> 1. **Protección de Datos:** Cifrado del lado del cliente AES-256-GCM para números de cuenta/datos sensibles y Hash SHA-256 inmutable en el ledger de transacciones. Se mantiene la separación estricta multinquilino mediante reglas de Firestore.
> 2. **Localización Bilingüe:** Selector de idioma en la barra superior (`ES | EN`) con detección automática del idioma del navegador y persistencia en almacenamiento local (`localStorage`).
> 3. **Ordenamiento de Categorías:** Ordenamiento automático por frecuencia de uso (volumen de transacciones asociadas) combinado con controles de ajuste manual de prioridad (subir/bajar y fijar al tope).
> 4. **Seguridad de Repositorio:** Las credenciales reales se aíslan en `.env` (ignorado en `.gitignore`), protegiendo `firebase-applet-config.json` y publicando una plantilla limpia `.env.example` para despliegues en GitHub.

---

## 1. Visión General y Alcance

### Objetivos Principales
1. **Seguridad de Credenciales y Repositorio Git:** Evitar cualquier fuga de claves de Firebase API al subir el proyecto a GitHub. Configurar carga de variables de entorno mediante Vite (`import.meta.env.VITE_*`) con fallback transparente al config interno, y actualizar `.gitignore` y `.env.example`.
2. **Soporte Bilingüe (Español / English):** Implementar un motor de localización ligero (`LanguageContext` + diccionarios tipados) que traduzca toda la interfaz de usuario (navegación, modales, gráficos, tablas, filtros, mensajes de error y estados) sin modificar los registros originales almacenados en Firestore.
3. **Estrategia Criptográfica y Privacidad de Datos:** Explicitar y consolidar la distinción arquitectónica entre datos que se *hashean* (hashes criptográficos irreversibles para integridad y deduplicación) y datos que se *cifran* (cifrado simétrico AES-256 para cuentas y credenciales que el usuario legítimo debe poder descifrar).
4. **Ordenamiento Inteligente de Categorías:** En `CategoriesView.tsx` y en los selectores de transacciones, ordenar las categorías dinámicamente según su frecuencia real de uso y permitir al usuario personalizar el orden para que sus categorías más críticas estén siempre al primer nivel.

---

## 2. Experiencia de Usuario y Diseño Visual

### 2.1 Selector de Idioma en Barra Superior (Top Bar Contract)
- **Ubicación:** Integrado en la barra superior junto al control de cuenta y autenticación, respetando el contrato de una sola fila y tres zonas.
- **Aspecto:** Selector segmentado minimalista (`ES` | `EN`) con transición suave y estado activo claramente diferenciado.
- **Comportamiento:** 
  - Al cargar por primera vez, detecta `navigator.language` (si inicia con `en`, establece inglés; de lo contrario, español).
  - Guarda la preferencia en `localStorage.getItem('app_language')`.
  - El cambio de idioma es instantáneo y reactivo en toda la aplicación sin recargar la página.

### 2.2 Gestión y Ordenamiento de Categorías
- **Barra de Herramientas de Categorías:** Se añade un control segmentado de ordenamiento:
  - `Más usadas (Frecuencia)` (predeterminado)
  - `Prioridad manual`
  - `Mayor gasto ($)`
  - `Alfabético (A - Z)`
- **Feedback Visual de Frecuencia:** Cada categoría muestra una insignia discreta con el volumen de transacciones vinculadas (ej. `28 transacciones`).
- **Ajuste Manual de Prioridad:** Botones discretos de subida/bajada y opción de "Fijar al inicio" para categorías esenciales (ej. Alimentación, Vivienda).
- **Propagación a Formularios:** El orden inteligente se propaga automáticamente a los `<select>` de `TransactionModal` y `TransactionsView`, agilizando la captura de transacciones.

### 2.3 Panel de Transparencia de Cifrado y Privacidad
- Actualización de la vista `SecurityCleView` para ilustrar en tiempo real:
  - Qué campos tienen Hash SHA-256 inmutable (integridad contable y deduplicación).
  - Qué campos cuentan con Cifrado Cliente AES-256-GCM (números de cuenta, detalles sensibles).
  - La protección de roles y aislamiento por núcleo familiar en Firestore Rules.

---

## 3. Decisiones de Producto y Arquitectura Técnica

### Decisión 1: Estrategia de Variables de Entorno (`.env` vs `firebase-applet-config.json`)
- **Enfoque:** Configurar `src/lib/firebase.ts` para leer prioritariamente de variables de entorno de Vite:
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_STORAGE_BUCKET`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_APP_ID`
  - `VITE_FIREBASE_DATABASE_ID`
- **Fallback Automático:** Si las variables `VITE_*` no están definidas (entorno de desarrollo AI Studio), se importa dinámicamente o usa como respaldo seguro `firebase-applet-config.json`.
- **Protección Git:** Se añaden al `.gitignore`:
  - `firebase-applet-config.json`
  - `.env.local`
- **Documentación `.env.example`:** Se suministra la plantilla documentada con claves ficticias lista para clonar y desplegar en GitHub.

### Decisión 2: Hashing vs Cifrado Reversible (Data Strategy)
- **Concepto Clave para el Usuario y Futura Comercialización:**
  - **Hashing (SHA-256, Unidireccional):**
    - Se aplica a firmas de transacciones (`date + amount + description + accountId`). Permite detección de duplicados en conciliación bancaria y validación de integridad sin exponer datos sensibles a terceros.
    - Las contraseñas son hasheadas internamente por Firebase Auth con scrypt.
  - **Cifrado (AES-256-GCM, Bidireccional Seguro):**
    - Los saldos, montos y descripciones NO pueden hashearse porque el usuario necesita leerlos y sumar totales.
    - Se implementa Cifrado a Nivel de Columna (CLE) en `accountNumberEncrypted` y campos identificatorios bancarios, garantizando que en caso de inspección de la base de datos Firestore, los números de cuenta permanezcan en texto cifrado.
  - **Seguridad Multinquilino (Multitenancy):**
    - Las reglas `firestore.rules` validan que ningún usuario ajeno al núcleo familiar (`familyId`) pueda acceder a los documentos.

### Decisión 3: Sistema de Internacionalización (i18n)
- **Implementación:** `src/context/LanguageContext.tsx` con un hook `useLanguage()`.
- **Estructura de Diccionario:** `src/i18n/translations.ts` con tipado estricto TypeScript para prevenir traducciones faltantes.
- **Cobertura:**
  - Menús y cabecera (Navbar, Workspace Toolbar, selector de ámbito).
  - Dashboard (4 pilares: Ganado/Earned, Ahorrado/Saved, Invertido/Invested, Gastado/Spent; gráficos y KPIs).
  - Módulos de Cuentas, Transacciones, Presupuestos y Categorías.
  - Modales de Conciliación CSV, Autenticación y Gestión Familiar.

---

## 4. Diagrama del Sistema y Flujo de Datos

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CLIENTE WEB (REACT SPA)                       │
├────────────────────────────────────────────────────────────────────────┤
│  Top Bar: [Logo] ──── [Nav Links] ──── [ES | EN] ──── [Perfil/Núcleo]  │
│  Toolbar: [Familiar / Personal] ─── [Código Familiar] ─── [Acciones]  │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
                   ▼                                 ▼
┌─────────────────────────────────────┐   ┌──────────────────────────────┐
│       LanguageContext (i18n)        │   │    Categories Ranking Engine │
│  - Detecta navegador / localStorage │   │  - Conteo de frecuencia txs  │
│  - Diccionario ES / EN completo     │   │  - Prioridad manual de orden │
└──────────────────┬──────────────────┘   └──────────────┬───────────────┘
                   │                                     │
                   ▼                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   CAPA CRIPTOGRÁFICA Y DE SEGURIDAD                    │
│  1. Variables de entorno: Vite VITE_* con fallback seguro a config     │
│  2. Ledger Hash SHA-256: Firma inmutable por cada transacción          │
│  3. CLE AES-256-GCM: Cifrado cliente de números de cuenta/bancos       │
│  4. Firestore Rules: Aislamiento por familyId para multitenant seguro  │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   CLOUD FIRESTORE (BASED EN LA NUBE)                   │
│   families/{familyId}/accounts      (datos cifrados CLE + números)     │
│   families/{familyId}/transactions  (firma hash SHA-256 inmutable)     │
│   families/{familyId}/categories    (orden de visualización persistente)│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Plan de Ejecución por Pasos

1. **Paso 1: Variables de Entorno y Seguridad de Repositorio**
   - Configurar `src/lib/firebase.ts` para leer `import.meta.env.VITE_FIREBASE_*` con fallback.
   - Actualizar `.env.example` con la lista completa y explicaciones de las variables de Firebase.
   - Actualizar `.gitignore` para excluir credenciales sensibles antes de subir a GitHub.

2. **Paso 2: Sistema de Idiomas (ES / EN)**
   - Crear `src/i18n/translations.ts` con las cadenas completas en Español e Inglés.
   - Crear `src/context/LanguageContext.tsx` con persistencia en `localStorage` y detección automática de idioma.
   - Integrar `LanguageProvider` en `src/main.tsx` o `src/App.tsx`.
   - Incorporar el selector `ES | EN` en `src/components/Navbar.tsx`.
   - Adaptar componentes principales (`Navbar`, `DashboardOverview`, `TransactionsView`, `AccountsView`, `CategoriesView`, `BudgetsView`, modales) para consumir los textos traducidos.

3. **Paso 3: Criptografía y Protección de Datos (CLE + Hash)**
   - Consolidar las utilidades de hashing SHA-256 y cifrado AES-256 en `src/utils/crypto.ts`.
   - Asegurar que al crear/actualizar cuentas y transacciones se genere el hash del ledger y el cifrado CLE.
   - Enriquecer `SecurityCleView.tsx` para explicar con claridad la arquitectura de datos hasheados vs cifrados para fines comerciales/SaaS.

4. **Paso 4: Ordenamiento Inteligente de Categorías**
   - Incorporar en `CategoriesView.tsx` el cálculo reactivo de frecuencia según las transacciones existentes.
   - Agregar selector de criterio de orden (Frecuencia, Prioridad manual, Gasto, Alfabético) y botones de reordenamiento manual.
   - Propagar el orden preferido a los selectores de categorías en `TransactionModal.tsx` y `TransactionsView.tsx`.

5. **Paso 5: Validación y Pruebas**
   - Ejecutar validación de TypeScript y linter (`lint_applet`).
   - Compilar el proyecto (`compile_applet`) verificando cero errores y óptimo rendimiento.
