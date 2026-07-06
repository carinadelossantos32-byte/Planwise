// import "./notification-settings.css"
import { useState, useEffect } from "react";
import {db} from "../../firebaseConfig";
import {doc, getDoc, setDoc} from "firebase/firestore";
import Settings from "../../pages/Settings/settings";
function LowStock(){
    const [isLowStockOn, setisLowStockOn]=useState(false);
    const [lowStockValue, setLowStockValue]=useState("");
    const [showToast, setShowToast]=useState("");
    const [errorMessage, setErrorMessage]=useState("");

        function validateLowStock(value) {
        const number = Number(value);

        if (!value.trim()) {
            setErrorMessage("");
            return false;
        }

        if (isNaN(number) || number <= 0) {
            setErrorMessage("Please enter a valid number greater than 0");
            return false;
        }

        setErrorMessage("");
        return true;
    }
   
     useEffect(()=>{
        async function fetchLowStockSettings(){
            try{
                const docRef = doc(db,"lowStock","lowStockLimit");
                const docSnap = await getDoc(docRef);

                if(docSnap.exists()){
                    const data=docSnap.data();
                    setisLowStockOn(data.isEnabled|| false);
                    setLowStockValue(data.lowStockLimit ? data.lowStockLimit.toString(): "");
                }
            }catch(error){
            console.log("low stock error:" + error);
            }
        } fetchLowStockSettings();},[]);
     
     
     async function handleLowStockValue(){

            const currentNumber=Number(lowStockValue);

            if (!validateLowStock(lowStockValue)) return;

            
                 try{
                    await setDoc(doc(db,"lowStock","lowStockLimit"),{
                        lowStockLimit:currentNumber,
                        isEnabled:isLowStockOn,
                    

                    },{merge:true});
                    setShowToast(`Low stock limit updated to ${currentNumber}`);
                    setTimeout(() => {setShowToast("");}, 3000);

                 }catch(error){
                    console.log("error:" + error);
                 }
             
        }
        async function handleToggle(e){

            const toggleState=e.target.checked;
            setisLowStockOn(toggleState);
            
                 try{
                    await setDoc(doc(db,"lowStock","lowStockLimit"),{
                        isEnabled:toggleState,
                    

                    },{merge:true});
                    setShowToast(`Low stock limit updated to ${currentNumber}`);
                    setTimeout(() => {setShowToast("");}, 3000);

                 }catch(error){
                    console.log("error:" + error);
                 }
             
        }
    
    
    return(
        <>

        {showToast && (
            <div className="toast toast-top toast-end">
                <div className="alert alert-success  rounded-xl px-6 py-4 bg-green-700">
                    <span className="font-semibold text-base text-white">{showToast}</span>
                </div>
            </div>
        )}
        <div className="p-2 w-full bg-gray-100 min-h-screen flex flex-col ">
        <h1 className="text-2xl font-bold mt-0 p-0">Notification Preferences</h1>
        <div className=" card bg-white border border-gray-300 rounded-lg p-3 w-full mt-10 mx-auto  ">

            <div className="flex flex-col px-7 py-4 ">
                
                <div className="flex items-center  justify-between border-b border-gray-300 ">
                    <div className="flex flex-col">
                    <h3 className=" text-2xl font-bold"> Low Stock Alerts</h3>
                    <p className="text-base">Get notified when commodity levels are low</p>
                </div>
                    <input type="checkbox" className="toggle w-16 h-8 rounded-[15px]! bg-gray-300! checked:bg-indigo-600! border-gray-400! checked:border-indigo-600!" 
                    checked={isLowStockOn} onChange={handleToggle}/>
                </div>

                {isLowStockOn && (
                    <div className="flex flex-col gap-3 p-4 mx- 10 my-10 bg-gray-50 border border-gray-200 rounded-lg animate-fadeIn">
                    <label className=" px-5 text-xl font-bold text-gray-700">
                        Set Low Stock Threshold
                    </label>
                    
                    <div className="flex gap-10 mx-5">
                        <input 
                        type="number" 
                        placeholder="Enter minimum qty (e.g. 5)" 
                        value={lowStockValue}
                        onChange={(e) => {setLowStockValue(e.target.value);validateLowStock(e.target.value);}}
                        className="px-5 w-100 h-12 text-black font-semibold text-lg bg-white border-2 border-gray-600 focus:border-indigo-600 focus:outline-none focus:ring-0"
                        />
                        <button 
                        type="button"
                        onClick={handleLowStockValue}
                        className="btn h-12 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-bold px-6 rounded-lg border-none"
                        >
                        Set Limit
                        </button>
                        
                    </div>
                       {errorMessage && <p className="px-5 text-red-500 text-base font-medium ">{errorMessage}</p>}
                    
                    
                    <span className="px-5 *:text-base text-gray-800 italic">
                        Status: System will notify you when stock hits this number.
                    </span>
                    </div>
                )}

            </div>

        </div>
        </div>
        </>
    )
}export default LowStock;