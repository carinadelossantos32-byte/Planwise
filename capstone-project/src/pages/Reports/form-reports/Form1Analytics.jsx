import { useMemo } from "react";
import "./Form1Analytics.css";

const methodCatalog = [
  { name: "Condom", aliases: ["condom"] },
  { name: "Pills", aliases: ["pills", "pill"] },
  { name: "Injectable", aliases: ["injectable", "inject"] },
  { name: "IUD", aliases: ["iud"] },
  { name: "Implant", aliases: ["implant", "subdermal"] },
  { name: "BTL", aliases: ["btl", "tubal ligation"] },
  { name: "Vasectomy", aliases: ["vasectomy", "nsv"] },
  { name: "Natural Methods", aliases: ["natural", "ccm", "billings", "bbt", "sympto", "sdm", "lam", "rhythm", "calendar"] },
];

const civilStatusLabels = [
  { label: "Single", aliases: ["single"] },
  { label: "Married", aliases: ["married"] },
  { label: "Separated", aliases: ["separated"] },
  { label: "Widowed", aliases: ["widowed"] },
  { label: "Divorced", aliases: ["divorced"] },
  { label: "Cohabiting", aliases: ["cohabiting", "live-in", "common law"] },
];

const educationLabels = [
  { label: "No Formal Education", aliases: ["none", "no formal", "no education"] },
  { label: "Elementary", aliases: ["elementary", "grade"] },
  { label: "High School", aliases: ["high school", "secondary"] },
  { label: "Vocational", aliases: ["vocational", "tech"] },
  { label: "College", aliases: ["college", "bachelor", "undergrad"] },
  { label: "Postgraduate", aliases: ["postgraduate", "graduate", "master", "doctor"] },
];

function getFieldValue(client, keys) {
  for (const key of keys) {
    const value = client?.[key];
    if (value === undefined || value === null) continue;

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    } else if (typeof value === "number" || typeof value === "boolean") {
      return value;
    } else if (value?.toDate) {
      return value.toDate();
    }
  }

  return "";
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (!value) return 0;

  const cleaned = String(value).replace(/[^0-9.-]+/g, "");
  const parsed = Number(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value?.toDate) return value.toDate();
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function getAgeFromClient(client) {
  const ageValue = getFieldValue(client, ["age", "client_age", "respondent_age"]);
  const numericAge = parseNumber(ageValue);
  if (numericAge > 0) return numericAge;

  const birthValue = getFieldValue(client, ["birthdate", "dob", "date_of_birth", "birth_date"]);
  const birthDate = parseDate(birthValue);
  if (birthDate) {
    const now = new Date();
    const years = now.getFullYear() - birthDate.getFullYear();
    const monthDelta = now.getMonth() - birthDate.getMonth();
    const dayDelta = now.getDate() - birthDate.getDate();
    return monthDelta < 0 || (monthDelta === 0 && dayDelta < 0) ? years - 1 : years;
  }

  return 0;
}

function getMethodLabel(client) {
  const methodValue = normalizeText(
    getFieldValue(client, [
      "fp_method",
      "FP_method",
      "method",
      "family_planning_method",
      "preferred_method",
      "current_method",
      "service_method",
      "intended_method",
    ])
  );

  if (!methodValue) return "";
  const normalized = methodValue.toLowerCase();

  for (const method of methodCatalog) {
    if (method.aliases.some((alias) => normalized.includes(alias))) {
      return method.name;
    }
  }

  return methodValue;
}

function getCivilStatusLabel(client) {
  const rawValue = normalizeText(getFieldValue(client, ["civil_status", "civilStatus", "marital_status", "marriage_status"])).toLowerCase();
  if (!rawValue) return "Unknown";

  for (const status of civilStatusLabels) {
    if (status.aliases.some((alias) => rawValue.includes(alias))) {
      return status.label;
    }
  }

  return rawValue.charAt(0).toUpperCase() + rawValue.slice(1);
}

function getEducationLabel(client) {
  const rawValue = normalizeText(getFieldValue(client, ["education", "highest_education", "educational_attainment", "schooling"])).toLowerCase();
  if (!rawValue) return "Unknown";

  for (const education of educationLabels) {
    if (education.aliases.some((alias) => rawValue.includes(alias))) {
      return education.label;
    }
  }

  return rawValue.charAt(0).toUpperCase() + rawValue.slice(1);
}

function shouldCountAsMale(client) {
  const value = normalizeText(getFieldValue(client, ["sex", "gender", "gender_identity", "sex_of_client"])).toLowerCase();
  return value === "male" || value === "m";
}

function shouldCountAsFemale(client) {
  const value = normalizeText(getFieldValue(client, ["sex", "gender", "gender_identity", "sex_of_client"])).toLowerCase();
  return value === "female" || value === "f";
}

function isIntendingToShift(client) {
  const rawValue = normalizeText(getFieldValue(client, ["intention_to_shift", "shift_intention", "intends_to_shift", "intention", "shifted"])).toLowerCase();
  if (!rawValue) return false;
  if (["no", "none", "n", "not", "false"].some((token) => rawValue === token)) return false;
  return Boolean(rawValue);
}

