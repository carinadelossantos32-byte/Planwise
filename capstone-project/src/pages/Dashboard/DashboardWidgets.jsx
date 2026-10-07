import { useEffect } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, RefreshCw } from 'lucide-react';
import PageHeader from '../../components/PageHeader/PageHeader';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const MALOLOS_CENTER = [14.8527, 120.8160];

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

// Leaflet only re-measures on window resize; the map box also changes size when the panel beside it grows
const MapAutoResize = () => {
  const map = useMap();

  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);

  return null;
};

export const RegionalOverviewPanel = ({ clients, subtitle }) => (
  <Panel
    title="Regional Overview"
    subtitle={subtitle}
    action={<PanelLink to="/gis-map">Open GIS Map</PanelLink>}
  >
    <div className="dash-map">
      <MapContainer
        center={MALOLOS_CENTER}
        zoom={12}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <MapAutoResize />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {clients
          .filter(c => c.latitude && c.longitude)
          .map((client, idx) => (
            <CircleMarker
              key={idx}
              center={[Number(client.latitude), Number(client.longitude)]}
              radius={6}
              pathOptions={{
                color: '#091F7A',
                fillColor: '#E0563D',
                fillOpacity: 0.85,
                weight: 2
              }}
            >
              <Popup>
                <div style={{ fontSize: '12px' }}>
                  <strong>{client.name || 'Client'}</strong><br />
                  {client.barangay || 'Malolos'}<br />
                  <span>Method: {client.fp_method || 'N/A'}</span>
                </div>
              </Popup>
            </CircleMarker>
          ))}
      </MapContainer>
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
