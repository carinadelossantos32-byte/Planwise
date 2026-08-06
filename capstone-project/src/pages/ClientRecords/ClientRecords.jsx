import { useEffect, useState, useCallback } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import ClientTable from "../../components/ClientTable/ClientTable";
import ClientTablePrivate from "../../components/ClientTablePrivate/ClientTablePrivate";
import ClientArchive from "../../components/ClientArchive/ClientArchive";
import { Search, Filter, Download, Upload, CirclePlus, RefreshCw, CloudSync } from 'lucide-react';
import "./client-records.css";
import { db } from "../../firebase-config";
import ClientAddModal from "../../components/ClientAddModal/ClientAddModal";
import ClientEditModal from "../../components/ClientEditModal/ClientEditModal";
import ClientViewModal from "../../components/ClientViewModal/ClientViewModal";
import ClientDeleteModal from "../../components/ClientDeleteModal/ClientDeleteModal";
import ClientAddModalPrivate from "../../components/ClientAddModalPrivate/ClientAddModalPrivate";
import ClientEditModalPrivate from "../../components/ClientEditModalPrivate/ClientEditModalPrivate";
import ClientViewModalPrivate from "../../components/ClientViewModalPrivate/ClientViewModalPrivate";
import ImportModal from "../../components/ImportModal/ImportModal";
import ReferredAndServed from "../../components/ReferredAndServed/ReferredAndServed";
import ClientAddModalReferred from "../../components/ClientAddModalReferred/ClientAddModalReferred";
import ClientEditModalReferred from "../../components/ClientEditModalReferred/ClientEditModalReferred";
import ClientViewModalReferred from "../../components/ClientViewModalReferred/ClientViewModalReferred";
import KoboSyncModal from "../../components/KoboSyncModal/KoboSyncModal";
import { PUBLIC_FORM_CONFIG, PRIVATE_FORM_CONFIG } from "../../utils/kobo-form-configs.js";

