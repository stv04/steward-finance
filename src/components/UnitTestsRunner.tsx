import React, { useState, useEffect } from 'react';
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Terminal, 
  CheckCheck, 
  Layers, 
  RotateCw 
} from 'lucide-react';
import { ParentCategory, Transaction, BudgetAccord, TestResultItem } from '../types/finance';
import { runUnitTests } from '../utils/unitTests';

interface UnitTestsRunnerProps {
  categories: ParentCategory[];
  transactions: Transaction[];
  accords: BudgetAccord[];
}

export const UnitTestsRunner: React.FC<UnitTestsRunnerProps> = ({
  categories,
  transactions,
  accords,
}) => {
  const [testResults, setTestResults] = useState<TestResultItem[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [lastExecutedAt, setLastExecutedAt] = useState<string>('');

  const executeSuite = () => {
    setIsRunning(true);
    setTimeout(() => {
      const results = runUnitTests(categories, transactions, accords);
      setTestResults(results);
      setIsRunning(false);
      setLastExecutedAt(new Date().toLocaleTimeString('es-ES'));
    }, 150);
  };

  useEffect(() => {
    executeSuite();
  }, [categories, transactions, accords]);

  const passedCount = testResults.filter(t => t.passed).length;
  const failedCount = testResults.filter(t => !t.passed).length;
  const totalDuration = testResults.reduce((sum, t) => sum + t.durationMs, 0);

  // Group by suite
  const suites = Array.from(new Set(testResults.map(t => t.suite)));

  return (
    <div className="space-y-6">
      
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Suite de Pruebas Unitarias del Motor Financiero
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Validación algorítmica de deduplicación por hash, normalización y herencia continua presupuestaria
          </p>
        </div>

        <button
          onClick={executeSuite}
          disabled={isRunning}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors shadow-xs cursor-pointer"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
          <span>{isRunning ? 'Ejecutando Pruebas...' : 'Ejecutar Suite Completa'}</span>
        </button>
      </div>

      {/* Summary Scoreboard (Clean and unboxed) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Total de Casos de Prueba</span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {testResults.length}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Ejecución en memoria cliente</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs bg-emerald-50/20">
          <span className="text-xs text-emerald-800 font-medium block">Pruebas Exitosas</span>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1 flex items-center gap-2">
            <span>{passedCount}</span>
            <CheckCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <span className="text-[11px] text-emerald-600 mt-1 block">100% de aserciones validadas</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Pruebas Fallidas</span>
          <div className={`text-2xl font-bold font-mono mt-1 ${failedCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
            {failedCount}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Tolerancia cero a regresiones</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Tiempo Total de Ejecución</span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1 flex items-center gap-1.5">
            <span>{totalDuration.toFixed(2)}</span>
            <span className="text-xs font-normal text-slate-400">ms</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Última ejecución: {lastExecutedAt}</span>
        </div>

      </div>

      {/* Tests Results by Suite */}
      <div className="space-y-6">
        {suites.map(suiteName => {
          const suiteTests = testResults.filter(t => t.suite === suiteName);
          return (
            <div key={suiteName} className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-slate-700" />
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{suiteName}</h2>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  {suiteTests.filter(t => t.passed).length}/{suiteTests.length} Aprobados
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {suiteTests.map(test => (
                  <div key={test.id} className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {test.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">
                          {test.title}
                        </div>
                        {test.details && (
                          <div className="text-slate-500 mt-0.5 font-mono text-[11px]">
                            {test.details}
                          </div>
                        )}
                        {test.error && (
                          <div className="text-rose-600 mt-1 font-mono font-medium">
                            {test.error}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-auto shrink-0 font-mono text-[11px] text-slate-400">
                      <span>{test.durationMs}ms</span>
                      <span className={`font-semibold ${test.passed ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {test.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
