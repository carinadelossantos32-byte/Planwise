import { useState, useEffect } from 'react';
import './dashboard.css';
import { db } from '../../firebase-config';
import { collection, onSnapshot } from 'firebase/firestore';
import { Users, UserPlus, HeartPulse, MapPin } from 'lucide-react';
import { barangays as MALOLOS_BARANGAYS } from '../../data/barangays';
import { DashboardHeader, KpiCard, Panel, GeoDistributionPanel, RegionalOverviewPanel, MethodCard } from './DashboardWidgets';

const METHOD_CONFIG = [
  { name: "Injectable (DMPA)", matchKeys: ["dmpa", "injectable", "injectables"], color: "var(--primary)" },
  { name: "Pills (Combined/POP)", matchKeys: ["pill", "pills", "pop", "coc"], color: "#4B3FD1" },
  { name: "Subdermal Implant", matchKeys: ["implant", "implants", "subdermal"], color: "var(--mint)" },
  { name: "IUD (Interval/Postpartum)", matchKeys: ["iud", "iud-interval", "iud-postpartum", "ppiud"], color: "#8B5CF6" },
  { name: "Condoms", matchKeys: ["condom", "condoms"], color: "var(--amber)" },
  { name: "BTL / NSV (Permanent)", matchKeys: ["btl", "nsv", "fstr/btl", "mstr/nsv", "tubal", "vasectomy"], color: "#2563EB" },
  { name: "Natural FP (NFP)", matchKeys: ["nfp", "lam", "sdm", "stm", "sympto", "bbt", "ccm", "cmm", "billings"], color: "#06B6D4" }
];

const Dashboard = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [allRawClients, setAllRawClients] = useState([]);

  const [metricsData, setMetricsData] = useState({
    registeredClients: 0,
    referredClients: 0,
    newThisMonth: 0,
    modernFpUsers: 0,
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

      let newThisMonthCount = 0;
      let contraceptiveCount = 0;

      const rawMethodCounts = {};
      const barangayCounts = {};

      allClients.forEach(client => {
        let createdDate = null;
        if (client.created_at) {
          createdDate = client.created_at.toDate ? client.created_at.toDate() : new Date(client.created_at);
        }

        // "New this month" means the record was registered in the current month
        if (createdDate && createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear) {
          newThisMonthCount++;
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
      const otherMethodsCount = Math.max(0, contraceptiveCount - totalMappedCount);

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

      matchedDistribution.sort((a, b) => b.rawCount - a.rawCount);

      setMethodDistribution(matchedDistribution);

      setMetricsData({
        registeredClients: allClients.length,
        referredClients: referredDocs.length,
        newThisMonth: newThisMonthCount,
        modernFpUsers: contraceptiveCount,
        totalBarangays: Object.keys(barangayCounts).length
      });
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

  const kpiCards = [
    { label: "Registered Clients", value: metricsData.registeredClients.toLocaleString(), subLabel: `${metricsData.referredClients.toLocaleString()} referred clients`, icon: Users, tone: "blue", to: "/client-records" },
    { label: "New This Month", value: metricsData.newThisMonth.toLocaleString(), subLabel: "Clients registered this month", icon: UserPlus, tone: "green", to: "/client-records" },
    { label: "Modern FP Users", value: metricsData.modernFpUsers.toLocaleString(), subLabel: `${(metricsData.registeredClients - metricsData.modernFpUsers).toLocaleString()} with no modern method recorded`, icon: HeartPulse, tone: "purple", to: "/reports" },
    { label: "Barangays", value: metricsData.totalBarangays.toLocaleString(), subLabel: "With recorded clients", icon: MapPin, tone: "orange", to: "/gis-map" }
  ];

  return (
    <div className="dash-page">
      <DashboardHeader
        title="CPD Dashboard"
        refreshing={refreshing}
        onRefresh={handleManualRefresh}
      />

      <div className={`dash-content${refreshing ? " is-refreshing" : ""}`}>
        <div className="dash-kpi-grid">
          {kpiCards.map(card => (
            <KpiCard key={card.label} {...card} />
          ))}
        </div>

        <div className="dash-grid dash-grid--map">
          <GeoDistributionPanel data={geoChartData} subtitle="Client distribution across top barangays" />
          <RegionalOverviewPanel clients={allRawClients} subtitle="GIS mapping breakdown" />
        </div>

        <Panel title="FP Method Distribution" subtitle="Breakdown of methods among clients with a recorded method">
          <div className="dash-method-grid dash-method-grid--wide">
            {methodDistribution.map(item => (
              <MethodCard key={item.name} name={item.name} count={item.count} share={item.share} color={item.color} />
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default Dashboard;
