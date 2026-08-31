import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import './dashboard.css'; 
import { db } from '../../firebase-config';
import { collection, onSnapshot } from 'firebase/firestore';
import { RefreshCw, FileSpreadsheet } from 'lucide-react';
import ExcelJS from 'exceljs';
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

const HealthDashboard = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [allRawClients, setAllRawClients] = useState([]);
  const [activeDataSource, setActiveDataSource] = useState("Live Database");

  const [metricsData, setMetricsData] = useState({
    currentUsersPrevMonth: 0,
    newAcceptorsPrevMonth: 0,
    otherAcceptors: 0,
    dropOuts: 0,
    currentUsersCurrentMonth: 0,
    newAcceptorsCurrentMonth: 0,
  });

  const [geoChartData, setGeoChartData] = useState([]);

  const [methodMix, setMethodMix] = useState([
    { name: "FSTR/BTL", keys: ["FSTR/BTL", "BTL", "Tubal Ligation"], count: 0, percentage: "0%", color: "var(--primary)" },
    { name: "MSTR/NSV", keys: ["MSTR/NSV", "NSV", "Vasectomy"], count: 0, percentage: "0%", color: "#4B3FD1" },
    { name: "Implant", keys: ["Implant", "Implants", "Subdermal Implant"], count: 0, percentage: "0%", color: "var(--mint)" },
    { name: "IUD-INTERVAL", keys: ["IUD-INTERVAL", "IUD", "IUD-TCu380A"], count: 0, percentage: "0%", color: "#8B5CF6" },
    { name: "Condoms", keys: ["Condom", "Condoms"], count: 0, percentage: "0%", color: "var(--amber)" },
    { name: "IUD-POSTPARTUM", keys: ["IUD-POSTPARTUM", "PPIUD"], count: 0, percentage: "0%", color: "#2563EB" },
    { name: "Pills (POP/COC)", keys: ["PILLS-POP", "PILLS-COC", "Pills"], count: 0, percentage: "0%", color: "#06B6D4" },
    { name: "Injectables", keys: ["INJECTABLES", "DMPA"], count: 0, percentage: "0%", color: "#F59E0B" }
  ]);

  const [demographics, setDemographics] = useState([
    { age: "10-14 years", total: 0, share: "0%", barWidth: "0%", color: "#6366F1" },
    { age: "15-19 years", total: 0, share: "0%", barWidth: "0%", color: "var(--primary)" },
    { age: "20-49 years", total: 0, share: "0%", barWidth: "0%", color: "#2563EB" }
  ]);

  const calculateAge = (birthdateStr) => {
    if (!birthdateStr) return null;
    const birthDate = new Date(birthdateStr);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const fetchAndProcessData = () => {
    let publicDocs = [], privateDocs = [], referredDocs = [];

    const processAllClients = () => {
      const allClients = [...publicDocs, ...privateDocs, ...referredDocs];
      setAllRawClients(allClients);

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      let prevMonthUserCount = 0;
      let prevMonthNewCount = 0;
      let otherCount = 0;
      let dropOutCount = 0;
      let currMonthUserCount = 0;
      let currMonthNewCount = 0;

      const rawMethodCounts = {};
      const barangayCounts = {};
      const ageGroups = { "10-14": 0, "15-19": 0, "20-49": 0 };

      allClients.forEach(client => {
        const clientStatus = (client.status || "").toLowerCase();
        const clientType = (client.type || "").toLowerCase();

        let createdDate = null;
        if (client.created_at) {
          createdDate = client.created_at.toDate ? client.created_at.toDate() : new Date(client.created_at);
        }

        const isCurrentMonth = createdDate && createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear;
        const isPrevMonth = createdDate && (
          (currentMonth === 0 ? createdDate.getMonth() === 11 && createdDate.getFullYear() === currentYear - 1 : createdDate.getMonth() === currentMonth - 1 && createdDate.getFullYear() === currentYear)
        );

        if (clientStatus.includes("drop") || clientStatus.includes("discontinue")) {
          dropOutCount++;
        } else if (clientType.includes("other")) {
          otherCount++;
        } else {
          if (isCurrentMonth) {
            currMonthUserCount++;
            if (clientType.includes("new")) currMonthNewCount++;
          } else if (isPrevMonth) {
            prevMonthUserCount++;
            if (clientType.includes("new")) prevMonthNewCount++;
          } else {
            currMonthUserCount++;
          }
        }

        const method = (client.fp_method || client.FP_method || "").trim();
        if (method) {
          rawMethodCounts[method] = (rawMethodCounts[method] || 0) + 1;
        }

        const rawLocation = (client.barangay || client.address || "").trim();
        if (rawLocation) {
          const matched = MALOLOS_BARANGAYS.find(b => rawLocation.toLowerCase().includes(b.toLowerCase()));
          if (matched) barangayCounts[matched] = (barangayCounts[matched] || 0) + 1;
        }

        const computedAge = calculateAge(client.birthdate_female) || calculateAge(client.birthdate) || (isNaN(Number(client.age)) ? null : Number(client.age));
        if (computedAge) {
          if (computedAge >= 10 && computedAge <= 14) ageGroups["10-14"]++;
          else if (computedAge >= 15 && computedAge <= 19) ageGroups["15-19"]++;
          else if (computedAge >= 20 && computedAge <= 49) ageGroups["20-49"]++;
        }
      });

      const sortedBrgyList = Object.entries(barangayCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 11);
      setGeoChartData(sortedBrgyList);

      const totalActiveMethods = Object.values(rawMethodCounts).reduce((a, b) => a + b, 0) || 1;
      setMethodMix(prevMethods =>
        prevMethods.map(item => {
          let count = 0;
          item.keys.forEach(k => {
            Object.keys(rawMethodCounts).forEach(rawKey => {
              if (rawKey.toLowerCase() === k.toLowerCase()) count += rawMethodCounts[rawKey];
            });
          });
          const percentage = ((count / totalActiveMethods) * 100).toFixed(1) + "%";
          return { ...item, count: count.toLocaleString(), percentage };
        })
      );

      const totalAgesMapped = Object.values(ageGroups).reduce((a, b) => a + b, 0) || 1;
      const demoConfig = [
        { key: "10-14", label: "10-14 years", color: "#6366F1" },
        { key: "15-19", label: "15-19 years", color: "var(--primary)" },
        { key: "20-49", label: "20-49 years", color: "#2563EB" }
      ];

      setDemographics(
        demoConfig.map(cfg => {
          const count = ageGroups[cfg.key] || 0;
          const sharePct = ((count / totalAgesMapped) * 100).toFixed(1);
          return {
            age: cfg.label,
            total: count.toLocaleString(),
            share: `${sharePct}%`,
            barWidth: `${sharePct}%`,
            color: cfg.color
          };
        })
      );

      setMetricsData({
        currentUsersPrevMonth: prevMonthUserCount,
        newAcceptorsPrevMonth: prevMonthNewCount,
        otherAcceptors: otherCount,
        dropOuts: dropOutCount,
        currentUsersCurrentMonth: currMonthUserCount,
        newAcceptorsCurrentMonth: currMonthNewCount
      });

      setLoading(false);
    };

    const unPublic = onSnapshot(collection(db, "clients_public"), (snap) => {
      publicDocs = snap.docs.map(d => d.data()).filter(d => d.is_archived !== true && d.is_archived !== "true");
      processAllClients();
    }, (err) => console.error("Health unPublic listener error:", err));

    const unPrivate = onSnapshot(collection(db, "clients_private"), (snap) => {
      privateDocs = snap.docs.map(d => d.data()).filter(d => d.is_archived !== true && d.is_archived !== "true");
      processAllClients();
    }, (err) => console.error("Health unPrivate listener error:", err));

    const unReferred = onSnapshot(collection(db, "clients_referred"), (snap) => {
      referredDocs = snap.docs.map(d => d.data()).filter(d => d.is_archived !== true && d.is_archived !== "true");
      processAllClients();
    }, (err) => console.error("Health unReferred listener error:", err));

    return () => { unPublic(); unPrivate(); unReferred(); };
  };

  const handleManualRefresh = () => {
    setRefreshing(true);
    setActiveDataSource("Live Database");
    fetchAndProcessData();
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  };

  useEffect(() => {
    const unsub = fetchAndProcessData();
    return () => unsub();
  }, []);

  const getCellNum = (cell) => {
    if (!cell || cell.value === null || cell.value === undefined) return 0;
    if (typeof cell.value === 'object' && cell.value.result !== undefined) {
      return Number(cell.value.result) || 0;
    }
    return Number(cell.value) || 0;
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const currentMonthName = months[new Date().getMonth()];
      const sheet = workbook.getWorksheet(currentMonthName) || workbook.worksheets[0];

      if (!sheet) {
        throw new Error("Could not find a valid sheet in the imported workbook.");
      }

      const prevBeginning = getCellNum(sheet.getRow(61).getCell(45));
      const prevNew = getCellNum(sheet.getRow(61).getCell(46));
      const otherAcc = getCellNum(sheet.getRow(61).getCell(47));
      const dropOuts = getCellNum(sheet.getRow(61).getCell(48));
      const currEnding = getCellNum(sheet.getRow(61).getCell(49));
      const currNew = getCellNum(sheet.getRow(61).getCell(50));

      setMetricsData({
        currentUsersPrevMonth: prevBeginning,
        newAcceptorsPrevMonth: prevNew,
        otherAcceptors: otherAcc,
        dropOuts: dropOuts,
        currentUsersCurrentMonth: currEnding,
        newAcceptorsCurrentMonth: currNew
      });

      const parsedMethods = [
        { name: "FSTR/BTL", count: getCellNum(sheet.getRow(8).getCell(49)), color: "var(--primary)" },
        { name: "MSTR/NSV", count: getCellNum(sheet.getRow(12).getCell(49)), color: "#4B3FD1" },
        { name: "Condoms", count: getCellNum(sheet.getRow(16).getCell(49)), color: "var(--amber)" },
        { name: "IUD-INTERVAL", count: getCellNum(sheet.getRow(20).getCell(49)), color: "#8B5CF6" },
        { name: "IUD-POSTPARTUM", count: getCellNum(sheet.getRow(24).getCell(49)), color: "#2563EB" },
        { name: "Pills (POP/COC)", count: getCellNum(sheet.getRow(28).getCell(49)) + getCellNum(sheet.getRow(32).getCell(49)), color: "#06B6D4" },
        { name: "Injectables", count: getCellNum(sheet.getRow(36).getCell(49)), color: "#F59E0B" },
        { name: "Implant", count: getCellNum(sheet.getRow(40).getCell(49)), color: "var(--mint)" }
      ];

      const totalMethodUsers = parsedMethods.reduce((sum, m) => sum + m.count, 0) || 1;
      setMethodMix(
        parsedMethods.map(m => ({
          ...m,
          keys: [m.name],
          percentage: `${((m.count / totalMethodUsers) * 100).toFixed(1)}%`,
          count: m.count.toLocaleString()
        }))
      );

      const rows10_14 = [5, 9, 13, 17, 21, 25, 29, 33, 37, 41, 45, 49, 53, 57];
      const rows15_19 = [6, 10, 14, 18, 22, 26, 30, 34, 38, 42, 46, 50, 54, 58];
      const rows20_49 = [7, 11, 15, 19, 23, 27, 31, 35, 39, 43, 47, 51, 55, 59];

      const sumAgeGroup = (rows) => rows.reduce((total, r) => total + getCellNum(sheet.getRow(r).getCell(49)), 0);

      const age10_14 = sumAgeGroup(rows10_14);
      const age15_19 = sumAgeGroup(rows15_19);
      const age20_49 = sumAgeGroup(rows20_49);
      const totalDemo = (age10_14 + age15_19 + age20_49) || 1;

      setDemographics([
        {
          age: "10-14 years",
          total: age10_14.toLocaleString(),
          share: `${((age10_14 / totalDemo) * 100).toFixed(1)}%`,
          barWidth: `${((age10_14 / totalDemo) * 100).toFixed(1)}%`,
          color: "#6366F1"
        },
        {
          age: "15-19 years",
          total: age15_19.toLocaleString(),
          share: `${((age15_19 / totalDemo) * 100).toFixed(1)}%`,
          barWidth: `${((age15_19 / totalDemo) * 100).toFixed(1)}%`,
          color: "var(--primary)"
        },
        {
          age: "20-49 years",
          total: age20_49.toLocaleString(),
          share: `${((age20_49 / totalDemo) * 100).toFixed(1)}%`,
          barWidth: `${((age20_49 / totalDemo) * 100).toFixed(1)}%`,
          color: "#2563EB"
        }
      ]);

      setActiveDataSource(`Imported: ${file.name} (${sheet.name})`);
    } catch (err) {
      console.error("Excel import error:", err);
      alert("Failed to parse the Excel file. Please ensure it follows the official RPFP / Health Office Form format.");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const topCards = [
    { label: "Current Users", subLabel: "(Previous Month)", value: metricsData.currentUsersPrevMonth.toLocaleString(), cardId: "overall-stocks-card" },
    { label: "New Acceptors", subLabel: "(Previous Month)", value: metricsData.newAcceptorsPrevMonth.toLocaleString(), cardId: "overall-population-card" },
    { label: "Other Acceptors", subLabel: "Active users", value: metricsData.otherAcceptors.toLocaleString(), cardId: "overall-rhu-card" },
    { label: "Drop Outs", subLabel: "Discontinued", value: metricsData.dropOuts.toLocaleString(), cardId: "low-stock-card" },
    { label: "Current Users", subLabel: "(Current Month)", value: metricsData.currentUsersCurrentMonth.toLocaleString(), cardId: "overall-stocks-card" },
    { label: "New Acceptors", subLabel: "(Current Month)", value: metricsData.newAcceptorsCurrentMonth.toLocaleString(), cardId: "overall-population-card" }
  ];

  const maxGeoValue = Math.max(...geoChartData.map(g => g.count), 1);

  return (
    <div id="inventory-container">
      <div id="inventory-topbar">
        <div>
          <h1>City Health Dashboard</h1>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--ink-faint)' }}>
            {loading ? "Loading overview..." : `Source: ${activeDataSource}`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            id="refresh-button" 
            onClick={handleManualRefresh}
            disabled={refreshing}
            style={{ cursor: refreshing ? 'wait' : 'pointer' }}
          >
            <RefreshCw size={14} className={refreshing ? "spin-icon" : ""} /> 
            {refreshing ? "Refreshing..." : "Refresh Data"}
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportExcel}
            accept=".xlsx, .xls"
            style={{ display: 'none' }}
          />

          <button 
            onClick={() => fileInputRef.current?.click()}
            id="deduct-button"
            disabled={importing}
            style={{ 
              height: '36px', 
              padding: '0 16px', 
              fontSize: '13px', 
              fontWeight: 600,
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              backgroundColor: '#107C41',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-sm)',
              cursor: importing ? 'wait' : 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0B5C30'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#107C41'}
          >
            <FileSpreadsheet size={15} /> {importing ? "Importing..." : "Import Excel"}
          </button>
        </div>
      </div>

      <div id="inventory-report-label">
        <h3>HEALTH METRICS REPORT</h3>
      </div>

      <div className="cards-container dashboard-metrics-grid">
        {topCards.map((item, idx) => (
          <div className="inventory-header-content" id={item.cardId} key={idx}>
            <h3>{item.label}</h3>
            <h2>{item.value}</h2>
            <p>{item.subLabel}</p>
          </div>
        ))}
      </div>

      <div className="dashboard-charts-section">
        <div className="chart-card">
          <h3 className="chart-title">Geographic Distribution</h3>
          <p className="chart-sub">Client density per Barangay</p>
          
          <div className="geo-bar-wrapper">
            {geoChartData.map((item, idx) => {
              const heightPct = (item.count / maxGeoValue) * 100;
              return (
                <div key={idx} className="geo-bar-col">
                  <span className="geo-bar-val">{item.count}</span>
                  <div className="geo-bar-fill" style={{ height: `${heightPct}%` }}></div>
                  <span className="geo-bar-lbl">{item.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Regional Overview</h3>
          <p className="chart-sub">GIS Cluster Mapping</p>
          
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

      <div className="dashboard-breakdown-section">
        <div className="chart-card">
          <h3 className="chart-title">Contraceptive Methods</h3>
          <p className="chart-sub">Current distribution of family planning methods</p>
          <div className="methods-subgrid">
            {methodMix.map((method, idx) => (
              <div className="method-item-box" key={idx}>
                <div className="method-header-info">
                  <span className="dot-indicator" style={{ backgroundColor: method.color }}></span>
                  <span className="method-title-lbl">{method.name}</span>
                  <span className="method-pct-lbl">{method.percentage}</span>
                </div>
                <h4>{method.count}</h4>
                <p className="active-user-sub">Active Users</p>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Client Demographics</h3>
          <p className="chart-sub">Age distribution of active FP users</p>
          <div className="demographics-list">
            {demographics.map((demo, idx) => (
              <div className="demo-row-item" key={idx}>
                <div className="demo-row-text">
                  <span>{demo.age}</span>
                  <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{demo.total}</span>
                </div>
                <div className="progress-track-bg">
                  <div className="progress-fill-bar" style={{ width: demo.barWidth, backgroundColor: demo.color }}></div>
                </div>
                <span className="demo-share-pct">{demo.share} of total users</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthDashboard;