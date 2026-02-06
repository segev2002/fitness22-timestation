import { useState, useEffect, useMemo, useCallback } from 'react';
import type { User, ExpenseReport, ExpenseItem, Currency } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { supabaseExpenses, supabaseUsers } from '../utils/supabase';
import jsPDF from 'jspdf';

interface AdminExpenseReportsProps {
  user: User;
}

// Currency symbols
const CURRENCY_SYMBOLS: Record<Currency, string> = {
  NIS: '₪',
  USD: '$',
  EUR: '€',
};

const AdminExpenseReports = ({ user }: AdminExpenseReportsProps) => {
  void user;
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  
  const [reports, setReports] = useState<ExpenseReport[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [reportsData, usersData] = await Promise.all([
          supabaseExpenses.getAllForMonth(selectedMonth),
          supabaseUsers.getAll(),
        ]);
        setReports(reportsData);
        setUsers(usersData.filter(u => !u.isDisabled));
      } catch (error) {
        console.error('Error loading expense reports:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [selectedMonth]);
  
  // Group reports by user
  const reportsByUser = useMemo(() => {
    const grouped: Record<string, { user: User | undefined; reports: ExpenseReport[] }> = {};
    
    // Initialize with all users
    for (const u of users) {
      grouped[u.id] = { user: u, reports: [] };
    }
    
    // Add reports
    for (const report of reports) {
      if (!grouped[report.userId]) {
        grouped[report.userId] = { user: undefined, reports: [] };
      }
      grouped[report.userId].reports.push(report);
    }
    
    // Filter to only users with reports
    return Object.entries(grouped)
      .filter(([, data]) => data.reports.length > 0)
      .sort(([, a], [, b]) => (a.user?.name || '').localeCompare(b.user?.name || ''));
  }, [reports, users]);
  
  // Toggle user expansion
  const toggleUserExpansion = (userId: string) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };
  
  // Expand all
  const expandAll = () => {
    setExpandedUsers(new Set(reportsByUser.map(([userId]) => userId)));
  };
  
  // Collapse all
  const collapseAll = () => {
    setExpandedUsers(new Set());
  };

  const handleDeleteReport = async (reportId: string) => {
    const confirmed = confirm(t.confirmDeleteExpenseReport);
    if (!confirmed) return;
    try {
      const success = await supabaseExpenses.delete(reportId);
      if (!success) return;
      const updatedReports = await supabaseExpenses.getAllForMonth(selectedMonth);
      setReports(updatedReports);
    } catch (error) {
      console.error('Error deleting expense report:', error);
    }
  };
  
  // Format currency
  const formatCurrency = (value: number, currency: Currency) => {
    return `${CURRENCY_SYMBOLS[currency]}${value.toFixed(2)}`;
  };
  
  // Generate PDF for a report
  const generatePDF = useCallback(async (report: ExpenseReport) => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const requestDate = report.createdAt ? new Date(report.createdAt) : new Date();
    const formatNumber = (value: number) => new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
    const formatCurrencyForPdf = (value: number, currency: Currency) => `${currency} ${formatNumber(value)}`;
    const buildRows = (items: ExpenseItem[], currency: Currency) => items
      .map(item => `
        <tr>
          <td style="padding: 6px 4px; border-bottom: 1px solid #e5e7eb;">${item.quantity}</td>
          <td style="padding: 6px 4px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
          <td style="padding: 6px 4px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrencyForPdf(item.unitPrice, currency)}</td>
          <td style="padding: 6px 4px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrencyForPdf(item.lineTotal, currency)}</td>
        </tr>
      `).join('');

    const buildSection = (title: string, items: ExpenseItem[], total: number, currency: Currency, exchangeRate?: number, totalInNIS?: number) => {
      if (items.length === 0 && total === 0) return '';
      return `
        <div style="margin-top: 20px;">
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 8px;">${title}</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="text-align: left; padding: 6px 4px;">Qty</th>
                <th style="text-align: left; padding: 6px 4px;">Description</th>
                <th style="text-align: right; padding: 6px 4px;">Unit Price</th>
                <th style="text-align: right; padding: 6px 4px;">Line Total</th>
              </tr>
            </thead>
            <tbody>
              ${buildRows(items, currency)}
            </tbody>
          </table>
          <div style="margin-top: 6px; display: flex; justify-content: flex-end; gap: 16px; font-size: 12px;">
            <span style="font-weight: 600;">Total ${currency}:</span>
            <span style="font-weight: 700;">${formatCurrencyForPdf(total, currency)}</span>
          </div>
          ${exchangeRate && totalInNIS !== undefined ? `
            <div style="margin-top: 4px; display: flex; justify-content: flex-end; gap: 16px; font-size: 12px;">
              <span>Exchange Rate:</span>
              <span>${exchangeRate}</span>
            </div>
            <div style="margin-top: 2px; display: flex; justify-content: flex-end; gap: 16px; font-size: 12px;">
              <span>Total NIS:</span>
              <span style="font-weight: 700;">${formatCurrencyForPdf(totalInNIS, 'NIS')}</span>
            </div>
          ` : ''}
        </div>
      `;
    };

    const container = document.createElement('div');
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.color = '#111827';
    container.style.width = '520px';
    container.innerHTML = `
      <div style="display: flex; align-items: baseline; gap: 16px;">
        <div style="font-size: 24px; font-weight: 700; color: #39FF14;">Fitness22</div>
        <div style="font-size: 20px; color: #6b7280;">Expense Report</div>
      </div>
      <div style="margin-top: 16px; font-size: 12px;">
        <div style="display: flex; justify-content: space-between; gap: 12px;">
          <div>Employee: ${report.userName}</div>
          <div>Request Date: ${requestDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
        <div style="margin-top: 6px;">Expense Period: ${report.expensePeriod}</div>
        ${report.checkedBy ? `<div style="margin-top: 8px;">Checked By: ${report.checkedBy}</div>` : ''}
        ${report.approvedBy ? `<div style="margin-top: 4px;">Approved By: ${report.approvedBy}</div>` : ''}
      </div>
      ${buildSection('EXPENSES IN NIS', report.itemsNIS, report.totalNIS, 'NIS')}
      ${buildSection('EXPENSES IN USD', report.itemsUSD, report.totalUSD, 'USD', report.exchangeRateUSD, report.totalUSDInNIS)}
      ${buildSection('EXPENSES IN EUR', report.itemsEUR, report.totalEUR, 'EUR', report.exchangeRateEUR, report.totalEURInNIS)}
      <div style="margin-top: 24px; display: flex; justify-content: flex-end; gap: 16px; font-size: 14px; font-weight: 700; color: #39FF14;">
        <span>GRAND TOTAL:</span>
        <span>${formatCurrencyForPdf(report.grandTotalNIS, 'NIS')}</span>
      </div>
      <div style="margin-top: 16px; font-size: 11px;">Status: ${report.status.toUpperCase()}</div>
    `;

    document.body.appendChild(container);
    await doc.html(container, {
      x: 24,
      y: 24,
      html2canvas: { scale: 1 },
      callback: () => {
        doc.save(`expense_report_${report.userName.replace(/\s+/g, '_')}_${report.month}.pdf`);
        document.body.removeChild(container);
      },
    });
  }, []);
  
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
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#39FF14] border-t-transparent"></div>
      </div>
    );
  }
  
  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-[var(--f22-text)]">{t.expenseReports}</h2>
        
        <div className="flex items-center gap-4">
          {/* Month selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 bg-[var(--f22-surface-light)] border border-[var(--f22-border)] rounded-lg text-[var(--f22-text)] focus:outline-none focus:border-[#39FF14]"
          >
            {monthOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          
          {/* Expand/Collapse buttons */}
          <div className="flex gap-2">
            <button
              onClick={expandAll}
              className="px-3 py-2 text-sm bg-[var(--f22-surface-light)] border border-[var(--f22-border)] rounded-lg text-[var(--f22-text-muted)] hover:border-[#39FF14] transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-2 text-sm bg-[var(--f22-surface-light)] border border-[var(--f22-border)] rounded-lg text-[var(--f22-text-muted)] hover:border-[#39FF14] transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>
      
      {/* Reports by user */}
      {reportsByUser.length === 0 ? (
        <div className="text-center py-12 text-[var(--f22-text-muted)]">
          {t.noExpenseReports}
        </div>
      ) : (
        <div className="space-y-4">
          {reportsByUser.map(([userId, { user: reportUser, reports: userReports }]) => (
            <div
              key={userId}
              className="bg-[var(--f22-surface)] rounded-lg border border-[var(--f22-border)] overflow-hidden"
            >
              {/* User header - clickable to expand/collapse */}
              <button
                onClick={() => toggleUserExpansion(userId)}
                className="w-full flex items-center justify-between p-4 hover:bg-[var(--f22-surface-light)] transition-colors"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 bg-[#39FF14] rounded-full flex items-center justify-center text-[#0D0D0D] font-bold overflow-hidden">
                    {reportUser?.profilePicture ? (
                      <img src={reportUser.profilePicture} alt={reportUser.name} className="w-full h-full object-cover" />
                    ) : (
                      (reportUser?.name || 'U').charAt(0).toUpperCase()
                    )}
                  </div>
                  
                  <div className="text-left">
                    <h3 className="font-semibold text-[var(--f22-text)]">
                      {reportUser?.name || t.unknownUser}
                    </h3>
                    <p className="text-sm text-[var(--f22-text-muted)]">
                      {userReports.length} {t.expenseReports.toLowerCase()}
                    </p>
                  </div>
                </div>
                
                {/* Total and expand icon */}
                <div className="flex items-center gap-4">
                  <span className="text-lg font-bold text-[#39FF14]">
                    {formatCurrency(
                      userReports.reduce((sum, r) => sum + r.grandTotalNIS, 0),
                      'NIS'
                    )}
                  </span>
                  
                  <svg
                    className={`w-5 h-5 text-[var(--f22-text-muted)] transition-transform ${
                      expandedUsers.has(userId) ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              
              {/* Expanded content */}
              {expandedUsers.has(userId) && (
                <div className="border-t border-[var(--f22-border)]">
                  {userReports.map((report) => (
                    <div
                      key={report.id}
                      className="p-4 border-b border-[var(--f22-border)] last:border-b-0 bg-[var(--f22-surface-light)]"
                    >
                      {/* Report header */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                        <div>
                          <h4 className="font-medium text-[var(--f22-text)]">
                            {report.expensePeriod}
                          </h4>
                          <p className="text-sm text-[var(--f22-text-muted)]">
                            {t.grandTotal}: {formatCurrency(report.grandTotalNIS, 'NIS')}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {/* PDF download */}
                          <button
                            onClick={() => generatePDF(report)}
                            className="px-5 py-2.5 min-h-[44px] text-sm bg-[#39FF14] text-[#0D0D0D] rounded-lg font-semibold hover:bg-[var(--f22-green)] transition-colors flex items-center gap-2 shadow-md shadow-[#39FF14]/30"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            PDF
                          </button>
                          <button
                            onClick={() => handleDeleteReport(report.id)}
                            className="px-4 py-2.5 min-h-[44px] text-sm bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            {t.deleteReport}
                          </button>
                        </div>
                      </div>
                      
                      {/* Expense summary tables */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* NIS */}
                        {report.itemsNIS.length > 0 && (
                          <div className="bg-[var(--f22-surface)] rounded-lg p-3">
                            <h5 className="text-sm font-medium text-[var(--f22-text-muted)] mb-2">NIS</h5>
                            <div className="space-y-1">
                              {report.itemsNIS.map(item => (
                                <div key={item.id} className="flex justify-between text-sm">
                                  <span className="text-[var(--f22-text)] truncate max-w-[150px]">{item.description}</span>
                                  <span className="text-[var(--f22-text)]">{formatCurrency(item.lineTotal, 'NIS')}</span>
                                </div>
                              ))}
                              <div className="border-t border-[var(--f22-border)] pt-1 mt-1 flex justify-between font-medium">
                                <span>{t.total}</span>
                                <span className="text-[#39FF14]">{formatCurrency(report.totalNIS, 'NIS')}</span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* USD */}
                        {report.itemsUSD.length > 0 && (
                          <div className="bg-[var(--f22-surface)] rounded-lg p-3">
                            <h5 className="text-sm font-medium text-[var(--f22-text-muted)] mb-2">USD</h5>
                            <div className="space-y-1">
                              {report.itemsUSD.map(item => (
                                <div key={item.id} className="flex justify-between text-sm">
                                  <span className="text-[var(--f22-text)] truncate max-w-[150px]">{item.description}</span>
                                  <span className="text-[var(--f22-text)]">{formatCurrency(item.lineTotal, 'USD')}</span>
                                </div>
                              ))}
                              <div className="border-t border-[var(--f22-border)] pt-1 mt-1">
                                <div className="flex justify-between text-sm text-[var(--f22-text-muted)]">
                                  <span>{t.exchangeRate}</span>
                                  <span>{report.exchangeRateUSD}</span>
                                </div>
                                <div className="flex justify-between font-medium">
                                  <span>{t.totalNIS}</span>
                                  <span className="text-[#39FF14]">{formatCurrency(report.totalUSDInNIS, 'NIS')}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* EUR */}
                        {report.itemsEUR.length > 0 && (
                          <div className="bg-[var(--f22-surface)] rounded-lg p-3">
                            <h5 className="text-sm font-medium text-[var(--f22-text-muted)] mb-2">EUR</h5>
                            <div className="space-y-1">
                              {report.itemsEUR.map(item => (
                                <div key={item.id} className="flex justify-between text-sm">
                                  <span className="text-[var(--f22-text)] truncate max-w-[150px]">{item.description}</span>
                                  <span className="text-[var(--f22-text)]">{formatCurrency(item.lineTotal, 'EUR')}</span>
                                </div>
                              ))}
                              <div className="border-t border-[var(--f22-border)] pt-1 mt-1">
                                <div className="flex justify-between text-sm text-[var(--f22-text-muted)]">
                                  <span>{t.exchangeRate}</span>
                                  <span>{report.exchangeRateEUR}</span>
                                </div>
                                <div className="flex justify-between font-medium">
                                  <span>{t.totalNIS}</span>
                                  <span className="text-[#39FF14]">{formatCurrency(report.totalEURInNIS, 'NIS')}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Invoices section */}
                      {[...report.itemsNIS, ...report.itemsUSD, ...report.itemsEUR].some(i => i.invoiceUrl || i.invoiceBase64) && (
                        <div className="mt-4 pt-4 border-t border-[var(--f22-border)]">
                          <h5 className="text-sm font-medium text-[var(--f22-text-muted)] mb-2">Invoices</h5>
                          <div className="flex flex-wrap gap-2">
                            {[...report.itemsNIS, ...report.itemsUSD, ...report.itemsEUR]
                              .filter(i => i.invoiceUrl || i.invoiceBase64)
                              .map(item => (
                                <button
                                  key={item.id}
                                  onClick={() => window.open(item.invoiceBase64 || item.invoiceUrl, '_blank')}
                                  className="px-3 py-1 text-xs bg-[var(--f22-surface)] border border-[var(--f22-border)] rounded hover:border-[#39FF14] transition-colors flex items-center gap-1"
                                >
                                  📎 {item.description.substring(0, 20)}...
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminExpenseReports;
