import { useState } from "react";
import "./client-table.css";
import { SquarePen, Trash2, ArchiveRestore, ImageIcon, Loader2, AlertCircle } from "lucide-react";

function ClientTable({ clients, loading, onView, onEdit, onDelete, isArchived, onRestore }) {
    const [currentPage, setCurrentPage] = useState(1);
    const [previewImage, setPreviewImage] = useState(null);
    const itemsPerPage = 10;

    const safeClients = clients || [];
    const totalPages = Math.ceil(safeClients.length / itemsPerPage);

    const indexOfLastClient = currentPage * itemsPerPage;
    const indexOfFirstClient = indexOfLastClient - itemsPerPage;
    const currentClients = safeClients.slice(indexOfFirstClient, indexOfLastClient);

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) setCurrentPage((prev) => prev - 1);
    };

    return (
        <>
            {/* Stats Banner */}
            <div className="stats-banner">
                <div className="stat-item">
                    <span className="stat-label">{isArchived ? "Archived Records" : "Total Records"}</span>
                    <span className="stat-value">{safeClients.length}</span>
                </div>

                {!isArchived && (
                    <>
                        <div className="stat-item">
                            <span className="stat-label">New This Month</span>
                            <span className="stat-value">
                                {safeClients.filter((c) => {
                                    if (!c.created_at || typeof c.created_at.toDate !== "function") return false;
                                    const date = c.created_at.toDate();
                                    const now = new Date();
                                    return (
                                        date.getMonth() === now.getMonth() &&
                                        date.getFullYear() === now.getFullYear()
                                    );
                                }).length}
                            </span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Active Users</span>
                            <span className="stat-value">
                                {safeClients.filter((c) => c.status === "Active" || c.status === "A").length}
                            </span>
                        </div>
                    </>
                )}
            </div>

            {/* Client Table */}
            <div className="client-table-container">
                {loading ? (
                    <div className="table-empty">Loading records...</div>
                ) : safeClients.length === 0 ? (
                    <div className="table-empty">
                        {isArchived ? "No archived records found." : "No records found."}
                    </div>
                ) : (
                    <>
                        <table className="table table-xs table-pin-rows table-pin-cols">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <td>Name</td>
                                    <td>Sex</td>
                                    <td>Civil Status</td>
                                    <td>Birthdate</td>
                                    <td>Address</td>
                                    <td>Barangay</td>
                                    <td>Highest Educational Attainment</td>
                                    <td>No. of Children</td>
                                    <td>Method Used</td>
                                    <td>Intention to Shift</td>
                                    <td>Type</td>
                                    <td>Status</td>
                                    <td>Reason</td>
                                    <td>Classes Held</td>
                                    <td>Signature</td>
                                    <td>Actions</td>
                                </tr>
                            </thead>

                            <tbody>
                                {currentClients.map((client, index) => (
                                    <tr
                                        key={client.id || index}
                                        className={`${isArchived ? "archived-row" : ""}${!isArchived ? " client-record-row-clickable" : ""}`}
                                        style={{ cursor: isArchived ? undefined : "pointer" }}
                                        tabIndex={isArchived ? undefined : 0}
                                        aria-label={isArchived ? undefined : `View ${client.name || "client"} record`}
                                        onClick={isArchived ? undefined : () => onView(client)}
                                        onKeyDown={isArchived ? undefined : (event) => {
                                            if (event.key === "Enter" || event.key === " ") {
                                                event.preventDefault();
                                                onView(client);
                                            }
                                        }}
                                    >
                                        <th>{String(indexOfFirstClient + index + 1).padStart(3, "0")}</th>
                                        <td>
                                            <div className="client-name">
                                                <span className="client-name-male">{client.name}</span>
                                                <span className="client-name-female">{client.spouse_name || ""}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="client-sex">
                                                <span className="sex-badge male">M</span>
                                                <span className="sex-badge female">F</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="client-civil-status">
                                                <span>{client.civil_status_male || "—"}</span>
                                                <span>{client.civil_status_female || "—"}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="client-birthdate">
                                                <span>{client.birthdate_male || "—"}</span>
                                                <span>{client.birthdate_female || "—"}</span>
                                            </div>
                                        </td>
                                        <td>{client.address || "—"}</td>
                                        <td>{client.barangay || "—"}</td>
                                        <td>
                                            <div className="client-educational-attainment">
                                                <span>{client.educational_attainment_male || "—"}</span>
                                                <span>{client.educational_attainment_female || "—"}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="children-badge">{client.no_of_children || "0"}</span>
                                        </td>
                                        <td>
                                            <span className="method-badge">{client.fp_method || "—"}</span>
                                        </td>
                                        <td>{client.intention_to_shift || "—"}</td>
                                        <td>
                                            <span className="type-badge">{client.type || "—"}</span>
                                        </td>
                                        <td>
                                            <span>{client.status || "—"}</span>
                                        </td>
                                        <td>{client.reason || "—"}</td>
                                        <td>{client.classes_held || "—"}</td>

                                        {/* SIGNATURE COLUMN */}
                                        <td>
                                            {client.signature_url ? (
                                                <div
                                                    className="sig-cell-attached"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        setPreviewImage({ url: client.signature_url, name: client.name });
                                                    }}
                                                    title="Click to zoom signature"
                                                >
                                                    <img
                                                        src={client.signature_url}
                                                        alt={`${client.name}'s Signature`}
                                                        loading="lazy"
                                                        decoding="async"
                                                        className="sig-thumbnail"
                                                    />
                                                    <span className="sig-status-attached">Attached</span>
                                                </div>
                                            ) : client.signature_status === "pending" ? (
                                                <div className="sig-cell-syncing">
                                                    <Loader2 size={14} className="animate-spin" />
                                                    <span className="sig-status-syncing">Syncing...</span>
                                                </div>
                                            ) : client.signature_status === "failed" ? (
                                                <div className="sig-cell-failed" title="Check the Cloud Functions logs for the sync error.">
                                                    <AlertCircle size={14} />
                                                    <span className="sig-status-failed">Sync failed</span>
                                                </div>
                                            ) : (
                                                <div className="sig-cell-none">
                                                    <ImageIcon size={14} />
                                                    <span className="sig-status-none">—</span>
                                                </div>
                                            )}
                                        </td>

                                        <td>
                                            <div className="action-buttons">
                                                {isArchived ? (
                                                    <button className="action-btn restore" onClick={() => onRestore(client)} title="Restore">
                                                        <ArchiveRestore size={15} strokeWidth={1.5} />
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button className="action-btn edit" onClick={(event) => { event.stopPropagation(); onEdit(client); }} title="Edit">
                                                            <SquarePen size={15} strokeWidth={1.5} />
                                                        </button>
                                                        <button className="action-btn delete" onClick={(event) => { event.stopPropagation(); onDelete(client); }} title="Delete">
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
                    </>
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="pagination-controls">
                    <button className="page-btn" onClick={handlePrevPage} disabled={currentPage === 1}>
                        Previous
                    </button>
                    <span className="page-info">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button className="page-btn" onClick={handleNextPage} disabled={currentPage === totalPages}>
                        Next
                    </button>
                </div>
            )}

            {/* Signature Zoom Modal */}
            {previewImage && (
                <div className="sig-modal-overlay" onClick={() => setPreviewImage(null)}>
                    <div className="sig-modal-content" onClick={(e) => e.stopPropagation()}>
                        <h4 className="sig-modal-title">Lagda: {previewImage.name}</h4>
                        <div className="sig-modal-image-box">
                            <img
                                src={previewImage.url}
                                alt="Signature Preview"
                                className="sig-modal-image"
                            />
                        </div>
                        <button className="sig-modal-close-btn" onClick={() => setPreviewImage(null)}>
                            Close
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

export default ClientTable;