
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
import ClientTable from "../../components/ClientTable/ClientTable";
import ClientTablePrivate from "../../components/ClientTablePrivate/ClientTablePrivate";
import ClientArchive from "../../components/ClientArchive/ClientArchive";
import { Search, Filter, Download, Upload, Plus } from 'lucide-react';
import "./client-records.css";
import { db } from "../../firebase-config";
import ClientAddModal from "../../components/ClientAddModal/ClientAddModal";
import ClientEditModal from "../../components/ClientEditModal/ClientEditModal";
import ClientViewModal from "../../components/ClientViewModal/ClientViewModal";
import ClientDeleteModal from "../../components/ClientDeleteModal/ClientDeleteModal";
import ClientAddModalPrivate from "../../components/ClientAddModalPrivate/ClientAddModalPrivate";
import ClientEditModalPrivate from "../../components/ClientEditModalPrivate/ClientEditModalPrivate";
import ClientViewModalPrivate from "../../components/ClientViewModalPrivate/ClientViewModalPrivate";

function ClientRecords() {

  // STATES
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [activeTab, setActiveTab] = useState("public");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    spouse_name: "",
    sex: "",
    civil_status: "",
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
    reason: ""
  });

  // COLLECTION HELPER
  const getCollection = useCallback(() => 
    activeTab === "private" ? "clients_private" : "clients_public"
  , [activeTab]);


  // READ (Optimized with Query & useCallback)
  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      // Use Firestore query to filter out archived records before downloading
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
      
      // Strip out the id and created_at so they don't overwrite server data
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


  // HELPERS
  const resetForm = () => {
    setFormData({
      name: "",
      spouse_name: "",
      sex: "",
      civil_status: "",
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
      reason: ""
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
    const matchesSearch =
      client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.spouse_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.fp_method?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus ? client.status === filterStatus : true;
    const matchesMethod = filterMethod ? client.fp_method === filterMethod : true;
    return matchesSearch && matchesStatus && matchesMethod;
  });

  // RENDER
  return (
    <>
      <div className="client-records-container">

        {/* HEADER */}
        <div className="toolbar-header">
          <h2>Client Records</h2>
          <p className="p-sub-title">Responsible Parenthood and Family Planning Program</p>

          {/* TABS */}
          <div className="view-tabs">
            <button
              className={`tab-btn ${activeTab === "public" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("public")}
            >
              FP Public
            </button>
            <button
              className={`tab-btn ${activeTab === "private" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("private")}
            >
              FP Private
            </button>
            <button
              className={`tab-btn ${activeTab === "archived" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("archived")}
            >
              Archived
            </button>
          </div>

          {/* TOOLBAR — hide on archived tab */}
          {activeTab !== "archived" && (
            <div className="client-toolbar">
              <div className="client-search">
                <Search size={14} color="#9ca3af" />
                <input
                  type="text"
                  placeholder="Search by name, address, or method..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <button className="filter-icon-btn">
                <Filter size={15} />
              </button>

              <select
                className="client-filter-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>

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
                <option value="BTT">BTT</option>
                <option value="Symptothermal">Symptothermal</option>
                <option value="SDM">SDM</option>
                <option value="LAM">LAM</option>
              </select>

              <div className="toolbar-actions">
                <button className="btn-export"><Download size={14} /> Export</button>
                <button className="btn-import"><Upload size={14} /> Import</button>
                <button
                  className="btn-add-client"
                  onClick={() => setShowAddModal(true)}
                >
                  <Plus size={14} /> Add New Client
                </button>
              </div>
            </div>
          )}
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
              onRestore={() => {}}
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
              onRestore={() => {}}
            />
          )}
          {activeTab === "archived" && (
            <ClientArchive />
          )}
        </div>

      </div>

 {/* ----------------- ADD MODALS ----------------- */}
      
      {/* Only show this one if the Public tab is active */}
      {showAddModal && activeTab === "public" && (
        <ClientAddModal
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchClients} 
        />
      )}

      {/* Only show this one if the Private tab is active */}
      {showAddModal && activeTab === "private" && (
        <ClientAddModalPrivate
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchClients} 
        />
      )}

      {/* ----------------- EDIT MODALS ----------------- */}
      
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

      {/* ----------------- VIEW MODALS ----------------- */}
      
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

      {/* ----------------- DELETE MODAL ----------------- */}
      {/* This one is shared, so it doesn't need an activeTab check */}
      {showDeleteModal && selectedClient && (
        <ClientDeleteModal
          selectedClient={selectedClient}
          onClose={() => setShowDeleteModal(false)}
          handleDelete={handleDelete}
        />
      )}
    </>
  );
}

export default ClientRecords;
 
