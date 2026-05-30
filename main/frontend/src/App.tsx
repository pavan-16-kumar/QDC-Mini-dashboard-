import React, { useEffect, useState } from 'react';
import { OrdersList } from './OrdersList';

export interface Garment {
  id: string;
  description: string;
  status: 'received' | 'in_cleaning' | 'ready' | 'delivered';
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone?: string;
  createdAt: string;
  garments: Garment[];
}

export type FilterStatus = 'all' | 'received' | 'in_cleaning' | 'ready' | 'delivered';

export const App: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'board' | 'spreadsheet'>(() => {
    const saved = localStorage.getItem('qdc_view_mode');
    return (saved === 'board' || saved === 'spreadsheet') ? saved : 'board';
  });

  // Persist viewMode in localStorage so that it stays constant when the page is reloaded
  useEffect(() => {
    localStorage.setItem('qdc_view_mode', viewMode);
  }, [viewMode]);

  // Modal and new order creation states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [newCustomerName, setNewCustomerName] = useState<string>('');
  const [newCustomerPhone, setNewCustomerPhone] = useState<string>('');
  const [newGarmentDraft, setNewGarmentDraft] = useState<string>('');
  const [newGarmentList, setNewGarmentList] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dynamically load Google Font "Outfit" and inject responsive media stylesheet
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    const style = document.createElement('style');
    style.innerHTML = `
      .qdc-layout {
        padding: 2.5rem 3.5rem;
      }
      .qdc-header-bar {
        padding: 2.25rem 3rem;
        background: linear-gradient(135deg, #dbeafe 0%, #f0f9ff 50%, #ffffff 100%);
        border-radius: 24px;
        box-shadow: 0 10px 30px rgba(59, 130, 246, 0.05);
        border: 1px solid rgba(59, 130, 246, 0.12);
      }
      .qdc-metrics-grid {
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      }
      .qdc-orders-grid {
        grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      }
      .qdc-tabs-container {
        overflow-x: visible;
        display: flex;
        flex-wrap: wrap;
      }

      @media (max-width: 1024px) {
        .qdc-layout {
          padding: 2rem !important;
        }
      }

      @media (max-width: 768px) {
        .qdc-layout {
          padding: 1.5rem 1rem !important;
        }
        .qdc-header-bar {
          padding: 1.75rem 1.5rem !important;
          border-radius: 16px !important;
        }
        .qdc-header-flex {
          flex-direction: column !important;
          align-items: flex-start !important;
          gap: 1.25rem !important;
        }
        .qdc-header-logo {
          width: 52px !important;
          height: 52px !important;
          border-radius: 10px !important;
        }
        .qdc-header-title {
          font-size: 1.85rem !important;
        }
        .qdc-header-subtitle {
          font-size: 0.9rem !important;
          margin-top: 0.5rem !important;
          line-height: 1.4 !important;
        }
        .qdc-metrics-grid {
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 1rem !important;
        }
        .qdc-metric-card {
          padding: 1.25rem 1rem !important;
        }
        .qdc-metric-value {
          font-size: 2rem !important;
        }
        .qdc-tabs-container {
          overflow-x: auto !important;
          flex-wrap: nowrap !important;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 0.5rem;
        }
        .qdc-tab-button {
          flex: 0 0 auto !important;
        }
      }

      @media (max-width: 480px) {
        .qdc-metrics-grid {
          grid-template-columns: 1fr !important;
        }
      }
      @keyframes slideIn {
        from { transform: translateY(-20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes scaleUp {
        from { transform: scale(0.95); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(link);
      document.head.removeChild(style);
    };
  }, []);

  // Fetch both active orders and the garment counts summary
  const fetchDashboardData = async () => {
    setError(null);
    try {
      const [ordersRes, summaryRes] = await Promise.all([
        fetch('http://localhost:3001/api/orders'),
        fetch('http://localhost:3001/api/orders/summary')
      ]);

      if (!ordersRes.ok || !summaryRes.ok) {
        throw new Error('Server returned an error');
      }

      const ordersData = (await ordersRes.json()) as Order[];
      const summaryData = (await summaryRes.json()) as Record<string, number>;

      setOrders(ordersData);
      setSummary(summaryData);
    } catch (e: any) {
      setError(e.message || 'Failed to update database');
    }
  };

  // Initial load
  useEffect(() => {
    const initFetch = async () => {
      setLoading(true);
      await fetchDashboardData();
      setLoading(false);
    };
    initFetch();
  }, []);

  // Cycle garment status: received -> in_cleaning -> ready -> delivered -> received
  const handleCycleGarmentStatus = async (orderId: string, garmentId: string, currentStatus: string) => {
    const nextStatusMap: Record<string, string> = {
      received: 'in_cleaning',
      in_cleaning: 'ready',
      ready: 'delivered',
      delivered: 'received',
    };
    const nextStatus = nextStatusMap[currentStatus] || 'received';

    try {
      const res = await fetch(`http://localhost:3001/api/orders/${orderId}/garments/${garmentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) {
        throw new Error('Failed to update status');
      }

      // Hot reload the visual dashboard components in parallel
      await fetchDashboardData();
    } catch (e: any) {
      alert(e.message || 'Network error updating garment status');
    }
  };

  const handleExportToExcel = () => {
    const headers = ['Order ID', 'Customer Name', 'Garment ID', 'Description', 'Status', 'Date Dropped'];
    const rows: string[][] = [];
    
    orders.forEach(order => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        order.id.toLowerCase().includes(query) || 
        order.customerName.toLowerCase().includes(query);
        
      if (!matchesSearch) return;
      
      order.garments.forEach(g => {
        if (selectedStatus !== 'all' && g.status !== selectedStatus) return;
        
        rows.push([
          order.id,
          order.customerName,
          g.id,
          g.description,
          g.status.toUpperCase(),
          new Date(order.createdAt).toLocaleString()
        ]);
      });
    });
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `qdc_laundry_report_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) {
      alert('Please enter a customer name.');
      return;
    }
    if (newGarmentList.length === 0) {
      alert('Please add at least one garment to register the order.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('http://localhost:3001/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: newCustomerName.trim(),
          customerPhone: newCustomerPhone.trim(),
          garments: newGarmentList.map(desc => ({ description: desc }))
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to create order');
      }

      // Success!
      setIsModalOpen(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewGarmentDraft('');
      setNewGarmentList([]);
      
      // Hot reload the dashboard
      await fetchDashboardData();
      
      // Show elegant toast
      setToastMessage('✨ Order registered successfully and live synchronized!');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to connect to the server');
    } finally {
      setSubmitting(false);
    }
  };

  // Status mapping for header stats cards
  const totalGarments = Object.values(summary).reduce((a, b) => a + b, 0);

  return (
    <div 
      className="qdc-layout"
      style={{
        width: '100%',
        boxSizing: 'border-box',
        fontFamily: '"Outfit", -apple-system, BlinkMacSystemFont, sans-serif',
        color: '#1e293b',
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 40%, #f8fafc 80%, #ffffff 100%)',
        minHeight: '100vh',
        margin: 0,
      }}
    >
      {/* Decorative clean water bubbles in light theme */}
      <div style={{
        position: 'fixed',
        top: '-5%',
        left: '-5%',
        width: '350px',
        height: '350px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.04) 0%, rgba(255,255,255,0) 70%)',
        zIndex: 0,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed',
        bottom: '-5%',
        right: '-5%',
        width: '450px',
        height: '450px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(56, 189, 248, 0.05) 0%, rgba(255,255,255,0) 70%)',
        zIndex: 0,
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
        
        {/* Separate Premium Header Bar Card */}
        <header 
          className="qdc-header-bar" 
          style={{
            marginBottom: '2.5rem',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div className="qdc-header-flex" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', flex: '1 1 auto' }}>
              {/* High-Resolution Logo Icon */}
              <img 
                src="/qdc_logo.png" 
                alt="QDC FreshFlow Logo" 
                className="qdc-header-logo"
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '14px',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.1)',
                  border: '1px solid rgba(37, 99, 235, 0.15)',
                  backgroundColor: '#ffffff',
                  transition: 'all 0.2s',
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <h1 className="qdc-header-title" style={{
                    fontSize: '2.5rem',
                    fontWeight: 800,
                    margin: 0,
                    letterSpacing: '-0.03em',
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}>
                    QDC FreshFlow
                  </h1>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    backgroundColor: 'rgba(37, 99, 235, 0.08)',
                    color: '#2563eb',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    border: '1px solid rgba(37, 99, 235, 0.15)',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.05)',
                  }}>
                    ● LIVE PORTAL
                  </span>
                </div>
                <p className="qdc-header-subtitle" style={{ fontSize: '1.05rem', color: '#475569', marginTop: '0.25rem', margin: 0, fontWeight: 500 }}>
                  Production-level dry-cleaning management board. Track sorting, washing, pressing, and deliveries edge-to-edge.
                </p>
              </div>
            </div>
            {/* "➕ New Order" Action Button */}
            <button
              onClick={() => setIsModalOpen(true)}
              style={{
                padding: '0.85rem 1.75rem',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.95rem',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(37, 99, 235, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(37, 99, 235, 0.25)';
              }}
            >
              <span>➕ New Order</span>
            </button>
          </div>
        </header>

        {/* Metrics Grid Bar */}
        <section 
          className="qdc-metrics-grid" 
          style={{
            display: 'grid',
            gap: '1.5rem',
            marginBottom: '2.5rem',
            width: '100%',
          }}
        >
          {/* Card 1: Total Active */}
          <div className="qdc-metric-card" style={{
            backgroundColor: '#ffffff',
            border: '1px solid rgba(59, 130, 246, 0.1)',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 4px 20px rgba(59, 130, 246, 0.04)',
          }}>
            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              🧺 Total Active
            </div>
            <div className="qdc-metric-value" style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: '0.5rem', color: '#1e3a8a' }}>
              {totalGarments}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>Garments in system</div>
          </div>

          {/* Card 2: Received */}
          <div className="qdc-metric-card" style={{
            backgroundColor: '#ffffff',
            border: '1px solid rgba(59, 130, 246, 0.1)',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 4px 20px rgba(59, 130, 246, 0.04)',
          }}>
            <div style={{ fontSize: '0.85rem', color: '#2563eb', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              🔵 Received
            </div>
            <div className="qdc-metric-value" style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: '0.5rem', color: '#2563eb' }}>
              {summary.received || 0}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>Awaiting cleaning</div>
          </div>

          {/* Card 3: In Cleaning */}
          <div className="qdc-metric-card" style={{
            backgroundColor: '#ffffff',
            border: '1px solid rgba(245, 158, 11, 0.15)',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 4px 20px rgba(245, 158, 11, 0.04)',
          }}>
            <div style={{ fontSize: '0.85rem', color: '#d97706', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              🟡 In Cleaning
            </div>
            <div className="qdc-metric-value" style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: '0.5rem', color: '#d97706' }}>
              {summary.in_cleaning || 0}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>Active wash/dry cycle</div>
          </div>

          {/* Card 4: Ready for Pickup */}
          <div className="qdc-metric-card" style={{
            backgroundColor: '#ffffff',
            border: '1px solid rgba(16, 185, 129, 0.15)',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 4px 20px rgba(16, 185, 129, 0.04)',
          }}>
            <div style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              🟢 Ready for Pickup
            </div>
            <div className="qdc-metric-value" style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: '0.5rem', color: '#059669' }}>
              {summary.ready || 0}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>Cleaned and bagged</div>
          </div>
        </section>

        {/* Search & Filter Controls Board */}
        <section style={{
          backgroundColor: '#ffffff',
          border: '1px solid rgba(59, 130, 246, 0.1)',
          borderRadius: '20px',
          padding: '1.5rem',
          boxShadow: '0 10px 30px rgba(59, 130, 246, 0.04)',
          marginBottom: '2.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          width: '100%',
          boxSizing: 'border-box',
        }}>
          {/* Top row: search input + view switcher + export button */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', width: '100%' }}>
            {/* Search Input Box */}
            <div style={{ flex: '1 1 300px', position: 'relative' }}>
              <input
                type="text"
                placeholder="🔍 Search active orders by Customer Name or Order ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '0.85rem 1.25rem',
                  borderRadius: '12px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#0f172a',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  outline: 'none',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.backgroundColor = '#ffffff';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.12)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.backgroundColor = '#f8fafc';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* View Switcher + Export Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Segmented View Mode Toggle */}
              <div style={{
                display: 'flex',
                backgroundColor: '#f1f5f9',
                padding: '4px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
              }}>
                <button
                  onClick={() => setViewMode('board')}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: viewMode === 'board' ? '#ffffff' : 'transparent',
                    color: viewMode === 'board' ? '#1e3a8a' : '#64748b',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    boxShadow: viewMode === 'board' ? '0 2px 6px rgba(0, 0, 0, 0.05)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  📋 Board
                </button>
                <button
                  onClick={() => setViewMode('spreadsheet')}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: viewMode === 'spreadsheet' ? '#ffffff' : 'transparent',
                    color: viewMode === 'spreadsheet' ? '#1e3a8a' : '#64748b',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    boxShadow: viewMode === 'spreadsheet' ? '0 2px 6px rgba(0, 0, 0, 0.05)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  📊 Excel Grid
                </button>
              </div>

              {/* Export to Excel Button */}
              <button
                onClick={handleExportToExcel}
                style={{
                  padding: '0.6rem 1.1rem',
                  borderRadius: '10px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  boxShadow: '0 2px 5px rgba(0, 0, 0, 0.03)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#eff6ff';
                  e.currentTarget.style.borderColor = '#93c5fd';
                  e.currentTarget.style.color = '#2563eb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.color = '#475569';
                }}
              >
                📥 Export Excel
              </button>
            </div>
          </div>

          {/* Bottom row: Segmented Tabs */}
          <div 
            className="qdc-tabs-container"
            style={{
              gap: '0.5rem',
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '0.25rem',
              width: '100%',
            }}
          >
            {[
              { id: 'all', label: '📁 All garments', count: totalGarments, activeBg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', activeText: '#ffffff' },
              { id: 'received', label: '🔵 Received', count: summary.received || 0, activeBg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', activeText: '#ffffff' },
              { id: 'in_cleaning', label: '🟡 In Cleaning', count: summary.in_cleaning || 0, activeBg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', activeText: '#ffffff' },
              { id: 'ready', label: '🟢 Ready', count: summary.ready || 0, activeBg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', activeText: '#ffffff' },
              { id: 'delivered', label: '⚪ Delivered', count: summary.delivered || 0, activeBg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', activeText: '#ffffff' },
            ].map((tab) => {
              const isActive = selectedStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedStatus(tab.id as FilterStatus)}
                  className="qdc-tab-button"
                  style={{
                    padding: '0.75rem 1.25rem',
                    borderRadius: '10px',
                    border: '1px solid transparent',
                    background: isActive ? tab.activeBg : 'transparent',
                    color: isActive ? tab.activeText : '#64748b',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s',
                    boxShadow: isActive ? '0 4px 12px rgba(59, 130, 246, 0.15)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = '#2563eb';
                      e.currentTarget.style.background = 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)';
                      e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.15)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.08)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = '#64748b';
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = 'transparent';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  <span>{tab.label}</span>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '20px',
                    backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : '#e2e8f0',
                    color: isActive ? '#ffffff' : '#64748b',
                    transition: 'all 0.2s',
                  }}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {loading && (
          <div style={{ textAlign: 'center', padding: '5rem' }}>
            <p style={{ color: '#2563eb', fontWeight: 600, fontSize: '1.2rem', letterSpacing: '0.05em' }}>
              🔄 Fetching active laundry database...
            </p>
          </div>
        )}
        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fee2e2',
            borderRadius: '12px',
            padding: '1.25rem 2rem',
            color: '#b91c1c',
            fontWeight: 500,
            marginBottom: '2rem',
            width: '100%',
            boxSizing: 'border-box',
          }}>
            ⚠️ System Exception: {error}
          </div>
        )}

        {!loading && !error && (
          <OrdersList 
            orders={orders} 
            selectedStatus={selectedStatus} 
            searchQuery={searchQuery}
            onCycleGarmentStatus={handleCycleGarmentStatus}
            viewMode={viewMode}
          />
        )}
      </div>

      {/* Toast Notification Pop-up */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '2rem',
          right: '2rem',
          backgroundColor: '#ffffff',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '16px',
          padding: '1.15rem 1.85rem',
          boxShadow: '0 10px 30px rgba(16, 185, 129, 0.15)',
          color: '#065f46',
          fontWeight: 600,
          fontSize: '0.95rem',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          animation: 'slideIn 0.3s ease-out forwards',
        }}>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Interactive New Order Modal Form Overlay */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.35)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          boxSizing: 'border-box',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
            border: '1px solid rgba(59, 130, 246, 0.15)',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '540px',
            boxShadow: '0 25px 60px rgba(15, 23, 42, 0.15)',
            padding: '2.25rem',
            boxSizing: 'border-box',
            animation: 'scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}>
            {/* Header block */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
              <div>
                <h2 style={{
                  fontSize: '1.65rem',
                  fontWeight: 800,
                  margin: 0,
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  🧺 Register New Order
                </h2>
                <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0.25rem 0 0 0', fontWeight: 500 }}>
                  Enter customer details and assign dry-cleaning items.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setNewCustomerName('');
                  setNewGarmentDraft('');
                  setNewGarmentList([]);
                }}
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#94a3b8',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  padding: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#475569'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
              >
                ✕
              </button>
            </div>

            {/* Form fields */}
            <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Customer Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  👤 Customer Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Charlie Brown"
                  required
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  style={{
                    padding: '0.85rem 1.1rem',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    color: '#0f172a',
                    outline: 'none',
                    transition: 'all 0.2s',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.12)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#cbd5e1';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Customer Phone */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  📞 Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +1 (555) 019-2834"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  style={{
                    padding: '0.85rem 1.1rem',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    color: '#0f172a',
                    outline: 'none',
                    transition: 'all 0.2s',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.12)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#cbd5e1';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Garment draft input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  👗 Add Garments to Order
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="e.g. Silk Shirt, Wool Blazer..."
                    value={newGarmentDraft}
                    onChange={(e) => setNewGarmentDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newGarmentDraft.trim()) {
                          setNewGarmentList([...newGarmentList, newGarmentDraft.trim()]);
                          setNewGarmentDraft('');
                        }
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '0.85rem 1.1rem',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      fontSize: '0.95rem',
                      fontWeight: 500,
                      color: '#0f172a',
                      outline: 'none',
                      transition: 'all 0.2s',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.12)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#cbd5e1';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newGarmentDraft.trim()) {
                        setNewGarmentList([...newGarmentList, newGarmentDraft.trim()]);
                        setNewGarmentDraft('');
                      }
                    }}
                    style={{
                      padding: '0 1.25rem',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#dbeafe';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#eff6ff';
                    }}
                  >
                    ➕ Add
                  </button>
                </div>
              </div>

              {/* Drafted items box */}
              <div style={{
                minHeight: '100px',
                maxHeight: '160px',
                overflowY: 'auto',
                padding: '1rem',
                backgroundColor: '#ffffff',
                border: '1px dashed #cbd5e1',
                borderRadius: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem',
              }}>
                {newGarmentList.length === 0 ? (
                  <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 500, margin: 0, textAlign: 'center' }}>
                      📋 No garments added yet. Enter items above.
                    </p>
                  </div>
                ) : (
                  newGarmentList.map((g, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: '#f0f9ff',
                        border: '1px solid #bae6fd',
                        borderRadius: '8px',
                        padding: '0.5rem 0.75rem',
                      }}
                    >
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0369a1' }}>
                        👕 {g}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...newGarmentList];
                          updated.splice(idx, 1);
                          setNewGarmentList(updated);
                        }}
                        style={{
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          padding: '2px 6px',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Modal footer actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setNewCustomerName('');
                    setNewGarmentDraft('');
                    setNewGarmentList([]);
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !newCustomerName.trim() || newGarmentList.length === 0}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: (submitting || !newCustomerName.trim() || newGarmentList.length === 0) ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    opacity: (submitting || !newCustomerName.trim() || newGarmentList.length === 0) ? 0.6 : 1,
                    transition: 'all 0.15s ease',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.18)',
                  }}
                >
                  {submitting ? 'Creating...' : 'Create Order ➔'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