function getClientName(client) {
  return (
    normalizeText(getFieldValue(client, ["client_name", "full_name", "name", "respondent_name", "beneficiary_name"])) || "-"
  );
}

function getBarangay(client) {
  return normalizeText(getFieldValue(client, ["barangay", "barangay_name", "location", "village"])) || "-";
}

function formatMonthLabel(client) {
  const rawValue = getFieldValue(client, ["report_month", "month", "service_month", "month_of_service", "created_at", "updated_at", "date"]);
  const dateValue = parseDate(rawValue);
  if (dateValue) {
    return dateValue.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }

  const normalized = normalizeText(String(rawValue)).toLowerCase();
  if (normalized.includes("january")) return "January";
  if (normalized.includes("february")) return "February";
  if (normalized.includes("march")) return "March";
  if (normalized.includes("april")) return "April";
  if (normalized.includes("may")) return "May";
  if (normalized.includes("june")) return "June";
  if (normalized.includes("july")) return "July";
  if (normalized.includes("august")) return "August";
  if (normalized.includes("september")) return "September";
  if (normalized.includes("october")) return "October";
  if (normalized.includes("november")) return "November";
  if (normalized.includes("december")) return "December";

  return normalizeText(rawValue) || "-";
}

function getTotalChildren(client) {
  const childrenValue = getFieldValue(client, ["children", "children_count", "number_of_children", "total_children", "no_of_children", "child_count"]);
  const value = parseNumber(childrenValue);
  return value;
}

function getSpouseName(client) {
  return normalizeText(getFieldValue(client, ["spouse_name", "partner_name", "husband_name", "wife_name"]));
}

