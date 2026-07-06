import React from 'react';
import './dashboard.css'; 
import mapPlaceholderImg from '../../assets/map-placeholder.png';

const Dashboard = () => {
  const metrics = [
    { label: "Total Families", value: "20", icon: "👥", color: "orange" },
    { label: "Registered Clients", value: "32", icon: "💙", color: "blue" },
    { label: "New Client", value: "12", icon: "👤+", color: "yellow" },
    { label: "Active FP Users", value: "112", icon: "📈", color: "purple" },
    { label: "Total Contraceptives Distributed", value: "73", icon: "💊", color: "teal" },
    { label: "Total Barangays", value: "15", icon: "📍", color: "pink" }
  ];

  const methods = [
    { name: "Injectable (DMPA)", count: "1,845", percentage: "40.8%", color: "#2F80ED" },
    { name: "Pills (Combined/POP)", count: "1,128", percentage: "24.9%", color: "#9B51E0" },
    { name: "Implant", count: "678", percentage: "15%", color: "#27AE60" },
    { name: "IUD", count: "542", percentage: "12%", color: "#E056FD" },
    { name: "Condoms", count: "230", percentage: "5.1%", color: "#FF7675" },
    { name: "BTL/NSV", count: "100", percentage: "2.2%", color: "#0984E3" }
  ];

  const demographics = [
    { age: "15-19 years", total: "423", share: "9.4%", barWidth: "9.4%", color: "#E056FD" },
    { age: "20-24 years", total: "1,245", share: "27.5%", barWidth: "27.5%", color: "#9B51E0" },
    { age: "25-29 years", total: "1,356", share: "30.0%", barWidth: "30.0%", color: "#2F80ED" },
    { age: "30-34 years", total: "892", share: "19.7%", barWidth: "19.7%", color: "#27AE60" },
    { age: "35-39 years", total: "445", share: "9.8%", barWidth: "9.8%", color: "#F2994A" },
    { age: "40-49 years", total: "162", share: "3.6%", barWidth: "3.6%", color: "#FF7675" }
  ];

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-text">
          <h1>Dashboard</h1>
          <p>Welcome back to your overview</p>
        </div>
        <div className="header-search">
          <input type="text" placeholder="Search..." className="search-bar" />
        </div>
      </header>

      <section className="metrics-grid">
        {metrics.map((item, idx) => (
          <div className={`metric-card card-${item.color}`} key={idx}>
            <div className="metric-icon-wrapper">{item.icon}</div>
            <h2>{item.value}</h2>
            <p>{item.label}</p>
          </div>
        ))}
      </section>

      <section className="dashboard-charts-section">
        <div className="chart-card large-chart">
          <h3>Geographic Distribution</h3>
          <p className="chart-sub">Client distribution across regions</p>
          <div className="placeholder-graph-bar">
            <div className="mock-bar-chart-visual"></div>
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
          <h3>Contraceptive Method Mix</h3>
          <p className="chart-sub">Current distribution of family planning methods</p>
          <div className="methods-subgrid">
            {methods.map((method, idx) => (
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

export default Dashboard;