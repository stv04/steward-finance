import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Landmark, 
  UploadCloud, 
  ShieldCheck, 
  CheckCircle2, 
  UserCircle2, 
  Users, 
  Key, 
  LayoutDashboard, 
  Building2, 
  ArrowLeftRight, 
  PiggyBank, 
  FolderTree 
} from 'lucide-react';
import { UserProfile, ScopeType, FamilyInfo } from '../types/finance';
import { ExtendedUserProfile } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface NavbarProps {
  activeScope: ScopeType;
  setActiveScope: (scope: ScopeType) => void;
  activeUserId: string;
  setActiveUserId: (id: string) => void;
  users: UserProfile[];
  userProfile: ExtendedUserProfile | null;
  familyInfo?: FamilyInfo | null;
  onNewTransaction: () => void;
  onOpenReconciliation: () => void;
  onOpenAuth: () => void;
  onOpenFamilyModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeScope,
  setActiveScope,
  activeUserId,
  setActiveUserId,
  users,
  userProfile,
  familyInfo,
  onNewTransaction,
  onOpenReconciliation,
  onOpenAuth,
  onOpenFamilyModal,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();

  // Normalize path without leading slash
  const activeTab = location.pathname.replace(/^\//, '') || 'dashboard';
  const activeUser = users.find(u => u.id === activeUserId) || users[0] || { name: 'Usuario' };

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-2xs">
        {/* Zone 1, 2, 3: Top Bar */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-6">
          
          {/* Zone 1: Wordmark / Brand */}
          <div 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2.5 sm:gap-3 shrink-0 cursor-pointer select-none"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-sm">
              <Landmark className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            </div>
            <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
              {t.brand}
            </span>
          </div>

          {/* Zone 2: Desktop Navigation Links (hidden on mobile, served by bottom bar) */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-7 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className={`whitespace-nowrap transition-colors cursor-pointer py-1 ${
                activeTab === 'dashboard'
                  ? 'text-slate-950 font-bold border-b-2 border-slate-900'
                  : 'hover:text-slate-900'
              }`}
            >
              {t.nav.dashboard}
            </button>
            <button
              type="button"
              onClick={() => navigate('/accounts')}
              className={`whitespace-nowrap transition-colors cursor-pointer py-1 ${
                activeTab === 'accounts'
                  ? 'text-slate-950 font-bold border-b-2 border-slate-900'
                  : 'hover:text-slate-900'
              }`}
            >
              {t.nav.accounts}
            </button>
            <button
              type="button"
              onClick={() => navigate('/transactions')}
              className={`whitespace-nowrap transition-colors cursor-pointer py-1 ${
                activeTab === 'transactions'
                  ? 'text-slate-950 font-bold border-b-2 border-slate-900'
                  : 'hover:text-slate-900'
              }`}
            >
              {t.nav.transactions}
            </button>
            <button
              type="button"
              onClick={() => navigate('/budgets')}
              className={`whitespace-nowrap transition-colors cursor-pointer py-1 ${
                activeTab === 'budgets'
                  ? 'text-slate-950 font-bold border-b-2 border-slate-900'
                  : 'hover:text-slate-900'
              }`}
            >
              {t.nav.budgets}
            </button>
            <button
              type="button"
              onClick={() => navigate('/categories')}
              className={`whitespace-nowrap transition-colors cursor-pointer py-1 ${
                activeTab === 'categories'
                  ? 'text-slate-950 font-bold border-b-2 border-slate-900'
                  : 'hover:text-slate-900'
              }`}
            >
              {t.nav.categories}
            </button>
          </nav>

          {/* Zone 3: Language Toggle, Family Badge & User Profile */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Language Switcher (ES | EN) */}
            <div className="inline-flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs">
              <button
                type="button"
                onClick={() => setLanguage('es')}
                className={`px-1.5 sm:px-2 py-1 rounded transition-colors cursor-pointer text-[11px] sm:text-xs ${
                  language === 'es' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Cambiar idioma a Español"
              >
                ES
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-1.5 sm:px-2 py-1 rounded transition-colors cursor-pointer text-[11px] sm:text-xs ${
                  language === 'en' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Switch language to English"
              >
                EN
              </button>
            </div>

            {/* Family Nucleus & Code quick button when authenticated */}
            {userProfile && (
              <button
                type="button"
                onClick={onOpenFamilyModal}
                className="hidden sm:inline-flex flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 text-xs text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                title={language === 'es' ? 'Gestión de Núcleo Familiar, Código de Acceso y Miembros' : 'Manage Family Nucleus, Invite Code and Members'}
              >
                <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="font-semibold hidden md:inline max-w-[90px] truncate">
                  {familyInfo?.name || userProfile.familyName || (language === 'es' ? 'Núcleo' : 'Family')}
                </span>
                <span className="bg-white text-slate-800 font-mono text-[10px] px-1.5 py-0.5 rounded border border-slate-200 font-bold shrink-0">
                  {familyInfo?.inviteCode || userProfile.familyId}
                </span>
              </button>
            )}

            {/* User profile / Login button */}
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              title={language === 'es' ? 'Cuenta y Autenticación Firebase' : 'Account and Firebase Auth'}
            >
              {userProfile?.avatar ? (
                <img src={userProfile.avatar} alt={userProfile.name} className="w-5 h-5 rounded-full object-cover shrink-0" />
              ) : (
                <UserCircle2 className="w-4 h-4 text-slate-600 shrink-0" />
              )}
              <span className="font-semibold text-slate-900 hidden sm:inline max-w-[90px] truncate">
                {userProfile?.name?.split(' ')[0] || t.nav.account}
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded hidden md:inline shrink-0">
                Firebase
              </span>
            </button>

            {/* Desktop-only top bar action button */}
            <button
              type="button"
              onClick={onNewTransaction}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs whitespace-nowrap shrink-0 cursor-pointer"
              title={t.nav.newTransaction}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Subheader Workspace Control Toolbar with horizontal swipe on mobile */}
        <div className="bg-slate-50/90 border-t border-slate-200/80 px-3 sm:px-6 lg:px-8 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs overflow-x-auto no-scrollbar">
            
            {/* Espacio / Ámbito Switcher */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-slate-500 font-medium whitespace-nowrap hidden sm:inline">{t.scope.label}</span>
              <div className="inline-flex p-0.5 bg-slate-200/70 rounded-md shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveScope('familiar')}
                  className={`px-2.5 sm:px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    activeScope === 'familiar'
                      ? 'bg-white text-slate-950 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.scope.familiar}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveScope('personal')}
                  className={`px-2.5 sm:px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    activeScope === 'personal'
                      ? 'bg-white text-slate-950 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.scope.personal}
                </button>
              </div>

              {/* User switcher if in personal scope */}
              {activeScope === 'personal' && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-slate-400">/</span>
                  <select
                    value={activeUserId}
                    onChange={(e) => setActiveUserId(e.target.value)}
                    className="bg-white border border-slate-200 rounded px-2 py-0.5 text-xs text-slate-700 font-medium outline-hidden cursor-pointer"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} {u.role === 'admin' ? `(${t.scope.adminBadge})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Family Code badge & Quick Action to Open Family Nucleus Modal */}
              {userProfile && (
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200 shrink-0">
                  <button
                    type="button"
                    onClick={onOpenFamilyModal}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-xs font-mono font-bold text-slate-800 transition-colors shadow-2xs cursor-pointer shrink-0"
                    title={language === 'es' ? 'Código de invitación. Clic para gestionar miembros.' : 'Family code. Click to manage members.'}
                  >
                    <Key className="w-3 h-3 text-emerald-600" />
                    <span>{familyInfo?.inviteCode || userProfile.familyId}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onOpenFamilyModal}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer whitespace-nowrap shrink-0 hidden md:inline-flex"
                  >
                    <Users className="w-3 h-3" />
                    <span>{t.scope.manageMembers} ({users.length})</span>
                  </button>
                </div>
              )}
            </div>

            {/* Secondary Action Toolbar & Technical Views via react-router-dom */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={onOpenReconciliation}
                className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded text-xs font-medium transition-colors whitespace-nowrap cursor-pointer shrink-0"
              >
                <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">{t.nav.reconciliation}</span>
                <span className="sm:hidden">CSV</span>
              </button>

              <span className="text-slate-300">|</span>

              <button
                type="button"
                onClick={() => navigate('/architecture')}
                className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer shrink-0 ${
                  activeTab === 'architecture'
                    ? 'text-slate-900 font-semibold bg-slate-200/80'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t.nav.architecture}</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/api-docs')}
                className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer shrink-0 ${
                  activeTab === 'api-docs'
                    ? 'text-slate-900 font-semibold bg-slate-200/80'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>{t.nav.apiDocs}</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/unit-tests')}
                className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer shrink-0 ${
                  activeTab === 'unit-tests'
                    ? 'text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">{t.nav.unitTests}</span>
                <span className="sm:hidden">Tests</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* FLOATING ACTION BUTTON (FAB) FOR NEW TRANSACTION */}
      <aside 
        aria-label="Acción flotante de transacción"
        className="fixed bottom-20 lg:bottom-8 right-4 sm:right-6 z-40"
      >
        <button
          type="button"
          onClick={onNewTransaction}
          className="flex items-center px-2 sm:px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer ring-3 focus:outline-hidden"
          aria-label={t.nav.newTransaction}
          title={t.nav.newTransaction}
        >
          <div className="flex items-center justify-center">
            <Plus className="w-6 h-6" />
          </div>
        </button>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION BAR (Visible on screens < lg) */}
      <nav 
        aria-label="Navegación móvil inferior"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg"
      >
        <div className="grid grid-cols-5 h-16">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className={`flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
              activeTab === 'dashboard'
                ? 'text-slate-950 font-bold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <LayoutDashboard className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-slate-950' : 'text-slate-500'}`} />
            <span className="text-[10px] truncate max-w-[62px]">{t.nav.dashboard}</span>
            {activeTab === 'dashboard' && <span className="w-1.5 h-1.5 rounded-full bg-slate-900 mt-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => navigate('/accounts')}
            className={`flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
              activeTab === 'accounts'
                ? 'text-slate-950 font-bold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <Building2 className={`w-4 h-4 ${activeTab === 'accounts' ? 'text-slate-950' : 'text-slate-500'}`} />
            <span className="text-[10px] truncate max-w-[62px]">{t.nav.accounts}</span>
            {activeTab === 'accounts' && <span className="w-1.5 h-1.5 rounded-full bg-slate-900 mt-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => navigate('/transactions')}
            className={`flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
              activeTab === 'transactions'
                ? 'text-slate-950 font-bold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <ArrowLeftRight className={`w-4 h-4 ${activeTab === 'transactions' ? 'text-slate-950' : 'text-slate-500'}`} />
            <span className="text-[10px] truncate max-w-[62px]">{t.nav.transactions}</span>
            {activeTab === 'transactions' && <span className="w-1.5 h-1.5 rounded-full bg-slate-900 mt-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => navigate('/budgets')}
            className={`flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
              activeTab === 'budgets'
                ? 'text-slate-950 font-bold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <PiggyBank className={`w-4 h-4 ${activeTab === 'budgets' ? 'text-slate-950' : 'text-slate-500'}`} />
            <span className="text-[10px] truncate max-w-[62px]">{t.nav.budgets}</span>
            {activeTab === 'budgets' && <span className="w-1.5 h-1.5 rounded-full bg-slate-900 mt-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => navigate('/categories')}
            className={`flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
              activeTab === 'categories'
                ? 'text-slate-950 font-bold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <FolderTree className={`w-4 h-4 ${activeTab === 'categories' ? 'text-slate-950' : 'text-slate-500'}`} />
            <span className="text-[10px] truncate max-w-[62px]">{t.nav.categories}</span>
            {activeTab === 'categories' && <span className="w-1.5 h-1.5 rounded-full bg-slate-900 mt-0.5" />}
          </button>
        </div>
      </nav>
    </>
  );
};
