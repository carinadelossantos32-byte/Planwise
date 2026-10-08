import { useEffect, useState, useCallback } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import ClientTable from "../../components/ClientTable/ClientTable";
import ClientTablePrivate from "../../components/ClientTablePrivate/ClientTablePrivate";
import ClientArchive from "../../components/ClientArchive/ClientArchive";
import { Search, FileSpreadsheet, FileText, Upload, CirclePlus, CloudSync } from 'lucide-react';
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
import { exportClientRecordsExcel, exportClientRecordsPDF } from "../../utils/client-record-exports.js";
import ExportConfirmModal from "../Reports/ExportConfirmModal.jsx";
import ReportSelect from "../../components/ReportSelect/ReportSelect";
import PageHeader from "../../components/PageHeader/PageHeader";

const slugify = (value) =>
  String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const CATEGORY_OPTIONS = [
  { value: "", label: "All Records" },
  { value: "fp_users", label: "FP Users" },
  { value: "unmet_needs", label: "Unmet Needs" },
  { value: "intention_to_shift", label: "Intention to Shift" },
  { value: "new_this_month", label: "New this Month" },
];

const METHOD_OPTIONS = [
  { value: "", label: "All FP Method" },
  { value: "Condom", label: "Condom" },
  { value: "IUD", label: "IUD" },
  { value: "Pills", label: "Pills" },
  { value: "Injectable", label: "Injectable" },
  { value: "Vasectomy", label: "Vasectomy" },
  { value: "Tubal Ligation", label: "Tubal Ligation" },
  { value: "Implant", label: "Implant" },
  { value: "CMM/Billings", label: "CMM/Billings" },
  { value: "BBT", label: "Basal Body Temperature (BBT)" },
  { value: "Symptothermal", label: "Sympto-Thermal Method (STM)" },
  { value: "SDM", label: "Standard Days Method (SDM)" },
  { value: "LAM", label: "Lactational Amenorrhea Method (LAM)" },
];

