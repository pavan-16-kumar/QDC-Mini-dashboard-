import React from 'react';
import type { Order, FilterStatus } from './App';

interface Props {
  orders: Order[];
  selectedStatus: FilterStatus;
  searchQuery: string;
  onCycleGarmentStatus: (orderId: string, garmentId: string, currentStatus: string) => void;
  viewMode: 'board' | 'spreadsheet';
}

const statusThemes: Record<string, { bg: string; text: string; label: string; border: string }> = {
  received: { 
    bg: '#eff6ff', 
    text: '#2563eb', 
    label: '📥 Received', 
    border: '#bfdbfe'
  },
  in_cleaning: { 
    bg: '#fffbeb', 
    text: '#d97706', 
    label: '🫧 Cleaning', 
    border: '#fde68a'
  },
  ready: { 
    bg: '#ecfdf5', 
    text: '#059669', 
    label: '✨ Ready', 
    border: '#a7f3d0'
  },
  delivered: { 
    bg: '#f1f5f9', 
    text: '#475569', 
    label: '🚚 Delivered', 
    border: '#cbd5e1'
  },
};

const nextActionLabels: Record<string, string> = {
  received: '📥 Start Cleaning',
  in_cleaning: '🫧 Mark Ready',
  ready: '✨ Deliver Order',
  delivered: '🚚 Reset Cycle',
};

