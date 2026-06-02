import './client-table-private.css';
import { SquarePen, Trash2, Eye, ArchiveRestore } from 'lucide-react';

function ClientTablePrivate({ clients, loading, onView, onEdit, onDelete, isArchived, onRestore }) {
    return (
        <>
            {/* Stats Banner */}
            <div className="stats-banner-private">
                <div className="stat-item-private">
                    <span className="stat-label-private">
                        {isArchived ? "Archived Records" : "Total Records"}
                    </span>
                    <span className="stat-value-private">{clients?.length || 0}</span>
                </div>
                {!isArchived && (
                    <div className="stat-item-private">
                        <span className="stat-label-private">New This Month</span>
                        <span className="stat-value-private">
                            {clients?.filter(c => {
<<<<<<< HEAD
=======
                                // Safeguard against null server timestamps
>>>>>>> main
                                if (!c.created_at || typeof c.created_at.toDate !== 'function') return false;

                                const date = c.created_at.toDate();
                                const now = new Date();
                                return date.getMonth() === now.getMonth() &&
                                    date.getFullYear() === now.getFullYear();
                            }).length || 0}
                        </span>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="client-table-container-private">
                {loading ? (
                    <div className="table-empty-private">Loading records...</div>
                ) : !clients || clients.length === 0 ? (
                    <div className="table-empty-private">
                        {isArchived ? "No archived records found." : "No records found."}
                    </div>
                ) : (
                    <table className="table table-xs table-pin-rows table-pin-cols">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <td>Name</td>
                                <td>Age</td>
                                <td>Birthdate</td>
                                <td>Address</td>
                                <td>Method Used</td>
                                <td>FP Issued By (Name of Clinic, Hospital, Lying-In)</td>
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
                                        </div>
                                    </td>
                                    <td>{client.age || "—"}</td>
                                    <td>{client.birthdate || "—"}</td>
                                    <td>{client.address || "—"}</td>
                                    <td>
                                        <span className="method-badge">{client.fp_method}</span>
                                    </td>
                                    <td>{client.fp_issued_by || "—"}</td>
                                    <td>
                                        <div className="action-buttons">
                                            {isArchived ? (
                                                <button className="action-btn restore" onClick={() => onRestore(client)}>
                                                    <ArchiveRestore size={15} strokeWidth={1.5} /></button>
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
    );
}

export default ClientTablePrivate;