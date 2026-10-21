import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  User, 
  Users, 
  ShieldCheck, 
  ArrowRight, 
  X, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Key,
  Copy,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { FamilyInfo } from '../types/finance';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyInfo?: FamilyInfo | null;
  onOpenFamilyModal?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose,
  familyInfo,
  onOpenFamilyModal
}) => {
  const { 
    currentUser, 
    userProfile, 
    loginWithEmail, 
    registerWithEmail, 
    loginAsDemoUser, 
    logout, 
    error, 
    clearError 
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [familyNameOrCode, setFamilyNameOrCode] = useState('');
  const [isJoiningFamily, setIsJoiningFamily] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localMsg, setLocalMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalMsg(null);
    setSubmitting(true);

    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
        setLocalMsg('Sesión iniciada con éxito en Firebase.');
        setTimeout(() => onClose(), 800);
      } else {
        await registerWithEmail(email, password, fullName, familyNameOrCode, isJoiningFamily);
        setLocalMsg('Cuenta creada y vinculada al núcleo familiar en Firestore.');
        setTimeout(() => onClose(), 800);
      }
    } catch (err: any) {
      // handled by auth context
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoSelect = (persona: 'carlos' | 'sofia') => {
    loginAsDemoUser(persona);
    setLocalMsg(`Sesión activa en modo demostración como ${persona === 'carlos' ? 'Carlos (Admin)' : 'Sofía (Miembro)'}`);
    setTimeout(() => onClose(), 600);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 my-8 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {currentUser || userProfile ? 'Gestión de Cuenta & Familia' : 'Autenticación en Firebase'}
              </h3>
              <p className="text-[11px] text-slate-500">Firebase Auth · Firestore Cloud Database</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* If user is already authenticated */}
        {userProfile && (
          <div className="space-y-4 py-2">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3">
              <img 
                src={userProfile.avatar} 
                alt={userProfile.name} 
                className="w-10 h-10 rounded-full border border-slate-200"
              />
              <div className="truncate flex-1">
                <span className="text-xs font-bold text-slate-900 block truncate">{userProfile.name}</span>
                <span className="text-[11px] text-slate-500 font-mono block truncate">{userProfile.email}</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                    Rol: {userProfile.role === 'admin' ? 'Administrador Familiar' : 'Miembro'}
                  </span>
                  {userProfile.familyName && (
                    <span className="text-[10px] text-slate-500">
                      Núcleo: <strong>{userProfile.familyName}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Family Code & Nucleus Card */}
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3 shadow-xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Código de Acceso Familiar</span>
                </span>
                <span className="text-[10px] bg-slate-800 text-emerald-300 font-mono px-2 py-0.5 rounded border border-slate-700">
                  {familyInfo?.name || userProfile.familyName || 'Núcleo'}
                </span>
              </div>

              <div className="flex items-center justify-between bg-slate-950/80 p-3 rounded-lg border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 block">Código para invitar miembros:</span>
                  <span className="text-base sm:text-lg font-mono font-bold text-white tracking-widest block">
                    {familyInfo?.inviteCode || userProfile.inviteCode || userProfile.familyId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const code = familyInfo?.inviteCode || userProfile.inviteCode || userProfile.familyId || '';
                    try {
                      await navigator.clipboard.writeText(code);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    } catch (e) {
                      console.warn(e);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                    copiedCode 
                      ? 'bg-emerald-500 text-slate-950 font-bold' 
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? '¡Copiado!' : 'Copiar'}</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed">
                Comparte este código con los integrantes de tu hogar para vincularlos a este núcleo familiar.
              </p>

              {onOpenFamilyModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenFamilyModal();
                  }}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Gestionar Miembros del Núcleo (Altas y Bajas)</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={async () => {
                  await logout();
                }}
                className="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
              >
                Cerrar Sesión
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Volver a la App
              </button>
            </div>
          </div>
        )}

        {/* If user is not logged in */}
        {!userProfile && (
          <div className="space-y-4">
            {/* Mode switch */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`py-1.5 font-medium rounded transition-colors cursor-pointer ${
                  mode === 'login' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`py-1.5 font-medium rounded transition-colors cursor-pointer ${
                  mode === 'register' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Registrar Cuenta
              </button>
            </div>

            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {localMsg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{localMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              {mode === 'register' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nombre Completo</label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Ej. Carlos Mendoza"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg focus:outline-hidden focus:border-slate-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="usuario@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg focus:outline-hidden focus:border-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contraseña</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg focus:outline-hidden focus:border-slate-500"
                  />
                </div>
              </div>

              {mode === 'register' && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="joinFam"
                      checked={isJoiningFamily}
                      onChange={(e) => setIsJoiningFamily(e.target.checked)}
                      className="rounded text-slate-900 cursor-pointer"
                    />
                    <label htmlFor="joinFam" className="text-slate-700 font-medium cursor-pointer">
                      Tengo un código de invitación familiar
                    </label>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {isJoiningFamily ? 'Código de Invitación Familiar' : 'Nombre del Núcleo Familiar'}
                    </label>
                    <input
                      type="text"
                      placeholder={isJoiningFamily ? 'Ej. FAM-8891' : 'Ej. Familia Mendoza'}
                      value={familyNameOrCode}
                      onChange={(e) => setFamilyNameOrCode(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-hidden focus:border-slate-500"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors shadow-xs cursor-pointer disabled:opacity-50 mt-2"
              >
                {submitting ? 'Procesando en Firebase...' : (mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta y Entrar')}
              </button>
            </form>

            {/* Quick Demo Mode Buttons */}
            <div className="pt-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-400 block mb-2 text-center">
                O prueba instantáneamente con perfiles pre-cargados:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDemoSelect('carlos')}
                  className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-left text-xs transition-colors cursor-pointer"
                >
                  <strong className="block text-slate-900">Carlos (Admin)</strong>
                  <span className="text-[10px] text-slate-500">Acceso total familiar</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoSelect('sofia')}
                  className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-left text-xs transition-colors cursor-pointer"
                >
                  <strong className="block text-slate-900">Sofía (Miembro)</strong>
                  <span className="text-[10px] text-slate-500">Cuentas e inversiones</span>
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
