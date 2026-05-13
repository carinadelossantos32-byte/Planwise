import "./privacy-settings.css"
import Settings from "../../pages/Settings/settings";
function PrivacySettings(){
    return(
        <>
       
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