function ClientRecords() {

  // STATES
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [activeTab, setActiveTab] = useState("public");
  const [filterCategory, setFilterCategory] = useState("");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showKoboSyncModal, setShowKoboSyncModal] = useState(false);
  const [syncConfig, setSyncConfig] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    spouse_name: "",
    sex: "",
    civil_status_male: "",
    civil_status_female: "",
    birthdate_male: "",
    birthdate_female: "",
    address: "",
    barangay: "",
    educational_attainment_male: "",
    educational_attainment_female: "",
    no_of_children: "",
    fp_method: "",
    intention_to_shift: "",
    type: "",
    status: "",
    reason: "",
    classes_held: ""
  });

  // COLLECTION HELPER
  const getCollection = useCallback(() => {
    if (activeTab === "private") return "clients_private";
    if (activeTab === "referred") return "clients_referred";
    return "clients_public"; // Default fallback
  }, [activeTab]);


  // READ
  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, getCollection()),
        where("is_archived", "==", false)
      );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setClients(data);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
    setLoading(false);
  }, [getCollection]);

  useEffect(() => {
    if (activeTab !== "archived") {
      fetchClients();
    }
  }, [activeTab, fetchClients]);


  // CREATE
  const handleAdd = async () => {
    try {
      await addDoc(collection(db, getCollection()), {
        ...formData,
        is_archived: false,
        created_at: serverTimestamp()
      });
      setShowAddModal(false);
      resetForm();
      fetchClients();
    } catch (error) {
      console.error("Error adding client:", error);
    }
  };

  // UPDATE
  const handleUpdate = async () => {
    try {
      const docRef = doc(db, getCollection(), selectedClient.id);
      const { id, created_at, ...updateData } = formData;
      await updateDoc(docRef, {
        ...updateData,
        updated_at: serverTimestamp()
      });
      setShowEditModal(false);
      resetForm();
      fetchClients();
    } catch (error) {
      console.error("Error updating client:", error);
    }
  };

  // ARCHIVE
  const handleDelete = async () => {
    try {
      await updateDoc(doc(db, getCollection(), selectedClient.id), {
        is_archived: true,
        updated_at: serverTimestamp()
      });
      setShowDeleteModal(false);
      setSelectedClient(null);
      fetchClients();
    } catch (error) {
      console.error("Error archiving client:", error);
    }
  };

  // EXPORT
  // ─── Tab-specific export configs ─────────────────────────────────
  const EXPORT_CONFIG = {
    public: {
      template: "/Export_Template.xlsx",
      filename: "RPFP_Form_1.xlsx",
      writeRows: writePublicRows,   // your existing logic
    },
    private: {
      template: "/Private_Template.xlsx",
      filename: "FP_User_Private.xlsx",
      writeRows: writePrivateRows,
    },
    referred: {
      template: "/Export_Template_Referred.xlsx",
      filename: "Referred_and_Served.xlsx",
      writeRows: writeReferredRows,
    },
  };

  // ─── Shared helpers ───────────────────────────────────────────────
  const thin = { style: "thin" };
  const border = { top: thin, bottom: thin, left: thin, right: thin };
  const noBorder = { top: { style: null }, bottom: { style: null }, left: { style: null }, right: { style: null } };
  const center = { horizontal: "center", vertical: "middle", wrapText: true };
  const left = { horizontal: "left", vertical: "middle", wrapText: true };

  const setCell = (sheet, ref, value, align = center) => {
    const cell = sheet.getCell(ref);
    cell.value = value;
    cell.border = border;
    cell.alignment = align;
    cell.font = { name: "Arial", size: 10 };
  };

  // ─── Row writers ──────────────────────────────────────────────────
  function writePublicRows(sheet, filteredClients) {
    const allCols = ["B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"];

    // Clear rows 6–500
    for (let r = 6; r <= 500; r++) {
      allCols.forEach(col => {
        const cell = sheet.getCell(`${col}${r}`);
        cell.value = null;
        cell.style = { border: noBorder, fill: { type: "pattern", pattern: "none" }, font: {}, alignment: {} };
      });
    }

    filteredClients.forEach((client, index) => {
      const husbandRow = 6 + index * 2;
      const wifeRow = husbandRow + 1;

      const merges = ["B", "H", "J", "K", "L", "M", "N", "O", "P"];
      merges.forEach(col => { try { sheet.mergeCells(`${col}${husbandRow}:${col}${wifeRow}`); } catch { } });
      try { sheet.mergeCells(`C${husbandRow}:D${husbandRow}`); } catch { }
      try { sheet.mergeCells(`C${wifeRow}:D${wifeRow}`); } catch { }

      // Husband row
      setCell(sheet, `B${husbandRow}`, index + 1);
      setCell(sheet, `C${husbandRow}`, client.name || "", left);
      setCell(sheet, `E${husbandRow}`, "M");
      setCell(sheet, `F${husbandRow}`, client.civil_status_male || "");
      setCell(sheet, `G${husbandRow}`, client.birthdate_male || "");
      setCell(sheet, `H${husbandRow}`, client.address || "", left);
      setCell(sheet, `I${husbandRow}`, client.educational_attainment_male || "");
      setCell(sheet, `J${husbandRow}`, client.no_of_children ? Number(client.no_of_children) : "");
      setCell(sheet, `K${husbandRow}`, client.fp_method || "");
      setCell(sheet, `L${husbandRow}`, client.intention_to_shift || "");
      setCell(sheet, `M${husbandRow}`, client.type || "");
      setCell(sheet, `N${husbandRow}`, client.status || "");
      setCell(sheet, `O${husbandRow}`, client.reason || "");
      setCell(sheet, `P${husbandRow}`, "");

      // Wife row
      setCell(sheet, `C${wifeRow}`, client.spouse_name || "", left);
      setCell(sheet, `E${wifeRow}`, "F");
      setCell(sheet, `F${wifeRow}`, client.civil_status_female || "");
      setCell(sheet, `G${wifeRow}`, client.birthdate_female || "");
      setCell(sheet, `I${wifeRow}`, client.educational_attainment_female || "");

      // Patch borders on merged wife-row cells
      merges.forEach(col => {
        sheet.getCell(`${col}${wifeRow}`).border = border;
      });
    });
  }

  function writePrivateRows(sheet, filteredClients) {
    const allCols = ["B", "C", "D", "E", "F", "G"];

    // Clear rows 7–100
    for (let r = 7; r <= 100; r++) {
      allCols.forEach(col => {
        const cell = sheet.getCell(`${col}${r}`);
        cell.value = null;
        cell.style = {
          border: noBorder,
          fill: { type: "pattern", pattern: "none" },
          font: {},
          alignment: {},
        };
      });
    }

    filteredClients.forEach((client, index) => {
      const row = 7 + index;

      setCell(sheet, `B${row}`, client.name || "", left);
      setCell(sheet, `C${row}`, client.age || "");
      setCell(sheet, `D${row}`, client.birthdate || "");
      setCell(sheet, `E${row}`, client.barangay || "", left);
      setCell(sheet, `F${row}`, client.fp_method || "");
      setCell(sheet, `G${row}`, client.fp_issued_by || "", left);
    });
  }

  function writeReferredRows(sheet, filteredClients) {
    const allCols = ["B", "C", "D", "E", "F", "G", "H", "I", "J"];

    // Clear rows 5–200
    for (let r = 5; r <= 200; r++) {
      allCols.forEach(col => {
        const cell = sheet.getCell(`${col}${r}`);
        cell.value = null;
        cell.style = {
          border: noBorder,
          fill: { type: "pattern", pattern: "none" },
          font: {},
          alignment: {},
        };
      });
    }

    filteredClients.forEach((client, index) => {
      const row = 5 + index;

      setCell(sheet, `B${row}`, index + 1);
      setCell(sheet, `C${row}`, client.name || "", left);
      setCell(sheet, `D${row}`, client.address || "", left);
      setCell(sheet, `E${row}`, client.FP_method || "");
      setCell(sheet, `F${row}`, client.facility_name || "", left);
      setCell(sheet, `G${row}`, client.facility_address || "", left);
      setCell(sheet, `H${row}`, client.referred_by || "", left);
      setCell(sheet, `I${row}`, client.volunteer_contact || "");
      setCell(sheet, `J${row}`, client.date || "");
    });
  }

  // ─── Main export handler ──────────────────────────────────────────
  const handleExport = async () => {
    const config = EXPORT_CONFIG[activeTab];
    if (!config) return;

    try {
      const response = await fetch(config.template);
      const arrayBuffer = await response.arrayBuffer();

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      const sheet = workbook.getWorksheet(1);

      config.writeRows(sheet, filteredClients);

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), config.filename);

    } catch (error) {
      console.error("Export failed:", error);
      alert(`Could not export. Make sure '${config.template.replace("/", "")}' is in your public folder!`);
    }
  };

  // HELPERS
  const resetForm = () => {
    setFormData({
      name: "",
      spouse_name: "",
      sex: "",
      civil_status_male: "",
      civil_status_female: "",
      birthdate_male: "",
      birthdate_female: "",
      address: "",
      barangay: "",
      educational_attainment_male: "",
      educational_attainment_female: "",
      no_of_children: "",
      fp_method: "",
      intention_to_shift: "",
      type: "",
      status: "",
      reason: "",
      classes_held: ""
    });
    setSelectedClient(null);
  };

  const openEditModal = (client) => {
    setSelectedClient(client);
    setFormData({ ...client });
    setShowEditModal(true);
  };

  const openViewModal = (client) => {
    setSelectedClient(client);
    setShowViewModal(true);
  };

  const openDeleteModal = (client) => {
    setSelectedClient(client);
    setShowDeleteModal(true);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };


  // FILTER
  const filteredClients = clients.filter((client) => {
    const query = searchQuery.toLowerCase();

    if (activeTab === "referred") {
      return (
        client.name?.toLowerCase().includes(query) ||
        client.facility_name?.toLowerCase().includes(query) ||
        client.referred_by?.toLowerCase().includes(query) ||
        client.address?.toLowerCase().includes(query)
      );
    }

    const matchesSearch =
      client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.spouse_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.fp_method?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesMethod = filterMethod ? client.fp_method === filterMethod : true;

    // FP Users 
    const matchesCategory =
      filterCategory === "fp_users" // FP Users
        ? client.fp_method && client.fp_method.trim() !== ""
        : filterCategory === "unmet_needs" // Unmet Needs
          ? client.type && client.type.trim() !== ""
          : filterCategory === "intention_to_shift" // Intention to Shift
            ? client.intention_to_shift && client.intention_to_shift.trim() !== ""
            : true; // All Records

    return matchesSearch && matchesMethod && matchesCategory;
  });


  // RENDER
  return (
    <>
      <div className="client-records-container">

        {/* HEADER */}
        <div className="toolbar-header-client">
          <h2 className="client-record-h2">Client Records</h2>
          <p className="p-sub-title-client">Responsible Parenthood and Family Planning Program</p>

          {/* TABS */}
          <div className="tabs-client">
            <div className="view-tabs-client">
              <button
                className={`tab-button ${activeTab === "public" ? "tab-active" : ""}`}
                onClick={() => { setActiveTab("public"); setFilterCategory(""); }}>FP Public</button>
              <button
                className={`tab-button ${activeTab === "private" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("private")}>FP Private</button>

              <button
                className={`tab-button ${activeTab === "referred" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("referred")}>Referred & Served</button>

              <button
                className={`tab-button ${activeTab === "archived" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("archived")}>Archived</button>
            </div>

                  <div className="toolbar-actions">
                  {activeTab === "public" && (
                    <button className="btn-sync-client" onClick={() => { setSyncConfig(PUBLIC_FORM_CONFIG); setShowKoboSyncModal(true); }}>
                      <CloudSync size={16} strokeWidth={2.0} /> Sync Public Form
                    </button>)}
                  {activeTab === "private" && (
                    <button className="btn-sync-client" onClick={() => { setSyncConfig(PRIVATE_FORM_CONFIG); setShowKoboSyncModal(true); }}>
                      <CloudSync size={16} strokeWidth={2.00} />Sync Private Form
                    </button>)}
                  <button className="btn-add-client" onClick={() => setShowAddModal(true)}>
                    <CirclePlus size={16}  strokeWidth={1.75} />
                    {activeTab === "referred" ? "Add New Referral" : "Add New Client"}
                  </button>
                </div>
      
          </div>

          <div className="client-toolbar">

            <div className="client-search">
              <Search size={14} color="#9ca3af" />
              <input
                type="text"
                placeholder={
                  activeTab === "archived"
                    ? "Search archived records..."
                    : activeTab === "referred"
                      ? "Search by name, facility, or referrer..."
                      : "Search by name, address, or method..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {activeTab !== "archived" && (
              <>
                {activeTab === "public" && (
                  <select
                    className="client-filter-select"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                  >
                    <option value="">All Records</option>
                    <option value="fp_users">FP Users</option>
                    <option value="unmet_needs">Unmet Needs</option>
                    <option value="intention_to_shift">Intention to Shift</option>
                  </select>
                )}

                {(activeTab === "public" || activeTab === "private"|| activeTab === "referred") && (
                  <select
                    className="client-filter-select"
                    value={filterMethod}
                    onChange={(e) => setFilterMethod(e.target.value)}
                  >
                    <option value="">All FP Method</option>
                    <option value="Condom">Condom</option>
                    <option value="IUD">IUD</option>
                    <option value="Pills">Pills</option>
                    <option value="Injectable">Injectable</option>
                    <option value="Vasectomy">Vasectomy</option>
                    <option value="Tubal Ligation">Tubal Ligation</option>
                    <option value="Implant">Implant</option>
                    <option value="CMM/Billings">CMM/Billings</option>
                    <option value="BBT">BBT</option>
                    <option value="Symptothermal">Symptothermal</option>
                    <option value="SDM">SDM</option>
                    <option value="LAM">LAM</option>
                  </select>

                )}


                {/* Main Action Buttons */}
            {(activeTab === "public" || activeTab === "private" || activeTab === "referred") && (
            <div className="btn-tab-actions">
              <button className="btn-export" onClick={handleExport}>
                <Download size={14} /> Export
              </button>

              <button className="btn-import" onClick={() => setShowImportModal(true)}>
                <Upload size={14} /> Import
              </button>
            </div>
            )}
              </>
            )}
          </div>
        </div>

        {/* TABLES */}
        <div className="client-table-wrapper">
          {activeTab === "public" && (
            <ClientTable
              clients={filteredClients}
              loading={loading}
              onView={openViewModal}
              onEdit={openEditModal}
              onDelete={openDeleteModal}
              isArchived={false}
              onRestore={() => { }}
            />
          )}
          {activeTab === "referred" && (
            <ReferredAndServed
              clients={filteredClients}
              loading={loading}
              onView={openViewModal}
              onEdit={openEditModal}
              onDelete={openDeleteModal}
              isArchived={false}
              onRestore={() => { }}
            />
          )}
          {activeTab === "private" && (
            <ClientTablePrivate
              clients={filteredClients}
              loading={loading}
              onView={openViewModal}
              onEdit={openEditModal}
              onDelete={openDeleteModal}
              isArchived={false}
              onRestore={() => { }}
            />
          )}
          {activeTab === "archived" && (
            <ClientArchive searchQuery={searchQuery} />
          )}
        </div>

      </div>

      {/* IMPORT MODAL */}
      {showImportModal && (
        <ImportModal
          collectionName={getCollection()}
          tabType={activeTab}
          onClose={() => setShowImportModal(false)}
          onSuccess={fetchClients}
        />
      )}

      {/* ADD MODALS */}
      {showAddModal && activeTab === "public" && (
        <ClientAddModal
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchClients}
        />
      )}
      {showAddModal && activeTab === "private" && (
        <ClientAddModalPrivate
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchClients}
        />
      )}
      {showAddModal && activeTab === "referred" && (
        <ClientAddModalReferred
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchClients}
        />
      )}

      {/* EDIT MODALS */}
      {showEditModal && activeTab === "public" && selectedClient && (
        <ClientEditModal
          client={selectedClient}
          onClose={() => { setShowEditModal(false); setSelectedClient(null); }}
          onSuccess={fetchClients}
        />
      )}
      {showEditModal && activeTab === "private" && selectedClient && (
        <ClientEditModalPrivate
          client={selectedClient}
          onClose={() => { setShowEditModal(false); setSelectedClient(null); }}
          onSuccess={fetchClients}
        />
      )}
      {showEditModal && activeTab === "referred" && selectedClient && (
        <ClientEditModalReferred
          client={selectedClient}
          onClose={() => { setShowEditModal(false); setSelectedClient(null); }}
          onSuccess={fetchClients}
        />
      )}

      {/* VIEW MODALS */}
      {showViewModal && activeTab === "public" && selectedClient && (
        <ClientViewModal
          client={selectedClient}
          onClose={() => { setShowViewModal(false); setSelectedClient(null); }}
        />
      )}
      {showViewModal && activeTab === "private" && selectedClient && (
        <ClientViewModalPrivate
          client={selectedClient}
          onClose={() => { setShowViewModal(false); setSelectedClient(null); }}
        />
      )}
      {showViewModal && activeTab === "referred" && selectedClient && (
        <ClientViewModalReferred
          client={selectedClient}
          onClose={() => { setShowViewModal(false); setSelectedClient(null); }}
        />
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && selectedClient && (
        <ClientDeleteModal
          selectedClient={selectedClient}
          onClose={() => setShowDeleteModal(false)}
          handleDelete={handleDelete}
        />
      )}

      {/* KOBO SYNC MODAL */}
      {showKoboSyncModal && (
        <KoboSyncModal
          onClose={() => setShowKoboSyncModal(false)}
          onSuccess={fetchClients}
          config={syncConfig}
        />
      )}
    </>
  );
}

export default ClientRecords;