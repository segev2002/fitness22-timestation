import { useState, useEffect, useMemo, useRef } from 'react';
import type { User, ExpenseReport, ExpenseItem, Currency } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { supabaseExpenses } from '../utils/supabase';
import { v4 as uuidv4 } from 'uuid';

interface ExpenseReportPageProps {
  user: User;
}

// Currency symbols
const CURRENCY_SYMBOLS: Record<Currency, string> = {
  NIS: '₪',
  USD: '$',
  EUR: '€',
};

// Default exchange rates
const DEFAULT_EXCHANGE_RATES = {
  USD: 3.12,
  EUR: 3.68,
};

// Individual expense item row component to prevent re-render issues
const ExpenseItemRow = ({
  item,
  currency,
  onUpdate,
  onRemove,
  onInvoiceUpload,
}: {
  item: ExpenseItem;
  currency: Currency;
  onUpdate: (updates: Partial<ExpenseItem>) => void;
  onRemove: () => void;
  onInvoiceUpload: (file: File) => void;
}) => {
  const { t } = useLanguage();
  const [localPrice, setLocalPrice] = useState(item.unitPrice ? String(item.unitPrice) : '');
  const [localDescription, setLocalDescription] = useState(item.description);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync local state when item changes from outside
  useEffect(() => {
    setLocalPrice(item.unitPrice ? String(item.unitPrice) : '');
    setLocalDescription(item.description);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]); // Only reset when item ID changes (new item)

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalPrice(value);
  };

  const handlePriceBlur = () => {
    const numValue = parseFloat(localPrice) || 0;
    onUpdate({ unitPrice: numValue });
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalDescription(e.target.value);
  };

  const handleDescriptionBlur = () => {
    onUpdate({ description: localDescription });
  };

  return (
    <div className="bg-[var(--f22-surface-light)] rounded-lg p-4 mb-4 border border-[var(--f22-border)]">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Quantity */}
        <div className="md:col-span-1">
          <label className="text-xs text-[var(--f22-text-muted)] mb-1 block md:hidden">{t.quantity}</label>
          <select
            value={item.quantity}
            onChange={(e) => onUpdate({ quantity: parseInt(e.target.value) })}
            className="w-full px-3 py-3 bg-[var(--f22-surface)] border border-[var(--f22-border)] rounded-lg text-[var(--f22-text)] text-sm focus:outline-none focus:border-[#39FF14]"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        
        {/* Description */}
        <div className="md:col-span-3">
          <label className="text-xs text-[var(--f22-text-muted)] mb-1 block md:hidden">{t.description}</label>
          <input
            type="text"
            value={localDescription}
            onChange={handleDescriptionChange}
            onBlur={handleDescriptionBlur}
            placeholder={t.enterDescription}
            className="w-full px-4 py-3 bg-[var(--f22-surface)] border border-[var(--f22-border)] rounded-lg text-[var(--f22-text)] text-sm focus:outline-none focus:border-[#39FF14]"
          />
        </div>
        
        {/* Unit Price - currency symbol outside input */}
        <div className="md:col-span-2">
          <label className="text-xs text-[var(--f22-text-muted)] mb-1 block md:hidden">{t.unitPrice}</label>
          <div className="flex items-center gap-2">
            <span className="text-[var(--f22-text-muted)] text-sm font-medium">
              {CURRENCY_SYMBOLS[currency]}
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={localPrice}
              onChange={handlePriceChange}
              onBlur={handlePriceBlur}
              placeholder="0.00"
              className="w-full px-4 py-3 bg-[var(--f22-surface)] border border-[var(--f22-border)] rounded-lg text-[var(--f22-text)] text-sm focus:outline-none focus:border-[#39FF14]"
            />
          </div>
        </div>
        
        {/* Line Total */}
        <div className="md:col-span-2">
          <label className="text-xs text-[var(--f22-text-muted)] mb-1 block md:hidden">{t.lineTotal}</label>
          <div className="px-4 py-3 bg-[var(--f22-surface)] border border-[var(--f22-border)] rounded-lg text-[var(--f22-text)] font-semibold text-sm">
            {CURRENCY_SYMBOLS[currency]}{item.lineTotal.toFixed(2)}
          </div>
        </div>
        
        {/* Invoice Upload - Bigger and centered */}
        <div className="md:col-span-3">
          <label className="text-xs text-[var(--f22-text-muted)] mb-1 block md:hidden">{t.uploadInvoice}</label>
          <input
            type="file"
            accept="image/*,.pdf"
            ref={fileInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onInvoiceUpload(file);
            }}
            className="hidden"
          />
          {item.invoiceBase64 || item.invoiceUrl ? (
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => {
                  const url = item.invoiceBase64 || item.invoiceUrl;
                  if (url) window.open(url, '_blank');
                }}
                className="flex-1 px-4 py-3 text-sm bg-[#39FF14] text-[#0D0D0D] rounded-lg hover:bg-[#39FF14] transition-colors font-medium"
              >
                👁 {t.viewInvoice}
              </button>
              <button
                onClick={() => onUpdate({ invoiceBase64: undefined, invoiceUrl: undefined })}
                className="px-4 py-3 text-sm bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-6 py-4 text-base bg-blue-500/20 text-blue-400 border-2 border-dashed border-blue-500/40 rounded-lg hover:bg-blue-500/30 hover:border-blue-500 transition-colors font-medium flex items-center justify-center gap-3"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              📎 {t.uploadInvoice}
            </button>
          )}
        </div>
        
        {/* Remove button */}
        <div className="md:col-span-1 flex justify-end">
          <button
            onClick={onRemove}
            className="p-3 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
            title={t.removeExpense}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

