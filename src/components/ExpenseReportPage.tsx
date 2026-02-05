import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { User, ExpenseReport, ExpenseItem, Currency } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { supabaseExpenses } from '../utils/supabase';
import { v4 as uuidv4 } from 'uuid';

interface ExpenseReportPageProps {
  user: User;
}

// Logo component for the header
const FitnessLogo = () => (
  <div className="flex items-center gap-2">
    <span className="text-2xl font-bold">
      <span className="text-[#39FF14]">=</span>
      <span className="text-[var(--f22-text)]">Fitness</span>
      <span className="text-[#39FF14]">22</span>
    </span>
  </div>
);

// Currency symbols
const CURRENCY_SYMBOLS: Record<Currency, string> = {
  NIS: '₪',
  USD: '$',
  EUR: '€',
};

// Default exchange rates (can be updated by admin)
const DEFAULT_EXCHANGE_RATES = {
  USD: 3.12,
  EUR: 3.68,
};

const ExpenseReportPage = ({ user }: ExpenseReportPageProps) => {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  
  // Current month selection
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  // Report data
  const [report, setReport] = useState<ExpenseReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Expense items by currency
  const [itemsNIS, setItemsNIS] = useState<ExpenseItem[]>([]);
  const [itemsUSD, setItemsUSD] = useState<ExpenseItem[]>([]);
  const [itemsEUR, setItemsEUR] = useState<ExpenseItem[]>([]);
  
  // Exchange rates
  const [exchangeRateUSD, setExchangeRateUSD] = useState(DEFAULT_EXCHANGE_RATES.USD);
  const [exchangeRateEUR, setExchangeRateEUR] = useState(DEFAULT_EXCHANGE_RATES.EUR);
  
  // Checked/Approved by
  const [checkedBy, setCheckedBy] = useState('Shira Sofrin');
  const [approvedBy, setApprovedBy] = useState('Benny Shaviv');
  
  // File input refs for invoice uploads
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  
  // Get month display string
  const getExpensePeriod = (monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[month - 1]}, ${year}`;
  };
  
  // Load expense report for selected month
  useEffect(() => {
    const loadReport = async () => {
      setIsLoading(true);
      try {
        const existingReport = await supabaseExpenses.getForUserMonth(user.id, selectedMonth);
        
        if (existingReport) {
          setReport(existingReport);
          setItemsNIS(existingReport.itemsNIS);
          setItemsUSD(existingReport.itemsUSD);
          setItemsEUR(existingReport.itemsEUR);
          setExchangeRateUSD(existingReport.exchangeRateUSD);
          setExchangeRateEUR(existingReport.exchangeRateEUR);
          if (existingReport.checkedBy) setCheckedBy(existingReport.checkedBy);
          if (existingReport.approvedBy) setApprovedBy(existingReport.approvedBy);
        } else {
          // Create new empty report
          setReport(null);
          setItemsNIS([]);
          setItemsUSD([]);
          setItemsEUR([]);
          setExchangeRateUSD(DEFAULT_EXCHANGE_RATES.USD);
          setExchangeRateEUR(DEFAULT_EXCHANGE_RATES.EUR);
        }
      } catch (error) {
        console.error('Error loading expense report:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadReport();
  }, [user.id, selectedMonth]);
  
  // Calculate totals
  const totals = useMemo(() => {
    const totalNIS = itemsNIS.reduce((sum, item) => sum + item.lineTotal, 0);
    const totalUSD = itemsUSD.reduce((sum, item) => sum + item.lineTotal, 0);
    const totalEUR = itemsEUR.reduce((sum, item) => sum + item.lineTotal, 0);
    
    const totalUSDInNIS = totalUSD * exchangeRateUSD;
    const totalEURInNIS = totalEUR * exchangeRateEUR;
    
    const grandTotalNIS = totalNIS + totalUSDInNIS + totalEURInNIS;
    
    return {
      totalNIS,
      totalUSD,
      totalUSDInNIS,
      totalEUR,
      totalEURInNIS,
      grandTotalNIS,
    };
  }, [itemsNIS, itemsUSD, itemsEUR, exchangeRateUSD, exchangeRateEUR]);
  
  // Add new expense item
  const addExpenseItem = (currency: Currency) => {
    const newItem: ExpenseItem = {
      id: uuidv4(),
      expenseReportId: report?.id || uuidv4(),
      currency,
      quantity: 1,
      description: '',
      unitPrice: 0,
      lineTotal: 0,
      createdAt: new Date().toISOString(),
    };
    
    switch (currency) {
      case 'NIS':
        setItemsNIS(prev => [...prev, newItem]);
        break;
      case 'USD':
        setItemsUSD(prev => [...prev, newItem]);
        break;
      case 'EUR':
        setItemsEUR(prev => [...prev, newItem]);
        break;
    }
  };
  
  // Update expense item
  const updateExpenseItem = useCallback((currency: Currency, itemId: string, updates: Partial<ExpenseItem>) => {
    const updateFn = (items: ExpenseItem[]) => 
      items.map(item => {
        if (item.id !== itemId) return item;
        const updated = { ...item, ...updates };
        // Recalculate line total
        updated.lineTotal = updated.quantity * updated.unitPrice;
        return updated;
      });
    
    switch (currency) {
      case 'NIS':
        setItemsNIS(updateFn);
        break;
      case 'USD':
        setItemsUSD(updateFn);
        break;
      case 'EUR':
        setItemsEUR(updateFn);
        break;
    }
  }, []);
  
  // Remove expense item
  const removeExpenseItem = (currency: Currency, itemId: string) => {
    switch (currency) {
      case 'NIS':
        setItemsNIS(prev => prev.filter(item => item.id !== itemId));
        break;
      case 'USD':
        setItemsUSD(prev => prev.filter(item => item.id !== itemId));
        break;
      case 'EUR':
        setItemsEUR(prev => prev.filter(item => item.id !== itemId));
        break;
    }
  };
  
  // Handle invoice upload
  const handleInvoiceUpload = async (currency: Currency, itemId: string, file: File) => {
    try {
      // Convert to base64 for now (can use Supabase storage later)
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        updateExpenseItem(currency, itemId, { invoiceBase64: base64 });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading invoice:', error);
    }
  };
  
  // Save expense report
  const handleSave = async (submit = false) => {
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      const reportId = report?.id || uuidv4();
      
      const reportData: ExpenseReport = {
        id: reportId,
        userId: user.id,
        userName: user.name,
        month: selectedMonth,
        expensePeriod: getExpensePeriod(selectedMonth),
        checkedBy,
        approvedBy,
        itemsNIS,
        totalNIS: totals.totalNIS,
        itemsUSD,
        totalUSD: totals.totalUSD,
        exchangeRateUSD,
        totalUSDInNIS: totals.totalUSDInNIS,
        itemsEUR,
        totalEUR: totals.totalEUR,
        exchangeRateEUR,
        totalEURInNIS: totals.totalEURInNIS,
        grandTotalNIS: totals.grandTotalNIS,
        status: submit ? 'submitted' : 'draft',
        createdAt: report?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Update item report IDs
      const allItems = [
        ...itemsNIS.map(i => ({ ...i, expenseReportId: reportId })),
        ...itemsUSD.map(i => ({ ...i, expenseReportId: reportId })),
        ...itemsEUR.map(i => ({ ...i, expenseReportId: reportId })),
      ];
      
      const success = await supabaseExpenses.save(reportData, allItems);
      
      if (success) {
        setReport(reportData);
        setSaveMessage({
          type: 'success',
          text: submit ? t.expenseReportSubmitted : t.expenseReportSaved,
        });
      } else {
        setSaveMessage({
          type: 'error',
          text: 'Failed to save expense report',
        });
      }
    } catch (error) {
      console.error('Error saving expense report:', error);
      setSaveMessage({
        type: 'error',
        text: 'Failed to save expense report',
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };
  
  // Format currency value
  const formatCurrency = (value: number, currency: Currency) => {
    return `${CURRENCY_SYMBOLS[currency]}${value.toFixed(2)}`;
  };
  
  // Get current date formatted
  const getCurrentDate = () => {
    const now = new Date();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    return `${monthNames[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  };
  
  // Generate month options (last 12 months)
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = `${t.months[date.getMonth()]} ${date.getFullYear()}`;
      options.push({ value, label });
    }
    return options;
  }, [t.months]);
  
  // Expense section component
  const ExpenseSection = ({ 
    currency, 
    title, 
    items, 
    total,
    totalInNIS,
    exchangeRate,
    onExchangeRateChange,
    showExchangeRate = false,
  }: {
    currency: Currency;
    title: string;
    items: ExpenseItem[];
    total: number;
    totalInNIS?: number;
    exchangeRate?: number;
    onExchangeRateChange?: (rate: number) => void;
    showExchangeRate?: boolean;
  }) => (
    <div className="mb-8">
      <h3 className="text-lg font-bold mb-4 text-[var(--f22-text)]">{title}</h3>
      
      {/* Header row */}
      <div className="grid grid-cols-12 gap-2 mb-2 text-sm font-medium text-[var(--f22-text-muted)] border-b border-[var(--f22-border)] pb-2">
        <div className="col-span-1">{t.quantity}</div>
        <div className="col-span-4">{t.description}</div>
        <div className="col-span-2">{currency === 'NIS' ? t.total : t.unitPrice}</div>
        <div className="col-span-2">{t.lineTotal}</div>
        <div className="col-span-2">{t.uploadInvoice}</div>
        <div className="col-span-1"></div>
      </div>
      
      {/* Expense items */}
      {items.map((item) => (
        <div key={item.id} className="grid grid-cols-12 gap-2 mb-2 items-center">
          {/* Quantity */}
          <div className="col-span-1">
            <select
              value={item.quantity}
              onChange={(e) => updateExpenseItem(currency, item.id, { quantity: parseInt(e.target.value) })}
              className="w-full px-2 py-2 bg-[var(--f22-surface-light)] border border-[var(--f22-border)] rounded-lg text-[var(--f22-text)] text-sm"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          
          {/* Description */}
          <div className="col-span-4">
            <input
              type="text"
              value={item.description}
              onChange={(e) => updateExpenseItem(currency, item.id, { description: e.target.value })}
              placeholder={t.enterDescription}
              className="w-full px-3 py-2 bg-[var(--f22-surface-light)] border border-[var(--f22-border)] rounded-lg text-[var(--f22-text)] text-sm focus:outline-none focus:border-[#39FF14]"
            />
          </div>
          
          {/* Unit Price / Total */}
          <div className="col-span-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--f22-text-muted)]">
                {CURRENCY_SYMBOLS[currency]}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={item.unitPrice || ''}
                onChange={(e) => updateExpenseItem(currency, item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 bg-[var(--f22-surface-light)] border border-[var(--f22-border)] rounded-lg text-[var(--f22-text)] text-sm focus:outline-none focus:border-[#39FF14]"
              />
            </div>
          </div>
          
          {/* Line Total */}
          <div className="col-span-2 text-[var(--f22-text)] font-medium px-3 py-2">
            {formatCurrency(item.lineTotal, currency)}
          </div>
          
          {/* Invoice Upload */}
          <div className="col-span-2">
            <input
              type="file"
              accept="image/*,.pdf"
              ref={(el) => { fileInputRefs.current[item.id] = el; }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleInvoiceUpload(currency, item.id, file);
              }}
              className="hidden"
            />
            {item.invoiceBase64 || item.invoiceUrl ? (
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    const url = item.invoiceBase64 || item.invoiceUrl;
                    if (url) window.open(url, '_blank');
                  }}
                  className="px-2 py-1 text-xs bg-[#39FF14]/20 text-[#39FF14] rounded hover:bg-[#39FF14]/30 transition-colors"
                >
                  {t.viewInvoice}
                </button>
                <button
                  onClick={() => updateExpenseItem(currency, item.id, { invoiceBase64: undefined, invoiceUrl: undefined })}
                  className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRefs.current[item.id]?.click()}
                className="px-3 py-1 text-xs bg-[var(--f22-surface-light)] border border-[var(--f22-border)] rounded-lg text-[var(--f22-text-muted)] hover:border-[#39FF14] hover:text-[#39FF14] transition-colors"
              >
                📎 {t.uploadInvoice}
              </button>
            )}
          </div>
          
          {/* Remove button */}
          <div className="col-span-1">
            <button
              onClick={() => removeExpenseItem(currency, item.id)}
              className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
              title={t.removeExpense}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      ))}
      
      {/* Add expense button */}
      <button
        onClick={() => addExpenseItem(currency)}
        className="flex items-center gap-2 px-4 py-2 mt-2 text-sm text-[#39FF14] bg-[#39FF14]/10 border border-[#39FF14]/30 rounded-lg hover:bg-[#39FF14]/20 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        {t.addExpense}
      </button>
      
      {/* Totals */}
      <div className="mt-4 border-t border-[var(--f22-border)] pt-4">
        <div className="flex justify-end items-center gap-4">
          <span className="text-[var(--f22-text-muted)]">{`Total ${currency}`}</span>
          <span className="text-lg font-bold text-[var(--f22-text)] min-w-[120px] text-right">
            {formatCurrency(total, currency)}
          </span>
        </div>
        
        {showExchangeRate && exchangeRate !== undefined && onExchangeRateChange && (
          <>
            <div className="flex justify-end items-center gap-4 mt-2">
              <span className="text-[var(--f22-text-muted)]">{t.exchangeRate}</span>
              <input
                type="number"
                step="0.01"
                value={exchangeRate}
                onChange={(e) => onExchangeRateChange(parseFloat(e.target.value) || 0)}
                className="w-24 px-3 py-1 bg-[var(--f22-surface-light)] border border-[var(--f22-border)] rounded text-[var(--f22-text)] text-right"
              />
            </div>
            <div className="flex justify-end items-center gap-4 mt-2">
              <span className="text-[var(--f22-text-muted)]">{t.totalNIS}</span>
              <span className="text-lg font-bold text-[#39FF14] min-w-[120px] text-right">
                {formatCurrency(totalInNIS || 0, 'NIS')}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#39FF14] border-t-transparent"></div>
      </div>
    );
  }
  
  return (
    <div className={`min-h-screen bg-[var(--f22-bg)] py-6 px-4 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-[var(--f22-surface)] rounded-xl shadow-lg border border-[var(--f22-border)] p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <FitnessLogo />
              <h1 className="text-2xl font-light text-[var(--f22-text-muted)]">{t.expenseReport}</h1>
            </div>
            
            {/* Month selector */}
            <div className="flex items-center gap-4">
              <label className="text-[var(--f22-text-muted)]">{t.selectMonth}:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 bg-[var(--f22-surface-light)] border border-[var(--f22-border)] rounded-lg text-[var(--f22-text)] focus:outline-none focus:border-[#39FF14]"
              >
                {monthOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Employee and date info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-[var(--f22-border)]">
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <span className="text-[var(--f22-text-muted)] w-32">{t.employee}:</span>
                <span className="font-semibold text-[var(--f22-text)]">{user.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[var(--f22-text-muted)] w-32">{t.expensePeriod}:</span>
                <span className="font-semibold text-[var(--f22-text)]">{getExpensePeriod(selectedMonth)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <span className="text-[var(--f22-text-muted)] w-32">{t.date}:</span>
                <span className="font-semibold text-[var(--f22-text)]">{getCurrentDate()}</span>
              </div>
              {report?.status && (
                <div className="flex items-center gap-4">
                  <span className="text-[var(--f22-text-muted)] w-32">Status:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    report.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                    report.status === 'submitted' ? 'bg-blue-500/20 text-blue-400' :
                    report.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {t[report.status]}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Checked/Approved by */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="flex items-center gap-4">
              <span className="text-[var(--f22-text-muted)] w-32">{t.checkedBy}:</span>
              <input
                type="text"
                value={checkedBy}
                onChange={(e) => setCheckedBy(e.target.value)}
                className="flex-1 px-3 py-2 bg-[var(--f22-surface-light)] border border-[var(--f22-border)] rounded-lg text-[var(--f22-text)] focus:outline-none focus:border-[#39FF14]"
                disabled={report?.status !== 'draft' && report?.status !== undefined}
              />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[var(--f22-text-muted)] w-32">{t.approvedBy}:</span>
              <input
                type="text"
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
                className="flex-1 px-3 py-2 bg-[var(--f22-surface-light)] border border-[var(--f22-border)] rounded-lg text-[var(--f22-text)] focus:outline-none focus:border-[#39FF14]"
                disabled={report?.status !== 'draft' && report?.status !== undefined}
              />
            </div>
          </div>
        </div>
        
        {/* Expense sections */}
        <div className="bg-[var(--f22-surface)] rounded-xl shadow-lg border border-[var(--f22-border)] p-6 mb-6">
          {/* NIS Expenses */}
          <ExpenseSection
            currency="NIS"
            title={t.expensesInNIS}
            items={itemsNIS}
            total={totals.totalNIS}
          />
          
          {/* USD Expenses */}
          <ExpenseSection
            currency="USD"
            title={t.expensesInUSD}
            items={itemsUSD}
            total={totals.totalUSD}
            totalInNIS={totals.totalUSDInNIS}
            exchangeRate={exchangeRateUSD}
            onExchangeRateChange={setExchangeRateUSD}
            showExchangeRate
          />
          
          {/* EUR Expenses */}
          <ExpenseSection
            currency="EUR"
            title={t.expensesInEUR}
            items={itemsEUR}
            total={totals.totalEUR}
            totalInNIS={totals.totalEURInNIS}
            exchangeRate={exchangeRateEUR}
            onExchangeRateChange={setExchangeRateEUR}
            showExchangeRate
          />
          
          {/* Grand Total */}
          <div className="mt-8 pt-6 border-t-2 border-[#39FF14]/30">
            <div className="flex justify-end items-center gap-4">
              <span className="text-xl font-bold text-[var(--f22-text)]">{t.grandTotal}</span>
              <span className="text-2xl font-bold text-[#39FF14] min-w-[150px] text-right">
                {formatCurrency(totals.grandTotalNIS, 'NIS')}
              </span>
            </div>
          </div>
        </div>
        
        {/* Save message */}
        {saveMessage && (
          <div className={`mb-4 p-4 rounded-lg ${
            saveMessage.type === 'success' 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {saveMessage.text}
          </div>
        )}
        
        {/* Action buttons */}
        <div className="flex flex-wrap gap-4 justify-end">
          <button
            onClick={() => handleSave(false)}
            disabled={isSaving || (report?.status !== 'draft' && report?.status !== undefined)}
            className="px-6 py-3 bg-[var(--f22-surface-light)] border border-[var(--f22-border)] rounded-lg text-[var(--f22-text)] font-medium hover:border-[#39FF14] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? '...' : t.saveExpenseReport}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={isSaving || (report?.status !== 'draft' && report?.status !== undefined)}
            className="px-6 py-3 bg-[#39FF14] text-[#0D0D0D] rounded-lg font-bold hover:bg-[#39FF14]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? '...' : t.submitExpenseReport}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpenseReportPage;
