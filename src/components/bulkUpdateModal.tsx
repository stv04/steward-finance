import { Check, Sparkles, X } from "lucide-react";
import { Transaction } from "../types/finance";
import { formatEuro } from "../utils/formatters";

interface BulkUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    onToggleSelect: (id: string) => void;
    onApplySingleSelect: () => void;
    onAppySimilarSelect: () => void;
    bulkPrompt: {
        targetDescription: string;
        targetMovement?: string;
        categoryLabel: string;
        subCategoryLabel?: string;
        similarItems?: Array<{
            id: string;
            date: string;
            description: string;
            movement?: string;
            amount: number;
            similarityScore: number;
        }>;
    };
    selectedSimilarTxIds: string[];
}


export const BulkUpdateModal: React.FC<BulkUpdateModalProps> = ({
    isOpen,
    onClose, 
    bulkPrompt, 
    selectedSimilarTxIds,
    onDeselectAll,
    onSelectAll,
    onToggleSelect,
    onAppySimilarSelect,
    onApplySingleSelect,
}) => {
    if(!isOpen) return;

    return <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 z-60">
        <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                    <h2 className="text-base font-bold text-slate-900">
                        Patrón de Similitud Detectado
                    </h2>
                    <p className="text-xs text-slate-500 mb-0">
                        Modificación de categoría en libro mayor
                    </p>

                </div>
                <button
                    onClick={onClose}
                    className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

        <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-2.5">
            <p className="font-medium text-slate-900">
                Se detectaron <strong>{bulkPrompt.similarItems?.length || 0}</strong> transacciones adicionales coincidentes con:
            </p>

            <div className="bg-white p-2.5 rounded border border-slate-200 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                <span>Concepto base</span>
                {bulkPrompt.targetMovement && <span>Movimiento</span>}
            </div>
            <div className="flex items-center justify-between gap-2 font-mono text-slate-900 text-xs font-bold">
                <span className="truncate">"{bulkPrompt.targetDescription}"</span>
                {bulkPrompt.targetMovement && (
                <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[11px] text-slate-700 shrink-0">
                    {bulkPrompt.targetMovement}
                </span>
                )}
            </div>
            </div>

            {/* Sample matches preview with individual Checkboxes */}
            {bulkPrompt.similarItems && bulkPrompt.similarItems.length > 0 && (
            <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600 font-semibold">
                    Transacciones coincidentes ({selectedSimilarTxIds.length}/{bulkPrompt.similarItems.length} seleccionadas):
                </span>
                <div className="flex items-center gap-2">
                    <button
                    type="button"
                    onClick={onSelectAll}
                    className="text-blue-700 hover:text-blue-900 font-semibold cursor-pointer"
                    >
                    Todas
                    </button>
                    <span className="text-slate-300">·</span>
                    <button
                    type="button"
                    onClick={onDeselectAll}
                    className="text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                    Ninguna
                    </button>
                </div>
                </div>

                <p className="text-[10px] text-slate-500">
                Desmarca con el checkbox cualquier movimiento que no corresponda (falso positivo):
                </p>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {bulkPrompt.similarItems.map(item => {
                    const isChecked = selectedSimilarTxIds.includes(item.id);

                    return (
                    <div 
                        key={item.id} 
                        onClick={() => onToggleSelect(item.id)}
                        className={`p-2 rounded-lg border flex items-center justify-between gap-2.5 text-[11px] cursor-pointer transition-colors ${
                        isChecked ? 'bg-blue-50/70 border-blue-300 shadow-xs' : 'bg-slate-50/60 border-slate-200 opacity-60'
                        }`}
                    >
                        <div className="flex items-center gap-2.5 truncate">
                        <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => onToggleSelect(item.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0"
                        />
                        <div className="truncate">
                            <span className="font-semibold text-slate-900 truncate block">{item.description}</span>
                            <span className="text-[10px] text-slate-500 block">
                            {item.date} {item.movement ? `· ${item.movement}` : ''}
                            </span>
                        </div>
                        </div>

                        <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-slate-900 block">{formatEuro(item.amount)}</span>
                        <span className="text-[10px] font-semibold text-blue-700 bg-blue-100/70 px-1.5 py-0.2 rounded">
                            {item.similarityScore}% cercanía
                        </span>
                        </div>
                    </div>
                    );
                })}
                </div>
            </div>
            )}

            <p className="text-slate-600 pt-1">
            ¿Deseas aplicar la nueva clasificación <strong>"{bulkPrompt.categoryLabel || 'Sin Categorizar'} {bulkPrompt.subCategoryLabel ? ` / ${bulkPrompt.subCategoryLabel}` : ''}"</strong> a las transacciones seleccionadas?
            </p>
            
            <div className="p-2 bg-blue-50/70 border border-blue-200 rounded text-[11px] text-blue-800">
            <strong>Nota:</strong> Los demás atributos (monto, fecha, cuenta) influirán exclusivamente a la transacción actual.
            </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
            type="button"
            onClick={onApplySingleSelect}
            className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
            >
            Solo esta transacción
            </button>
            <button
            type="button"
            disabled={selectedSimilarTxIds.length === 0}
            onClick={onAppySimilarSelect}
            className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors shadow-xs flex items-center gap-1.5 ${
                selectedSimilarTxIds.length > 0 
                ? 'bg-blue-700 hover:bg-blue-800 cursor-pointer' 
                : 'bg-slate-300 cursor-not-allowed'
            }`}
            >
            <Check className="w-4 h-4" />
            <span>Actualizar seleccionadas ({selectedSimilarTxIds.length})</span>
            </button>
        </div>
        </div>
    </div>
}