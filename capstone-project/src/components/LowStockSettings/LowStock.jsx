import "./notification-settings.css"
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
                    setShowToast(`Low stock alerts ${toggleState ? "enabled" : "disabled"}`);
                    setTimeout(() => {setShowToast("");}, 3000);

                 }catch(error){
                    console.log("error:" + error);
                 }
             
        }
    
    
    return(
        <>

        {showToast && (
            <div className="toast-container">
                <div id="toast-alert">
                    <span >{showToast}</span>
                </div>
            </div>
        )}
        <h1>Low Stock Settings</h1>
        <div className="lowstock-shell">
        
        <div id="notification-container">

        <div id="low-stock-item" className="notif-item">
                
                <div className="notif-text">
                    <div className="notif-text-header">
                    <h3>Low Stock Alerts</h3>
                    <p>Get notified when commodity levels are low</p>
                </div>
                <label className="switch">
                    <input type="checkbox"  
                    checked={isLowStockOn} onChange={handleToggle}/>
                    <span className="slider round"></span>
                </label>
                </div>

                {isLowStockOn && (
                    <div className="lowstock-settings">
                    <label>
                        Set Low Stock Threshold
                    </label>
                    
                    <div className="lowstock-input-row">
                        <input 
                        type="number" 
                        placeholder="Enter minimum qty (e.g. 5)" 
                        value={lowStockValue}
                        onChange={(e) => {setLowStockValue(e.target.value);validateLowStock(e.target.value);}}
                        className="lowstock-input"
                        />
                        <button 
                        type="button"
                        onClick={handleLowStockValue}
                        className="lowstock-button"
                        >
                        Set Limit
                        </button>
                        
                    </div>
                       {errorMessage && <p className="error-message">{errorMessage}</p>}
                    
                    
                    <span className="status-text">
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