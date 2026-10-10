import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, RefreshCw } from 'lucide-react';
import PageHeader from '../../components/PageHeader/PageHeader';
import { AdvancedMarker, AdvancedMarkerAnchorPoint, InfoWindow } from '@vis.gl/react-google-maps';
import GoogleMapShell from '../../components/GoogleMap/GoogleMapShell';

const MALOLOS_CENTER = { lat: 14.8527, lng: 120.8160 };

export const DashboardHeader = ({ title, refreshing, onRefresh }) => (
  <PageHeader title={title}>
    <button type="button" className="page-head-btn" onClick={onRefresh} disabled={refreshing}>
      <RefreshCw size={14} className={refreshing ? "page-head-spin" : ""} />
      {refreshing ? "Refreshing..." : "Refresh Data"}
    </button>
  </PageHeader>
);

// Headline figure that links to the page it comes from
export const KpiCard = ({ label, value, subLabel, to, icon: Icon, tone = "blue" }) => (
  <Link to={to} className={`dash-kpi dash-kpi--${tone}`}>
    <span className="dash-kpi-icon"><Icon size={20} /></span>
    <span className="dash-kpi-label">{label} <ArrowUpRight size={14} /></span>
    <span className="dash-kpi-value">{value}</span>
    <span className="dash-kpi-sub">{subLabel}</span>
  </Link>
);

export const Panel = ({ title, subtitle, action, children }) => (
  <section className="dash-panel">
    <div className="dash-panel-head">
      <div>
        <h2 className="dash-panel-title">{title}</h2>
        {subtitle && <p className="dash-panel-sub">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
);

export const PanelLink = ({ to, children }) => (
  <Link to={to} className="dash-link-btn">
    {children} <ArrowUpRight size={14} />
  </Link>
);

export const GeoDistributionPanel = ({ data, subtitle }) => {
  const maxValue = Math.max(...data.map(g => g.count), 1);

  return (
    <Panel title="Geographic Distribution" subtitle={subtitle}>
      {data.length > 0 ? (
        <div className="dash-bar-list">
          {data.map(item => (
            <div className="dash-bar-row" key={item.name}>
              <span className="dash-bar-label" title={item.name}>{item.name}</span>
              <div className="dash-bar-track">
                <div className="dash-bar-fill" style={{ width: `${(item.count / maxValue) * 100}%` }}></div>
              </div>
              <span className="dash-bar-value">{item.count}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="dash-empty">No geographic data recorded yet.</p>
      )}
    </Panel>
  );
};

// One small dot per client; clicking a dot shows who and where
const ClientDots = ({ clients }) => {
  const [openIndex, setOpenIndex] = useState(null);
  const located = clients.filter(c => c.latitude && c.longitude);
  const open = openIndex !== null ? located[openIndex] : null;

  return (
    <>
      {located.map((client, idx) => (
        <AdvancedMarker
          key={idx}
          position={{ lat: Number(client.latitude), lng: Number(client.longitude) }}
          anchorPoint={AdvancedMarkerAnchorPoint.CENTER}
          onClick={() => setOpenIndex(idx)}
        >
          <span style={{
            display: 'block',
            width: '20px',
            height: '20px',
            boxSizing: 'border-box',
            borderRadius: '50%',
            background: '#E0563D',
            border: '3px solid #ffffff',
            boxShadow: '0 0 0 2px #0f172a, 0 0 0 5px rgba(255, 255, 255, 0.9), 0 6px 14px rgba(15, 23, 42, 0.55)',
          }} />
        </AdvancedMarker>
      ))}

      {open && (
        <InfoWindow
          position={{ lat: Number(open.latitude), lng: Number(open.longitude) }}
          pixelOffset={[0, -8]}
          onCloseClick={() => setOpenIndex(null)}
        >
          <div style={{ fontSize: '12px' }}>
            <strong>{open.name || 'Client'}</strong><br />
            {open.barangay || 'Malolos'}<br />
            <span>Method: {open.fp_method || 'N/A'}</span>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

export const RegionalOverviewPanel = ({ clients, subtitle }) => (
  <Panel
    title="Regional Overview"
    subtitle={subtitle}
    action={<PanelLink to="/gis-map">Open GIS Map</PanelLink>}
  >
    <div className="dash-map">
      <div style={{ position: 'absolute', inset: 0 }}>
        <GoogleMapShell defaultCenter={MALOLOS_CENTER} defaultZoom={12} zoomControl faded gestureHandling="cooperative">
          <ClientDots clients={clients} />
        </GoogleMapShell>
      </div>
    </div>
  </Panel>
);

export const MethodCard = ({ name, count, share, color }) => (
  <div className="dash-method">
    <div className="dash-method-top">
      <span className="dash-method-dot" style={{ backgroundColor: color }}></span>
      <span className="dash-method-name" title={name}>{name}</span>
      <span className="dash-method-share">{share}</span>
    </div>
    <span className="dash-method-count">{count}</span>
    <div className="dash-method-track">
      <div className="dash-method-fill" style={{ width: share, backgroundColor: color }}></div>
    </div>
  </div>
);