export const OrdersList: React.FC<Props> = ({ orders, selectedStatus, searchQuery, onCycleGarmentStatus, viewMode }) => {
  // Helper to extract customer initials for beautiful avatars
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Perform search and status filtering simultaneously
  const filteredOrders = orders
    .filter((order) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        order.id.toLowerCase().includes(query) ||
        order.customerName.toLowerCase().includes(query)
      );
    })
    .map((order) => ({
      ...order,
      garments: selectedStatus === 'all'
        ? order.garments
        : order.garments.filter((g) => g.status === selectedStatus),
    }))
    .filter((order) => order.garments.length > 0);

  if (filteredOrders.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '5rem 2rem',
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        border: '1px solid rgba(59, 130, 246, 0.1)',
        boxShadow: '0 10px 30px rgba(59, 130, 246, 0.04)',
        width: '100%',
        boxSizing: 'border-box',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1.25rem' }}>🧼</div>
        <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1e3a8a', margin: '0 0 0.5rem 0' }}>
          No Matching Records Found
        </h3>
        <p style={{ color: '#64748b', fontSize: '1rem', margin: 0, maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
          {searchQuery
            ? `We couldn't find any orders matching "${searchQuery}" for the selected filter.`
            : 'No active orders currently match this laundry processing status.'}
        </p>
      </div>
    );
  }

  // --- 1. Excel Spreadsheet Grid View ---
  if (viewMode === 'spreadsheet') {
    // Flatten garments to a linear rows array for simple Excel-like presentation
    const tableRows: {
      orderId: string;
      customerName: string;
      customerPhone?: string;
      garmentId: string;
      description: string;
      status: string;
      createdAt: string;
    }[] = [];

    filteredOrders.forEach(order => {
      order.garments.forEach(g => {
        tableRows.push({
          orderId: order.id,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          garmentId: g.id,
          description: g.description,
          status: g.status,
          createdAt: order.createdAt
        });
      });
    });

    return (
      <div style={{
        width: '100%',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        boxShadow: '0 10px 30px rgba(59, 130, 246, 0.03)',
        overflowX: 'auto', // Scrollable horizontally on small mobiles
        boxSizing: 'border-box',
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          textAlign: 'left',
          fontSize: '0.9rem',
          color: '#334155',
          minWidth: '700px', // Restricts squishing on mobile screens
        }}>
          {/* Header Row */}
          <thead>
            <tr style={{
              background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
              borderBottom: '2px solid #cbd5e1',
            }}>
              <th style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#1e3a8a' }}>Order ID</th>
              <th style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#1e3a8a' }}>Customer Name</th>
              <th style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#1e3a8a' }}>Phone Number</th>
              <th style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#1e3a8a' }}>Garment ID</th>
              <th style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#1e3a8a' }}>Description</th>
              <th style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#1e3a8a' }}>Process Status</th>
              <th style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#1e3a8a' }}>Date Dropped</th>
            </tr>
          </thead>
          {/* Body Rows */}
          <tbody>
            {tableRows.map((row, index) => {
              const theme = statusThemes[row.status] || { 
                bg: '#f1f5f9', 
                text: '#475569', 
                label: row.status, 
                border: '#cbd5e1'
              };
              return (
                <tr 
                  key={`${row.orderId}-${row.garmentId}-${index}`}
                  style={{
                    backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#eff6ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';
                  }}
                >
                  {/* Order ID */}
                  <td style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: '#2563eb' }}>
                    {row.orderId}
                  </td>
                  {/* Customer */}
                  <td style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>
                    {row.customerName}
                  </td>
                  {/* Phone Number */}
                  <td style={{ padding: '0.85rem 1.25rem', color: '#475569', fontWeight: 500 }}>
                    {row.customerPhone || '—'}
                  </td>
                  {/* Garment ID */}
                  <td style={{ padding: '0.85rem 1.25rem', color: '#64748b' }}>
                    {row.garmentId}
                  </td>
                  {/* Description */}
                  <td style={{ padding: '0.85rem 1.25rem', fontWeight: 500 }}>
                    {row.description}
                  </td>
                  {/* Status Badge & Next Action Button */}
                  <td style={{ padding: '0.85rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {/* Current Status Badge (static, highly visual) */}
                      <span style={{
                        border: `1px solid ${theme.border}`,
                        borderRadius: '20px',
                        backgroundColor: theme.bg,
                        color: theme.text,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '4px 10px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        whiteSpace: 'nowrap',
                      }}>
                        {theme.label}
                      </span>
                      
                      <span style={{ color: '#94a3b8', fontWeight: 600 }}>➔</span>

                      {/* Next Step Action Button */}
                      <button
                        onClick={() => onCycleGarmentStatus(row.orderId, row.garmentId, row.status)}
                        title={`Click to transition garment status to the next step`}
                        style={{
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          backgroundColor: '#ffffff',
                          color: '#475569',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '4px 10px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          transition: 'all 0.15s ease',
                          whiteSpace: 'nowrap',
                          outline: 'none',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#eff6ff';
                          e.currentTarget.style.borderColor = '#3b82f6';
                          e.currentTarget.style.color = '#2563eb';
                          e.currentTarget.style.transform = 'translateX(2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.borderColor = '#cbd5e1';
                          e.currentTarget.style.color = '#475569';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }}
                      >
                        {nextActionLabels[row.status] || row.status}
                      </button>
                    </div>
                  </td>
                  {/* Date Dropped */}
                  <td style={{ padding: '0.85rem 1.25rem', fontSize: '0.8rem', color: '#64748b' }}>
                    {new Date(row.createdAt).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // --- 2. Classic Card Grid Board View ---
  return (
    <div 
      className="qdc-orders-grid"
      style={{
        display: 'grid',
        gap: '1.75rem',
        width: '100%',
      }}
    >
      {filteredOrders.map((order) => (
        <div
          key={order.id}
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid rgba(59, 130, 246, 0.08)',
            borderRadius: '20px',
            padding: '1.75rem',
            boxShadow: '0 10px 25px rgba(59, 130, 246, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.borderColor = 'rgba(37, 99, 235, 0.2)';
            e.currentTarget.style.boxShadow = '0 15px 30px rgba(37, 99, 235, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.08)';
            e.currentTarget.style.boxShadow = '0 10px 25px rgba(59, 130, 246, 0.03)';
          }}
        >
          <div>
            {/* Header Block */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem' }}>
              {/* Initials Avatar */}
              <div style={{
                width: '45px',
                height: '45px',
                borderRadius: '50%',
                backgroundColor: '#eff6ff',
                border: '1px solid rgba(37, 99, 235, 0.15)',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                fontWeight: 800,
              }}>
                {getInitials(order.customerName)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e3a8a' }}>
                    {order.customerName}
                  </span>
                  <span style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.06)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(37, 99, 235, 0.12)',
                  }}>
                    {order.id}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  📅 Dropped: {new Date(order.createdAt).toLocaleString()}
                </div>
                {order.customerPhone && (
                  <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>📞</span> {order.customerPhone}
                  </div>
                )}
              </div>
            </div>

            {/* Segment Divider */}
            <div style={{ height: '1px', backgroundColor: 'rgba(59, 130, 246, 0.08)', marginBottom: '1.25rem' }} />

            {/* Garments Sublist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {order.garments.map((g) => {
                const theme = statusThemes[g.status] || { 
                  bg: '#f1f5f9', 
                  text: '#475569', 
                  label: g.status, 
                  border: '#cbd5e1'
                };
                return (
                  <div
                    key={g.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.85rem 1.1rem',
                      backgroundColor: '#f8fafc',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f1f5f9';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }}
                  >
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>
                      {g.description}
                    </span>
                    
                    {/* Interactive Action Status Badge & Next Action */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {/* Current Status Badge (static, highly visual) */}
                      <span style={{
                        border: `1px solid ${theme.border}`,
                        borderRadius: '20px',
                        backgroundColor: theme.bg,
                        color: theme.text,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '4px 8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        whiteSpace: 'nowrap',
                      }}>
                        {theme.label}
                      </span>
                      
                      <span style={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.8rem' }}>➔</span>

                      {/* Next Step Action Button */}
                      <button
                        onClick={() => onCycleGarmentStatus(order.id, g.id, g.status)}
                        title={`Click to transition garment status to the next step`}
                        style={{
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          backgroundColor: '#ffffff',
                          color: '#475569',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '4px 8px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          transition: 'all 0.15s ease',
                          whiteSpace: 'nowrap',
                          outline: 'none',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#eff6ff';
                          e.currentTarget.style.borderColor = '#3b82f6';
                          e.currentTarget.style.color = '#2563eb';
                          e.currentTarget.style.transform = 'translateX(2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.borderColor = '#cbd5e1';
                          e.currentTarget.style.color = '#475569';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }}
                      >
                        {nextActionLabels[g.status] || g.status}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
