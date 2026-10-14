import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Landmark, UploadCloud, ShieldCheck, CheckCircle2, UserCircle2, Cloud } from 'lucide-react';
import { UserProfile, ScopeType } from '../types/finance';
import { ExtendedUserProfile } from '../context/AuthContext';

interface NavbarProps {
  activeScope: ScopeType;
  setActiveScope: (scope: ScopeType) => void;
  activeUserId: string;
  setActiveUserId: (id: string) => void;
  users: UserProfile[];
  userProfile: ExtendedUserProfile | null;
  onNewTransaction: () => void;
  onOpenReconciliation: () => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeScope,
  setActiveScope,
  activeUserId,
  setActiveUserId,
  users,
  userProfile,
  onNewTransaction,
  onOpenReconciliation,
  onOpenAuth,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Normalize path without leading slash
  const activeTab = location.pathname.replace(/^\//, '') || 'dashboard';
  const activeUser = users.find(u => u.id === activeUserId) || users[0];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      {/* Zone 1, 2, 3: Strict Top Bar Contract (1 line brand, 4-5 text nav links, 1 primary action) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        
        {/* Zone 1: Single text element wordmark */}
        <div 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-3 shrink-0 cursor-pointer"
        >
          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-sm">
            <Landmark className="w-5 h-5 text-emerald-400" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
            PatrimonioFamiliar
          </span>
        </div>

        {/* Zone 2: 4-5 concise single-line text navigation links via react-router-dom */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600">
          <button
            onClick={() => navigate('/dashboard')}
            className={`whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'dashboard'
                ? 'text-slate-950 font-semibold border-b-2 border-slate-900 pb-0.5'
                : 'hover:text-slate-900'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => navigate('/accounts')}
            className={`whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'accounts'
                ? 'text-slate-950 font-semibold border-b-2 border-slate-900 pb-0.5'
                : 'hover:text-slate-900'
            }`}
          >
            Cuentas
          </button>
          <button
            onClick={() => navigate('/transactions')}
            className={`whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'transactions'
                ? 'text-slate-950 font-semibold border-b-2 border-slate-900 pb-0.5'
                : 'hover:text-slate-900'
            }`}
          >
            Transacciones
          </button>
          <button
            onClick={() => navigate('/budgets')}
            className={`whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'budgets'
                ? 'text-slate-950 font-semibold border-b-2 border-slate-900 pb-0.5'
                : 'hover:text-slate-900'
            }`}
          >
            Presupuestos
          </button>
          <button
            onClick={() => navigate('/categories')}
            className={`whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'categories'
                ? 'text-slate-950 font-semibold border-b-2 border-slate-900 pb-0.5'
                : 'hover:text-slate-900'
            }`}
          >
            Categorías
          </button>
        </nav>

        {/* Zone 3: 1 primary action + User Profile trigger */}
        <div className="flex items-center gap-3 shrink-0">
          {/* User profile / Login button */}
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Cuenta y Autenticación Firebase"
          >
            {userProfile?.avatar ? (
              <img src={userProfile.avatar} alt={userProfile.name} className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <UserCircle2 className="w-4 h-4 text-slate-600" />
            )}
            <span className="font-semibold text-slate-900 hidden sm:inline max-w-[110px] truncate">
              {userProfile?.name?.split(' ')[0] || 'Cuenta'}
            </span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded hidden md:inline">
              Firebase
            </span>
          </button>

          <button
            onClick={onNewTransaction}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Transacción</span>
          </button>
        </div>
      </div>

      {/* Subheader Workspace Control Toolbar */}
      <div className="bg-slate-50/80 border-t border-slate-200/80 px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs">
          
          {/* Espacio / Ámbito Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium whitespace-nowrap">Ámbito Activo:</span>
            <div className="inline-flex p-0.5 bg-slate-200/70 rounded-md">
              <button
                type="button"
                onClick={() => setActiveScope('familiar')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  activeScope === 'familiar'
                    ? 'bg-white text-slate-950 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Familiar Consolidado
              </button>
              <button
                type="button"
                onClick={() => setActiveScope('personal')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  activeScope === 'personal'
                    ? 'bg-white text-slate-950 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Individual ({activeUser.name.split(' ')[0]})
              </button>
            </div>

            {/* User switcher if in personal scope */}
            {activeScope === 'personal' && (
              <div className="flex items-center gap-1.5 ml-1">
                <span className="text-slate-400">/</span>
                <select
                  value={activeUserId}
                  onChange={(e) => setActiveUserId(e.target.value)}
                  className="bg-white border border-slate-200 rounded px-2 py-0.5 text-xs text-slate-700 font-medium outline-hidden"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Secondary Action Toolbar & Technical Views via react-router-dom */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenReconciliation}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded text-xs font-medium transition-colors whitespace-nowrap cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
              <span>Conciliación CSV / Extractos</span>
            </button>

            <span className="text-slate-300">|</span>

            <button
              onClick={() => navigate('/architecture')}
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'architecture'
                  ? 'text-slate-900 font-semibold bg-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>ERD &amp; Cifrado CLE</span>
            </button>

            <button
              onClick={() => navigate('/api-docs')}
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'api-docs'
                  ? 'text-slate-900 font-semibold bg-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Docs API REST</span>
            </button>

            <button
              onClick={() => navigate('/unit-tests')}
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'unit-tests'
                  ? 'text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tests Unitarios</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
