import React, { useState, useEffect } from 'react';
import './dashboard.css'; 
import mapPlaceholderImg from '../../assets/map-placeholder.png';
import { db } from '../../firebase-config';
import { collection, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { RefreshCw, Download, Upload } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

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

const HealthDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
    { name: "FSTR/BTL", keys: ["FSTR/BTL", "BTL", "Tubal Ligation"], count: 0, percentage: "0%", color: "#2F80ED" },
    { name: "MSTR/NSV", keys: ["MSTR/NSV", "NSV", "Vasectomy"], count: 0, percentage: "0%", color: "#9B51E0" },
    { name: "Implant", keys: ["Implant", "Subdermal Implant"], count: 0, percentage: "0%", color: "#27AE60" },
    { name: "IUD-INTERVAL", keys: ["IUD-INTERVAL", "IUD", "IUD-TCu380A"], count: 0, percentage: "0%", color: "#E056FD" },
    { name: "Condoms", keys: ["Condom", "Condoms"], count: 0, percentage: "0%", color: "#FF7675" },
    { name: "IUD-POSTPARTUM", keys: ["IUD-POSTPARTUM", "PPIUD"], count: 0, percentage: "0%", color: "#0984E3" }
  ]);

  // 4. Demographics State
  const [demographics, setDemographics] = useState([
    { age: "15-19 years", total: 0, share: "0%", barWidth: "0%", color: "#E056FD" },
    { age: "20-24 years", total: 0, share: "0%", barWidth: "0%", color: "#9B51E0" },
    { age: "25-29 years", total: 0, share: "0%", barWidth: "0%", color: "#2F80ED" },
    { age: "30-34 years", total: 0, share: "0%", barWidth: "0%", color: "#27AE60" },
    { age: "35-39 years", total: 0, share: "0%", barWidth: "0%", color: "#F2994A" },
    { age: "40-49 years", total: 0, share: "0%", barWidth: "0%", color: "#FF7675" }
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
        { key: "15-19", label: "15-19 years", color: "#E056FD" },
        { key: "20-24", label: "20-24 years", color: "#9B51E0" },
        { key: "25-29", label: "25-29 years", color: "#2F80ED" },
        { key: "30-34", label: "30-34 years", color: "#27AE60" },
        { key: "35-39", label: "35-39 years", color: "#F2994A" },
        { key: "40-49", label: "40-49 years", color: "#FF7675" }
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
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Health Overview');

    sheet.columns = [
      { header: 'Metric Category', key: 'category', width: 30 },
      { header: 'Total Value', key: 'value', width: 20 }
    ];

    sheet.addRow({ category: 'Current Users (Previous Month)', value: metricsData.currentUsersPrevMonth });
    sheet.addRow({ category: 'New Acceptors (Previous Month)', value: metricsData.newAcceptorsPrevMonth });
    sheet.addRow({ category: 'Other Acceptors', value: metricsData.otherAcceptors });
    sheet.addRow({ category: 'Drop Outs', value: metricsData.dropOuts });
    sheet.addRow({ category: 'Current Users (Current Month)', value: metricsData.currentUsersCurrentMonth });
    sheet.addRow({ category: 'New Acceptors (Current Month)', value: metricsData.newAcceptorsCurrentMonth });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Health_Dashboard_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const buffer = evt.target.result;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.getWorksheet(1);

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          const name = row.getCell(1).value;
          const fp_method = row.getCell(2).value;
          const barangay = row.getCell(3).value;

          if (name) {
            addDoc(collection(db, "clients_public"), {
              name: typeof name === 'object' ? String(name.result || name.value || name) : String(name),
              fp_method: fp_method ? String(fp_method) : "",
              barangay: barangay ? String(barangay) : "",
              is_archived: false,
              created_at: serverTimestamp()
            });
          }
        }
      });
      alert("Excel records imported successfully!");
    };
    reader.readAsArrayBuffer(file);
  };

  const topCards = [
    { label: "Current Users", subLabel: "(Previous Month)", value: metricsData.currentUsersPrevMonth, icon: "👥", color: "orange" },
    { label: "New Acceptors", subLabel: "(Previous Month)", value: metricsData.newAcceptorsPrevMonth, icon: "💙", color: "blue" },
    { label: "Other Acceptors", subLabel: "", value: metricsData.otherAcceptors, icon: "👤+", color: "yellow" },
    { label: "Drop Outs", subLabel: "", value: metricsData.dropOuts, icon: "📉", color: "purple" },
    { label: "Current Users", subLabel: "(Current Month)", value: metricsData.currentUsersCurrentMonth, icon: "👥", color: "teal" },
    { label: "New Acceptors", subLabel: "(Current Month)", value: metricsData.newAcceptorsCurrentMonth, icon: "👤+", color: "pink" }
  ];

  const maxGeoValue = Math.max(...geoChartData.map(g => g.count), 1);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-text">
          <h1>Dashboard</h1>
          <p>{loading ? "Loading overview..." : "Welcome back to your overview"}</p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            onClick={fetchAndProcessData}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', backgroundColor: '#FFF', fontWeight: 600, cursor: 'pointer' }}
          >
            <RefreshCw size={14} className={refreshing ? "spin-icon" : ""} /> Refresh Data
          </button>

          <button 
            onClick={handleExportExcel}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: 'none', backgroundColor: '#EF4444', color: '#FFF', fontWeight: 600, cursor: 'pointer' }}
          >
            <Download size={14} /> Export as Excel
          </button>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: 'none', backgroundColor: '#10B981', color: '#FFF', fontWeight: 600, cursor: 'pointer' }}>
            <Upload size={14} /> Import Excel
            <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} style={{ display: 'none' }} />
          </label>
        </div>
      </header>

      <section className="metrics-grid">
        {topCards.map((item, idx) => (
          <div className={`metric-card card-${item.color}`} key={idx}>
            <div className="metric-icon-wrapper">{item.icon}</div>
            <h2>{item.value}</h2>
            <p style={{ fontWeight: 600, marginBottom: '2px' }}>{item.label}</p>
            {item.subLabel && <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>{item.subLabel}</span>}
          </div>
        ))}
      </section>

      <section className="dashboard-charts-section">
        <div className="chart-card large-chart">
          <h3>Geographic Distribution</h3>
          <p className="chart-sub">Client distribution across regions</p>
          
          <div style={{ height: '220px', display: 'flex', alignItems: 'flex-end', gap: '12px', marginTop: '20px', paddingBottom: '10px', borderBottom: '1px solid #E5E7EB' }}>
            {geoChartData.map((item, idx) => {
              const heightPct = (item.count / maxGeoValue) * 100;
              return (
                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>{item.count}</span>
                  <div style={{ width: '100%', height: `${heightPct}%`, backgroundColor: '#2F80ED', borderRadius: '4px 4px 0 0', minHeight: '6px' }}></div>
                  <span style={{ fontSize: '0.7rem', color: '#6B7280', marginTop: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '42px' }}>{item.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="chart-card side-map">
          <h3>Regional Overview</h3>
          <div 
            className="placeholder-map-visual"
            style={{ backgroundImage: `url(${mapPlaceholderImg})` }}
          >
            <div className="mock-map-tint">GIS Cluster Map View</div>
          </div>
        </div>
      </section>

      <section className="dashboard-breakdown-section">
        <div className="chart-card method-mix-card">
          <h3>Contraceptive Methods</h3>
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
                <p className="active-user-sub">active users</p>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card demographics-card">
          <h3>Client Demographics</h3>
          <p className="chart-sub">Age distribution of active FP users</p>
          <div className="demographics-list">
            {demographics.map((demo, idx) => (
              <div className="demo-row-item" key={idx}>
                <div className="demo-row-text">
                  <span className="demo-age-span">{demo.age}</span>
                  <span className="demo-total-span">{demo.total}</span>
                </div>
                <div className="progress-track-bg">
                  <div className="progress-fill-bar" style={{ width: demo.barWidth, backgroundColor: demo.color }}></div>
                </div>
                <span className="demo-share-pct">{demo.share} of total users</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HealthDashboard;