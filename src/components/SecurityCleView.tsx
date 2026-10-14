import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Database, 
  Key, 
  Lock, 
  Unlock, 
  Copy, 
  Check, 
  FileCode, 
  Layers, 
  Server,
  ArrowRight
} from 'lucide-react';
import { encryptField, EncryptedFieldEnvelope } from '../utils/crypto';

export const SecurityCleView: React.FC = () => {
  const [copiedDdl, setCopiedDdl] = useState<boolean>(false);
  
  // Interactive CLE simulator state
  const [plainInput, setPlainInput] = useState<string>('ES91 2100 0418 4502 0005 4821');
  const [encryptedEnvelope, setEncryptedEnvelope] = useState<EncryptedFieldEnvelope | null>(null);
  const [isDecrypted, setIsDecrypted] = useState<boolean>(false);
  const [isEncrypting, setIsEncrypting] = useState<boolean>(false);

  const handleSimulateEncrypt = async () => {
    setIsEncrypting(true);
    const env = await encryptField(plainInput);
    setEncryptedEnvelope(env);
    setIsDecrypted(false);
    setIsEncrypting(false);
  };

  const sqlDdlScript = `-- =====================================================================
-- ESQUEMA RECOMENDADO: HÍBRIDO RELACIONAL (POSTGRESQL 16+) + JSONB
-- Para Ledger Financiero Estricto + Metadatos de Extractos Bancarios
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tabla de Usuarios del Núcleo Familiar
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'member', -- 'admin', 'member'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Entidades Financieras y Cuentas (Con Soporte para CLE)
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    institution VARCHAR(100) NOT NULL,
    account_type VARCHAR(50) NOT NULL, -- 'bank_checking', 'bank_savings', 'investment', 'card_credit', etc.
    account_number_masked VARCHAR(20) NOT NULL, -- '•••• 4821' (para visualización)
    account_number_encrypted BYTEA NOT NULL, -- AES-256-GCM Envelope Encryption (KMS ARN)
    balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    scope VARCHAR(20) NOT NULL DEFAULT 'familiar', -- 'personal', 'familiar'
    credit_limit NUMERIC(15, 2) DEFAULT NULL,
    cutoff_day SMALLINT DEFAULT NULL,
    payment_due_day SMALLINT DEFAULT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Árbol de Categorías y Subcategorías
CREATE TABLE parent_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'expense', 'income'
    color_hex VARCHAR(7) NOT NULL,
    icon_name VARCHAR(50) NOT NULL
);

CREATE TABLE subcategories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES parent_categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    monthly_historical_average NUMERIC(12, 2) NOT NULL DEFAULT 0.00
);

-- 4. Libro Mayor Estricto de Transacciones (Ledger Relacional)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    account_id UUID NOT NULL REFERENCES accounts(id),
    destination_account_id UUID REFERENCES accounts(id), -- Para transferencias entre cuentas
    category_id UUID NOT NULL REFERENCES parent_categories(id),
    subcategory_id UUID REFERENCES subcategories(id),
    scope VARCHAR(20) NOT NULL DEFAULT 'familiar', -- 'personal', 'familiar'
    type VARCHAR(20) NOT NULL, -- 'income', 'expense', 'transfer'
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    transaction_date DATE NOT NULL,
    description TEXT NOT NULL,
    original_raw_description TEXT,
    attachment_storage_path TEXT,
    -- Hash SHA-256 determinista para prevención de duplicados
    transaction_hash CHAR(64) NOT NULL,
    is_reconciled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_transaction_composite_hash UNIQUE (transaction_hash)
);

-- 5. Extractos Bancarios en Bruto y Conciliación (PostgreSQL JSONB)
CREATE TABLE bank_statement_imports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id),
    imported_by_user_id UUID NOT NULL REFERENCES users(id),
    file_name VARCHAR(255) NOT NULL,
    batch_hash CHAR(64) NOT NULL,
    -- Almacenamiento no estructurado flexible para parsers heterogéneos
    raw_payload JSONB NOT NULL,
    matched_count INT NOT NULL DEFAULT 0,
    duplicate_count INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'reconciled',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Pactos Presupuestarios y Regla de Herencia Continuada
CREATE TABLE budget_accords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(150) NOT NULL,
    effective_month CHAR(7) NOT NULL, -- 'YYYY-MM'
    scope VARCHAR(20) NOT NULL DEFAULT 'familiar',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE budget_envelopes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    accord_id UUID NOT NULL REFERENCES budget_accords(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES parent_categories(id),
    subcategory_id UUID REFERENCES subcategories(id),
    budgeted_amount NUMERIC(15, 2) NOT NULL CHECK (budgeted_amount >= 0)
);

-- Índices de alto rendimiento
CREATE INDEX idx_transactions_date_scope ON transactions(transaction_date, scope);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_hash ON transactions(transaction_hash);
CREATE INDEX idx_raw_payload_gin ON bank_statement_imports USING gin (raw_payload);
CREATE INDEX idx_budget_accords_month ON budget_accords(effective_month DESC);
`;

  const copyDdlToClipboard = () => {
    navigator.clipboard.writeText(sqlDdlScript);
    setCopiedDdl(true);
    setTimeout(() => setCopiedDdl(false), 2000);
  };

  return (
    <div className="space-y-8">
      
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Arquitectura de Base de Datos &amp; Seguridad Criptográfica
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluación de arquitectura de datos (PostgreSQL Híbrido + JSONB), Cifrado en Tránsito TLS 1.3 y Column-Level Encryption (CLE)
          </p>
        </div>

        <button
          onClick={copyDdlToClipboard}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
        >
          {copiedDdl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          <span>{copiedDdl ? 'DDL Copiado al Portapapeles' : 'Copiar DDL SQL'}</span>
        </button>
      </div>

      {/* 3 Pillars Security Badges Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Pillar 1: TLS 1.3 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-blue-700 font-semibold text-xs mb-2">
            <Server className="w-4 h-4" />
            <span>Cifrado en Tránsito (In-Transit)</span>
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">TLS 1.3 Obligatorio</h3>
          <p className="text-xs text-slate-500 mb-3">
            Todas las conexiones REST/GraphQL exigen TLS 1.3 con Perfect Forward Secrecy (PFS), cipher suites seguras (ECDHE-RSA-AES128-GCM-SHA256) y cabeceras HSTS preloaded.
          </p>
          <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
            Protocolo: TLSv1.3 / PFS Verificado
          </span>
        </div>

        {/* Pillar 2: AES-256 At-Rest */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs mb-2">
            <Database className="w-4 h-4" />
            <span>Cifrado en Reposo (At-Rest)</span>
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">AES-256 Nivel de Volumen</h3>
          <p className="text-xs text-slate-500 mb-3">
            Volúmenes de almacenamiento de Cloud SQL/PostgreSQL y respaldos automáticos encriptados bajo AES-256 mediante llaves administradas por KMS con rotación anual.
          </p>
          <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
            Almacenamiento: AES-XTS-256 Activo
          </span>
        </div>

        {/* Pillar 3: Column-Level Encryption (CLE) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-purple-700 font-semibold text-xs mb-2">
            <Key className="w-4 h-4" />
            <span>Cifrado a Nivel de Campo (CLE)</span>
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">AES-256-GCM Envelope Encryption</h3>
          <p className="text-xs text-slate-500 mb-3">
            Identificadores de cuenta (IBAN, tarjeta), números sensibles y credenciales de pasarelas se cifran a nivel de aplicación antes de persistirse en base de datos.
          </p>
          <span className="text-[11px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-medium">
            CLE: AES-GCM + AWS KMS / Vault
          </span>
        </div>

      </div>

      {/* Interactive CLE Simulator Sandbox */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-700" />
              <span>Simulador Interactivo de Column-Level Encryption (CLE)</span>
            </h2>
            <p className="text-xs text-slate-500">
              Experimenta el proceso criptográfico de cifrado y descifrado de números de cuenta sensibles
            </p>
          </div>
          <button
            onClick={handleSimulateEncrypt}
            disabled={isEncrypting}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            {isEncrypting ? 'Cifrando...' : 'Ejecutar Cifrado AES-256-GCM'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Plain Input */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Dato Sensible en Claro (Plaintext / Memoria de Aplicación)
            </label>
            <input
              type="text"
              value={plainInput}
              onChange={(e) => setPlainInput(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:border-slate-500"
            />
            <span className="text-[11px] text-slate-400 block">
              Ejemplo: Número de cuenta bancaria o identificador de tarjeta en el frontend
            </span>
          </div>

          {/* Ciphertext Output */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Almacenamiento en Base de Datos (PostgreSQL BYTEA)
              </label>
              {encryptedEnvelope && (
                <button
                  onClick={() => setIsDecrypted(!isDecrypted)}
                  className="text-xs text-blue-700 font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  {isDecrypted ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  <span>{isDecrypted ? 'Ocultar Texto' : 'Descifrar con Llave KMS'}</span>
                </button>
              )}
            </div>

            <div className="p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-lg min-h-[74px] flex flex-col justify-center break-all select-all">
              {encryptedEnvelope ? (
                isDecrypted ? (
                  <span className="text-white">{plainInput}</span>
                ) : (
                  <div>
                    <span className="text-slate-400 text-[10px] block mb-1">Algoritmo: {encryptedEnvelope.algorithm}</span>
                    <span>{encryptedEnvelope.ciphertext}</span>
                    <span className="text-slate-500 text-[10px] block mt-1">IV: {encryptedEnvelope.iv} | TAG: {encryptedEnvelope.tag}</span>
                  </div>
                )
              ) : (
                <span className="text-slate-500">Haz clic en "Ejecutar Cifrado" para generar el paquete criptográfico.</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Database Model Evaluation: Relational vs NoSQL vs Hybrid */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-700" />
            <span>Evaluación Arquitectónica: Modelo Relacional vs. NoSQL vs. Híbrido</span>
          </h2>
          <p className="text-xs text-slate-500">
            Análisis de compensaciones para el libro mayor financiero y extractos bancarios no estructurados
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          
          {/* Relacional Puro */}
          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
            <h3 className="font-bold text-slate-900">1. Relacional Puro (SQL Estricto)</h3>
            <p className="text-slate-600">
              Garantiza propiedades ACID perfectas, integridad referencial y restricciones CHECK para balances y doble partida.
            </p>
            <div className="pt-2 text-rose-700 font-medium">
              Limitación: Rigidez ante cambios imprevistos en formatos de extractos de bancos internacionales.
            </div>
          </div>

          {/* NoSQL Puro */}
          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
            <h3 className="font-bold text-slate-900">2. NoSQL Puro (Documental)</h3>
            <p className="text-slate-600">
              Alta flexibilidad de esquema para ingesta de extractos heterogéneos y metadatos variables.
            </p>
            <div className="pt-2 text-rose-700 font-medium">
              Limitación: Riesgo de inconsistencias en saldos, ausencia de transacciones ACID distribuidas nativas y joins costosos.
            </div>
          </div>

          {/* Híbrido Recomendado */}
          <div className="p-4 rounded-lg border border-emerald-300 bg-emerald-50/30 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-emerald-950">3. Híbrido (PostgreSQL + JSONB)</h3>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                RECOMENDADO
              </span>
            </div>
            <p className="text-slate-700">
              Tablas relacionales estrictas para el libro mayor contable (transactions, accounts, users) con restricciones UNIQUE de hash y ACID total; combinado con columnas JSONB indexadas con GIN para metadatos de extractos bancarios en bruto.
            </p>
          </div>

        </div>
      </section>

      {/* SQL DDL Code View */}
      <section className="bg-slate-950 p-6 rounded-xl border border-slate-800 text-slate-300 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-white">schema.sql (PostgreSQL 16 DDL)</span>
          </div>
          <button
            onClick={copyDdlToClipboard}
            className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            {copiedDdl ? 'Copiado' : 'Copiar'}
          </button>
        </div>

        <pre className="overflow-x-auto max-h-80 leading-relaxed text-slate-300 select-all">
          {sqlDdlScript}
        </pre>
      </section>

    </div>
  );
};
