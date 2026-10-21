/**
 * CONFIGURACIÓN DE SEGURIDAD Y PRIVACIDAD DE DATOS (SECURITY CONFIG)
 * ==============================================================================
 * Este archivo centraliza los flags de seguridad criptográfica de la aplicación.
 * Permite alternar entre el modelo convencional de producción y el modelo de
 * Cifrado a Nivel de Columna del Cliente (CLE - Client-Level Encryption).
 * 
 * ------------------------------------------------------------------------------
 * ANÁLISIS DE VENTAJAS Y DESVENTAJAS:
 * ------------------------------------------------------------------------------
 * 
 * 1. MODO CONVENCIONAL (RECOMENDADO PARA PRODUCCIÓN RÁPIDA / FIREBASE ESTÁNDAR)
 *    Flag: ENABLE_CLIENT_LEVEL_ENCRYPTION = false
 * 
 *    ✅ VENTAJAS:
 *       - Cero fricción operativa: Firestore gestiona la seguridad mediante reglas
 *         estrictas por usuario y núcleo familiar (RBAC / multi-tenant).
 *       - Las consultas, filtros y ordenamientos en la base de datos funcionan nativamente.
 *       - No hay riesgo de pérdida de datos por pérdida de clave maestra o passphrase local.
 *       - Cuentas bancarias se protegen mediante enmascaramiento visual (ej. "•••• 4821").
 * 
 *    ❌ DESVENTAJAS:
 *       - Si un administrador de base de datos accede a la consola de Firestore,
 *         puede ver los datos en texto plano.
 * 
 * ------------------------------------------------------------------------------
 * 
 * 2. MODO CIFRADO CLIENTE (CLE - AES-256-GCM ZERO-KNOWLEDGE)
 *    Flag: ENABLE_CLIENT_LEVEL_ENCRYPTION = true
 * 
 *    ✅ VENTAJAS:
 *       - Máxima privacidad ("Zero-Knowledge"): Ni Google Cloud ni administradores
 *         de la base de datos pueden leer los números de cuenta ni detalles sensibles.
 *       - Cumplimiento estricto para venta o comercialización como software bancario
 *         o multi-inquilino de alta seguridad.
 * 
 *    ❌ DESVENTAJAS:
 *       - Complejidad en producción: La gestión y rotación de claves maestras recae
 *         en el cliente o requiere un servicio KMS (Key Management Service).
 *       - Los campos cifrados no pueden ser consultados mediante índices de Firestore
 *         (e.g., no se puede hacer un 'where' exacto sobre un número de cuenta cifrado
 *         sin hashes ciegos adicionales).
 * ==============================================================================
 */

export interface SecuritySettings {
  /**
   * Si está activo, los números de cuenta se cifran con AES-256-GCM antes de escribir en Firestore.
   * Si está inactivo (false), se guardan de forma convencional con enmascaramiento visual.
   */
  enableClientLevelEncryption: boolean;
  
  /**
   * Si está activo, calcula y almacena la firma SHA-256 para verificación del ledger contable.
   */
  enableLedgerSha256Hashing: boolean;
  
  /**
   * Algoritmo de cifrado cliente simétrico utilizado.
   */
  encryptionAlgorithm: 'AES-256-GCM';
}

export const SECURITY_CONFIG: SecuritySettings = {
  // Cambia este flag a true/false según tus necesidades de despliegue en producción:
  enableClientLevelEncryption: false, 
  enableLedgerSha256Hashing: true,
  encryptionAlgorithm: 'AES-256-GCM',
};
