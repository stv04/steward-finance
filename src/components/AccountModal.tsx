import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  TrendingUp, 
  CreditCard, 
  Wallet, 
  Check, 
  Layers,
  ArrowRight,
  ShieldCheck,
  Percent,
  Calendar
} from 'lucide-react';
import { AccountType, FinancialAccount, ScopeType } from '../types/finance';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (account: FinancialAccount) => void;
  existingAccounts: FinancialAccount[];
  activeUserId: string;
  defaultType?: AccountType;
}

const ACCOUNT_TYPE_OPTIONS: { 
  type: AccountType; 
  title: string; 
  category: string;
  description: string; 
  icon: typeof Building2;
}[] = [
  {
    type: 'bank_checking',
    title: 'Cuenta Corriente',
    category: 'Bancaria',
    description: 'Cuenta bancaria operativa para cobros, transferencias y gastos diarios.',
    icon: Building2,
  },
  {
    type: 'bank_savings',
    title: 'Cuenta de Ahorro',
    category: 'Bancaria',
    description: 'Fondo de emergencia o ahorros líquidos con disponibilidad inmediata.',
    icon: Building2,
  },
  {
    type: 'investment',
    title: 'Plataforma de Inversión',
    category: 'Inversión',
    description: 'Fondos indexados, acciones, CETES, bonos soberanos o criptoactivos.',
    icon: TrendingUp,
  },
  {
    type: 'card_debit',
    title: 'Tarjeta de Débito',
    category: 'Tarjetas',
    description: 'Tarjeta vinculada directamente a una cuenta corriente o ahorro activa.',
    icon: CreditCard,
  },
  {
    type: 'card_credit',
    title: 'Tarjeta de Crédito',
    category: 'Tarjetas',
    description: 'Línea de crédito rotativa con ciclo mensual, fecha de corte y pago.',
    icon: CreditCard,
  },
  {
    type: 'digital_gateway',
    title: 'Pasarela Digital',
    category: 'Digital & Efectivo',
    description: 'Billetera digital en la nube como PayPal, Stripe o Mercado Pago.',
    icon: Wallet,
  },
  {
    type: 'cash_wallet',
    title: 'Billetera / Efectivo',
    category: 'Digital & Efectivo',
    description: 'Caja chica personal o dinero en efectivo para pagos físicos.',
    icon: Wallet,
  },
];

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingAccounts,
  activeUserId,
  defaultType = 'bank_checking',
}) => {
  const [accountType, setAccountType] = useState<AccountType>(defaultType);
  const [name, setName] = useState<string>('');
  const [institution, setInstitution] = useState<string>('');
  const [balance, setBalance] = useState<string>('0');
  const [currency, setCurrency] = useState<string>('EUR');
  const [scope, setScope] = useState<ScopeType>('familiar');
  const [accountNumberMasked, setAccountNumberMasked] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  // Debit card linked account
  const [linkedAccountId, setLinkedAccountId] = useState<string>('');

  // Credit card specific fields
  const [creditLimit, setCreditLimit] = useState<string>('2500');
  const [cutoffDay, setCutoffDay] = useState<string>('15');
  const [paymentDueDay, setPaymentDueDay] = useState<string>('5');

  // Investment specific fields
  const [yieldRateAnnual, setYieldRateAnnual] = useState<string>('8.5');
  const [assetClass, setAssetClass] = useState<string>('Renta Variable Indexada');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    const parsedBalance = parseFloat(balance) || 0;
    const generatedId = `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newAccount: FinancialAccount = {
      id: generatedId,
      name: name.trim(),
      institution: institution.trim() || 'Entidad Financiera',
      accountType,
      accountNumberMasked: accountNumberMasked.trim() ? (accountNumberMasked.startsWith('••••') ? accountNumberMasked : `•••• ${accountNumberMasked.slice(-4)}`) : '•••• ' + Math.floor(1000 + Math.random() * 9000),
      balance: parsedBalance,
      currency,
      ownerId: activeUserId,
      scope,
      isActive: true,
      notes: notes.trim() || undefined,
    };

    if (accountType === 'card_debit') {
      newAccount.linkedAccountId = linkedAccountId || undefined;
    }

    if (accountType === 'card_credit') {
      newAccount.creditLimit = parseFloat(creditLimit) || 1000;
      newAccount.cutoffDay = parseInt(cutoffDay, 10) || 15;
      newAccount.paymentDueDay = parseInt(paymentDueDay, 10) || 5;
    }

    if (accountType === 'investment') {
      newAccount.yieldRateAnnual = parseFloat(yieldRateAnnual) || 0;
      newAccount.assetClass = assetClass.trim() || 'Inversión';
    }

    onSave(newAccount);
    onClose();
  };

  const eligibleLinkedAccounts = existingAccounts.filter(
    a => a.accountType === 'bank_checking' || a.accountType === 'bank_savings'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Registrar Nueva Cuenta o Instrumento
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Crea manualmente tus cuentas bancarias, inversiones, tarjetas o billeteras.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Account Type Selector Grid */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Tipo de Entidad Financiera
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ACCOUNT_TYPE_OPTIONS.map((opt) => {
                const IconComponent = opt.icon;
                const isSelected = accountType === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setAccountType(opt.type)}
                    className={`flex items-start gap-3 p-3 text-left rounded-lg border transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600/30' 
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className={`p-2 rounded-md shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">{opt.title}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">({opt.category})</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight mt-0.5 line-clamp-2">
                        {opt.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Core Info Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre de la Cuenta *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Santander Nómina / Vanguard S&P 500"
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Institución / Entidad
              </label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="Ej. Banco Santander, BBVA, Vanguard, PayPal"
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
          </div>

          {/* Balance, Currency, and Scope */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Saldo Inicial
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  required
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  className="w-full text-xs font-mono tabular-nums px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Moneda
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="MXN">MXN ($)</option>
                <option value="COP">COP ($)</option>
                <option value="ARS">ARS ($)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ámbito de Visibilidad
              </label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as ScopeType)}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              >
                <option value="familiar">Familiar (Compartida en Núcleo)</option>
                <option value="personal">Personal (Solo Privada)</option>
              </select>
            </div>
          </div>

          {/* Conditional: Tarjeta de Débito (Vinculada a cuenta activa) */}
          {accountType === 'card_debit' && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800">
                  Vincular Tarjeta de Débito a Cuenta Bancaria
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Selecciona la cuenta de ahorros o corriente desde la cual se debitan los fondos de esta tarjeta:
              </p>
              <select
                value={linkedAccountId}
                onChange={(e) => setLinkedAccountId(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              >
                <option value="">-- Sin vincular directamente (Saldo independiente) --</option>
                {eligibleLinkedAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.institution}) - Saldo: {acc.currency} {acc.balance.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Conditional: Tarjeta de Crédito (Corte y Fecha de Pago) */}
          {accountType === 'card_credit' && (
            <div className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-amber-900">
                <CreditCard className="w-4 h-4 text-amber-700" />
                <span className="text-xs font-bold">
                  Parámetros de Ciclo de Crédito
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Límite de Crédito
                  </label>
                  <input
                    type="number"
                    step="50"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    className="w-full text-xs font-mono px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Día de Corte (1 - 31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={cutoffDay}
                    onChange={(e) => setCutoffDay(e.target.value)}
                    className="w-full text-xs font-mono px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Día Límite de Pago
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={paymentDueDay}
                    onChange={(e) => setPaymentDueDay(e.target.value)}
                    className="w-full text-xs font-mono px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Conditional: Inversión (Rendimiento anual y clase de activo) */}
          {accountType === 'investment' && (
            <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-emerald-900">
                <TrendingUp className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold">
                  Parámetros del Instrumento de Inversión
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Rendimiento Anual Estimado (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={yieldRateAnnual}
                      onChange={(e) => setYieldRateAnnual(e.target.value)}
                      placeholder="Ej. 9.8"
                      className="w-full text-xs font-mono px-3 py-1.5 pr-7 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                    <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Clase de Activo / Fondo
                  </label>
                  <input
                    type="text"
                    value={assetClass}
                    onChange={(e) => setAssetClass(e.target.value)}
                    placeholder="Ej. Renta Fija Gubernamental / S&P 500"
                    className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Identification & Security */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Número Enmascarado (Últimos 4 dígitos)
              </label>
              <input
                type="text"
                maxLength={20}
                value={accountNumberMasked}
                onChange={(e) => setAccountNumberMasked(e.target.value)}
                placeholder="•••• 4821"
                className="w-full text-xs font-mono px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Nunca se almacenan números completos en texto claro.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Notas / Propósito
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej. Para gastos de supermercado y servicios"
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Guardar Cuenta</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
