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
import { exportClientRecordsExcel, exportClientRecordsPDF } from "../../utils/client-record-exports.js";

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
    classes_held: "",
    signature_url: null,
    signature_status: "none",
  });

  // COLLECTION HELPER
  const getCollection = useCallback(() => {
    if (activeTab === "private") return "clients_private";
    if (activeTab === "referred") return "clients_referred";
    return "clients_public"; // Default fallback
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

  // Manual fallback refresh kung kailangan
  const fetchClients = useCallback(() => {
    // Kusang pinapagana ng onSnapshot ang updates
  }, []);

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
    } catch (error) {
      console.error("Error archiving client:", error);
    }
  };

  const handleExport = async () => {
    await exportClientRecordsExcel(activeTab, filteredClients);
  };

  const handleExportPDF = async () => {
    await exportClientRecordsPDF(activeTab, filteredClients);
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
            : true;

    return matchesSearch && matchesMethod && matchesCategory;
  });

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
                </button>
              )}
              {activeTab === "private" && (
                <button className="btn-sync-client" onClick={() => { setSyncConfig(PRIVATE_FORM_CONFIG); setShowKoboSyncModal(true); }}>
                  <CloudSync size={16} strokeWidth={2.00} /> Sync Private Form
                </button>
              )}
              {activeTab !== "archived" && (
                <button className="btn-add-client" onClick={() => setShowAddModal(true)}>
                  <CirclePlus size={16} strokeWidth={1.75} />
                  {activeTab === "referred" ? "Add New Referral" : "Add New Client"}
                </button>
              )}
              <button className="btn-import" onClick={() => setShowImportModal(true)}>
                <Upload size={14} /> Import
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

                {(activeTab === "public" || activeTab === "private" || activeTab === "referred") && (
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
                    <option value="BBT">Basal Body Temperature(BBT)</option>
                    <option value="Symptothermal">Sympto-Thermal Method(STM)</option>
                    <option value="SDM">Standard Days Method(SDM)</option>
                    <option value="LAM">Lactational Amenorrhea Method(LAM)</option>
                  </select>
                )}

                {(activeTab === "public" || activeTab === "private" || activeTab === "referred") && (
                  <div className="btn-tab-actions">
                    <button className="btn-export" onClick={handleExport}>
                      <Download size={14} /> Export Excel
                    </button>
                    <button className="btn-export" onClick={handleExportPDF}>
                      <Download size={14} /> Export PDF
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