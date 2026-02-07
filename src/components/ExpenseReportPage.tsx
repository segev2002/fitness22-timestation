import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { supabaseExpenses } from '../utils/supabase';
import type { User, ExpenseReport, ExpenseItem, Currency } from '../types';

interface ExpenseReportPageProps { user: User; }

interface ItemState {
  id: string;
  quantity: number;
  description: string;
  unitPrice: number;
  invoiceUrl?: string;
  invoiceBase64?: string;
}

const createEmptyItem = (): ItemState => ({
  id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  quantity: 1, description: '', unitPrice: 0,
});

const createExpenseReportId = () => `expense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const ExpenseItemRow = ({ item, currency, onUpdate, onRemove, onInvoiceUpload, onInvoiceRemove, t }: {
  item: ItemState;
  currency: Currency;
  onUpdate: (id: string, field: keyof ItemState, value: string | number) => void;
  onRemove: (id: string) => void;
  onInvoiceUpload: (id: string, file: File) => void;
  onInvoiceRemove: (id: string) => void;
  t: ReturnType<typeof import('../context/LanguageContext').useLanguage>['t'];
}) => {
  const [localPrice, setLocalPrice] = useState(item.unitPrice.toString());
  const [localDesc, setLocalDesc] = useState(item.description);
  const lineTotal = item.quantity * item.unitPrice;
  const sym = currency === 'NIS' ? '₪' : currency === 'USD' ? '$' : '€';

  return (
    <div style={{ background: 'var(--f22-surface-light)', borderRadius: 12, padding: 16, border: '1px solid var(--f22-border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 120px 100px', gap: 8, alignItems: 'end' }}>
        <div className="form-group">
          <label className="form-label">{t.quantity}</label>
          <input type="number" min={1} value={item.quantity} onChange={e => onUpdate(item.id, 'quantity', Number(e.target.value))} className="form-input" style={{ padding: '8px 12px', minHeight: 40 }} />
        </div>
        <div className="form-group">
          <label className="form-label">{t.description}</label>
          <input type="text" value={localDesc} onChange={e => setLocalDesc(e.target.value)} onBlur={() => onUpdate(item.id, 'description', localDesc)} className="form-input" style={{ padding: '8px 12px', minHeight: 40 }} placeholder={t.enterDescription} />
        </div>
        <div className="form-group">
          <label className="form-label">{t.unitPrice}</label>
          <input type="number" step="0.01" min={0} value={localPrice} onChange={e => setLocalPrice(e.target.value)} onBlur={() => onUpdate(item.id, 'unitPrice', Number(localPrice))} className="form-input" style={{ padding: '8px 12px', minHeight: 40 }} />
        </div>
        <div className="form-group">
          <label className="form-label">{t.lineTotal}</label>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--f22-text)', padding: '10px 0' }}>{sym}{lineTotal.toFixed(2)}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {item.invoiceUrl || item.invoiceBase64 ? (
          <>
            <a href={item.invoiceUrl || item.invoiceBase64} target="_blank" rel="noopener noreferrer" className="btn-sm green" style={{ textDecoration: 'none' }}>{t.viewInvoice}</a>
            <button onClick={() => onInvoiceRemove(item.id)} className="btn-sm danger">{t.removeInvoice}</button>
          </>
        ) : (
          <label className="btn-sm ghost" style={{ cursor: 'pointer' }}>
            <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            {t.uploadInvoice}
            <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) onInvoiceUpload(item.id, e.target.files[0]); }} />
          </label>
        )}
        <button onClick={() => onRemove(item.id)} className="btn-sm danger" style={{ marginInlineStart: 'auto' }}>{t.removeExpense}</button>
      </div>
    </div>
  );
};

const ExpenseReportPage = ({ user }: ExpenseReportPageProps) => {
  const { t, language } = useLanguage();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [report, setReport] = useState<ExpenseReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [itemsNIS, setItemsNIS] = useState<ItemState[]>([createEmptyItem()]);
  const [itemsUSD, setItemsUSD] = useState<ItemState[]>([createEmptyItem()]);
  const [itemsEUR, setItemsEUR] = useState<ItemState[]>([createEmptyItem()]);
  const [exchangeRateUSD, setExchangeRateUSD] = useState(3.6);
  const [exchangeRateEUR, setExchangeRateEUR] = useState(3.9);
  const [checkedBy, setCheckedBy] = useState('');
  const [approvedBy, setApprovedBy] = useState('');

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    const existing = await supabaseExpenses.getForUserMonth(user.id, selectedMonth);
    if (existing) {
      setReport(existing);
      setItemsNIS(existing.itemsNIS.length > 0 ? existing.itemsNIS.map(i => ({ id: i.id, quantity: i.quantity, description: i.description, unitPrice: i.unitPrice, invoiceUrl: i.invoiceUrl, invoiceBase64: i.invoiceBase64 })) : [createEmptyItem()]);
      setItemsUSD(existing.itemsUSD.length > 0 ? existing.itemsUSD.map(i => ({ id: i.id, quantity: i.quantity, description: i.description, unitPrice: i.unitPrice, invoiceUrl: i.invoiceUrl, invoiceBase64: i.invoiceBase64 })) : [createEmptyItem()]);
      setItemsEUR(existing.itemsEUR.length > 0 ? existing.itemsEUR.map(i => ({ id: i.id, quantity: i.quantity, description: i.description, unitPrice: i.unitPrice, invoiceUrl: i.invoiceUrl, invoiceBase64: i.invoiceBase64 })) : [createEmptyItem()]);
      setExchangeRateUSD(existing.exchangeRateUSD || 3.6);
      setExchangeRateEUR(existing.exchangeRateEUR || 3.9);
      setCheckedBy(existing.checkedBy || '');
      setApprovedBy(existing.approvedBy || '');
    } else {
      setReport(null);
      setItemsNIS([createEmptyItem()]);
      setItemsUSD([createEmptyItem()]);
      setItemsEUR([createEmptyItem()]);
    }
    setIsLoading(false);
  }, [user.id, selectedMonth]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const updateItem = (_items: ItemState[], setItems: React.Dispatch<React.SetStateAction<ItemState[]>>, id: string, field: keyof ItemState, value: string | number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const removeItem = (_items: ItemState[], setItems: React.Dispatch<React.SetStateAction<ItemState[]>>, id: string) => {
    setItems(prev => prev.length > 1 ? prev.filter(i => i.id !== id) : prev);
  };

  const handleInvoiceUpload = async (_items: ItemState[], setItems: React.Dispatch<React.SetStateAction<ItemState[]>>, id: string, file: File) => {
    // Try Supabase storage first
    const url = await supabaseExpenses.uploadInvoice(file, user.id, id);
    if (url) {
      setItems(prev => prev.map(i => i.id === id ? { ...i, invoiceUrl: url } : i));
    } else {
      // Fallback: base64
      const reader = new FileReader();
      reader.onload = (e) => { if (e.target?.result) setItems(prev => prev.map(i => i.id === id ? { ...i, invoiceBase64: e.target!.result as string } : i)); };
      reader.readAsDataURL(file);
    }
  };

  const handleInvoiceRemove = (_items: ItemState[], setItems: React.Dispatch<React.SetStateAction<ItemState[]>>, id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, invoiceUrl: undefined, invoiceBase64: undefined } : i));
  };

  const calcTotal = (items: ItemState[]) => items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const totalNIS = calcTotal(itemsNIS);
  const totalUSD = calcTotal(itemsUSD);
  const totalEUR = calcTotal(itemsEUR);
  const totalUSDInNIS = totalUSD * exchangeRateUSD;
  const totalEURInNIS = totalEUR * exchangeRateEUR;
  const grandTotal = totalNIS + totalUSDInNIS + totalEURInNIS;

  const buildExpenseItems = (items: ItemState[], currency: Currency, reportId: string): ExpenseItem[] =>
    items.filter(i => i.description || i.unitPrice > 0).map(i => ({
      id: i.id, expenseReportId: reportId, currency, quantity: i.quantity,
      description: i.description, unitPrice: i.unitPrice, lineTotal: i.quantity * i.unitPrice,
      invoiceUrl: i.invoiceUrl, invoiceBase64: i.invoiceBase64, createdAt: new Date().toISOString(),
    }));

  const handleSave = async (status: 'draft' | 'submitted') => {
    setIsSaving(true);
    setSaveMessage('');
    const [y, m] = selectedMonth.split('-').map(Number);
    const monthNames = language === 'he' ? t.months : t.months;
    const expensePeriod = `${monthNames[m - 1]}, ${y}`;
  const reportId = report?.id || createExpenseReportId();

    const expReport: ExpenseReport = {
      id: reportId, userId: user.id, userName: user.name, month: selectedMonth,
      expensePeriod, checkedBy: checkedBy || undefined, approvedBy: approvedBy || undefined,
      itemsNIS: [], totalNIS, itemsUSD: [], totalUSD, exchangeRateUSD, totalUSDInNIS,
      itemsEUR: [], totalEUR, exchangeRateEUR, totalEURInNIS, grandTotalNIS: grandTotal,
      status, createdAt: report?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
    };

    const allItems = [
      ...buildExpenseItems(itemsNIS, 'NIS', reportId),
      ...buildExpenseItems(itemsUSD, 'USD', reportId),
      ...buildExpenseItems(itemsEUR, 'EUR', reportId),
    ];

    const success = await supabaseExpenses.save(expReport, allItems);
    setSaveMessage(success ? (status === 'submitted' ? t.expenseReportSubmitted : t.expenseReportSaved) : t.profileSaveFailed);
    setIsSaving(false);
    if (success) loadReport();
  };

  const currencySection = (
    title: string, sym: string, currency: Currency,
    items: ItemState[], setItems: React.Dispatch<React.SetStateAction<ItemState[]>>,
    total: number, exchangeRate?: number, setExchangeRate?: (v: number) => void, totalInNIS?: number,
  ) => (
    <div style={{ marginBottom: 32 }}>
      <h4 style={{ fontWeight: 700, fontSize: 16, color: 'var(--f22-text)', marginBottom: 16 }}>{title}</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map(item => (
          <ExpenseItemRow
            key={item.id} item={item} currency={currency} t={t}
            onUpdate={(id, field, value) => updateItem(items, setItems, id, field, value)}
            onRemove={(id) => removeItem(items, setItems, id)}
            onInvoiceUpload={(id, file) => handleInvoiceUpload(items, setItems, id, file)}
            onInvoiceRemove={(id) => handleInvoiceRemove(items, setItems, id)}
          />
        ))}
      </div>
      <button onClick={() => setItems(prev => [...prev, createEmptyItem()])} className="btn-sm ghost" style={{ marginTop: 12 }}>
        <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        {t.addExpense}
      </button>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--f22-border-subtle)' }}>
        <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--f22-text)' }}>{t.total}: {sym}{total.toFixed(2)}</span>
        {exchangeRate !== undefined && setExchangeRate && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--f22-text-muted)' }}>{t.exchangeRate}:</span>
            <input type="number" step="0.01" value={exchangeRate} onChange={e => setExchangeRate(Number(e.target.value))} className="form-input" style={{ width: 80, padding: '4px 8px', minHeight: 36, fontSize: 13 }} />
            <span style={{ fontSize: 13, color: '#39FF14', fontWeight: 600 }}>= ₪{totalInNIS?.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );

  const isSubmitted = report?.status === 'submitted' || report?.status === 'approved';

  if (isLoading) {
    return <div className="app-loading"><div className="spinner" /></div>;
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 72px)' }}>
      <div className="page-section">
        <h3 className="section-heading">
          <span className="section-icon">
            <svg style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>
          </span>
          {t.expenseReport}
        </h3>

        {/* Month Selector */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24 }}>
          <label className="form-label" style={{ marginBottom: 0 }}>{t.selectMonth}:</label>
          <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="form-input" style={{ width: 'auto' }} />
          {report && <span className={`status-chip ${report.status === 'approved' ? 'green' : report.status === 'submitted' ? 'yellow' : report.status === 'rejected' ? 'red' : 'gray'}`}>{t[report.status as keyof typeof t] as string}</span>}
        </div>

        {/* Checked/Approved By */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
          <div className="form-group">
            <label className="form-label">{t.checkedBy}</label>
            <input type="text" value={checkedBy} onChange={e => setCheckedBy(e.target.value)} className="form-input" style={{ padding: '8px 12px', minHeight: 40 }} disabled={isSubmitted} />
          </div>
          <div className="form-group">
            <label className="form-label">{t.approvedBy}</label>
            <input type="text" value={approvedBy} onChange={e => setApprovedBy(e.target.value)} className="form-input" style={{ padding: '8px 12px', minHeight: 40 }} disabled={isSubmitted} />
          </div>
        </div>

        {/* Currency Sections */}
        {currencySection(t.expensesInNIS, '₪', 'NIS', itemsNIS, setItemsNIS, totalNIS)}
        {currencySection(t.expensesInUSD, '$', 'USD', itemsUSD, setItemsUSD, totalUSD, exchangeRateUSD, setExchangeRateUSD, totalUSDInNIS)}
        {currencySection(t.expensesInEUR, '€', 'EUR', itemsEUR, setItemsEUR, totalEUR, exchangeRateEUR, setExchangeRateEUR, totalEURInNIS)}

        {/* Grand Total */}
        <div style={{ background: 'rgba(57,255,20,.1)', border: '1px solid rgba(57,255,20,.25)', borderRadius: 16, padding: 20, marginBottom: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: '#39FF14', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.grandTotal}</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#39FF14', letterSpacing: '-0.025em' }}>₪{grandTotal.toFixed(2)}</div>
        </div>

        {/* Save/Submit buttons */}
        {saveMessage && <div className={saveMessage.includes('fail') || saveMessage.includes('נכשל') ? 'error-box' : 'success-box'} style={{ marginBottom: 16 }}>{saveMessage}</div>}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => handleSave('submitted')} disabled={isSaving || isSubmitted} className="btn-green" style={{ minWidth: 220 }}>
            {isSaving ? <div className="spinner" style={{ width: 20, height: 20 }} /> : null}
            {t.sendExpenseReport}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpenseReportPage;