const ExpenseReportPage = ({ user }: ExpenseReportPageProps) => {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  
  // Current month selection
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDate());
  
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
  
  // Get month display string
  const getExpensePeriod = (monthStr: string, day: number) => {
    const [year, month] = monthStr.split('-').map(Number);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[month - 1]} ${day}, ${year}`;
  };

  const selectedDateKey = useMemo(() => {
    const day = String(selectedDay).padStart(2, '0');
    return `${selectedMonth}-${day}`;
  }, [selectedMonth, selectedDay]);

  const daysInSelectedMonth = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    return new Date(year, month, 0).getDate();
  }, [selectedMonth]);

  useEffect(() => {
    setSelectedDay((prev) => Math.min(prev, daysInSelectedMonth));
  }, [daysInSelectedMonth]);
  
  // Load expense report for selected month
  useEffect(() => {
    const loadReport = async () => {
      setIsLoading(true);
      try {
  const existingReport = await supabaseExpenses.getForUserMonth(user.id, selectedDateKey);
        
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
  }, [user.id, selectedDateKey]);
  
  // Calculate totals
  const totals = useMemo(() => {
    const totalNIS = itemsNIS.reduce((sum, item) => sum + item.lineTotal, 0);
    const totalUSD = itemsUSD.reduce((sum, item) => sum + item.lineTotal, 0);
    const totalEUR = itemsEUR.reduce((sum, item) => sum + item.lineTotal, 0);
    
    const totalUSDInNIS = totalUSD * exchangeRateUSD;
    const totalEURInNIS = totalEUR * exchangeRateEUR;
    
    const grandTotalNIS = totalNIS + totalUSDInNIS + totalEURInNIS;
    
    return { totalNIS, totalUSD, totalUSDInNIS, totalEUR, totalEURInNIS, grandTotalNIS };
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
      case 'NIS': setItemsNIS(prev => [...prev, newItem]); break;
      case 'USD': setItemsUSD(prev => [...prev, newItem]); break;
      case 'EUR': setItemsEUR(prev => [...prev, newItem]); break;
    }
  };
  
  // Update expense item
  const updateExpenseItem = (currency: Currency, itemId: string, updates: Partial<ExpenseItem>) => {
    const updateFn = (items: ExpenseItem[]) => 
      items.map(item => {
        if (item.id !== itemId) return item;
        const updated = { ...item, ...updates };
        updated.lineTotal = updated.quantity * updated.unitPrice;
        return updated;
      });
    
    switch (currency) {
      case 'NIS': setItemsNIS(updateFn); break;
      case 'USD': setItemsUSD(updateFn); break;
      case 'EUR': setItemsEUR(updateFn); break;
    }
  };
  
  // Remove expense item
  const removeExpenseItem = (currency: Currency, itemId: string) => {
    switch (currency) {
      case 'NIS': setItemsNIS(prev => prev.filter(item => item.id !== itemId)); break;
      case 'USD': setItemsUSD(prev => prev.filter(item => item.id !== itemId)); break;
      case 'EUR': setItemsEUR(prev => prev.filter(item => item.id !== itemId)); break;
    }
  };
  
  // Handle invoice upload
  const handleInvoiceUpload = (currency: Currency, itemId: string, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      updateExpenseItem(currency, itemId, { invoiceBase64: base64 });
    };
    reader.readAsDataURL(file);
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
  month: selectedDateKey,
  expensePeriod: getExpensePeriod(selectedMonth, selectedDay),
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
  createdAt: report?.createdAt || new Date(`${selectedDateKey}T12:00:00`).toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
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
        setSaveMessage({ type: 'error', text: 'Failed to save expense report' });
      }
    } catch (error) {
      console.error('Error saving expense report:', error);
      setSaveMessage({ type: 'error', text: 'Failed to save expense report' });
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
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    return `${monthNames[month - 1]} ${selectedDay}, ${year}`;
  };
  
  // Generate month options
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
    <div className="mb-10">
      <h3 className="text-xl font-bold mb-6 text-[var(--f22-text)] flex items-center gap-3">
        <span className="w-10 h-10 rounded-lg bg-[#39FF14] flex items-center justify-center text-[#0D0D0D] text-lg">
          {CURRENCY_SYMBOLS[currency]}
        </span>
        {title}
      </h3>
      
      {/* Header row - desktop only */}
      <div className="hidden md:grid grid-cols-12 gap-4 mb-4 text-sm font-medium text-[var(--f22-text-muted)] px-4">
        <div className="col-span-1">{t.quantity}</div>
        <div className="col-span-3">{t.description}</div>
        <div className="col-span-2">{t.unitPrice}</div>
        <div className="col-span-2">{t.lineTotal}</div>
        <div className="col-span-3 text-center">{t.uploadInvoice}</div>
        <div className="col-span-1"></div>
      </div>
      
      {/* Expense items */}
      {items.map((item) => (
        <ExpenseItemRow
          key={item.id}
          item={item}
          currency={currency}
          onUpdate={(updates) => updateExpenseItem(currency, item.id, updates)}
          onRemove={() => removeExpenseItem(currency, item.id)}
          onInvoiceUpload={(file) => handleInvoiceUpload(currency, item.id, file)}
        />
      ))}
      
      {/* Add expense button */}
      <button
        onClick={() => addExpenseItem(currency)}
  className="flex items-center gap-3 px-6 py-4 mt-4 text-base text-[#0D0D0D] bg-[#39FF14] border-2 border-dashed border-[#39FF14] rounded-lg hover:bg-[#39FF14] hover:border-[#39FF14] transition-all w-full justify-center font-medium"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        {t.addExpense}
      </button>
      
      {/* Totals */}
      <div className="mt-6 pt-6 border-t border-[var(--f22-border)]">
        <div className="flex justify-end items-center gap-6 mb-3">
          <span className="text-[var(--f22-text-muted)] text-lg">{`Total ${currency}`}</span>
          <span className="text-xl font-bold text-[var(--f22-text)] min-w-[140px] text-right">
            {formatCurrency(total, currency)}
          </span>
        </div>
        
        {showExchangeRate && exchangeRate !== undefined && onExchangeRateChange && (
          <>
            <div className="flex justify-end items-center gap-6 mb-3">
              <span className="text-[var(--f22-text-muted)]">{t.exchangeRate}</span>
              <input
                type="text"
                inputMode="decimal"
                value={exchangeRate}
                onChange={(e) => onExchangeRateChange(parseFloat(e.target.value) || 0)}
                className="w-28 px-4 py-2 bg-[var(--f22-surface-light)] border border-[var(--f22-border)] rounded-lg text-[var(--f22-text)] text-right focus:outline-none focus:border-[#39FF14]"
              />
            </div>
            <div className="flex justify-end items-center gap-6">
              <span className="text-[var(--f22-text-muted)] text-lg">{t.totalNIS}</span>
              <span className="text-xl font-bold text-[#39FF14] min-w-[140px] text-right">
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
    <div className={`min-h-screen bg-[var(--f22-bg)] ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="w-full h-full px-4 sm:px-6 md:px-8 py-8">
        <div className="w-full space-y-8">
          
          {/* Header Card */}
          <div className="bg-[var(--f22-surface)] rounded-lg shadow-lg border border-[var(--f22-border)] p-6 sm:p-8">
            {/* Title centered */}
            <h1 className="text-3xl font-bold text-[var(--f22-text)] text-center mb-8">{t.expenseReport}</h1>
              
            {/* Month selector - right aligned */}
            <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'} mb-8`}>
              <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <label className="text-[var(--f22-text-muted)]">{t.selectMonth}:</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-5 py-3 bg-[var(--f22-surface-light)] border border-[var(--f22-border)] rounded-lg text-[var(--f22-text)] focus:outline-none focus:border-[#39FF14] text-base"
                >
                  {monthOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <label className="text-[var(--f22-text-muted)]">{t.day}:</label>
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(parseInt(e.target.value, 10))}
                  className="px-4 py-3 bg-[var(--f22-surface-light)] border border-[var(--f22-border)] rounded-lg text-[var(--f22-text)] focus:outline-none focus:border-[#39FF14] text-base w-24"
                >
                  {Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Employee and date info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-[var(--f22-border)]">
              <div className="space-y-4">
                <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className={`text-[var(--f22-text-muted)] w-36 ${isRTL ? 'text-right' : 'text-left'}`}>{t.employee}:</span>
                  <span className={`font-semibold text-[var(--f22-text)] text-lg ${isRTL ? 'text-right' : 'text-left'}`}>{user.name}</span>
                </div>
                <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className={`text-[var(--f22-text-muted)] w-36 ${isRTL ? 'text-right' : 'text-left'}`}>{t.expensePeriod}:</span>
                  <span className={`font-semibold text-[var(--f22-text)] text-lg ${isRTL ? 'text-right' : 'text-left'}`}>{getExpensePeriod(selectedMonth, selectedDay)}</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className={`text-[var(--f22-text-muted)] w-36 ${isRTL ? 'text-right' : 'text-left'}`}>{t.date}:</span>
                  <span className={`font-semibold text-[var(--f22-text)] text-lg ${isRTL ? 'text-right' : 'text-left'}`}>{getCurrentDate()}</span>
                </div>
              </div>
            </div>
            
            {/* Checked/Approved by */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-8 border-t border-[var(--f22-border)]">
              <div className={`grid items-center gap-4 ${isRTL ? 'grid-cols-[1fr,140px]' : 'grid-cols-[140px,1fr]'}`}>
                <span className={`text-[var(--f22-text-muted)] ${isRTL ? 'text-right' : 'text-left'}`}>{t.checkedBy}:</span>
                <input
                  type="text"
                  value={checkedBy}
                  onChange={(e) => setCheckedBy(e.target.value)}
                  className={`px-4 py-3 bg-[var(--f22-surface-light)] border border-[var(--f22-border)] rounded-lg text-[var(--f22-text)] focus:outline-none focus:border-[#39FF14] ${isRTL ? 'text-right' : 'text-left'}`}
                  disabled={report?.status !== 'draft' && report?.status !== undefined}
                />
              </div>
              <div className={`grid items-center gap-4 ${isRTL ? 'grid-cols-[1fr,140px]' : 'grid-cols-[140px,1fr]'}`}>
                <span className={`text-[var(--f22-text-muted)] ${isRTL ? 'text-right' : 'text-left'}`}>{t.approvedBy}:</span>
                <input
                  type="text"
                  value={approvedBy}
                  onChange={(e) => setApprovedBy(e.target.value)}
                  className={`px-4 py-3 bg-[var(--f22-surface-light)] border border-[var(--f22-border)] rounded-lg text-[var(--f22-text)] focus:outline-none focus:border-[#39FF14] ${isRTL ? 'text-right' : 'text-left'}`}
                  disabled={report?.status !== 'draft' && report?.status !== undefined}
                />
              </div>
            </div>
          </div>
          
          {/* Expense sections */}
          <div className="bg-[var(--f22-surface)] rounded-lg shadow-lg border border-[var(--f22-border)] p-6 sm:p-8">
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
            <div className="mt-10 pt-8 border-t-2 border-[#39FF14]">
              <div className="flex justify-end items-center gap-6">
                <span className="text-2xl font-bold text-[var(--f22-text)]">{t.grandTotal}</span>
                <span className="text-3xl font-bold text-[#39FF14] min-w-[180px] text-right">
                  {formatCurrency(totals.grandTotalNIS, 'NIS')}
                </span>
              </div>
            </div>
          </div>
          
          {/* Save message */}
          {saveMessage && (
            <div className={`p-5 rounded-lg ${
              saveMessage.type === 'success' 
                ? 'bg-[var(--f22-green)]/20 text-[var(--f22-green)] border border-[var(--f22-green)]/30' 
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {saveMessage.text}
            </div>
          )}
          
          {/* Action button - Submit only */}
          <div className="flex justify-end pb-8">
            <button
              onClick={() => handleSave(true)}
              disabled={isSaving || (report?.status !== 'draft' && report?.status !== undefined)}
              className="px-10 py-4 bg-[#39FF14] text-[#0D0D0D] rounded-lg font-bold hover:bg-[#39FF14] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg shadow-lg shadow-[#39FF14]/30"
            >
              {isSaving ? '...' : t.submitExpenseReport}
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default ExpenseReportPage;
