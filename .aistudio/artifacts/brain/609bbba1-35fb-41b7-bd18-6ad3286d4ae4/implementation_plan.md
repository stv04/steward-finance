# Plan de Implementación: Base de Datos Firestore y Autenticación Familiar

Arquitectura e integración de persistencia en la nube mediante **Firebase Firestore** y sistema de acceso con **Firebase Authentication** (Email/Password), permitiendo cuentas individuales privadas y gobernanza de espacios familiares compartidos.

## Decisiones Críticas y Confirmaciones del Usuario

> [!IMPORTANT]
> A partir de las aclaraciones interactivas, se consolidaron los siguientes pilares de arquitectura:
> - **Motor de Base de Datos**: Firebase Firestore (base de datos documental en la nube NoSQL con sincronización en tiempo real).
> - **Método de Autenticación**: Correo electrónico y contraseña con soporte para roles familiares (`admin`, `member`).
> - **Estructura de Permisos**: Cuentas individuales privadas con posibilidad de vincularse a un núcleo familiar compartido (`familyId`) mediante código de invitación.

---

## 1. Visión General del Sistema

El sistema evolucionará del estado actual en memoria local a un entorno persistente y multi-dispositivo seguro. Cada usuario dispondrá de su propia identidad autenticada, con acceso exclusivo a sus transacciones y cuentas marcadas como `Personal`, al tiempo que podrá sincronizar flujos compartidos dentro de su `Familia` activa con control estricto de roles.

```
┌─────────────────────────────────────────────────────────────┐
│                    NÚCLEO FAMILIAR (familyId)               │
│                                                             │
│   ┌──────────────────────────┐  ┌────────────────────────┐  │
│   │   Usuario A (Admin)      │  │   Usuario B (Miembro)   │  │
│   │   - Cuentas Personales   │  │   - Cuentas Personales  │  │
│   │   - Gastos Personales    │  │   - Gastos Personales   │  │
│   └─────────────┬────────────┘  └───────────┬────────────┘  │
│                 │                           │               │
│                 ▼                           ▼               │
│         ┌───────────────────────────────────────────┐       │
│         │      Bóveda Financiera Compartida         │       │
│         │   - Cuentas Familiares (Santander/BBVA)   │       │
│         │   - Pactos Presupuestarios Heredados      │       │
│         │   - Transacciones de Ámbito Familiar      │       │
│         └───────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Experiencia de Usuario & Flujos de Navegación

1. **Flujo de Acceso y Registro (Auth Gateway)**:
   - Pantalla de inicio de sesión minimalista y limpia con Email y Contraseña.
   - Opción para crear una nueva cuenta o unirse a una familia existente ingresando un código de invitación (`familyInviteCode`).
   - Opción de "Modo Demostración Rápido" para pruebas sin fricción.
2. **Selector de Contexto en Barra Superior**:
   - Muestra el usuario activo autenticado y permite alternar entre su vista privada individual y la vista familiar consolidada.
3. **Gestión de Invitaciones y Miembros**:
   - Modal de administración familiar donde el administrador puede generar códigos de invitación para su pareja o hijos.
4. **Sincronización en Tiempo Real**:
   - Indicador sutil de conexión segura con Firestore. Toda nueva transacción registrada por un miembro se refleja de inmediato en los paneles del resto de la familia.

---

## 3. Decisiones de Producto y Trade-Offs

- **Firestore vs. SQL**: Firestore ofrece sincronización reactiva en tiempo real (`onSnapshot`) sin necesidad de configurar WebSockets manuales o servidores dedicados.
- **Esquema Particionado (`Split Collections & Subcollections`)**:
  - `users/{userId}`: Perfil y preferencias privadas.
  - `families/{familyId}`: Metadatos del grupo familiar y lista de miembros.
  - `families/{familyId}/accounts/{accountId}`: Cuentas compartidas.
  - `families/{familyId}/transactions/{transactionId}`: Ledger compartido.
  - `families/{familyId}/budgets/{accordId}`: Pactos presupuestarios continuos.
  - `users/{userId}/personal_accounts`: Cuentas estrictamente individuales.
  - `users/{userId}/personal_transactions`: Movimientos privados del usuario.

---

## 4. Arquitectura Técnica y Estrategia de Datos

### Diagrama de Flujo y Componentes

```
┌──────────────────────────────────────────────────────────┐
│                     React SPA (Vite)                     │
│                                                          │
│  ┌────────────────────┐          ┌────────────────────┐  │
│  │  AuthContext       │          │  FirestoreSync     │  │
│  │  (Login / Signup)  │          │  (onSnapshot Hooks)│  │
│  └─────────┬──────────┘          └─────────┬──────────┘  │
└────────────┼───────────────────────────────┼─────────────┘
             │                               │
             ▼                               ▼
┌──────────────────────────────────────────────────────────┐
│                 Firebase Cloud Services                  │
│                                                          │
│  ┌────────────────────┐          ┌────────────────────┐  │
│  │ Firebase Auth      │          │ Cloud Firestore    │  │
│  │ - Email & Password │          │ - Rules (ABAC)     │  │
│  │ - JWT Tokens       │          │ - Family & Personal│  │
│  └────────────────────┘          └────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Fases de Implementación Propuestas

1. **Aprovisionamiento de Firebase**:
   - Despliegue de la interfaz de configuración `show_aistudio_ui(firebase_setup)` para aceptación de términos.
   - Verificación de términos y aprovisionamiento de Firestore y Auth vía RPC.
2. **Definición de `firebase-blueprint.json`**:
   - Declaración de entidades (`User`, `Family`, `Account`, `Transaction`, `BudgetAccord`).
3. **Reglas de Seguridad `firestore.rules`**:
   - Enforzamiento de acceso basado en roles (ABAC): solo miembros verificados de una familia pueden leer o escribir en `families/{familyId}`.
   - Los datos personales en `users/{userId}` solo son accesibles por su propietario (`request.auth.uid == userId`).
4. **Integración en Frontend**:
   - `src/lib/firebase.ts`: Inicialización del SDK con control de errores tipado.
   - `src/context/AuthContext.tsx`: Proveedor de estado de autenticación y sesión de usuario.
   - Pantalla/Modal de Autenticación y Registro Familiar.
   - Conexión de repositorios en `App.tsx` para sincronizar datos locales con Firestore.
