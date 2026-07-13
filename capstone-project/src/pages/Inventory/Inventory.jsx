// import "./inventory.css"
import { useEffect, useState } from "react";
import { db } from "../../firebase-config";
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
            
                <div className=" flex items-center justify-between px-5 py-1  border-b border-gray-300">
                     <h1 className="font-bold" >CHC Stocks</h1>`

                    <div className="flex gap-3">
                        <button className="btn bg-white w-40 h-8 border border-[#D1D5DC] rounded-lg px-2 py-5 flex items-center justify-center gap-2 hover:bg-gray-300 text-[16px] text-[#364153]"
                       onClick={fetchRHUData} >
                         <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />  
                            {isLoading ? "Refreshing..." : "Refresh Data"}</button>
                        {/* <button className="btn bg-[#E7000B] w-40 h-8 rounded-lg px-2 py-5 border-0 hover:bg-red-700 text-[16px]">
                            <Upload className="w-5 h-5"/>  
                            Export as PDF</button>
                        <button className="btn bg-[#009966] w-40 h-8 rounded-lg px-2 py-5 border-0 hover:bg-green-800  text-[16px]">
                             <FileText className="w-5 h-5"/>
                            Export as Excel</button> */}
                    </div>
                </div>

                <div className=" flex items-start border border-gray-300 px-15 py-3">
                    <h3 className="font-bold text-gray-900">Inventory Report</h3>
                </div>

                <div className="flex gap-10 w-full px-20 py-9 ">
                    <div className="flex flex-col gap-1 flex-1 max-w-xs rounded-lg p-4 bg-[#4478FE]">
                        <h3 className="text-white text-sm">Overall Stocks</h3>
                        <h2 className="text-white text-3xl font-bold">{rhuData.reduce((sum, item) => sum + item.stock, 0)}</h2>
                        <p className="text-white text-xs">This Month</p>
                    </div>
                    <div className="flex flex-col gap-1 flex-1 max-w-xs rounded-lg p-4  bg-[#22C55E]">
                        <h3 className="text-white text-sm">RHU with Low Stocks</h3>
                        <h2 className="text-white text-3xl font-bold">
                            {rhuData.filter((item) => item.stock <= lowStockLimit).length}
                        </h2>
                        <p className="text-white text-xs">Out of 10 RHUs</p>
                    </div>
                                        
                </div>

                <div className="card bg-white border border-gray-400 rounded-lg p-6  mx-20 my-4">
                    <h3 className="font-bold text-lg mb-4 text-[#00017A]">City Health Center</h3>

                    <div className="flex flex-col gap-3">
                        {sortedRHUData.map((item) => (
                            <div className="flex items-center gap-3 justify-start mx-10" key={item.id}>
                                <span className="text-[15px] font-medium text-gray-700 w-12">{item.name}</span>
                                <progress className="mx-5 progress flex-1 [&::-webkit-progress-value]:bg-[#4478FE] [&::-webkit-progress-bar]:bg-gray-400 h-7 max-w-3xl rounded-xl" 
                                value={item.stock} max={Math.max(...sortedRHUData.map(r => r.stock), 1)} ></progress>
                                <span className="text-[15px] font-medium     text-gray-600 w-20 text-right">{item.stock} stocks</span>
                                <SquarePen color="#14086d" hover:color="#6f26e4" strokeWidth={0.75} className="text-white  w-10 h-5 border-none rounded-xl cursor-pointer"
                                    onClick={() => { setSelectedRHU(item); setshowRHUInfo(true); setEditingRHUId(null); }}
                                    Update
                                />
                        
                            </div>
                            
                        ))}
                    </div>



                    {showRHUInfo && selectedRHU && (
                        <div className="modal modal-open flex items-center justify-center z-50">
                            <div className="modal-box max-w-xl h-3/4 bg-white text-center flex flex-col items-center justify-start gap-6 px-8 py-6 rounded-2xl">
                                <div className="w-full flex flex-col gap-2 items-start my-2 mx-2 px-3 ">
                                <p className="text-3xl text-black font-bold mx-46"> {selectedRHU.name}</p>
                                <p className="text-lg text-black font-medium my-3">Current Stock: {selectedRHU.stock}</p>
                                <p className="text-lg text-black font-medium ">Total Population: {selectedRHU ? Number(selectedRHU.total_population || 0).toLocaleString() : 0}</p>
                                    <div className="flex items-start gap-2 flex-col w-full h-full border-1-gray-300 border rounded-lg px-3 py-2 my-5">
                                      <div className="flex items-center justify-between w-full ">
                                        <p className="text-lg text-black font-medium  my-3">Barangays: </p>
                                        <SquarePen color="#14086d" hover:color="#6f26e4" strokeWidth={0.75} className="text-white  w-10 h-5 border-none rounded-xl cursor-pointer"
                                        onClick={() => setEditingRHUId(selectedRHU.id)}
                                        Update
                                    />
                                        </div>
                                       

                                        {editingRHUId === selectedRHU?.id ? (
                                            <div className="flex flex-col gap-2 w-full">
                                                {selectedRHU.barangays?.map((brgy, index) => (
                                                    <input
                                                        key={index}
                                                        value={brgy}
                                                        onChange={(e) => handleBarangay(index, e.target.value)}
                                                        className="input input-bordered w-full text-sm"
                                                    />
                                                ))}
                                                <button
                                                    onClick={handleAddBarangay}
                                                    className="text-base font-medium text-blue-600 text-left hover:text-blue-700 cursor-pointer"
                                                >
                                                    + Add Barangay
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                {selectedRHU.barangays?.map((barangay, index) => (
                                                    <p key={index}>{barangay}</p>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="w-full flex justify-end items-center gap-2 mt-auto">
                                    <button className="btn bg-gray-500  text-white hover:bg-gray-600 border-none rounded-xl"
                                    onClick={() => { setshowRHUInfo(false); setSelectedRHU(null); setEditingRHUId(null); }}>
                                        Close
                                    </button>

                                    {editingRHUId === selectedRHU?.id ? (
                                        <button className="btn bg-red-500 text-white hover:bg-red-600 border-none rounded-xl"
                                            onClick={() => setEditingRHUId(null)}>
                                            Cancel Edit
                                        </button>
                                    ) : null}

                                    <button className="btn bg-[#4602c5] text-white hover:bg-[#24035a] border-none rounded-xl"
                                    onClick={handleSaveBarangayChanges}>
                                        Update Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    </div>


                    
                
                

                <div className="flex justify-end gap-2 mx-20 mb-10">

                        <button className="btn rounded-lg px-6 py-4 border-none hover:bg-red-800 text-[18px] text-white bg-[#E7000B]" 
                        onClick={()=>setShowDeductModal(true)}>Deduct Stock</button>

                        <button className="btn rounded-lg px-6 py-4 border-none hover:bg-[#1a5c2a] text-[18px] text-white bg-[#237237]" 
                        onClick={()=>setshowAllocateModal(true)}>Allocate Stock</button>

                {showAllocateModal && (
                        <div className="modal modal-open flex items-center justify-center">
                            <div className="modal-box max-w-3xl h-150 bg-white text-start flex flex-col items-center gap-6 px-8 py-6 rounded-2xl">
                                
                             <div className="w-full flex flex-col gap-2">
                                <h3 className="font-bold text-2xl text-center ">  Allocate Stock</h3>
                                <h4 className="text-sm font-bold text-emerald-700 bg-emerald-50/80 px-4 py-2.5 rounded-xl leading-relaxed">
                                    Enter total quantity to allocate. It will auto-distributed to each RHU</h4>
                            </div>
                        
                            <div className="w-full flex flex-col items-start ml-3 ">
                                <input type="number" value={stockValue} 
                                onChange={(e) => {setStockValue(e.target.value);handleAllocateValue(e.target.value);}}
                                className="  focus:outline-none focus:border-[#4602c5] focus:ring-2 focus:ring-[#4602c5]/20 w-48 h-12 text-center text-xl font-bold rounded-xl bg-white border-gray-500 text-gray-900 [&::-webkit-inner-spin-button]:bg-gray-200 [&::-webkit-inner-spin-button]:opacity-40" />

                                 {showAllocateError && (
                                        <div role="alert" className="alert alert-error fixed right-20 m-1 py-0 w-100 h-10 shadow-lg z-20">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <span>Please enter a number to allocate</span>
                                        
                                        </div>
                                    )}
                            </div>
                            {errorMessage && <p className="px-5 text-red-500 text-base font-medium ">{errorMessage}</p>}

                            <div className="overflow-x-auto w-full h-full items-center justify-center rounded-box border  border-gray-200 bg-white">
                                <table className="table rounded-lg w-full">
                                    {/* head */}
                                    <thead>
                                    <tr className="bg-gray-200 text-black" >
                                        <th></th>
                                        <th>RHU</th>
                                        <th>Current Stock</th>
                                        <th>Population</th>
                                        <th>Allocated</th>
                                    </tr>
                                    </thead>
                                    <tbody className="bg-gray-200 w-full rounded-lg border border-gray-300">
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

                                <div className="w-full flex justify-end items-center gap-3 mt-5 px-3    ">
                
                                      <button className="btn bg-gray-400 border-none text-black text-base w-20 h-10 hover:bg-gray-600 rounded-xl"
                                        onClick={()=>setshowAllocateModal(false)}>
                                        Cancel</button>

                                        <button className="btn bg-[#237237]  border-none text-white text-base w-40 h-10 hover:bg-[#1a5c2a] rounded-xl"
                                        onClick={handleStockValue}>
                                        Confirm</button>
                                </div>
                            </div>
                            {showConfirmAllocate && (
                            <div className="modal modal-open flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
                                <div className="modal-box bg-white text-center flex flex-col items-center justify-center gap-5 px-8 py-7 rounded-2xl max-w-large">
                                
                              
                                <div className="flex flex-col gap-4">
                                    <h3 className="font-black text-2xl text-gray-900 leading-tight">
                                    Confirm Stock Allocation
                                    </h3>
                                    <p className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl p-3.5 font-bold text-lg shadow-sm">
                                    Note: This action will allocate stocks to all RHUs. 
                                   </p>
                                   <p className="text-sm text-gray-600 font-medium leading-relaxed px-2" >Please ensure you have reviewed the current stock levels and the allocation quantities for each RHU before confirming. Click Confirm to authorize the automated ledger updates and finalize the distribution process.</p>
                                </div>
                                
                                <div className="w-full flex mt-2 gap-5 items-center justify-center">
                                    <button 
                                    className="btn px-10 h-12 bg-gray-500 hover:bg-gray-700 text-white font-bold text-lg border-none rounded-xl tracking-wide normal-case shadow-md shadow-gray-200 transition-all duration-200"
                                    onClick={()=> {setShowConfirmAllocate(false); setshowAllocateModal(true);}}
                                    >
                                    Cancel
                                    </button>
                                    <button 
                                    className="btn px-10 h-12 bg-green-600 hover:bg-green-700 text-white font-bold text-lg border-none rounded-xl tracking-wide normal-case shadow-md shadow-green-200 transition-all duration-200"
                                    onClick={ConfirmAllocation}
                                    >
                                    Confirm
                                    </button>
                                </div>

                                </div>
                            </div>
                            )}
                            </div>

                            


                        </div>
    
                    )}

                    {showDeductModal && (

                        <div className="modal modal-open flex items-center justify-center">
                                <div className="modal-box max-w-3xl bg-white ">
                                    <h3 className="font-bold text-lg mb-5">Deduct Stock</h3>

                                    <div className="overflow-x-auto">
                                    <table className="table rounded-lg w-full">
                                        {/* head */}
                                        <thead>
                                        <tr className="bg-gray-200 text-black  ">
                                            <th>#</th>
                                            <th>RHU Name</th>
                                            <th>Current Stock</th>
                                            <th>Status</th>
                                            <th>Deduct Qty</th>

                                        </tr>
                                        </thead>
                                        <tbody className="bg-gray-200 w-full rounded-lg border border-gray-300"    >
                                        {/* row 1 */}
                                        {sortedRHUData.map((item,index)=>(
                                        <tr key={item.id} className="bg-white hover:bg-gray-50">
                                            <th>{index + 1}</th>
                                            <td>{item.name}</td>
                                            <td>{item.stock} stocks</td>
                                            
                                            <td>
                                               <span className={`px-2 py-1 rounded-full text-xs font-bold ${item.stock <= lowStockLimit ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
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
                                                    className="input input-bordered input-sm w-full max-w-xs"
                                                />
                                            </td>
                                        </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                    </div>

                                   
                                    
                                    <div className="flex w-full justify-end items-center gap-3 mt-5">

                                         {showDeductError && (
                                        <div role="alert" className="alert alert-error fixed right-70 py-0  w-100 h-10 shadow-lg z-20">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <span>Please enter at least 1 deduction amount</span>
                                        
                                        </div>
                                    )}
                                        <button className="btn bg-gray-400 border-none text-black text-base w-20 h-10 hover:bg-gray-600 rounded-xl"
                                        onClick={()=>setShowDeductModal (false)}>
                                        Cancel</button>

                                        <button className="btn bg-[#E7000B] border-none text-white text-base w-40 h-10 hover:bg-[#bb010a] rounded-xl"
                                        onClick={handleConfirmDeduct}>
                                        Confirm Deduct</button>
                                    </div>

                        </div>
                        </div>

                       
                    )}

                  

                   

                    {showConfirmDeduct && (
                            <div className="modal modal-open flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
                                <div className="modal-box bg-white text-center flex flex-col items-center justify-center gap-5 px-8 py-7 rounded-2xl max-w-large">
                                
                               
                                <div className="flex flex-col gap-4">
                                    <h3 className="font-black text-2xl text-gray-900 leading-tight">
                                    Confirm Stock Deduction
                                    </h3>
                                    <p className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl p-3.5 font-bold text-lg shadow-sm">
                                   Warning: This will permanently deduct stocks from the selected RHUs.
                                    </p>
                                   <p className="text-sm text-gray-600 font-medium leading-relaxed px-2" >Please review the quantities you entered for each RHU. Only RHUs with a filled quantity will be affected. This action cannot be undone.</p>
                                </div>
                                
                                <div className="w-full flex justify-end mt-2 gap-5">
                                     <button className="btn px-10 h-12 bg-gray-500 hover:bg-gray-700 text-white font-bold text-lg border-none rounded-xl tracking-wide normal-case shadow-md shadow-gray-200 transition-all duration-200"
                                    onClick={()=> {setShowConfirmDeduct(false); setShowDeductModal(true);}}
                                    >Cancel
                                    </button>
                                    <button className="btn px-10 h-12 bg-green-600 hover:bg-green-700 text-white font-bold text-lg border-none rounded-xl tracking-wide normal-case shadow-md shadow-green-200 transition-all duration-200"
                                    onClick={ConfirmDeduction}
                                    >Confirm
                                    </button>
                                </div>

                                </div>
                            </div>
                            )}

                   

                      
                    {showToast && (
                        <div className="toast toast-end toast-bottom z-50 p-4 ">
                        <div className="alert alert-success bg-emerald-600 text-white font-bold text-md border-none shadow-xl rounded-xl p-4 flex gap-3 max-w-md">
                            <CheckCircle className="w-6 h-6" />
                            <div>
                            <span className="block font-black text-lg">Inventory Updated</span>
                            <span className="text-sm font-medium text-emerald-50 block mt-0.5">
                                Allocation successful. {stockValue} units distributed to all RHUs.
                            </span>
                            </div>
                        </div>
                        </div>
                    )}

                        
                    </div>

                    
                    

                
            
           



            



        </>
    )
}

export default Inventory;