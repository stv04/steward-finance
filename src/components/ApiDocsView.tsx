import React, { useState } from 'react';
import { 
  Code, 
  Send, 
  CheckCircle2, 
  Copy, 
  Check, 
  Shield, 
  Terminal, 
  Globe, 
  Layers
} from 'lucide-react';
import { FinancialAccount, Transaction, BudgetAccord } from '../types/finance';

interface ApiDocsViewProps {
  accounts: FinancialAccount[];
  transactions: Transaction[];
  accords: BudgetAccord[];
}

export const ApiDocsView: React.FC<ApiDocsViewProps> = ({
  accounts,
  transactions,
  accords,
}) => {
  const [selectedEndpointIndex, setSelectedEndpointIndex] = useState<number>(0);
  const [simulatedResponse, setSimulatedResponse] = useState<any | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);

  const endpoints = [
    {
      method: 'GET',
      path: '/api/v1/accounts',
      title: 'Obtener Cuentas y Entidades Financieras',
      description: 'Devuelve todas las cuentas (bancos, inversiones, tarjetas, PayPal, efectivo) con saldos consolidados y datos de corte/pago cifrados mediante CLE.',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        'X-Scope-Context': 'familiar',
        'Accept': 'application/json',
      },
      requestBody: null,
      generateResponse: () => ({
        status: 200,
        success: true,
        data: {
          accounts: accounts.slice(0, 4).map(a => ({
            id: a.id,
            name: a.name,
            institution: a.institution,
            accountType: a.accountType,
            accountNumberMasked: a.accountNumberMasked,
            balance: a.balance,
            currency: a.currency,
            scope: a.scope,
            creditLimit: a.creditLimit,
            cutoffDay: a.cutoffDay,
            paymentDueDay: a.paymentDueDay,
          })),
          summary: {
            totalAccounts: accounts.length,
            consolidatedNetWorth: 53120.00,
          }
        }
      }),
    },
    {
      method: 'POST',
      path: '/api/v1/transactions',
      title: 'Registrar Movimiento Individual en Ledger',
      description: 'Inserta una transacción en el libro mayor relacional, calcula el hash SHA-256 para prevenir duplicados y valida fondos.',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        'Content-Type': 'application/json',
      },
      requestBody: {
        userId: 'usr_carlos',
        date: '2026-10-14',
        amount: 85.50,
        type: 'expense',
        accountId: 'acc_santander_checking',
        categoryId: 'cat_alimentacion',
        subcategoryId: 'sub_supermercado',
        scope: 'familiar',
        description: 'Compra semanal frutas y vegetales',
      },
      generateResponse: () => ({
        status: 201,
        success: true,
        message: 'Transacción registrada con éxito e incorporada al libro mayor.',
        data: {
          transactionId: 'tx_rec_generated_9921',
          compositeHash: '8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a',
          isDuplicate: false,
          ledgerBalanceAfter: 5034.50,
        }
      }),
    },
    {
      method: 'POST',
      path: '/api/v1/transactions/reconcile',
      title: 'Conciliación Bancaria por Lote & Deduplicación',
      description: 'Recibe un extracto en bruto (CSV/JSON), computa hashes combinados para deduplicación instantánea y sugiere categorías basadas en similaridad semántica.',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        'Content-Type': 'application/json',
      },
      requestBody: {
        targetAccountId: 'acc_credit_mastercard',
        rawStatements: [
          { rawDate: '2026-10-04', rawDesc: 'SUPERMERCADO CENTRAL CORTE 4402', rawAmount: 182.40 },
          { rawDate: '2026-10-14', rawDesc: 'SUPERMERCADO DIA FRUTAS', rawAmount: 38.50 },
          { rawDate: '2026-10-14', rawDesc: 'NETFLIX MENSUAL PREMIUM', rawAmount: 19.99 },
        ]
      },
      generateResponse: () => ({
        status: 200,
        success: true,
        summary: { totalProcessed: 3, detectedDuplicates: 1, readyForImport: 2 },
        items: [
          {
            row: { date: '2026-10-04', desc: 'SUPERMERCADO CENTRAL CORTE 4402', amount: 182.40 },
            isDuplicate: true,
            reason: 'Hash SHA-256 colisiona con movimiento preexistente tx_004 en cuenta',
            suggestedAction: 'skip_duplicate',
          },
          {
            row: { date: '2026-10-14', desc: 'SUPERMERCADO DIA FRUTAS', amount: 38.50 },
            isDuplicate: false,
            suggestedCategory: 'cat_alimentacion',
            suggestedSubcategory: 'sub_supermercado',
            confidence: 0.90,
          },
          {
            row: { date: '2026-10-14', desc: 'NETFLIX MENSUAL PREMIUM', amount: 19.99 },
            isDuplicate: false,
            suggestedCategory: 'cat_entretenimiento',
            suggestedSubcategory: 'sub_streaming',
            confidence: 0.95,
          }
        ]
      }),
    },
    {
      method: 'GET',
      path: '/api/v1/budgets/continuous?month=2026-10&scope=familiar',
      title: 'Consultar Presupuesto con Regla de Herencia Continuada',
      description: 'Calcula el presupuesto en vigor para el mes indicado, resolviendo de forma recursiva los pactos heredados y calculando alertas de desviación en tiempo real.',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        'Accept': 'application/json',
      },
      requestBody: null,
      generateResponse: () => ({
        status: 200,
        success: true,
        data: {
          targetMonth: '2026-10',
          scope: 'familiar',
          isInherited: true,
          inheritedFromAccord: 'accord_base_2026_08',
          totalIncome: 7250.00,
          totalBudgeted: 5020.00,
          totalRealizedExpense: 1845.90,
          zeroBasedBalance: 2230.00,
          envelopesCount: 6,
          envelopesStatus: [
            { category: 'Vivienda & Hogar', budgeted: 1650, spent: 1390, available: 260, status: 'warning' },
            { category: 'Alimentación', budgeted: 1050, spent: 345.90, available: 704.10, status: 'nominal' },
            { category: 'Inversión & Ahorro', budgeted: 1150, spent: 500, available: 650, status: 'nominal' },
          ]
        }
      }),
    },
    {
      method: 'POST',
      path: '/api/v1/budgets/accord',
      title: 'Promulgar Nuevo Pacto Presupuestario',
      description: 'Crea un nuevo pacto que corta la herencia del pacto anterior e inicia una nueva línea de herencia recursiva a partir del mes de vigencia.',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        'Content-Type': 'application/json',
      },
      requestBody: {
        name: 'Pacto Presupuestario Noviembre 2026',
        effectiveMonth: '2026-11',
        scope: 'familiar',
        envelopes: [
          { categoryId: 'cat_vivienda', budgetedAmount: 1700.00 },
          { categoryId: 'cat_alimentacion', budgetedAmount: 1100.00 },
          { categoryId: 'cat_inversion', budgetedAmount: 1250.00 },
        ]
      },
      generateResponse: () => ({
        status: 201,
        success: true,
        message: 'Nuevo pacto promulgado con éxito. Establecido como nueva base de herencia recursiva.',
        data: {
          accordId: 'accord_nov_2026_new',
          effectiveMonth: '2026-11',
          envelopesRegistered: 3,
        }
      }),
    },
  ];

  const currentEndpoint = endpoints[selectedEndpointIndex];

  const handleExecuteSandbox = () => {
    setIsExecuting(true);
    setTimeout(() => {
      setSimulatedResponse(currentEndpoint.generateResponse());
      setIsExecuting(false);
    }, 250);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Documentación Técnica de la API REST (Backend Architecture)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Especificación técnica de endpoints para conciliación bancaria, herencia presupuestaria y libro mayor contable
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-lg">
          <Globe className="w-3.5 h-3.5 text-blue-600" />
          <span>Base URL: https://api.finanzas.internal/v1</span>
        </div>
      </div>

      {/* Main Grid: Endpoint List & Sandbox Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Col (4 Cols): Endpoints List */}
        <div className="lg:col-span-4 space-y-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
            Endpoints Disponibles ({endpoints.length})
          </span>

          <div className="space-y-1.5">
            {endpoints.map((ep, idx) => {
              const isSelected = selectedEndpointIndex === idx;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedEndpointIndex(idx);
                    setSimulatedResponse(null);
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-white border-slate-900 shadow-xs' 
                      : 'bg-white/60 hover:bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                      ep.method === 'GET' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {ep.method}
                    </span>
                    <span className="font-mono text-xs font-semibold text-slate-900 truncate">
                      {ep.path.split('?')[0]}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 line-clamp-1 block">
                    {ep.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Col (8 Cols): Endpoint Detail & Interactive Sandbox */}
        <div className="lg:col-span-8 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
          
          {/* Header of Endpoint */}
          <div className="flex items-start justify-between pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                  currentEndpoint.method === 'GET' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {currentEndpoint.method}
                </span>
                <span className="font-mono text-sm font-bold text-slate-900">
                  {currentEndpoint.path}
                </span>
              </div>
              <h2 className="text-sm font-semibold text-slate-800">{currentEndpoint.title}</h2>
              <p className="text-xs text-slate-500 mt-1">{currentEndpoint.description}</p>
            </div>

            <button
              onClick={handleExecuteSandbox}
              disabled={isExecuting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isExecuting ? 'Enviando...' : 'Probar Endpoint'}</span>
            </button>
          </div>

          {/* Request Headers */}
          <div>
            <span className="text-xs font-semibold text-slate-700 block mb-1.5">Cabeceras Requeridas (Headers)</span>
            <div className="p-3 bg-slate-50 rounded-lg font-mono text-[11px] text-slate-700 space-y-1 border border-slate-200">
              {Object.entries(currentEndpoint.headers).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-slate-500 font-semibold">{k}:</span>
                  <span className="text-slate-800 truncate max-w-sm">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Request Body (if any) */}
          {currentEndpoint.requestBody && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-700">Cuerpo de la Petición (JSON Payload)</span>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(currentEndpoint.requestBody, null, 2))}
                  className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  {copiedPayload ? 'Copiado' : 'Copiar JSON'}
                </button>
              </div>
              <pre className="p-3 bg-slate-900 text-emerald-400 rounded-lg font-mono text-xs overflow-x-auto max-h-44">
                {JSON.stringify(currentEndpoint.requestBody, null, 2)}
              </pre>
            </div>
          )}

          {/* Live Response Inspector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-slate-500" />
                <span>Respuesta del Servidor (Live API Response)</span>
              </span>
              {simulatedResponse && (
                <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                  HTTP {simulatedResponse.status} OK (TLS 1.3)
                </span>
              )}
            </div>

            <pre className="p-3 bg-slate-950 text-slate-200 rounded-lg font-mono text-xs overflow-x-auto max-h-56 select-all border border-slate-800">
              {simulatedResponse 
                ? JSON.stringify(simulatedResponse, null, 2) 
                : '// Haz clic en "Probar Endpoint" para disparar la petición simulada en tiempo real.'}
            </pre>
          </div>

        </div>

      </div>

    </div>
  );
};