function Form1Analytics({ clients = [], loading = false, error = "" }) {
  const totalRegistered = clients.length;

  const demographics = useMemo(() => {
    const gender = { male: 0, female: 0, unknown: 0 };
    const civil = {};
    const education = {};
    let ageTotal = 0;
    let ageCount = 0;
    let childrenTotal = 0;
    let coupleCount = 0;
    const methodCounts = {};
    let intentToShiftCount = 0;

    clients.forEach((client) => {
      if (shouldCountAsMale(client)) gender.male += 1;
      else if (shouldCountAsFemale(client)) gender.female += 1;
      else gender.unknown += 1;

      const age = getAgeFromClient(client);
      if (age > 0) {
        ageTotal += age;
        ageCount += 1;
      }

      const childCount = getTotalChildren(client);
      childrenTotal += childCount;

      if (getSpouseName(client)) {
        coupleCount += 1;
      }

      const status = getCivilStatusLabel(client);
      civil[status] = (civil[status] || 0) + 1;

      const educationLabel = getEducationLabel(client);
      education[educationLabel] = (education[educationLabel] || 0) + 1;

      const methodLabel = getMethodLabel(client);
      if (methodLabel) {
        methodCounts[methodLabel] = (methodCounts[methodLabel] || 0) + 1;
      }

      if (isIntendingToShift(client)) {
        intentToShiftCount += 1;
      }
    });

    const modernMethods = ["Condom", "Pills", "Injectable", "IUD", "Implant", "BTL", "Vasectomy"];
    const traditionalMethods = ["Natural Methods"];
    const modernCount = Object.entries(methodCounts).reduce(
      (sum, [name, value]) => (modernMethods.includes(name) ? sum + value : sum),
      0
    );
    const traditionalCount = Object.entries(methodCounts).reduce(
      (sum, [name, value]) => (traditionalMethods.includes(name) ? sum + value : sum),
      0
    );

    return {
      male: gender.male,
      female: gender.female,
      averageAge: ageCount ? Math.round(ageTotal / ageCount) : 0,
      totalChildren: childrenTotal,
      couplesRegistered: coupleCount,
      modernCount,
      traditionalCount,
      methodCounts,
      intentToShiftCount,
      civilSummary: Object.entries(civil).sort(([a], [b]) => b.localeCompare(a)),
      educationSummary: Object.entries(education).sort(([a], [b]) => b.localeCompare(a)),
    };
  }, [clients]);

  const tableRows = useMemo(
    () =>
      clients.map((client, index) => ({
        key: `${client.id || index}-${index}`,
        name: getClientName(client),
        barangay: getBarangay(client),
        sex: normalizeText(getFieldValue(client, ["sex", "gender", "gender_identity"])) || "-",
        age: getAgeFromClient(client) || "-",
        civilStatus: getCivilStatusLabel(client),
        education: getEducationLabel(client),
        fpMethod: getMethodLabel(client) || "-",
        intendedShift: isIntendingToShift(client) ? "Yes" : "No",
        children: getTotalChildren(client) || "-",
        month: formatMonthLabel(client),
      })),
    [clients]
  );

  const handleExportExcel = () => {
    if (!tableRows.length) return;

    const headers = [
      "Name",
      "Barangay",
      "Sex",
      "Age",
      "Civil Status",
      "Education",
      "FP Method",
      "Intends to Shift",
      "Children",
      "Report Month",
    ];

    const lines = [headers.join(",")];
    tableRows.forEach((row) => {
      const data = [
        row.name,
        row.barangay,
        row.sex,
        row.age,
        row.civilStatus,
        row.education,
        row.fpMethod,
        row.intendedShift,
        row.children,
        row.month,
      ];
      lines.push(
        data
          .map((value) => {
            const escaped = String(value ?? "").replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(",")
      );
    });

    const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "rpfp-form1-report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="form1-analytics">
        <h2>RPFP Form 1 Analytics</h2>
        <p>Loading Form 1 data from Firestore...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="form1-analytics">
        <h2>RPFP Form 1 Analytics</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="form1-analytics">
      <h2>RPFP Form 1 Analytics</h2>

      <div className="form1-cards">
        <div className="form1-card">
          <h4>Total Registered Clients</h4>
          <span>{totalRegistered}</span>
        </div>
        <div className="form1-card">
          <h4>Modern FP Users</h4>
          <span>{demographics.modernCount}</span>
        </div>
        <div className="form1-card">
          <h4>Traditional FP Users</h4>
          <span>{demographics.traditionalCount}</span>
        </div>
        <div className="form1-card">
          <h4>Couples Registered</h4>
          <span>{demographics.couplesRegistered}</span>
        </div>
      </div>

      <div className="form1-panel-row">
        <section className="form1-panel">
          <div className="panel-heading">
            <h3>Client Demographics</h3>
          </div>
          <div className="detail-row">
            <span>Male</span>
            <strong>{demographics.male}</strong>
          </div>
          <div className="detail-row">
            <span>Female</span>
            <strong>{demographics.female}</strong>
          </div>
          <div className="detail-row">
            <span>Average Age</span>
            <strong>{demographics.averageAge || "-"}</strong>
          </div>
          <div className="detail-row">
            <span>Total Children</span>
            <strong>{demographics.totalChildren}</strong>
          </div>
        </section>

        <section className="form1-panel">
          <div className="panel-heading">
            <h3>Family Planning Summary</h3>
          </div>
          {methodCatalog.map((method) => {
            if (method.name === "Natural Methods") return null;
            if (method.name === "BTL" || method.name === "Vasectomy") {
              return (
                <div className="detail-row" key={method.name}>
                  <span>{method.name}</span>
                  <strong>{demographics.methodCounts[method.name] || 0}</strong>
                </div>
              );
            }

            if (["Condom", "Pills", "Injectable", "IUD", "Implant"].includes(method.name)) {
              return (
                <div className="detail-row" key={method.name}>
                  <span>{method.name}</span>
                  <strong>{demographics.methodCounts[method.name] || 0}</strong>
                </div>
              );
            }

            return null;
          })}
          <div className="detail-row">
            <span>Natural Methods</span>
            <strong>{demographics.methodCounts["Natural Methods"] || 0}</strong>
          </div>
          <div className="detail-row">
            <span>Clients Intending to Shift Methods</span>
            <strong>{demographics.intentToShiftCount}</strong>
          </div>
        </section>
      </div>

      <div className="form1-panel-row form1-panel-row-compact">
        <section className="form1-panel form1-summary-panel">
          <h3>Civil Status Summary</h3>
          <div className="summary-list">
            {demographics.civilSummary.length ? (
              demographics.civilSummary.map(([label, value]) => (
                <div className="summary-item" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))
            ) : (
              <div className="summary-item">
                <span>No records available</span>
              </div>
            )}
          </div>
        </section>

        <section className="form1-panel form1-summary-panel">
          <h3>Educational Attainment Summary</h3>
          <div className="summary-list">
            {demographics.educationSummary.length ? (
              demographics.educationSummary.map(([label, value]) => (
                <div className="summary-item" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))
            ) : (
              <div className="summary-item">
                <span>No records available</span>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="form1-table-panel">
        <div className="table-header">
          <h3>Official RPFP Form 1 Report</h3>
          <button className="export-excel-button" onClick={handleExportExcel}>
            Export to Excel
          </button>
        </div>

        <div className="table-wrapper">
          <table className="form1-report-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Barangay</th>
                <th>Sex</th>
                <th>Age</th>
                <th>Civil Status</th>
                <th>Education</th>
                <th>FP Method</th>
                <th>Intends to Shift</th>
                <th>Children</th>
                <th>Report Month</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => (
                <tr key={row.key}>
                  <td>{row.name}</td>
                  <td>{row.barangay}</td>
                  <td>{row.sex}</td>
                  <td>{row.age}</td>
                  <td>{row.civilStatus}</td>
                  <td>{row.education}</td>
                  <td>{row.fpMethod}</td>
                  <td>{row.intendedShift}</td>
                  <td>{row.children}</td>
                  <td>{row.month}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default Form1Analytics;
