import { useEffect, useState, useCallback } from "react";
import { collection, getDocs, updateDoc, doc, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase-config";
import ClientTable from "../ClientTable/ClientTable";
import ClientTablePrivate from "../ClientTablePrivate/ClientTablePrivate";
import ReferredAndServed from "../ReferredAndServed/ReferredAndServed"; 
import { X, Archive, ArchiveRestore } from "lucide-react";
import "./client-archive.css";

import '../ClientDeleteModal/client-delete-modal.css'; 

function ClientArchive({ searchQuery }) {
    const [publicClients, setPublicClients] = useState([]);
    const [privateClients, setPrivateClients] = useState([]);
    const [referredClients, setReferredClients] = useState([]); 
    const [loading, setLoading] = useState(true);

    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [clientToRestore, setClientToRestore] = useState(null);
    const [restoreType, setRestoreType] = useState(""); 

    const fetchArchived = useCallback(async () => {
        setLoading(true);
        try {
            const qPublic = query(collection(db, "clients_public"), where("is_archived", "==", true));
            const publicSnapshot = await getDocs(qPublic);
            setPublicClients(publicSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

            const qPrivate = query(collection(db, "clients_private"), where("is_archived", "==", true));
            const privateSnapshot = await getDocs(qPrivate);
            setPrivateClients(privateSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

            const qReferred = query(collection(db, "clients_referred"), where("is_archived", "==", true));
            const referredSnapshot = await getDocs(qReferred);
            setReferredClients(referredSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

        } catch (error) {
            console.error("Error fetching archived clients:", error);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchArchived();
    }, [fetchArchived]);

    const openRestoreModal = (client, type) => {
        setClientToRestore(client);
        setRestoreType(type);
        setShowRestoreModal(true);
    };

    const confirmRestore = async () => {
        if (!clientToRestore) return;
        
        try {
            let collectionName = "clients_public";
            if (restoreType === "private") collectionName = "clients_private";
            if (restoreType === "referred") collectionName = "clients_referred";
            
            await updateDoc(doc(db, collectionName, clientToRestore.id), {
                is_archived: false,
                updated_at: serverTimestamp()
            });
            
            fetchArchived(); 
            setShowRestoreModal(false); 
            setClientToRestore(null); 

        } catch (error) {
            console.error(`Error restoring ${restoreType} client:`, error);
        }
    };

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

    const filteredReferred = referredClients.filter((client) =>
        client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.facility_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.referred_by?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.address?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="client-archive-container">

            {/* PUBLIC ARCHIVED TABLE */}
            <div className="archive-section">
                <div className="archive-section-header">
                    <span className="archive-section-icon"><Archive size={15} /></span>
                    <h3>FP Public</h3>
                    <span className="archive-count">{filteredPublic.length} archived</span>
                </div>
                <ClientTable
                    clients={filteredPublic}
                    loading={loading}
                    onView={() => {}}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    isArchived={true}
                    onRestore={(client) => openRestoreModal(client, "public")} 
                />
            </div>

            {/* PRIVATE ARCHIVED TABLE */}
            <div className="archive-section">
                <div className="archive-section-header">
                    <span className="archive-section-icon"><Archive size={15} /></span>
                    <h3>FP Private</h3>
                    <span className="archive-count">{filteredPrivate.length} archived</span>
                </div>
                <ClientTablePrivate
                    clients={filteredPrivate}
                    loading={loading}
                    onView={() => {}}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    isArchived={true}
                    onRestore={(client) => openRestoreModal(client, "private")}
                />
            </div>

            <div className="archive-section">
                <div className="archive-section-header">
                    <span className="archive-section-icon"><Archive size={15} /></span>
                    <h3>Referred & Served</h3>
                    <span className="archive-count">{filteredReferred.length} archived</span>
                </div>
                <ReferredAndServed
                    clients={filteredReferred}
                    loading={loading}
                    onView={() => {}}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    isArchived={true}
                    onRestore={(client) => openRestoreModal(client, "referred")} 
                />
            </div>

            {/* INLINE RESTORE MODAL */}
            {showRestoreModal && clientToRestore && (
                <div className="modal-overlay-delete">
                    <div className="modal-delete">

                        <button 
                            className="modal-close-delete" 
                            onClick={() => { setShowRestoreModal(false); setClientToRestore(null); }}
                        >
                            <X size={16} />
                        </button>
                        <div className="archive-icon-circle archive-icon-circle--restore">
                            <ArchiveRestore size={26} />
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
                                className="btn-archive btn-archive--restore" 
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