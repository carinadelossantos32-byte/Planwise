import { useState } from "react"
import "./settings.css"
import { useNavigate } from "react-router"
import backArrowLogo from "../../assets/back.png"
import accountLogo from "../../assets/account-logo.png"
import privacyLogo from "../../assets/privacy.png"
import notifLogo from "../../assets/notif.png"
import aboutLogo from "../../assets/about.png"
import logoutLogo from "../../assets/logout.png"
import Account from "../../components/AccountSettings/Account"
import PrivacySettings from "../../components/PrivacySettings/PrivacySettings"
import NotificationSettings from "../../components/NotificationSettings/NotificationSettings"
import AboutSettings from "../../components/AboutSettings/AboutSettings"

function Settings(){
    const navigate = useNavigate();
    const [activePage, setActivePage] = useState("account");
    
    return(
    <>
    <div className="settings-container">

    <div id="settings-nav">
        <div id="back-button">
            <img src={backArrowLogo} alt="back-button" /> 
             <h4>Back</h4>
        </div>
        <div id="search-field" >
            <input id="search-input" type="text" placeholder="Search..." />
        </div>
        <div id="account-field" className={activePage === "account" ? "selected" : ""} onClick={() => setActivePage("account")}>
            <img src={accountLogo} alt="acc-logo" />
            <h4>Account</h4>
        </div>
         <div id="privacy-field" className={activePage === "privacy" ? "selected" : ""} onClick={() => setActivePage("privacy")}>
            <img src={privacyLogo} alt="priv-logo" />
            <h4>Privacy & Security</h4>
        </div>
        <div id="notif-field" className={activePage === "notifications" ? "selected" : ""} onClick={() => setActivePage("notifications")}>
            <img src={notifLogo} alt="notif-logo" />
            <h4>Notifications</h4>
        </div>
        <div id="about-field" className={activePage === "about" ? "selected" : ""} onClick={() => setActivePage("about")}>
            <img src={aboutLogo} alt="about-logo" />
            <h4>About</h4>
        </div>
        
    </div>
    <div id="settings-content">
        {activePage === "account" && <Account />}
        {activePage === "privacy" && <PrivacySettings />}
        {activePage === "notifications" && <NotificationSettings />}
        {activePage === "about" && <AboutSettings />}
    </div>
    </div>

    
    
    </>
    )
}

export default Settings;
