import React, { useState } from 'react';
import { 
  Users, 
  X, 
  Copy, 
  Check, 
  UserPlus, 
  UserMinus, 
  ShieldCheck, 
  ShieldAlert, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Key, 
  ArrowRight,
  Mail,
  User as UserIcon
} from 'lucide-react';
import { UserProfile, FamilyInfo } from '../types/finance';
import { ExtendedUserProfile } from '../context/AuthContext';
import { addMemberToFamily, removeMemberFromFamily, joinFamilyByCode } from '../services/firestoreService';

interface FamilyMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyInfo: FamilyInfo | null;
  familyMembers: UserProfile[];
  currentUserProfile: ExtendedUserProfile | null;
  onProfileRefreshed?: () => void;
}

export const FamilyMembersModal: React.FC<FamilyMembersModalProps> = ({
  isOpen,
  onClose,
  familyInfo,
  familyMembers,
  currentUserProfile,
  onProfileRefreshed,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<boolean>(false);
  
  // Add member form state
  const [newMemberEmail, setNewMemberEmail] = useState<string>('');
  const [newMemberName, setNewMemberName] = useState<string>('');
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'member'>('member');
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Join another family state
  const [showJoinSection, setShowJoinSection] = useState<boolean>(false);
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [isJoining, setIsJoining] = useState<boolean>(false);

  // Removing member confirmation
  const [memberToRemove, setMemberToRemove] = useState<UserProfile | null>(null);
  const [isRemoving, setIsRemoving] = useState<boolean>(false);

  if (!isOpen) return null;

  const isAdmin = currentUserProfile?.role === 'admin';
  const familyId = currentUserProfile?.familyId || familyInfo?.id || '';
  const familyName = currentUserProfile?.familyName || familyInfo?.name || 'Familia Principal';
  const inviteCode = familyInfo?.inviteCode || familyId;

  const handleCopyCode = async (codeToCopy: string, isAlternative: boolean = false) => {
    try {
      await navigator.clipboard.writeText(codeToCopy);
      if (isAlternative) {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2500);
      } else {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (err) {
      console.warn('Clipboard write error:', err);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setActionMsg({ type: 'error', text: 'Solo los administradores pueden añadir nuevos miembros.' });
      return;
    }
    if (!newMemberEmail.trim()) {
      setActionMsg({ type: 'error', text: 'Por favor introduce un correo electrónico válido.' });
      return;
    }

    setIsAdding(true);
    setActionMsg(null);

    try {
      const res = await addMemberToFamily(
        familyId,
        familyName,
        newMemberEmail.trim(),
        newMemberName.trim() || undefined,
        newMemberRole
      );

      if (res.success) {
        setActionMsg({ type: 'success', text: res.message });
        setNewMemberEmail('');
        setNewMemberName('');
      } else {
        setActionMsg({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err?.message || 'Error al agregar miembro al núcleo familiar.' });
    } finally {
      setIsAdding(false);
    }
  };

  const handleConfirmRemove = async () => {
    if (!memberToRemove || !isAdmin) return;
    if (memberToRemove.id === currentUserProfile?.id) {
      setActionMsg({ type: 'error', text: 'No puedes retirarte a ti mismo del núcleo familiar como administrador activo.' });
      setMemberToRemove(null);
      return;
    }

    setIsRemoving(true);
    setActionMsg(null);

    try {
      const res = await removeMemberFromFamily(familyId, memberToRemove.id);
      if (res.success) {
        setActionMsg({ type: 'success', text: `Se retiró a ${memberToRemove.name} del núcleo familiar.` });
      } else {
        setActionMsg({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err?.message || 'Error al retirar el miembro.' });
    } finally {
      setIsRemoving(false);
      setMemberToRemove(null);
    }
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserProfile || !joinCodeInput.trim()) return;

    setIsJoining(true);
    setActionMsg(null);

    try {
      const res = await joinFamilyByCode(
        currentUserProfile.id,
        currentUserProfile.name,
        currentUserProfile.email,
        joinCodeInput.trim()
      );

      if (res.success) {
        setActionMsg({ type: 'success', text: res.message });
        setJoinCodeInput('');
        setShowJoinSection(false);
        if (onProfileRefreshed) {
          onProfileRefreshed();
        }
      } else {
        setActionMsg({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err?.message || 'Error al unirse al núcleo familiar.' });
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8 space-y-5">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Núcleo Familiar · {familyName}
                </h3>
                {isAdmin ? (
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Admin</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full">
                    Miembro
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Código de acceso compartido y gestión de miembros ({familyMembers.length} {familyMembers.length === 1 ? 'miembro' : 'miembros'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Alert Banner */}
        {actionMsg && (
          <div className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
            actionMsg.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {actionMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <span className="flex-1 font-medium">{actionMsg.text}</span>
            <button 
              onClick={() => setActionMsg(null)}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Family Code Card (Destacado) */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 sm:p-5 rounded-xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
              <Key className="w-3.5 h-3.5 text-emerald-400" />
              <span>Código del Núcleo Familiar</span>
            </div>
            <span className="text-[10px] bg-slate-700/80 text-emerald-300 font-mono px-2 py-0.5 rounded">
              {familyMembers.length} Miembros Activos
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-lg border border-slate-700/60">
            <div>
              <span className="text-[11px] text-slate-400 block">Código Principal de Invitación:</span>
              <span className="text-xl sm:text-2xl font-mono font-bold text-white tracking-widest block">
                {inviteCode}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleCopyCode(inviteCode, false)}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer ${
                copied 
                  ? 'bg-emerald-500 text-slate-950 font-bold' 
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>¡Código Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Código</span>
                </>
              )}
            </button>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            💡 Comparte este código con tu pareja o familiares. Al registrarse o ingresar este código en su cuenta, se vincularán de inmediato a este núcleo para consolidar patrimonios, flujos y presupuestos.
          </p>

          {familyId !== inviteCode && (
            <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span className="truncate">ID Técnico: {familyId}</span>
              <button
                type="button"
                onClick={() => handleCopyCode(familyId, true)}
                className="text-slate-300 hover:text-white underline cursor-pointer ml-2 shrink-0"
              >
                {copiedId ? '¡Copiado!' : 'Copiar ID'}
              </button>
            </div>
          )}
        </div>

        {/* Family Members List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>Miembros del Núcleo</span>
              <span className="text-slate-400 font-normal">({familyMembers.length})</span>
            </h4>
            <span className="text-[11px] text-slate-500">
              {isAdmin ? 'Gestión de altas y bajas habilitada' : 'Visualización de integrantes'}
            </span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {familyMembers.map((member) => {
              const isCurrentUser = member.id === currentUserProfile?.id;
              const isMemberAdmin = member.role === 'admin';

              return (
                <div 
                  key={member.id} 
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                    isCurrentUser 
                      ? 'bg-blue-50/50 border-blue-200' 
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <img 
                      src={member.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.name)}`} 
                      alt={member.name}
                      className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                    />
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 truncate">{member.name}</span>
                        {isCurrentUser && (
                          <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-1.5 py-0.2 rounded">
                            Tú
                          </span>
                        )}
                        {member.status === 'invited' && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.2 rounded">
                            Pendiente registro
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono block truncate">
                        {member.email || 'Sin correo registrado'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      isMemberAdmin 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {isMemberAdmin ? 'Administrador' : 'Miembro'}
                    </span>

                    {/* Remove Member Button (Only Admin, and cannot remove self) */}
                    {isAdmin && !isCurrentUser && (
                      <button
                        type="button"
                        onClick={() => setMemberToRemove(member)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title={`Sacar a ${member.name} del núcleo familiar`}
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Remove Member Confirmation Dialogue */}
        {memberToRemove && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3 text-xs">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-rose-950">¿Sacar a {memberToRemove.name} del núcleo familiar?</h5>
                <p className="text-rose-800 mt-0.5 leading-relaxed">
                  Esta acción desvinculará a este usuario del grupo familiar. Dejará de ver las cuentas consolidadas y las transacciones compartidas.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setMemberToRemove(null)}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isRemoving}
                onClick={handleConfirmRemove}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {isRemoving ? 'Retirando...' : 'Sí, Sacar del Núcleo'}
              </button>
            </div>
          </div>
        )}

        {/* Admin: Add Member Form */}
        {isAdmin ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-emerald-600" />
                <span>Agregar Nuevo Miembro al Núcleo</span>
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100/70 px-2 py-0.5 rounded">
                Solo Administradores
              </span>
            </div>

            <form onSubmit={handleAddMember} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Correo Electrónico *
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="email" 
                      required 
                      placeholder="ejemplo@correo.com"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nombre o Apodo <span className="text-slate-400 font-normal">(Opcional)</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      placeholder="Ej. Sofía, Carlos..."
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-slate-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-medium text-slate-600">Rol a asignar:</label>
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value as 'admin' | 'member')}
                    className="border border-slate-300 rounded px-2 py-1 bg-white text-xs font-semibold text-slate-800"
                  >
                    <option value="member">Miembro (Cotitular)</option>
                    <option value="admin">Co-Administrador</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isAdding}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isAdding ? 'Vinculando...' : 'Vincular al Núcleo'}</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Non-admin notice */
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Tienes rol de <strong>Miembro</strong>. Puedes compartir el código del núcleo familiar. Las altas y bajas están reservadas exclusivamente a los administradores.
            </span>
          </div>
        )}

        {/* Option to switch or join another family with code */}
        <div className="pt-2 border-t border-slate-100">
          {!showJoinSection ? (
            <button
              type="button"
              onClick={() => setShowJoinSection(true)}
              className="text-[11px] text-blue-700 hover:text-blue-900 font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>¿Tienes otro código y deseas unirte a otra familia?</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          ) : (
            <form onSubmit={handleJoinByCode} className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg space-y-2 text-xs">
              <span className="font-semibold text-blue-900 block">Unirse a otro núcleo familiar por código:</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  placeholder="Ej. FAM-9821 o ID de familia"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-blue-300 rounded-lg bg-white font-mono text-xs focus:outline-hidden"
                />
                <button
                  type="submit"
                  disabled={isJoining}
                  className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isJoining ? 'Uniendo...' : 'Unirme'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowJoinSection(false)}
                  className="text-slate-500 hover:text-slate-800 text-xs px-2"
                >
                  Cerrar
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
