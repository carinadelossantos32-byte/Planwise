import "./notification-settings.css"
import Settings from "../../pages/Settings/settings";
function NotificationSettings(){
    return(
        <>
        
        <h1>Notification Preferences</h1>
        <h3>Low Stock Alerts</h3>
        <p>Get notified when commodity levels are low</p>
        
        <h3>New Client Registrations</h3>
        <p>Receive alerts for new FP registrations</p>
        
        <h3>Report Generation</h3>
        <p>Notifications when report is ready to download</p>

        <h3>System Updates</h3>
        <p>Important system maintenance and updates</p>
        </>
    )
}export default NotificationSettings;