import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import './dashboard.css'; 
import { db } from '../../firebase-config';
import { collection, onSnapshot } from 'firebase/firestore';
import { RefreshCw } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const MALOLOS_BARANGAYS = [
  "Anilao", "Atlag", "Babatnin", "Bagna", "Bagong Bayan", "Balayong", "Balite", 
  "Bangkal", "Barihan", "Bulihan", "Bungahan", "Caingin", "Calero", "Caliligawan", 
  "Canalate", "Caniogan", "Catmon", "Cofradia", "Dakila", "Guinhawa", "Liang", 
  "Ligas", "Longos", "Look 1st", "Look 2nd", "Lugam", "Mabolo", "Mambog", 
  "Masile", "Matimbo", "Mojon", "Namayan", "Niugan", "Pamarawan", "Panasahan", 
  "Pinagbakahan", "San Agustin", "San Gabriel", "San Juan", "San Pablo", 
  "San Vicente", "Santiago", "Santisima Trinidad", "Santor", "Santo Cristo", 
  "Santo Niño", "Santo Rosario", "Sumapang Bata", "Sumapang Matanda", "Taal"
];

const MALOLOS_CENTER = [14.8527, 120.8160];

const METHOD_CONFIG = [
  { name: "Injectable (DMPA)", matchKeys: ["dmpa", "injectable", "injectables"], color: "var(--primary)" },
  { name: "Pills (Combined/POP)", matchKeys: ["pill", "pills", "pop", "coc"], color: "#4B3FD1" },
  { name: "Subdermal Implant", matchKeys: ["implant", "implants", "subdermal"], color: "var(--mint)" },
  { name: "IUD (Interval/Postpartum)", matchKeys: ["iud", "iud-interval", "iud-postpartum", "ppiud"], color: "#8B5CF6" },
  { name: "Condoms", matchKeys: ["condom", "condoms"], color: "var(--amber)" },
  { name: "BTL / NSV (Permanent)", matchKeys: ["btl", "nsv", "fstr/btl", "mstr/nsv", "tubal", "vasectomy"], color: "#2563EB" },
  { name: "Natural FP (NFP)", matchKeys: ["nfp", "lam", "sdm", "stm", "bbt", "ccm"], color: "#06B6D4" }
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allRawClients, setAllRawClients] = useState([]);

  const [metricsData, setMetricsData] = useState({
    totalFamilies: 0,
    registeredClients: 0,
    newClients: 0,
    activeFpUsers: 0,
    totalContraceptives: 0,
    totalBarangays: 0
  });

  const [geoChartData, setGeoChartData] = useState([]);
  const [methodDistribution, setMethodDistribution] = useState([]);

  const fetchAndProcessData = () => {
    let publicDocs = [], privateDocs = [], referredDocs = [];

    const processAllClients = () => {
      const allClients = [...publicDocs, ...privateDocs, ...referredDocs];
      setAllRawClients(allClients);

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      let activeUsersCount = 0;
      let newClientsCount = 0;
      let contraceptiveCount = 0;

      const rawMethodCounts = {};
      const barangayCounts = {};

      allClients.forEach(client => {
        const clientStatus = (client.status || "").toLowerCase();
        const clientType = (client.type || "").toLowerCase();

        let createdDate = null;
        if (client.created_at) {
          createdDate = client.created_at.toDate ? client.created_at.toDate() : new Date(client.created_at);
        }

        const isCurrentMonth = createdDate && createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear;

        if (!clientStatus.includes("drop") && !clientStatus.includes("discontinue")) {
          activeUsersCount++;
          if (isCurrentMonth || clientType.includes("new")) {
            newClientsCount++;
          }
        }

        const method = (client.fp_method || client.FP_method || client.method || "").trim();
        if (method) {
          rawMethodCounts[method] = (rawMethodCounts[method] || 0) + 1;
          contraceptiveCount++;
        }

        const rawLocation = (client.barangay || client.address || "").trim();
        if (rawLocation) {
          const matched = MALOLOS_BARANGAYS.find(b => rawLocation.toLowerCase().includes(b.toLowerCase()));
          if (matched) barangayCounts[matched] = (barangayCounts[matched] || 0) + 1;
        }
      });

      const sortedBrgyList = Object.entries(barangayCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);
      setGeoChartData(sortedBrgyList);

      let otherMethodsCount = 0;
      const totalMethodUsers = Object.values(rawMethodCounts).reduce((a, b) => a + b, 0) || 1;

      const matchedDistribution = METHOD_CONFIG.map(cfg => {
        let count = 0;
        Object.entries(rawMethodCounts).forEach(([rawKey, val]) => {
          const lowerKey = rawKey.toLowerCase();
          if (cfg.matchKeys.some(mk => lowerKey.includes(mk))) {
            count += val;
          }
        });
        const sharePct = ((count / totalMethodUsers) * 100).toFixed(1);
        return {
          name: cfg.name,
          count: count.toLocaleString(),
          rawCount: count,
          share: `${sharePct}%`,
          barWidth: `${sharePct}%`,
          color: cfg.color
        };
      });

      const totalMappedCount = matchedDistribution.reduce((sum, item) => sum + item.rawCount, 0);
      otherMethodsCount = Math.max(0, contraceptiveCount - totalMappedCount);

      if (otherMethodsCount > 0) {
        const sharePct = ((otherMethodsCount / totalMethodUsers) * 100).toFixed(1);
        matchedDistribution.push({
          name: "Other Methods",
          count: otherMethodsCount.toLocaleString(),
          rawCount: otherMethodsCount,
          share: `${sharePct}%`,
          barWidth: `${sharePct}%`,
          color: "var(--ink-soft)"
        });
      }

      setMethodDistribution(matchedDistribution);

      setMetricsData({
        totalFamilies: Math.round(allClients.length * 0.85),
        registeredClients: allClients.length,
        newClients: newClientsCount,
        activeFpUsers: activeUsersCount,
        totalContraceptives: contraceptiveCount,
        totalBarangays: Object.keys(barangayCounts).length
      });

      setLoading(false);
    };

    const unPublic = onSnapshot(collection(db, "clients_public"), (snap) => {
      publicDocs = snap.docs.map(d => d.data()).filter(d => d.is_archived !== true && d.is_archived !== "true");
      processAllClients();
    }, (err) => console.error("CPD unPublic listener error:", err));

    const unPrivate = onSnapshot(collection(db, "clients_private"), (snap) => {
      privateDocs = snap.docs.map(d => d.data()).filter(d => d.is_archived !== true && d.is_archived !== "true");
      processAllClients();
    }, (err) => console.error("CPD unPrivate listener error:", err));

    const unReferred = onSnapshot(collection(db, "clients_referred"), (snap) => {
      referredDocs = snap.docs.map(d => d.data()).filter(d => d.is_archived !== true && d.is_archived !== "true");
      processAllClients();
    }, (err) => console.error("CPD unReferred listener error:", err));

    return () => { unPublic(); unPrivate(); unReferred(); };
  };

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchAndProcessData();
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  };

  useEffect(() => {
    const unsub = fetchAndProcessData();
    return () => unsub();
  }, []);

  const topCards = [
    { label: "Total Families", value: metricsData.totalFamilies, cardId: "overall-stocks-card" },
    { label: "Registered Clients", value: metricsData.registeredClients, cardId: "overall-population-card" },
    { label: "New Clients", value: metricsData.newClients, cardId: "overall-rhu-card" },
    { label: "Active FP Users", value: metricsData.activeFpUsers, cardId: "overall-stocks-card" },
    { label: "Total Contraceptives", value: metricsData.totalContraceptives, cardId: "overall-population-card" },
    { label: "Total Barangays", value: metricsData.totalBarangays, cardId: "low-stock-card" }
  ];

  const maxGeoValue = Math.max(...geoChartData.map(g => g.count), 1);

  return (
    <div id="inventory-container">
      <div id="inventory-topbar">
        <div>
          <h1>CPD Dashboard</h1>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--ink-faint)' }}>
            {loading ? "Loading population overview..." : "Population & Demographics Live View"}
          </p>
        </div>

        <button 
          id="refresh-button" 
          onClick={handleManualRefresh}
          disabled={refreshing}
          style={{ cursor: refreshing ? 'wait' : 'pointer' }}
        >
          <RefreshCw size={14} className={refreshing ? "spin-icon" : ""} />
          {refreshing ? "Refreshing..." : "Refresh Data"}
        </button>
      </div>

      <div id="inventory-report-label">
        <h3>POPULATION REPORT</h3>
      </div>

      <div className="cards-container dashboard-metrics-grid">
        {topCards.map((item, idx) => (
          <div className="inventory-header-content" id={item.cardId} key={idx}>
            <h3>{item.label}</h3>
            <h2>{item.value}</h2>
            <p>Malolos City coverage</p>
          </div>
        ))}
      </div>

      <div className="dashboard-charts-section">
        <div className="chart-card">
          <h3 className="chart-title">Geographic Distribution</h3>
          <p className="chart-sub">Client distribution across top Barangays</p>
          
          <div className="geo-bar-wrapper">
            {geoChartData.length > 0 ? (
              geoChartData.map((item, idx) => {
                const heightPct = (item.count / maxGeoValue) * 100;
                return (
                  <div key={idx} className="geo-bar-col">
                    <span className="geo-bar-val">{item.count}</span>
                    <div className="geo-bar-fill" style={{ height: `${heightPct}%` }}></div>
                    <span className="geo-bar-lbl">{item.name}</span>
                  </div>
                );
              })
            ) : (
              <div style={{ width: '100%', textAlign: 'center', color: 'var(--ink-faint)', fontSize: '13px', paddingTop: '80px' }}>
                No geographic data recorded yet.
              </div>
            )}
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Regional Overview</h3>
          <p className="chart-sub">GIS mapping breakdown</p>
          
          <div className="mini-map-container">
            <MapContainer
              center={MALOLOS_CENTER}
              zoom={12}
              scrollWheelZoom={false}
              style={{ height: '240px', width: '100%', borderRadius: '14px' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {allRawClients
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

            <button 
              type="button"
              className="mock-map-tint-btn"
              onClick={() => navigate('/gis-map')}
            >
              GIS Cluster Map View ↗
            </button>
          </div>
        </div>
      </div>

      <div style={{ margin: '15px 30px 0' }}>
        <div className="chart-card">
          <h3 className="chart-title">FP Method Distribution</h3>
          <p className="chart-sub">Breakdown of family planning methods across active clients</p>
          <div className="demographics-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {methodDistribution.map((item, idx) => (
              <div className="demo-row-item" key={idx} style={{ background: 'var(--surface-sunken)', padding: '12px 16px', borderRadius: 'var(--radius-md)' }}>
                <div className="demo-row-text">
                  <span>{item.name}</span>
                  <span style={{ color: item.color, fontWeight: 700 }}>{item.count}</span>
                </div>
                <div className="progress-track-bg" style={{ marginTop: '6px' }}>
                  <div className="progress-fill-bar" style={{ width: item.barWidth, backgroundColor: item.color }}></div>
                </div>
                <span className="demo-share-pct" style={{ marginTop: '4px' }}>{item.share} of total users</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;