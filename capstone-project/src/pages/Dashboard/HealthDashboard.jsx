import { useState, useEffect } from 'react';
import './dashboard.css';
import { db } from '../../firebase-config';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { Users, HeartPulse, UserCheck, TriangleAlert } from 'lucide-react';
import { DashboardHeader, KpiCard, Panel, GeoDistributionPanel, RegionalOverviewPanel, MethodCard } from './DashboardWidgets';
import { barangays as MALOLOS_BARANGAYS } from '../../data/barangays';
import { INVENTORY_FP_METHODS } from '../../data/inventoryMethods.js';

const HealthDashboard = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [allRawClients, setAllRawClients] = useState([]);
  const [rhuData, setRhuData] = useState([]);
  const [limitsByMethod, setLimitsByMethod] = useState({});

  const [summaryData, setSummaryData] = useState({
    registeredClients: 0,
    newThisMonth: 0,
    modernUsers: 0,
    intendsModern: 0,
  });

  const [geoChartData, setGeoChartData] = useState([]);

  const [methodMix, setMethodMix] = useState([
    { name: "FSTR/BTL", keys: ["FSTR/BTL", "BTL", "Tubal Ligation"], count: 0, percentage: "0%", color: "var(--primary)" },
    { name: "MSTR/NSV", keys: ["MSTR/NSV", "NSV", "Vasectomy"], count: 0, percentage: "0%", color: "#4B3FD1" },
    { name: "Implant", keys: ["Implant", "Implants", "Subdermal Implant"], count: 0, percentage: "0%", color: "var(--mint)" },
    { name: "IUD", keys: ["IUD", "IUD-INTERVAL", "IUD-TCu380A", "IUD-POSTPARTUM", "PPIUD"], count: 0, percentage: "0%", color: "#8B5CF6" },
    { name: "Condoms", keys: ["Condom", "Condoms"], count: 0, percentage: "0%", color: "var(--amber)" },
    { name: "Pills (POP/COC)", keys: ["PILLS-POP", "PILLS-COC", "Pills"], count: 0, percentage: "0%", color: "#06B6D4" },
    { name: "Injectables", keys: ["INJECTABLES", "Injectable", "DMPA"], count: 0, percentage: "0%", color: "#F59E0B" },
    { name: "CMM/Billings", keys: ["CMM/Billings", "CMM", "CCM", "Billings", "CMM Billings"], count: 0, percentage: "0%", color: "#14B8A6" },
    { name: "BBT", keys: ["BBT", "Basal Body Temperature"], count: 0, percentage: "0%", color: "#EC4899" },
    { name: "Sympto-Thermal (STM)", keys: ["Symptothermal", "Sympto-Thermal", "Sympto Thermal", "STM"], count: 0, percentage: "0%", color: "#84CC16" },
    { name: "SDM", keys: ["SDM", "Standard Days Method"], count: 0, percentage: "0%", color: "#F97316" },
    { name: "LAM", keys: ["LAM", "Lactational Amenorrhea Method"], count: 0, percentage: "0%", color: "#0EA5E9" }
  ]);

  const [demographics, setDemographics] = useState([]);

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

      let modernUserCount = 0;
      let intendsModernCount = 0;
      let newThisMonthCount = 0;

      const rawMethodCounts = {};
      const barangayCounts = {};
      const ageGroups = { "10-14": 0, "15-19": 0, "20-49": 0, "50+": 0, "unknown": 0 };

      allClients.forEach(client => {
        const clientStatus = (client.status || "").toLowerCase();

        let createdDate = null;
        if (client.created_at) {
          createdDate = client.created_at.toDate ? client.created_at.toDate() : new Date(client.created_at);
        }

        const isCurrentMonth = createdDate && createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear;
        if (isCurrentMonth) newThisMonthCount++;

        // "status" holds the client's answer on intending to use a modern method
        if (clientStatus.includes("expressing intention")) intendsModernCount++;

        const method = (client.fp_method || client.FP_method || "").trim();
        if (method) {
          rawMethodCounts[method] = (rawMethodCounts[method] || 0) + 1;
          modernUserCount++;
        }

        const rawLocation = (client.barangay || client.address || "").trim();
        if (rawLocation) {
          const matched = MALOLOS_BARANGAYS.find(b => rawLocation.toLowerCase().includes(b.toLowerCase()));
          if (matched) barangayCounts[matched] = (barangayCounts[matched] || 0) + 1;
        }

        const computedAge = calculateAge(client.birthdate_female) || calculateAge(client.birthdate) || (isNaN(Number(client.age)) ? null : Number(client.age));
        if (computedAge >= 10 && computedAge <= 14) ageGroups["10-14"]++;
        else if (computedAge >= 15 && computedAge <= 19) ageGroups["15-19"]++;
        else if (computedAge >= 20 && computedAge <= 49) ageGroups["20-49"]++;
        else if (computedAge >= 50) ageGroups["50+"]++;
        else ageGroups["unknown"]++;
      });

      const sortedBrgyList = Object.entries(barangayCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 11);
      setGeoChartData(sortedBrgyList);

      const totalActiveMethods = Object.values(rawMethodCounts).reduce((a, b) => a + b, 0) || 1;
      setMethodMix(prevMethods => {
        let matchedTotal = 0;
        const mix = prevMethods.filter(item => item.keys.length > 0).map(item => {
          let count = 0;
          item.keys.forEach(k => {
            Object.keys(rawMethodCounts).forEach(rawKey => {
              if (rawKey.toLowerCase() === k.toLowerCase()) count += rawMethodCounts[rawKey];
            });
          });
          matchedTotal += count;
          const percentage = ((count / totalActiveMethods) * 100).toFixed(1) + "%";
          return { ...item, count: count.toLocaleString(), rawCount: count, percentage };
        });

        // most used first
        mix.sort((a, b) => b.rawCount - a.rawCount);

        // anything recorded under a name not listed above, so the cards add up to 100%
        const otherCount = Object.values(rawMethodCounts).reduce((a, b) => a + b, 0) - matchedTotal;
        if (otherCount > 0) {
          mix.push({
            name: "Other Methods",
            keys: [],
            count: otherCount.toLocaleString(),
            percentage: ((otherCount / totalActiveMethods) * 100).toFixed(1) + "%",
            color: "#64748B"
          });
        }
        return mix;
      });

      // every client lands in exactly one group, so the shares add up to 100%
      const totalAgesMapped = allClients.length || 1;
      const demoConfig = [
        { key: "10-14", label: "10-14 years", color: "#6366F1" },
        { key: "15-19", label: "15-19 years", color: "var(--primary)" },
        { key: "20-49", label: "20-49 years", color: "#2563EB" },
        { key: "50+", label: "50 years and above", color: "#0EA5E9" },
        { key: "unknown", label: "Age not recorded", color: "#94A3B8" }
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

      setSummaryData({
        registeredClients: allClients.length,
        newThisMonth: newThisMonthCount,
        modernUsers: modernUserCount,
        intendsModern: intendsModernCount
      });
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
    fetchAndProcessData();
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  };

  useEffect(() => {
    const unsub = fetchAndProcessData();
    return () => unsub();
  }, []);

  useEffect(() => {
    const unRhu = onSnapshot(collection(db, "rhu"), (snap) => {
      setRhuData(snap.docs.map(d => d.data()));
    }, (err) => console.error("Health rhu listener error:", err));

    const unLimits = onSnapshot(doc(db, "lowStock", "lowStockLimit"), (snap) => {
      setLimitsByMethod(snap.data()?.limitsByMethod ?? {});
    }, (err) => console.error("Health lowStock listener error:", err));

    return () => { unRhu(); unLimits(); };
  }, []);

  const totalStock = rhuData.reduce((total, rhu) => (
    total + INVENTORY_FP_METHODS.reduce((sum, m) => sum + Number(rhu.stockByMethod?.[m.id] ?? 0), 0)
  ), 0);

  const lowStockRhuCount = rhuData.filter(rhu => INVENTORY_FP_METHODS.some(m => {
    const limit = Number(limitsByMethod?.[m.id] ?? 0);
    return limit > 0 && Number(rhu.stockByMethod?.[m.id] ?? 0) <= limit;
  })).length;

  const kpiCards = [
    { label: "Registered Clients", value: summaryData.registeredClients.toLocaleString(), subLabel: `${summaryData.newThisMonth.toLocaleString()} new this month`, icon: Users, tone: "blue", to: "/client-records" },
    { label: "Modern FP Users", value: summaryData.modernUsers.toLocaleString(), subLabel: `${(summaryData.registeredClients - summaryData.modernUsers).toLocaleString()} with no modern method`, icon: HeartPulse, tone: "green", to: "/client-records" },
    { label: "For Follow-up", value: summaryData.intendsModern.toLocaleString(), subLabel: "Intend to use a modern FP method", icon: UserCheck, tone: "purple", to: "/client-records" },
    { label: "RHUs Low on Stock", value: lowStockRhuCount.toLocaleString(), subLabel: `${totalStock.toLocaleString()} units on hand in total`, icon: TriangleAlert, tone: "orange", to: "/inventory" }
  ];

  return (
    <div className="dash-page">
      <DashboardHeader
        title="City Health Dashboard"
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
          <GeoDistributionPanel data={geoChartData} subtitle="Client density per barangay" />
          <RegionalOverviewPanel clients={allRawClients} subtitle="GIS cluster mapping" />
        </div>

        <div className="dash-grid dash-grid--breakdown">
          <Panel title="Contraceptive Methods" subtitle="Current distribution of family planning methods">
            <div className="dash-method-grid dash-method-grid--compact">
              {methodMix.map(method => (
                <MethodCard key={method.name} name={method.name} count={method.count} share={method.percentage} color={method.color} />
              ))}
            </div>
          </Panel>

          <Panel title="Client Demographics" subtitle="Age distribution of registered clients">
            <div className="dash-demo-list">
              {demographics.map(demo => (
                <div key={demo.age}>
                  <div className="dash-demo-top">
                    <span>{demo.age}</span>
                    <strong>{demo.total}</strong>
                  </div>
                  <div className="dash-bar-track">
                    <div className="dash-bar-fill" style={{ width: demo.barWidth, background: demo.color }}></div>
                  </div>
                  <span className="dash-demo-share">{demo.share} of registered clients</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
};

export default HealthDashboard;
