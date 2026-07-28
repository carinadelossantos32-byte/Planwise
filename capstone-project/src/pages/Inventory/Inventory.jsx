import "./inventory.css"
import { useEffect, useState } from "react";
import {db} from "../../firebaseConfig"
import { doc, getDoc, getDocs, updateDoc, setDoc, collection } from "firebase/firestore";
import { CheckCircle,RefreshCw, Upload,FileText, SquarePen } from "lucide-react";



function Inventory(){
    const [editingRHUId, setEditingRHUId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [showAllocateError, setShowAllocateError] = useState(false);
    const [showConfirmAllocate, setShowConfirmAllocate] = useState(false);
    const [showAllocateModal, setshowAllocateModal] = useState(false);
    const [showAddStockModal, setshowAddStockModal] = useState(false);
    const [showToast, setShowToast]=useState(false);
    const [stockValue, setStockValue]=useState("");
    const [errorMessage, setErrorMessage]=useState("");

    const [showDeductModal, setShowDeductModal] = useState(false);
    const [showConfirmDeduct, setShowConfirmDeduct] = useState(false);
    const [deductValue, setDeductValue] = useState({});
    const [deductError, setDeductError] = useState("");
    const [showDeductError, setShowDeductError] = useState(false);

    const [rhuData, setRhuData] = useState([]);
    const [stockPerRHU, setstockPerRHU]=useState(0);
    const [remainder, setRemainder]=useState(0);
    const [lowStockLimit, setLowStockLimit]=useState(0);

    const [showRHUInfo, setshowRHUInfo] = useState(false);
    const [selectedRHU, setSelectedRHU] = useState(null);

          async function fetchRHUData(){
            setIsLoading(true);
            const refreshed = await getDocs(collection(db, "rhu"));
            const data = [];
            refreshed.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
            data.sort((a, b) => a.id.localeCompare(b.id));
            setRhuData(data);
            setIsLoading(false);
        }
     useEffect(()=>{
        
            async function fetchInventoryData(){
                const inventorySnap=await getDoc(doc(db,"lowStock","lowStockLimit")); 
                if(inventorySnap.exists()){
                  setLowStockLimit(inventorySnap.data().lowStockLimit || 0);
                }
            }
        
        fetchRHUData();
        fetchInventoryData();
        },[]);
        

        function handleAllocateValue(value) {
        const number = Number(value);

        if(number <= 0){
            setErrorMessage("Please enter a valid number greater than 0");
            return false;
        }

        setErrorMessage("");
         return true;

        
    }

    function handleConfirmDeduct(){
        const hasDeduction = Object.values(deductValue).some(qty => Number(qty) > 0);
        if(!hasDeduction){
            setShowDeductError(true);
            setTimeout(() => setShowDeductError(false), 3000);
            return;

        }
        setDeductError("");
        setShowConfirmDeduct(true);
        setShowDeductModal(false);

    }

    async function ConfirmDeduction(){
        const deductions = Object.entries(deductValue)
            .filter(([_, qty]) => Number(qty) > 0);

        if (deductions.length === 0) {
            setDeductError("Please enter at least one deduction amount.");
            return;
        }

       try{
        const updates = deductions.map(([id, qty]) => {
            const amount = Number(qty);
            const item = rhuData.find((row) => row.id === id);
            const currentStock = item?.stock || 0;
            const finalStock = Math.max(0, currentStock - amount);
            return updateDoc(doc(db,"rhu",id), { stock: finalStock });
        });

        await Promise.all(updates);
        setDeductValue({});
        await fetchRHUData();
        setShowConfirmDeduct(false);




       }catch(error){
        console.error("deduction:",error);
       }
    }
    
    
        
    

    async function ConfirmAllocation(){
        try{
            const totalPopulation = rhuData.reduce((sum, item) => sum + Number(item.total_population || 0), 0);

            await setDoc(doc(db,"inventory","allocation"),{
                totalAllocation:Number(stockValue),
                rhuCount:rhuData.length
                
            });

            const updates =rhuData.map((item)=>{
                const pop = Number(item.total_population || 0);
                const allocated = totalPopulation > 0 ? Math.round((pop/totalPopulation) * Number(stockValue)) : 0;
                return updateDoc(doc(db,"rhu",item.id),{
                    stock:item.stock + allocated
                });
            });

            await Promise.all(updates);
            await fetchRHUData();       

         

        }
        catch(error){
            console.error("allocation:",error);
        }

        setShowConfirmAllocate(false);
        setshowAllocateModal(false);
        setShowToast(true);
        setStockValue("");
        setTimeout(() => { setShowToast(false);setShowToast("");     }, 4000);
    }
        
    

    function handleStockValue(){

       const currentNumber=Number(stockValue);
   
         if (!stockValue || currentNumber <=0 ){
             setShowAllocateError(true);
             setTimeout(() => { setShowAllocateError(false);}, 3000);
             return;
           }
        setShowAllocateError(false);
        setShowConfirmAllocate(true);
    
        }

        const sortedRHUData = [...rhuData].sort((a, b) => {
        const numA = parseInt(a.name.replace(/\D/g, ""));
        const numB = parseInt(b.name.replace(/\D/g, ""));
        return numA - numB;
        });

    function handleBarangay(index, value) {
        if (!selectedRHU) return;
        const updatedBarangays = [...(selectedRHU.barangays || [])];
        updatedBarangays[index] = value;
        setSelectedRHU({ ...selectedRHU, barangays: updatedBarangays });
    }

    function handleAddBarangay() {
        if (!selectedRHU) return;
        setSelectedRHU({
            ...selectedRHU,
            barangays: [...(selectedRHU.barangays || []), ""]
        });
    }

    function handleSaveBarangayChanges() {
        if (!selectedRHU) return;
        const updatedBarangays = (selectedRHU.barangays || []).filter((item) => item && item.trim() !== "");
        setSelectedRHU({ ...selectedRHU, barangays: updatedBarangays });
        setEditingRHUId(null);
    }

    return(
        <>
            <div id="inventory-container">
                <div id= "inventory-topbar">
                                        <h1>CHC Stocks</h1>
                                        <button id="refresh-button" onClick={fetchRHUData}>
                                                <RefreshCw className={isLoading ? "spin-icon" : ""} />
                                                {isLoading ? "Refreshing..." : "Refresh Data"}
                                        </button>
                       
                </div>

                <div id="inventory-report-label">
                    <h3>Inventory Report</h3>
                </div>

                <div className = "cards-container">
                    <div className="inventory-header-content" id="overall-stocks-card">
                        <h3 >Overall Stocks</h3>
                        <h2>{rhuData.reduce((sum, item) => sum + item.stock, 0)}</h2>
                        
                    </div>
                    <div className="inventory-header-content" id="low-stock-card">
                        <h3 >RHU with Low Stocks</h3>
                        <h2>{rhuData.filter((item) => item.stock <= lowStockLimit).length}</h2>
                        <p>Out of 10 RHUs</p>
                    </div>
                                        
                </div>

                <div id="inventory-content">
                    <h3 id="rhu-title">City Health Center</h3>

                        {sortedRHUData.map((item) => (
                            <div className="rhu-row" key={item.id}>
                                <span className="rhu-name">{item.name}</span>
                                <progress className="rhu-progress" 
                                value={item.stock} 
                                max={Math.max(...sortedRHUData.map(r => r.stock), 1)} ></progress>
                                <span className="rhu-stock-count">{item.stock} stocks</span>
                                <SquarePen color="#14086d" hover:color="#6f26e4" strokeWidth={0.75} className="rhu-edit-icon"
                                    onClick={() => { setSelectedRHU(item); setshowRHUInfo(true); setEditingRHUId(null); }}
                                    Update
                                />
                        
                            </div>
                            
                        ))}
                </div>           



                    {showRHUInfo && selectedRHU && (
                        <div className="modal-overlay">
                            <div className="modal-content rhu-info-box">

                                <div className="rhu-detail-header">
                                <p className="rhu-detail-name"> {selectedRHU.name}</p>

                                <div className="rhu-stat-card">
                                    <p className="rhu-stat">Current Stock: {selectedRHU.stock}</p>
                                    <p className="rhu-stat ">Total Population: {selectedRHU ? Number(selectedRHU.total_population || 0).toLocaleString() : 0}</p>
                                </div>
                                
                                    <div className="barangay-section">
                                      <div className="barangay-header">
                                        <p>Barangays: </p>
                                        <SquarePen color="#14086d" hover:color="#6f26e4" strokeWidth={0.75} className="rhu-edit-icon"
                                        onClick={() => setEditingRHUId(selectedRHU.id)}
                                        Update
                                    />
                                     </div>
                                       

                                        {editingRHUId === selectedRHU?.id ? (
                                            <div className="barangay-edit-list">
                                                {selectedRHU.barangays?.map((brgy, index) => (
                                                    <input
                                                        key={index}
                                                        value={brgy}
                                                        onChange={(e) => handleBarangay(index, e.target.value)}
                                                        className="barangay-input"
                                                    />
                                                ))}
                                                <button onClick={handleAddBarangay}className="add-barangay-link">
                                                    + Add Barangay
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                {selectedRHU.barangays?.map((barangay, index) => (
                                                    <p key={index} className="barangay-item">{barangay}</p>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button className="btn-cancel" onClick={() => { setshowRHUInfo(false); setSelectedRHU(null); setEditingRHUId(null); }}>
                                        Close
                                    </button>

                                    {editingRHUId === selectedRHU?.id ? (
                                        <button className="btn-confirm"
                                            onClick={() => setEditingRHUId(null)}>
                                            Cancel Edit
                                        </button>
                                    ) : null}

                                    <button className="btn-save-changes"
                                    onClick={handleSaveBarangayChanges}>
                                        Update Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    </div>


                    
                
                

                <div id="inventory-actions">

                        <button id="deduct-button" onClick={()=>setShowDeductModal(true)}>
                            Deduct Stock</button>

                        <button id="allocate-button"onClick={()=>setshowAllocateModal(true)}>
                            Allocate Stock</button>
                </div>

                {showAllocateModal && (
                        <div className="modal-overlay">
                            <div className="modal-content allocate-box">
                                
                             <div className="modal-header">
                                <h3>  Allocate Stock</h3>
                                <p className="modal-subtext">Enter total quantity to allocate. It will auto-distributed to each RHU</p>
                            </div>
                        
                            <div className="allocate-input-section">
                                <input type="number" value={stockValue} 
                                onChange={(e) => {setStockValue(e.target.value);handleAllocateValue(e.target.value);}}
                                className="allocate-input" />

                                 {showAllocateError && (
                                        <div className="error-banner">
                                        <span>Please enter a number to allocate</span>
                                        </div>
                                    )}
                            </div>
                            {errorMessage && <p className="error-text">{errorMessage}</p>}

                            <div className="modal-table-wrapper">
                                <table className="modal-table">
                                    {/* head */}
                                    <thead>
                                    <tr>
                                        <th></th>
                                        <th>RHU</th>
                                        <th>Current Stock</th>
                                        <th>Population</th>
                                        <th>Allocated</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                        {sortedRHUData.map((item, index) => {
                                            const totalPopulation = rhuData.reduce((sum, row) => sum + Number(row.total_population || 0), 0);
                                            const population = Number(item.total_population || 0);
                                            const allocated = stockValue ? (totalPopulation > 0 ? Math.round((population / totalPopulation) * parseInt(stockValue)) : 0) : 0;
                                            return (
                                                <tr key={item.id} className="text-base">
                                                    <th>{index + 1}</th>
                                                    <td>{item.name}</td>
                                                    <td>{item.stock} stocks</td>
                                                    <td>{Number(population).toLocaleString()}</td>
                                                    <td>{stockValue ? Number(allocated).toLocaleString() : <span className="text-gray-500">-</span>}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>

                                <div className="modal-footer">
                
                                      <button className="btn-cancel"onClick={()=>setshowAllocateModal(false)}>
                                        Cancel</button>

                                        <button className="btn-confirm-success"onClick={handleStockValue}>Confirm</button>
                                </div>
                            </div>
                            {showConfirmAllocate && (
                            <div className="modal-overlay confirm-overlay">
                                <div className="modal-content confirm-box">
                                    <h3 className="confirm-title">Confirm Stock Allocation</h3>
                                    <p className="confirm-note"> Note: This action will allocate stocks to all RHUs. </p>
                                   <p className="confirm-detail" >Please ensure you have reviewed the current stock levels and the allocation quantities for each RHU before confirming. Click Confirm to authorize the automated ledger updates and finalize the distribution process.</p>
                               
                                
                                <div className="modal-footer confirm-footer">
                                    <button className="btn-cancel-large" onClick={()=> {setShowConfirmAllocate(false); setshowAllocateModal(true);}}
                                    >Cancel
                                    </button>
                                    <button className="btn-confirm-success-large"onClick={ConfirmAllocation}
                                    >Confirm
                                    </button>
                                </div>

                                </div>
                            </div>
                            )}
                            </div>

                            


                        </div>
    
                    )}

                    {showDeductModal && (

                        <div className="modal-overlay">
                                <div className="modal-content deduct-box ">
                                    <h3 className="modal-title">Deduct Stock</h3>

                                    <div className="modal-table-wrapper">
                                    <table className="modal-table">
                                        {/* head */}
                                        <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>RHU Name</th>
                                            <th>Current Stock</th>
                                            <th>Status</th>
                                            <th>Deduct Qty</th>

                                        </tr>
                                        </thead>
                                        <tbody>
                                        {/* row 1 */}
                                        {sortedRHUData.map((item,index)=>(
                                        <tr key={item.id}>
                                            <th>{index + 1}</th>
                                            <td>{item.name}</td>
                                            <td>{item.stock} stocks</td>
                                            
                                            <td>
                                               <span className={`status-badge ${item.stock <= lowStockLimit ? "status-low" : "status-sufficient"}`}>
                                                {item.stock <=lowStockLimit ? 'Low Stock' : 'Sufficient'}</span>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    placeholder="qty"
                                                    min="1"
                                                    max={item.stock}
                                                    value={deductValue[item.id] || ""}
                                                    onChange={(e) => setDeductValue(prev => ({
                                                        ...prev,
                                                        [item.id]: e.target.value
                                                    }))}
                                                    className="deduct-qty-input"
                                                />
                                            </td>
                                        </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                    </div>

                                   
                                    
                                    <div className="modal-footer">

                                         {showDeductError && (
                                        <div className="error-banner">
                                        <span>Please enter at least 1 deduction amount</span>
                                        </div>
                                    )}
                                        <button className="btn-cancel"
                                        onClick={()=>setShowDeductModal (false)}>
                                        Cancel</button>

                                        <button className="btn-confirm-solid"
                                        onClick={handleConfirmDeduct}>
                                        Confirm Deduct</button>
                                    </div>

                        </div>
                        </div>

                       
                    )}

                  

                   

                    {showConfirmDeduct && (
                            <div className="modal-overlay confirm-overlay">
                                <div className="modal-content confirm-box">
                                
                                    <h3 className="confirm-title">Confirm Stock Deduction</h3>
                                    <p className="confirm-note"> Warning: This will permanently deduct stocks from the selected RHUs.</p>
                                   <p className="confirm-detail" >Please review the quantities you entered for each RHU. Only RHUs with a filled quantity will be affected. This action cannot be undone.</p>
                                
                                
                                <div className="modal-footer confirm-footer">
                                     <button className="btn-cancel-large"
                                    onClick={()=> {setShowConfirmDeduct(false); setShowDeductModal(true);}}
                                    >Cancel
                                    </button>
                                    <button className="btn-confirm-success-large"
                                    onClick={ConfirmDeduction}
                                    >Confirm
                                    </button>
                                </div>

                                </div>
                            </div>
                            )}

                   

                      
                    {showToast && (
                        <div id="toast-container">
                        <div id="toast-alert">
                            <CheckCircle size={20} />
                            <div>
                            <span id="toast-title">Inventory Updated</span>
                            <span id="toast-message">
                                Allocation successful. {stockValue} units distributed to all RHUs.
                            </span>
                            </div>
                        </div>
                        </div>
                    )}

                        
                   

            

                
            
           



            



        </>
    )
}

export default Inventory;