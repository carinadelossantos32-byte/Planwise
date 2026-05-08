import "./settings.css"
import { useNavigate } from "react-router"
import backArrowLogo from "../../assets/back.png"
import accountLogo from "../../assets/account-logo.png"
import privacyLogo from "../../assets/privacy.png"
import notifLogo from "../../assets/notif.png"
import aboutLogo from "../../assets/about.png"

function Settings(){
    const navigate = useNavigate();
    
    return(
    <>
    <p id="content">HELLO WORLD</p>
    <div id="settings-nav">
        <div id="back-button">
            <img src={backArrowLogo} alt="back-button" /> 
             <h4>Back</h4>
        </div>
        <div id="search-field">
            <input id="search-input" type="text" placeholder="Search..." />
        </div>
        <div id="account-field" onClick={() => navigate("/settings/account")}>
            <img src={accountLogo} alt="acc-logo" />
            <h4>Account</h4>
        </div>
         <div id="privacy-field" onClick={() => navigate("/settings/privacy")}>
            <img src={privacyLogo} alt="priv-logo" />
            <h4>Privacy & Security</h4>
        </div>
        <div id="notif-field" onClick={() => navigate("/settings/notifications")}>
            <img src={notifLogo} alt="notif-logo" />
            <h4>Notifications</h4>
        </div>
        <div id="about-field" onClick={() => navigate("/settings/about")}>
            <img src={aboutLogo} alt="about-logo" />
            <h4>About</h4>
        </div>
    </div>
    </>
    )
}

export default Settings;
