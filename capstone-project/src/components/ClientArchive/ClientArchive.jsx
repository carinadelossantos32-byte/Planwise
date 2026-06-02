import { useEffect, useState, useCallback } from "react";
import { collection, getDocs, updateDoc, doc, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase-config";
import ClientTable from "../ClientTable/ClientTable";
import ClientTablePrivate from "../ClientTablePrivate/ClientTablePrivate";
<<<<<<< HEAD
import { Search, X, ArchiveRestore } from "lucide-react"; 
import "./client-archive.css";
=======
import { Search, X, ArchiveRestore } from "lucide-react"; // <-- Added icons here
import "./client-archive.css";
// Import the delete modal CSS so the restore modal looks the same!
>>>>>>> main
import '../ClientDeleteModal/client-delete-modal.css'; 

function ClientArchive() {
    const [publicClients, setPublicClients] = useState([]);
    const [privateClients, setPrivateClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // MODAL STATES
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [clientToRestore, setClientToRestore] = useState(null);
<<<<<<< HEAD
    const [restoreType, setRestoreType] = useState(""); 

    // FETCH BOTH COLLECTIONS
=======
    const [restoreType, setRestoreType] = useState(""); // tracks 'public' or 'private'

    // FETCH BOTH COLLECTIONS (Optimized with Query & useCallback)
>>>>>>> main
    const fetchArchived = useCallback(async () => {
        setLoading(true);
        try {
            // fetch archived public
            const qPublic = query(collection(db, "clients_public"), where("is_archived", "==", true));
            const publicSnapshot = await getDocs(qPublic);
            setPublicClients(publicSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

            // fetch archived private
            const qPrivate = query(collection(db, "clients_private"), where("is_archived", "==", true));
            const privateSnapshot = await getDocs(qPrivate);
            setPrivateClients(privateSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

        } catch (error) {
            console.error("Error fetching archived clients:", error);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchArchived();
    }, [fetchArchived]);

    // OPEN CONFIRMATION MODAL
    const openRestoreModal = (client, type) => {
        setClientToRestore(client);
        setRestoreType(type);
        setShowRestoreModal(true);
    };

    // CONFIRM AND EXECUTE RESTORE
    const confirmRestore = async () => {
        if (!clientToRestore) return;
        
        try {
<<<<<<< HEAD
=======
            // Dynamically pick the collection based on the saved state
>>>>>>> main
            const collectionName = restoreType === "public" ? "clients_public" : "clients_private";
            
            await updateDoc(doc(db, collectionName, clientToRestore.id), {
                is_archived: false,
                updated_at: serverTimestamp()
            });
            
<<<<<<< HEAD
            fetchArchived(); 
            setShowRestoreModal(false); 
            setClientToRestore(null); 
=======
            fetchArchived(); // Refresh the tables
            setShowRestoreModal(false); // Close the modal
            setClientToRestore(null); // Clear state
>>>>>>> main
        } catch (error) {
            console.error(`Error restoring ${restoreType} client:`, error);
        }
    };

    // FILTER
    const filteredPublic = publicClients.filter((client) =>
        client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.spouse_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.fp_method?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredPrivate = privateClients.filter((client) =>
        client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.fp_method?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="client-archive-container">

            {/* SEARCH */}
            <div className="archive-toolbar">
                <div className="client-search">
                    <Search size={14} color="#7c8492" />
                    <input className="client-search-input"
                        type="text"
                        placeholder="Search archived records..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* PUBLIC ARCHIVED TABLE */}
            <div className="archive-section">
                <div className="archive-section-header">
                    <h3>FP Public — Archived</h3>
                    <span className="archive-count">{filteredPublic.length} records</span>
                </div>
                <ClientTable
                    clients={filteredPublic}
                    loading={loading}
                    onView={() => {}}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    isArchived={true}
<<<<<<< HEAD
=======
                    // Trigger modal instead of direct restore
>>>>>>> main
                    onRestore={(client) => openRestoreModal(client, "public")} 
                />
            </div>

            {/* PRIVATE ARCHIVED TABLE */}
            <div className="archive-section">
                <div className="archive-section-header">
                    <h3>FP Private — Archived</h3>
                    <span className="archive-count">{filteredPrivate.length} records</span>
                </div>
                <ClientTablePrivate
                    clients={filteredPrivate}
                    loading={loading}
                    onView={() => {}}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    isArchived={true}
<<<<<<< HEAD
=======
                    // Trigger modal instead of direct restore
>>>>>>> main
                    onRestore={(client) => openRestoreModal(client, "private")}
                />
            </div>

<<<<<<< HEAD
            {/* INLINE RESTORE MODAL */}
=======
            {/* =========================================
                INLINE RESTORE MODAL
                ========================================= */}
>>>>>>> main
            {showRestoreModal && clientToRestore && (
                <div className="modal-overlay-delete">
                    <div className="modal-delete">

                        <button 
                            className="modal-close-delete" 
                            onClick={() => { setShowRestoreModal(false); setClientToRestore(null); }}
                        >
                            <X size={16} />
                        </button>

<<<<<<< HEAD
=======
                        {/* Teal styling to distinguish from the red delete modal */}
>>>>>>> main
                        <div className="archive-icon-circle" style={{ backgroundColor: '#10b981' }}>
                            <ArchiveRestore size={28} color="#fff" />
                        </div>

                        <h2 className="archive-title">Restore client record?</h2>

                        <p className="archive-message">
                            The client record of <span className="archive-name">{clientToRestore.name}</span> 
                            {clientToRestore.spouse_name && (
                                <> & <span className="archive-name">{clientToRestore.spouse_name}</span></>
                            )} 
                            {" "}will be moved back to the active records.
                        </p>

                        <div className="modal-btn-delete">
                            <button 
                                className="btn-cancel-d" 
                                onClick={() => { setShowRestoreModal(false); setClientToRestore(null); }}
                            >
                                Cancel
                            </button>
                            <button 
                                className="btn-archive" 
                                style={{ backgroundColor: '#10b981', color: 'white', border: 'none' }} 
                                onClick={confirmRestore}
                            >
                                <ArchiveRestore size={15} /> Restore
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}

export default ClientArchive;