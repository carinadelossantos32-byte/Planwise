import "./privacy.css"
import Settings from "../Settings/settings";
function PrivacySettings(){
    return(
        <>
        <Settings />    
        <h1>Privacy Settings</h1>
        <h3>Change Password</h3>
        <h5>Current Password</h5>
        <input type="password" placeholder="Enter your current password" />
        <h5>New Password</h5>
        <input type="password" placeholder="Enter your new password" />
        <button id="update-password-button">Update Password</button>
        </>
    )
}export default PrivacySettings;