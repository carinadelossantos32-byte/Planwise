import "./client-table.css"
import { SquarePen, Trash2, FileText, Eye, ArchiveRestore } from 'lucide-react';

function ClientTable({ clients, loading, onView, onEdit, onDelete, isArchived, onRestore }) {
    return (
        <>
            {/* Stats Banner */}
            <div className="stats-banner">
                <div className="stat-item">
                    <span className="stat-label">{isArchived ? "Archived Records" : "Total Records"}</span>
                    <span className="stat-value">{clients?.length || 0}</span>
                </div>

                {!isArchived && (
                    <>
                        <div className="stat-item">
                            <span className="stat-label">New This Month</span>
                            <span className="stat-value">
                                {clients?.filter(c => {
                                    // Safeguard against null server timestamps
                                    if (!c.created_at || typeof c.created_at.toDate !== 'function') return false;

                                    const date = c.created_at.toDate();
                                    const now = new Date();
                                    return date.getMonth() === now.getMonth() &&
                                        date.getFullYear() === now.getFullYear();
                                }).length || 0}
                            </span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Active Users</span>
                            <span className="stat-value">
                                {clients?.filter(c => c.status === "Active").length || 0}
                            </span>
                        </div>
                    </>
                )}
            </div>

            {/* Client Table */}
            <div className="client-table-container">
                {loading ? (
                    <div className="table-empty">Loading records...</div>
                ) : !clients || clients.length === 0 ? (
                    <div className="table-empty">
                        {isArchived ? "No archived records found." : "No records found."}
                    </div>
                ) : (
                    <table className="table table-xs table-pin-rows table-pin-cols">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <td>Name</td>
                                <td>Sex</td>
                                <td>Civil Status</td>
                                <td>Birthdate</td>
                                <td>Address</td>
                                <td>Highest Educational Attainment</td>
                                <td>No. of Children</td>
                                <td>Method Used</td>
                                <td>Intention to Shift</td>
                                <td>Type</td>
                                <td>Status</td>
                                <td>Reason</td>
                                <td>Actions</td>
                            </tr>
                        </thead>

                        <tbody>
                            {clients.map((client, index) => (
                                <tr key={client.id} className={isArchived ? "archived-row" : ""}>
                                    <th>{String(index + 1).padStart(3, "0")}</th>
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
                                    <td>{client.civil_status}</td>
                                    <td>
                                        <div className="client-birthdate">
                                            <span>{client.birthdate_male}</span>
                                            <span>{client.birthdate_female}</span>
                                        </div>
                                    </td>
                                    <td>{client.address}</td>
                                    <td>
                                        <div className="client-educational-attainment">
                                            <span>{client.educational_attainment_male}</span>
                                            <span>{client.educational_attainment_female}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="children-badge">{client.no_of_children}</span>
                                    </td>
                                    <td>
                                        <span className="method-badge">{client.fp_method}</span>
                                    </td>
                                    <td>{client.intention_to_shift || "—"}</td>
                                    <td>
                                        <span className="type-badge">{client.type}</span>
                                    </td>
                                    <td>
                                        <span>{client.status}</span>
                                    </td>
                                    <td>{client.reason || "—"}</td>
                                    <td>
                                        <div className="action-buttons">

                                            {isArchived ? (
                                                <button className="action-btn restore" onClick={() => onRestore(client)} title="Restore">
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
                )}
            </div>
        </>
    )
}

export default ClientTable;