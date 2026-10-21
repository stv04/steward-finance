/**
 * DICCIONARIO DE TRADUCCIONES BILINGÜE (ES / EN)
 * ==============================================================================
 * Centraliza todos los textos de la interfaz para soportar cambio dinámico
 * entre Español e Inglés sin alterar los datos persistidos en la base de datos.
 * ==============================================================================
 */

export type Language = 'es' | 'en';

export const translations = {
  es: {
    // Top Bar & Navigation
    brand: 'PatrimonioFamiliar',
    nav: {
      dashboard: 'Dashboard',
      accounts: 'Cuentas',
      transactions: 'Transacciones',
      budgets: 'Presupuestos',
      categories: 'Categorías',
      architecture: 'ERD & Cifrado',
      apiDocs: 'Docs API REST',
      unitTests: 'Tests Unitarios',
      newTransaction: 'Nueva Transacción',
      reconciliation: 'Conciliación CSV / Extractos',
      account: 'Cuenta',
      demoMode: 'Modo Demo',
      presentationBanner: 'Modo Presentación Activo: Visualizando estructura mockup con datos financieros de muestra.',
      connectCloud: 'Conectar Bóveda Firebase en Vivo',
      cloudActive: 'Firestore: Ruta activa',
    },

    // Workspace & Scope
    scope: {
      label: 'Ámbito Activo:',
      familiar: 'Familiar Consolidado',
      personal: 'Individual',
      familyCode: 'Código Familiar:',
      manageMembers: 'Gestionar Miembros',
      membersCount: 'miembro(s)',
      copyCode: 'Copiar Código',
      codeCopied: '¡Copiado!',
      adminBadge: 'Admin',
      memberBadge: 'Miembro',
    },

    // 4 Pillars & Financial Metrics
    pillars: {
      earned: 'Ganado',
      saved: 'Ahorrado',
      invested: 'Invertido',
      spent: 'Gastado',
      earnedDesc: 'Ingresos netos devengados',
      savedDesc: 'Excedente retenido en cuentas',
      investedDesc: 'Aporte a patrimonio rentable',
      spentDesc: 'Consumo y gastos de vida',
    },

    // Dashboard Overview
    dashboard: {
      title: 'Panel Consolidado de Finanzas',
      subtitle: 'Visión patrimonial unificada, flujos de caja y dinámica por miembro del hogar',
      totalPatrimony: 'Patrimonio Neto',
      liquidAvailable: 'Liquidez Disponible',
      totalDebts: 'Deuda / Tarjetas',
      savingsRate: 'Tasa de Ahorro',
      timeframe: {
        monthly: 'Mensual',
        quarterly: 'Trimestral',
        annual: 'Anual',
        all: 'Histórico',
      },
      memberDynamicsTitle: 'Dinámica Financiera por Miembro del Núcleo',
      memberDynamicsSubtitle: 'Relación comparativa de lo ganado, ahorrado, invertido y gastado',
      trendTitle: 'Evolución de Ingresos y Gastos',
      expenseDistribution: 'Distribución por Categorías',
      noData: 'No hay transacciones registradas en este período',
      assetsBreakdown: 'Distribución de Activos',
    },

    // Accounts
    accounts: {
      title: 'Cuentas y Posición Financiera',
      subtitle: 'Custodia unificada de cuentas bancarias, tarjetas, billeteras e inversiones',
      newAccount: 'Nueva Cuenta',
      transfer: 'Transferencia',
      updateBalance: 'Actualizar Saldo',
      deleteConfirm: '¿Estás seguro de eliminar esta cuenta?',
      types: {
        all: 'Todas las Cuentas',
        bank_checking: 'Cuenta Corriente',
        bank_savings: 'Cuenta de Ahorros',
        investment: 'Inversiones',
        card_debit: 'Tarjeta de Débito',
        card_credit: 'Tarjeta de Crédito',
        digital_gateway: 'Pasarela Digital',
        cash_wallet: 'Efectivo / Billetera',
      },
      balance: 'Saldo',
      currency: 'Moneda',
      owner: 'Titular',
      maskedNumber: 'Número de Cuenta',
      encryptedBadge: 'Cifrado CLE',
    },

    // Transactions
    transactions: {
      title: 'Historial de Transacciones',
      subtitle: 'Libro mayor de ingresos, gastos y transferencias con trazabilidad criptográfica',
      searchPlaceholder: 'Buscar por concepto, detalle o comercio...',
      filterAll: 'Todas las transacciones',
      filterIncome: 'Solo Ingresos',
      filterExpense: 'Solo Gastos',
      filterTransfer: 'Transferencias',
      date: 'Fecha',
      concept: 'Concepto',
      movement: 'Detalle Bancario',
      category: 'Categoría',
      amount: 'Monto',
      account: 'Cuenta',
      user: 'Responsable',
      actions: 'Acciones',
      deleteConfirm: '¿Deseas eliminar esta transacción?',
      hashSha256: 'Hash SHA-256 Ledger',
    },

    // Categories
    categories: {
      title: 'Estructura de Categorías y Presupuestos',
      subtitle: 'Organiza gastos e ingresos por jerarquía, frecuencia de uso y prioridad operativa',
      newCategory: 'Nueva Categoría Principal',
      newSubcategory: 'Nueva Subcategoría',
      treeView: 'Vista Jerárquica',
      chartsView: 'Análisis Visual',
      sorting: {
        label: 'Ordenar por:',
        frequency: 'Más Usadas (Frecuencia)',
        manual: 'Prioridad Manual',
        expense: 'Mayor Gasto ($)',
        alpha: 'Alfabético (A - Z)',
      },
      txCount: 'transacciones registradas',
      priorityRank: 'Prioridad #',
      moveUp: 'Subir prioridad',
      moveDown: 'Bajar prioridad',
      pinTop: 'Fijar arriba',
      subcategoriesCount: 'subcategorías',
      edit: 'Editar',
      delete: 'Eliminar',
      typeExpense: 'Gasto',
      typeIncome: 'Ingreso',
    },

    // Common & Actions
    common: {
      save: 'Guardar',
      cancel: 'Cancelar',
      edit: 'Editar',
      delete: 'Eliminar',
      confirm: 'Confirmar',
      close: 'Cerrar',
      copied: '¡Copiado al portapapeles!',
      loading: 'Cargando...',
      success: 'Operación completada con éxito',
      error: 'Ocurrió un error',
      language: 'Idioma',
      langEs: 'Español',
      langEn: 'English',
    },
  },

  en: {
    // Top Bar & Navigation
    brand: 'FamilyPatrimony',
    nav: {
      dashboard: 'Dashboard',
      accounts: 'Accounts',
      transactions: 'Transactions',
      budgets: 'Budgets',
      categories: 'Categories',
      architecture: 'ERD & Encryption',
      apiDocs: 'REST API Docs',
      unitTests: 'Unit Tests',
      newTransaction: 'New Transaction',
      reconciliation: 'CSV Reconciliation',
      account: 'Account',
      demoMode: 'Demo Mode',
      presentationBanner: 'Presentation Mode Active: Displaying mockup structure with sample financial data.',
      connectCloud: 'Connect Live Firebase Vault',
      cloudActive: 'Firestore: Active route',
    },

    // Workspace & Scope
    scope: {
      label: 'Active Scope:',
      familiar: 'Consolidated Family',
      personal: 'Individual',
      familyCode: 'Family Code:',
      manageMembers: 'Manage Members',
      membersCount: 'member(s)',
      copyCode: 'Copy Code',
      codeCopied: 'Copied!',
      adminBadge: 'Admin',
      memberBadge: 'Member',
    },

    // 4 Pillars & Financial Metrics
    pillars: {
      earned: 'Earned',
      saved: 'Saved',
      invested: 'Invested',
      spent: 'Spent',
      earnedDesc: 'Net earned revenue & salaries',
      savedDesc: 'Retained surplus in accounts',
      investedDesc: 'Allocated to productive assets',
      spentDesc: 'Living & lifestyle consumption',
    },

    // Dashboard Overview
    dashboard: {
      title: 'Consolidated Financial Dashboard',
      subtitle: 'Unified net worth tracking, cash flows, and household member dynamics',
      totalPatrimony: 'Net Worth',
      liquidAvailable: 'Available Liquidity',
      totalDebts: 'Debts / Cards',
      savingsRate: 'Savings Rate',
      timeframe: {
        monthly: 'Monthly',
        quarterly: 'Quarterly',
        annual: 'Annual',
        all: 'All Time',
      },
      memberDynamicsTitle: 'Household Member Financial Dynamics',
      memberDynamicsSubtitle: 'Comparative relation of earned, saved, invested, and spent',
      trendTitle: 'Income & Expense Evolution',
      expenseDistribution: 'Expense Breakdown by Category',
      noData: 'No transactions recorded for this period',
      assetsBreakdown: 'Assets Allocation',
    },

    // Accounts
    accounts: {
      title: 'Accounts & Financial Position',
      subtitle: 'Unified custody of bank accounts, debit/credit cards, wallets, and investments',
      newAccount: 'New Account',
      transfer: 'Transfer',
      updateBalance: 'Update Balance',
      deleteConfirm: 'Are you sure you want to delete this account?',
      types: {
        all: 'All Accounts',
        bank_checking: 'Checking Account',
        bank_savings: 'Savings Account',
        investment: 'Investments',
        card_debit: 'Debit Card',
        card_credit: 'Credit Card',
        digital_gateway: 'Digital Gateway',
        cash_wallet: 'Cash / Wallet',
      },
      balance: 'Balance',
      currency: 'Currency',
      owner: 'Owner',
      maskedNumber: 'Account Number',
      encryptedBadge: 'CLE Encrypted',
    },

    // Transactions
    transactions: {
      title: 'Transaction History',
      subtitle: 'Immutable ledger of income, expenses, and transfers with cryptographic integrity',
      searchPlaceholder: 'Search by concept, detail, or merchant...',
      filterAll: 'All Transactions',
      filterIncome: 'Income Only',
      filterExpense: 'Expenses Only',
      filterTransfer: 'Transfers',
      date: 'Date',
      concept: 'Concept',
      movement: 'Bank Detail',
      category: 'Category',
      amount: 'Amount',
      account: 'Account',
      user: 'Responsible',
      actions: 'Actions',
      deleteConfirm: 'Do you want to delete this transaction?',
      hashSha256: 'SHA-256 Ledger Hash',
    },

    // Categories
    categories: {
      title: 'Categories & Budget Structure',
      subtitle: 'Organize expenses and income by hierarchy, usage frequency, and operational priority',
      newCategory: 'New Parent Category',
      newSubcategory: 'New Subcategory',
      treeView: 'Hierarchy View',
      chartsView: 'Visual Analytics',
      sorting: {
        label: 'Sort by:',
        frequency: 'Most Used (Frequency)',
        manual: 'Manual Priority',
        expense: 'Highest Expense ($)',
        alpha: 'Alphabetical (A - Z)',
      },
      txCount: 'recorded transactions',
      priorityRank: 'Priority #',
      moveUp: 'Increase priority',
      moveDown: 'Decrease priority',
      pinTop: 'Pin to top',
      subcategoriesCount: 'subcategories',
      edit: 'Edit',
      delete: 'Delete',
      typeExpense: 'Expense',
      typeIncome: 'Income',
    },

    // Common & Actions
    common: {
      save: 'Save',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      confirm: 'Confirm',
      close: 'Close',
      copied: 'Copied to clipboard!',
      loading: 'Loading...',
      success: 'Operation completed successfully',
      error: 'An error occurred',
      language: 'Language',
      langEs: 'Español',
      langEn: 'English',
    },
  },
};

type DeepString<T> = {
  [K in keyof T]: T[K] extends object ? DeepString<T[K]> : string;
};

export type TranslationSchema = DeepString<typeof translations.es>;
export type TranslationKey = TranslationSchema;