function ClientRecords() {

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [activeTab, setActiveTab] = useState("public");
  const [filterCategory, setFilterCategory] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showKoboSyncModal, setShowKoboSyncModal] = useState(false);
  const [syncConfig, setSyncConfig] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [exportFormat, setExportFormat] = useState(null);
  const [actionError, setActionError] = useState("");

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
    classes_held: "",
    signature_url: null,
    signature_status: "none",
  });

  const getCollection = useCallback(() => {
    if (activeTab === "private") return "clients_private";
    if (activeTab === "referred") return "clients_referred";
    return "clients_public";
  }, [activeTab]);

  // ⚡ REAL-TIME READ LISTENER (onSnapshot para kusa mag-update kapag natapos ang signature sync)
  useEffect(() => {
    if (activeTab === "archived") return;

    setLoading(true);
    const q = query(
      collection(db, getCollection()),
      where("is_archived", "==", false)
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const data = querySnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setClients(data);
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to clients:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activeTab, getCollection]);

  const fetchClients = useCallback(() => {
  }, []);

  const handleAdd = async () => {
    try {
      await addDoc(collection(db, getCollection()), {
        ...formData,
        is_archived: false,
        created_at: serverTimestamp()
      });
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error("Error adding client:", error);
    }
  };

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
    } catch (error) {
      console.error("Error updating client:", error);
    }
  };

  const handleDelete = async () => {
    try {
      await updateDoc(doc(db, getCollection(), selectedClient.id), {
        is_archived: true,
        updated_at: serverTimestamp()
      });
      setShowDeleteModal(false);
      setSelectedClient(null);
    } catch (error) {
      console.error("Error archiving client:", error);
      setShowDeleteModal(false);
      setActionError("The record could not be archived. Check your connection and try again.");
      setTimeout(() => setActionError(""), 6000);
    }
  };

  const handleExport = (format) => {
    setExportFormat(format);
  };

  const handleConfirmExport = (fileName) => {
    if (!exportFormat) return;

    const exportFunction = exportFormat === "pdf" ? exportClientRecordsPDF : exportClientRecordsExcel;
    setExportFormat(null);
    exportFunction(activeTab, filteredClients, fileName);
  };

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
      classes_held: "",
      signature_url: null,
      signature_status: "none",
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

  // FILTER & SEARCH LOGIC
  const filteredClients = clients.filter((client) => {
    const query = searchQuery.toLowerCase().trim();

    // 1. Search filter (panatilihing buo ang client data)
    const matchesSearch = !query || (
      activeTab === "referred"
        ? client.name?.toLowerCase().includes(query) ||
        client.facility_name?.toLowerCase().includes(query) ||
        client.referred_by?.toLowerCase().includes(query) ||
        client.address?.toLowerCase().includes(query) ||
        client.fp_method?.toLowerCase().includes(query)
        : client.name?.toLowerCase().includes(query) ||
        client.spouse_name?.toLowerCase().includes(query) ||
        client.address?.toLowerCase().includes(query) ||
        client.barangay?.toLowerCase().includes(query) ||
        client.fp_method?.toLowerCase().includes(query)
    );

    // 2. Method dropdown filter
    const matchesMethod = filterMethod
      ? client.fp_method?.toLowerCase() === filterMethod.toLowerCase()
      : true;

    const createdAt = client.created_at;
    const createdDate = createdAt
      ? typeof createdAt.toDate === "function"
        ? createdAt.toDate()
        : new Date(createdAt)
      : null;
    const now = new Date();
    const isNewThisMonth = Boolean(
      createdDate &&
      !Number.isNaN(createdDate.getTime()) &&
      createdDate.getMonth() === now.getMonth() &&
      createdDate.getFullYear() === now.getFullYear()
    );

    // 3. Category dropdown filter (Public tab)
    const matchesCategory =
      filterCategory === "fp_users"
        ? Boolean(client.fp_method && client.fp_method.trim() !== "")
        : filterCategory === "unmet_needs"
          ? (
            Boolean(client.type && client.type.trim() !== "") &&
            !client.status?.toLowerCase().includes("pregnant") &&
            !client.reason?.toLowerCase().includes("achieving")
          )
          : filterCategory === "intention_to_shift"
            ? Boolean(client.intention_to_shift && client.intention_to_shift.trim() !== "")
            : filterCategory === "new_this_month"
              ? isNewThisMonth
              : true;

    return matchesSearch && matchesMethod && matchesCategory;
  });

  // Same filters as the toolbar, so the export always matches the table
  const exportFilterControls = [
    ...(activeTab === "public"
      ? [{
        key: "category",
        label: "Records",
        value: filterCategory,
        onChange: (e) => setFilterCategory(e.target.value),
        options: CATEGORY_OPTIONS,
      }]
      : []),
    {
      key: "method",
      label: "FP Method",
      value: filterMethod,
      onChange: (e) => setFilterMethod(e.target.value),
      options: METHOD_OPTIONS,
    },
  ];

  const exportBaseName = [
    "Client_Records",
    activeTab,
    activeTab === "public" && filterCategory,
    filterMethod && slugify(filterMethod),
  ].filter(Boolean).join("_");

  return (
    <>
      <div className="client-records-container">

        {/* HEADER */}
        <PageHeader
          title="Client Records"
          footer={
            <div className="cr-tabs-row">
              <div className="cr-tabs">
                <button
                  className={`cr-tab ${activeTab === "public" ? "is-active" : ""}`}
                  onClick={() => { setActiveTab("public"); setFilterCategory(""); }}>FP Public</button>
                <button
                  className={`cr-tab ${activeTab === "private" ? "is-active" : ""}`}
                  onClick={() => setActiveTab("private")}>FP Private</button>
                <button
                  className={`cr-tab ${activeTab === "referred" ? "is-active" : ""}`}
                  onClick={() => setActiveTab("referred")}>Referred & Served</button>
                <button
                  className={`cr-tab ${activeTab === "archived" ? "is-active" : ""}`}
                  onClick={() => setActiveTab("archived")}>Archived</button>
              </div>

              {activeTab !== "archived" && (
                <button className="cr-btn cr-btn--primary" onClick={() => setShowAddModal(true)}>
                  <CirclePlus size={16} />
                  {activeTab === "referred" ? "Add New Referral" : "Add New Client"}
                </button>
              )}
            </div>
          }
        >
              {activeTab === "public" && (
                <button className="cr-btn cr-btn--outline" onClick={() => { setSyncConfig(PUBLIC_FORM_CONFIG); setShowKoboSyncModal(true); }}>
                  <CloudSync size={16} /> Sync Public Form
                </button>
              )}
              {activeTab === "private" && (
                <button className="cr-btn cr-btn--outline" onClick={() => { setSyncConfig(PRIVATE_FORM_CONFIG); setShowKoboSyncModal(true); }}>
                  <CloudSync size={16} /> Sync Private Form
                </button>
              )}
              <button className="cr-btn cr-btn--outline" onClick={() => setShowImportModal(true)}>
                <Upload size={15} /> Import
              </button>
        </PageHeader>

        <div className="cr-body">
          <div className="cr-toolbar">
            <div className="cr-search">
              <Search size={15} color="#94a3b8" />
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
                  <div className="cr-select">
                    <ReportSelect
                      ariaLabel="Record category"
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      options={CATEGORY_OPTIONS}
                    />
                  </div>
                )}

                <div className="cr-select cr-select--wide">
                  <ReportSelect
                    ariaLabel="FP method"
                    value={filterMethod}
                    onChange={(e) => setFilterMethod(e.target.value)}
                    options={METHOD_OPTIONS}
                  />
                </div>

                <div className="cr-export">
                  <button className="cr-btn cr-btn--excel" onClick={() => handleExport("excel")}>
                    <FileSpreadsheet size={15} /> Export Excel
                  </button>
                  <button className="cr-btn cr-btn--pdf" onClick={() => handleExport("pdf")}>
                    <FileText size={15} /> Export PDF
                  </button>
                </div>
              </>
            )}
          </div>

          {/* TABLES */}
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

      {actionError && (
        <div className="client-records-error-toast" role="alert">{actionError}</div>
      )}

      {/* KOBO SYNC MODAL */}
      {showKoboSyncModal && (
        <KoboSyncModal
          onClose={() => setShowKoboSyncModal(false)}
          onSuccess={fetchClients}
          config={syncConfig}
        />
      )}

      {exportFormat && (
        <ExportConfirmModal
          format={exportFormat}
          reportName={
            activeTab === "public"
              ? "FP Public Client Records"
              : activeTab === "private"
                ? "FP Private Client Records"
                : "Referred and Served Client Records"
          }
          filters={exportFilterControls}
          defaultFileName={exportBaseName}
          onCancel={() => setExportFormat(null)}
          onConfirm={handleConfirmExport}
        />
      )}
    </>
  );
}

export default ClientRecords;