import { useState } from "react"
import "./settings.css"
import { useNavigate } from "react-router"
import {Info, LockKeyhole, User, Bell, Search } from "lucide-react";
import Account from "../../components/AccountSettings/Account"
import PrivacySettings from "../../components/PrivacySettings/PrivacySettings"
import LowStockSettings from "../../components/LowStockSettings/LowStock"
import AboutSettings from "../../components/AboutSettings/AboutSettings"

function Settings(){
    const navigate = useNavigate();
    const [activePage, setActivePage] = useState("account");
    
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

        <div id="notif-field" 
        onClick={() => setActivePage("notifications")} 
        className={activePage === "notifications" ? "selected" : ""}
         >
        <Bell size={16} strokeWidth={1} />
        <h4>Low Stock</h4>
        </div>

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
        {activePage === "notifications" && <LowStockSettings/>}
        {activePage === "about" && <AboutSettings />}
    </div>

     </div>

    
    
    </>
    )
}

export default Settings;
