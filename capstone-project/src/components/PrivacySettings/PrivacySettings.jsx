import "./privacy-settings.css"
import Settings from "../../pages/Settings/settings";
import eyeOpenIcon from "../../assets/eyeOpen.png";
import eyeClosedIcon from "../../assets/eyeClose.png";

import { useState } from "react";


function PrivacySettings(){
    const [showPassword, setShowPassword] = useState(false);
    return(
        <>

        
        <div id="privacy-settings-page-container">
       
        <h1>Privacy Settings</h1>
        <div id="privacy-settings-container">

            <div id="change-password-section">
                <h3>Change Password</h3>

                <div className="info-section">
                <h5>Current Password</h5>
                <div className="password-input-wrapper">
                    <input type="password" placeholder="Enter your current password" />
                    <img src={showPassword? eyeOpenIcon : eyeClosedIcon} onClick={() => setShowPassword(!showPassword)} alt="toggle password" /> 
                </div>
                </div>

                <div className="info-section">
                <h5>New Password</h5>
                <div className="password-input-wrapper">
                <input type="password" placeholder="Enter your new password" />
                </div>
                </div>

                

                <div className="info-section">
                <h5>Confirm New Password</h5>
                <div className="password-input-wrapper">
                <input type="password" placeholder="Confirm your new password" />
                </div>
                </div>
                <button id="update-password-button">Update Password</button>



            </div>



        </div>

        </div>
        </>
        
    )
}export default PrivacySettings;