import { useState, useEffect } from "react"
import "./settings.css"
import { useNavigate } from "react-router"
import {Info, LockKeyhole, User, Bell, Search } from "lucide-react";
import Account from "../../components/AccountSettings/Account"
import PrivacySettings from "../../components/PrivacySettings/PrivacySettings"
import LowStockSettings from "../../components/LowStockSettings/LowStock"
import AboutSettings from "../../components/AboutSettings/AboutSettings"
import { auth, db, doc, getDoc } from "../../firebase-config"
import { onAuthStateChanged } from "firebase/auth";

function Settings(){
    const navigate = useNavigate();
    const [activePage, setActivePage] = useState("account");
    const [userRole, setUserRole] = useState(null);
    const isHealth = userRole === "health";
 
   useEffect(() => {
       const unsubscribe = onAuthStateChanged(auth, async (user) => {
           if (!user) {
               setUserRole(null);
               return;
           }

           const userDocRef = doc(db, "users", user.email);
           const userDocSnap = await getDoc(userDocRef);
           if (userDocSnap.exists()) {
               setUserRole(userDocSnap.data().role);
           }
       });

       return () => unsubscribe();
   }, []);
    
    return(
    <>
   

<div className="settings-container">
    <div id="settings-nav">

        <h1>Settings</h1>

        <div id="account-field" 
        onClick={() => setActivePage("account")} 
        className={activePage === "account" ? "selected" : ""}
         >
        <User size={16} strokeWidth={1} />
        <h4>Account</h4>
        </div>

        <div id="privacy-field" 
        onClick={() => setActivePage("privacy")} 
        className={activePage === "privacy" ? "selected" : ""}
         >
        <LockKeyhole size={16} strokeWidth={1} />
        <h4>Privacy & Security</h4>
        </div>

        {isHealth && (
        <div id="notif-field" 
        onClick={() => setActivePage("notifications")} 
        className={activePage === "notifications" ? "selected" : ""}
         >
        <Bell size={16} strokeWidth={1} />
        <h4>Low Stock</h4>
        </div>
        )}

        <div id="about-field" 
        onClick={() => setActivePage("about")} 
        className={activePage === "about" ? "selected" : ""}
         >
        <Info size={16} strokeWidth={1} />
        <h4>About</h4>
        </div>
  
        
    </div>

    <div id="settings-content">
        {activePage === "account" && <Account />}
        {activePage === "privacy" && <PrivacySettings />}
        {activePage === "notifications" && isHealth && <LowStockSettings/>}
        {activePage === "about" && <AboutSettings />}
    </div>

     </div>

    
    
    </>
    )
}

export default Settings;
