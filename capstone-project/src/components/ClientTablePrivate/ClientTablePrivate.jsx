import { useState } from "react";
import './client-table-private.css';
import { SquarePen, Trash2, Eye, ArchiveRestore } from 'lucide-react';


function ClientTablePrivate({ clients, loading, onView, onEdit, onDelete, isArchived, onRestore }) {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10; 

    const safeClients = clients || [];
    const totalPages = Math.ceil(safeClients.length / itemsPerPage);

    const indexOfLastClient = currentPage * itemsPerPage;
    const indexOfFirstClient = indexOfLastClient - itemsPerPage;
    const currentClients = safeClients.slice(indexOfFirstClient, indexOfLastClient);

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) setCurrentPage(prev => prev - 1);
    };

    return (
        <>
            {/* Stats Banner */}
            <div className="stats-banner-private">
                <div className="stat-item-private">
                    <span className="stat-label-private">
                        {isArchived ? "Archived Records" : "Total Records"}
                    </span>
                    <span className="stat-value-private">{safeClients.length}</span>
                </div>
                {!isArchived && (
                    <div className="stat-item-private">
                        <span className="stat-label-private">New This Month</span>
                        <span className="stat-value-private">
                            {safeClients.filter(c => {
                                if (!c.created_at || typeof c.created_at.toDate !== 'function') return false;

                                const date = c.created_at.toDate();
                                const now = new Date();
                                return date.getMonth() === now.getMonth() &&
                                    date.getFullYear() === now.getFullYear();
                            }).length}
                        </span>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="client-table-container-private">
                {loading ? (
                    <div className="table-empty-private">Loading records...</div>
                ) : safeClients.length === 0 ? (
                    <div className="table-empty-private">
                        {isArchived ? "No archived records found." : "No records found."}
                    </div>
                ) : (
                    <>
                        <table className="table table-xs table-pin-rows table-pin-cols">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <td>Name</td>
                                    <td>Age</td>
                                    <td>Birthdate</td>
                                    <td>Address</td>
                                    <td>Barangay</td>
                                    <td>Method Used</td>
                                    <td>FP Issued By (Name of Clinic, Hospital, Lying-In)</td>
                                    <td>Actions</td>
                                </tr>
                            </thead>
                            <tbody>
                                {currentClients.map((client, index) => (
                                    <tr key={client.id} className={isArchived ? "archived-row" : ""}>
                                        <th>{String(indexOfFirstClient + index + 1).padStart(3, "0")}</th>
                                        <td>
                                            <div className="client-name">
                                                <span className="client-name-male">{client.name}</span>
                                            </div>
                                        </td>
                                        <td>{client.age || "—"}</td>
                                        <td>{client.birthdate || "—"}</td>
                                        <td>{client.address || "—"}</td>
                                        <td>{client.barangay || "—"}</td>
                                        <td>
                                            <span className="method-badge">{client.fp_method}</span>
                                        </td>
                                        <td>{client.fp_issued_by || "—"}</td>
                                        <td>
                                            <div className="action-buttons">
                                                {isArchived ? (
                                                    <button className="action-btn restore" onClick={() => onRestore(client)}>
                                                        <ArchiveRestore size={15} strokeWidth={1.5} />
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button className="action-btn view" onClick={() => onView(client)}>
                                                            <Eye size={15} strokeWidth={1.5} />
                                                        </button>
                                                        <button className="action-btn edit" onClick={() => onEdit(client)}>
                                                            <SquarePen size={15} strokeWidth={1.5} />
                                                        </button>
                                                        <button className="action-btn delete" onClick={() => onDelete(client)}>
                                                            <Trash2 size={15} strokeWidth={1.5} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="pagination-controls">
                                <button 
                                    className="page-btn" 
                                    onClick={handlePrevPage} 
                                    disabled={currentPage === 1}
                                >
                                    Previous
                                </button>
                                <span className="page-info">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button 
                                    className="page-btn" 
                                    onClick={handleNextPage} 
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
}

export default ClientTablePrivate;