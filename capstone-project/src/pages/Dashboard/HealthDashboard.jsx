import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import './dashboard.css'; 
import { db } from '../../firebase-config';
import { collection, onSnapshot } from 'firebase/firestore';
import { RefreshCw, Download } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
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

const METHOD_ROW_MAP = {
  "fstr/btl": 5,
  "btl": 5,
  "mstr/nsv": 9,
  "nsv": 9,
  "condom": 13,
  "condoms": 13,
  "iud-interval": 17,
  "iud": 17,
  "iud-postpartum": 21,
  "pills-pop": 25,
  "pop": 25,
  "pills-coc": 29,
  "coc": 29,
  "pills": 29,
  "injectables": 33,
  "dmpa": 33,
  "implants": 37,
  "implant": 37,
  "nfp-ccm": 41,
  "nfp-bbt": 45,
  "nfp-stm": 49,
  "nfp-sdm": 53,
  "nfp-lam": 57
};

const HealthDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allRawClients, setAllRawClients] = useState([]);

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
    { name: "Implant", keys: ["Implant", "Subdermal Implant"], count: 0, percentage: "0%", color: "var(--mint)" },
    { name: "IUD-INTERVAL", keys: ["IUD-INTERVAL", "IUD", "IUD-TCu380A"], count: 0, percentage: "0%", color: "#8B5CF6" },
    { name: "Condoms", keys: ["Condom", "Condoms"], count: 0, percentage: "0%", color: "var(--amber)" },
    { name: "IUD-POSTPARTUM", keys: ["IUD-POSTPARTUM", "PPIUD"], count: 0, percentage: "0%", color: "#2563EB" }
  ]);

  const [demographics, setDemographics] = useState([
    { age: "15-19 years", total: 0, share: "0%", barWidth: "0%", color: "var(--primary)" },
    { age: "20-24 years", total: 0, share: "0%", barWidth: "0%", color: "#4B3FD1" },
    { age: "25-29 years", total: 0, share: "0%", barWidth: "0%", color: "var(--mint)" },
    { age: "30-34 years", total: 0, share: "0%", barWidth: "0%", color: "#8B5CF6" },
    { age: "35-39 years", total: 0, share: "0%", barWidth: "0%", color: "var(--amber)" },
    { age: "40-49 years", total: 0, share: "0%", barWidth: "0%", color: "#2563EB" }
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
    setRefreshing(true);
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
      const ageGroups = { "15-19": 0, "20-24": 0, "25-29": 0, "30-34": 0, "35-39": 0, "40-49": 0 };

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
          if (computedAge >= 15 && computedAge <= 19) ageGroups["15-19"]++;
          else if (computedAge >= 20 && computedAge <= 24) ageGroups["20-24"]++;
          else if (computedAge >= 25 && computedAge <= 29) ageGroups["25-29"]++;
          else if (computedAge >= 30 && computedAge <= 34) ageGroups["30-34"]++;
          else if (computedAge >= 35 && computedAge <= 39) ageGroups["35-39"]++;
          else if (computedAge >= 40 && computedAge <= 49) ageGroups["40-49"]++;
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
        { key: "15-19", label: "15-19 years", color: "var(--primary)" },
        { key: "20-24", label: "20-24 years", color: "#4B3FD1" },
        { key: "25-29", label: "25-29 years", color: "var(--mint)" },
        { key: "30-34", label: "30-34 years", color: "#8B5CF6" },
        { key: "35-39", label: "35-39 years", color: "var(--amber)" },
        { key: "40-49", label: "40-49 years", color: "#2563EB" }
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
      setRefreshing(false);
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

  useEffect(() => {
    const unsub = fetchAndProcessData();
    return () => unsub();
  }, []);

  const handleExportExcel = async () => {
    try {
      const response = await fetch('/templates/Health Office Form.xlsx');
      if (!response.ok) {
        throw new Error("Template file not found under /public/templates/");
      }
      const arrayBuffer = await response.arrayBuffer();

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const currentMonthName = months[new Date().getMonth()];
      const sheet = workbook.getWorksheet(currentMonthName) || workbook.getWorksheet(1);

      allRawClients.forEach(client => {
        const method = (client.fp_method || client.FP_method || "").toLowerCase().trim();
        const baseRow = METHOD_ROW_MAP[method];
        if (!baseRow) return;

        const age = calculateAge(client.birthdate_female) || calculateAge(client.birthdate) || Number(client.age) || 25;
        let ageOffset = 2;
        if (age >= 10 && age <= 14) ageOffset = 0;
        else if (age >= 15 && age <= 19) ageOffset = 1;
        else if (age >= 20 && age <= 49) ageOffset = 2;

        const targetRow = baseRow + ageOffset;
        const totalEndingCell = sheet.getRow(targetRow).getCell(49);
        const currentVal = Number(totalEndingCell.value) || 0;
        totalEndingCell.value = currentVal + 1;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `DOH_Malolos_Health_Report_${currentMonthName}_${new Date().getFullYear()}.xlsx`);
    } catch (err) {
      console.error("Excel export error:", err);
      alert("Failed to export Excel using the official template. Please ensure 'Health Office Form.xlsx' is in your public/templates folder.");
    }
  };

  const topCards = [
    { label: "Current Users", subLabel: "(Previous Month)", value: metricsData.currentUsersPrevMonth, cardId: "overall-stocks-card" },
    { label: "New Acceptors", subLabel: "(Previous Month)", value: metricsData.newAcceptorsPrevMonth, cardId: "overall-population-card" },
    { label: "Other Acceptors", subLabel: "Active users", value: metricsData.otherAcceptors, cardId: "overall-rhu-card" },
    { label: "Drop Outs", subLabel: "Discontinued", value: metricsData.dropOuts, cardId: "low-stock-card" },
    { label: "Current Users", subLabel: "(Current Month)", value: metricsData.currentUsersCurrentMonth, cardId: "overall-stocks-card" },
    { label: "New Acceptors", subLabel: "(Current Month)", value: metricsData.newAcceptorsCurrentMonth, cardId: "overall-population-card" }
  ];

  const maxGeoValue = Math.max(...geoChartData.map(g => g.count), 1);

  return (
    <div id="inventory-container">
      <div id="inventory-topbar">
        <div>
          <h1>City Health Dashboard</h1>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--ink-faint)' }}>
            {loading ? "Loading overview..." : "System live status"}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button id="refresh-button" onClick={fetchAndProcessData}>
            <RefreshCw size={14} className={refreshing ? "spin-icon" : ""} /> 
            Refresh Data
          </button>

          <button 
            onClick={handleExportExcel}
            id="deduct-button"
            style={{ height: '36px', padding: '0 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#E0563D', color: '#FFF' }}
          >
            <Download size={14} /> Export Excel
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