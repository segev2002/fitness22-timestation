import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { supabaseExpenses, supabaseUsers } from '../utils/supabase';
import type { User, ExpenseReport } from '../types';

interface AdminExpenseReportsProps { user: User; }

const AdminExpenseReports = ({ user }: AdminExpenseReportsProps) => {
  const { t } = useLanguage();
  const [reports, setReports] = useState<ExpenseReport[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const printRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [allReports, allUsers] = await Promise.all([
      supabaseExpenses.getAllForMonth(selectedMonth),
      supabaseUsers.getAll(),
    ]);
    setReports(allReports);
    setUsers(allUsers.filter(u => !u.isDisabled));
    setIsLoading(false);
  }, [selectedMonth]);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleUser = (userId: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm(t.confirmDeleteExpenseReport)) return;
    await supabaseExpenses.delete(reportId);
    loadData();
  };

  const handleApprove = async (reportId: string) => {
    await supabaseExpenses.updateStatus(reportId, 'approved', user.name);
    loadData();
  };

  const handleReject = async (reportId: string) => {
    await supabaseExpenses.updateStatus(reportId, 'rejected');
    loadData();
  };

  const handleGeneratePDF = async (report: ExpenseReport) => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      // Build off-screen element
      const container = document.createElement('div');
      container.style.cssText = 'position:absolute;left:-9999px;top:0;width:800px;padding:40px;background:#fff;color:#000;font-family:Arial,sans-serif;';

      const sym = (c: string) => c === 'NIS' ? '₪' : c === 'USD' ? '$' : '€';
      const renderItems = (items: typeof report.itemsNIS, cur: string) =>
        items.map(i => `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee">${i.quantity}</td><td style="padding:6px 10px;border-bottom:1px solid #eee">${i.description}</td><td style="padding:6px 10px;border-bottom:1px solid #eee">${sym(cur)}${i.unitPrice.toFixed(2)}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;font-weight:600">${sym(cur)}${i.lineTotal.toFixed(2)}</td></tr>`).join('');

      container.innerHTML = `
        <h1 style="font-size:24px;margin-bottom:8px">${t.expenseReport}</h1>
        <p style="color:#666;margin-bottom:20px">${report.userName} — ${report.expensePeriod}</p>
        ${report.checkedBy ? `<p style="font-size:13px;color:#666">${t.checkedBy}: ${report.checkedBy}</p>` : ''}
        ${report.approvedBy ? `<p style="font-size:13px;color:#666">${t.approvedBy}: ${report.approvedBy}</p>` : ''}
        <hr style="margin:20px 0;border:none;border-top:1px solid #ddd">
        ${report.itemsNIS.length > 0 ? `<h3 style="margin:16px 0 8px">${t.expensesInNIS}</h3><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f5f5f5"><th style="padding:8px 10px;text-align:left;font-size:12px">${t.quantity}</th><th style="padding:8px 10px;text-align:left;font-size:12px">${t.description}</th><th style="padding:8px 10px;text-align:left;font-size:12px">${t.unitPrice}</th><th style="padding:8px 10px;text-align:left;font-size:12px">${t.lineTotal}</th></tr></thead><tbody>${renderItems(report.itemsNIS, 'NIS')}</tbody></table><p style="text-align:right;font-weight:700;margin-top:8px">${t.totalNIS}: ₪${report.totalNIS.toFixed(2)}</p>` : ''}
        ${report.itemsUSD.length > 0 ? `<h3 style="margin:16px 0 8px">${t.expensesInUSD}</h3><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f5f5f5"><th style="padding:8px 10px;text-align:left;font-size:12px">${t.quantity}</th><th style="padding:8px 10px;text-align:left;font-size:12px">${t.description}</th><th style="padding:8px 10px;text-align:left;font-size:12px">${t.unitPrice}</th><th style="padding:8px 10px;text-align:left;font-size:12px">${t.lineTotal}</th></tr></thead><tbody>${renderItems(report.itemsUSD, 'USD')}</tbody></table><p style="text-align:right;font-weight:700;margin-top:8px">${t.totalUSD}: $${report.totalUSD.toFixed(2)} (${t.exchangeRate}: ${report.exchangeRateUSD}) = ₪${report.totalUSDInNIS.toFixed(2)}</p>` : ''}
        ${report.itemsEUR.length > 0 ? `<h3 style="margin:16px 0 8px">${t.expensesInEUR}</h3><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f5f5f5"><th style="padding:8px 10px;text-align:left;font-size:12px">${t.quantity}</th><th style="padding:8px 10px;text-align:left;font-size:12px">${t.description}</th><th style="padding:8px 10px;text-align:left;font-size:12px">${t.unitPrice}</th><th style="padding:8px 10px;text-align:left;font-size:12px">${t.lineTotal}</th></tr></thead><tbody>${renderItems(report.itemsEUR, 'EUR')}</tbody></table><p style="text-align:right;font-weight:700;margin-top:8px">${t.totalEUR}: €${report.totalEUR.toFixed(2)} (${t.exchangeRate}: ${report.exchangeRateEUR}) = ₪${report.totalEURInNIS.toFixed(2)}</p>` : ''}
        <hr style="margin:24px 0;border:none;border-top:2px solid #39FF14">
        <p style="text-align:right;font-size:22px;font-weight:800">${t.grandTotal}: ₪${report.grandTotalNIS.toFixed(2)}</p>
      `;
      document.body.appendChild(container);

      const canvas = await html2canvas(container, { scale: 2 });
      document.body.removeChild(container);

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF('p', 'mm', 'a4');
      let position = 0;
      const pageHeight = 297;

      while (position < imgHeight) {
        if (position > 0) pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, -position, imgWidth, imgHeight);
        position += pageHeight;
      }

      pdf.save(`expense_report_${report.userName}_${report.month}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'green';
      case 'submitted': return 'yellow';
      case 'rejected': return 'red';
      default: return 'gray';
    }
  };

  const iconStyle = { width: 20, height: 20 };

  // Group reports by user
  const reportsByUser = reports.reduce<Record<string, ExpenseReport[]>>((acc, r) => {
    if (!acc[r.userId]) acc[r.userId] = [];
    acc[r.userId].push(r);
    return acc;
  }, {});

  if (isLoading) {
    return <div className="page-section"><div className="app-loading" style={{ minHeight: 200 }}><div className="spinner" /></div></div>;
  }

  return (
    <div className="page-section" ref={printRef}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
        <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="form-input" style={{ width: 'auto' }} />
        <span style={{ color: 'var(--f22-text-muted)', fontSize: 14 }}>{reports.length} {t.expenseReports}</span>
      </div>

      {reports.length === 0 ? (
        <div className="empty-state"><p>{t.noExpenseReports}</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.entries(reportsByUser).map(([userId, userReports]) => {
            const u = users.find(u => u.id === userId);
            const isExpanded = expandedUsers.has(userId);
            const totalExpenses = userReports.reduce((s, r) => s + r.grandTotalNIS, 0);
            return (
              <div key={userId} style={{ background: 'var(--f22-surface-light)', borderRadius: 16, border: '1px solid var(--f22-border)', overflow: 'hidden' }}>
                <button onClick={() => toggleUser(userId)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--f22-text)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                      {u?.profilePicture ? <img src={u.profilePicture} alt="" /> : (u?.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 700 }}>{u?.name || t.unknownUser}</span>
                    <span style={{ color: '#39FF14', fontWeight: 700, fontSize: 14 }}>₪{totalExpenses.toFixed(2)}</span>
                  </div>
                  <svg style={{ ...iconStyle, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {isExpanded && (
                  <div style={{ padding: '0 20px 20px' }}>
                    {userReports.map(report => (
                      <div key={report.id} style={{ background: 'var(--f22-surface)', borderRadius: 12, padding: 20, border: '1px solid var(--f22-border)', marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--f22-text)' }}>{report.expensePeriod}</div>
                            <span className={`status-chip ${statusColor(report.status)}`}>{t[report.status as keyof typeof t] as string}</span>
                          </div>
                          <div style={{ fontWeight: 800, fontSize: 20, color: '#39FF14' }}>₪{report.grandTotalNIS.toFixed(2)}</div>
                        </div>

                        {/* Summary lines */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13, color: 'var(--f22-text-muted)', marginBottom: 16 }}>
                          {report.totalNIS > 0 && <span>NIS: ₪{report.totalNIS.toFixed(2)}</span>}
                          {report.totalUSD > 0 && <span>USD: ${report.totalUSD.toFixed(2)} (x{report.exchangeRateUSD}) = ₪{report.totalUSDInNIS.toFixed(2)}</span>}
                          {report.totalEUR > 0 && <span>EUR: €{report.totalEUR.toFixed(2)} (x{report.exchangeRateEUR}) = ₪{report.totalEURInNIS.toFixed(2)}</span>}
                        </div>
                        {report.checkedBy && <div style={{ fontSize: 12, color: 'var(--f22-text-muted)' }}>{t.checkedBy}: {report.checkedBy}</div>}
                        {report.approvedBy && <div style={{ fontSize: 12, color: 'var(--f22-text-muted)' }}>{t.approvedBy}: {report.approvedBy}</div>}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                          {report.status === 'submitted' && (
                            <>
                              <button onClick={() => handleApprove(report.id)} className="btn-sm green">{t.approveReport}</button>
                              <button onClick={() => handleReject(report.id)} className="btn-sm danger">{t.rejectReport}</button>
                            </>
                          )}
                          <button onClick={() => handleGeneratePDF(report)} className="btn-sm ghost">
                            <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            {t.downloadPDF}
                          </button>
                          <button onClick={() => handleDeleteReport(report.id)} className="btn-sm danger">
                            <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            {t.deleteReport}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminExpenseReports;
