import "./notification-settings.css"
import Settings from "../../pages/Settings/settings";
function NotificationSettings(){
    return(
        <>
        
        <h1>Notification Preferences</h1>
        <div id="notification-container">

            <div className="notif-item">
                <div className="notif-text">
                    <h3>Low Stock Alerts</h3>
                    <p>Get notified when commodity levels are low</p>
                </div>
                <label className="switch">
                    <input type="checkbox" />
                    <span className="slider round"></span>
                </label>
            </div>
            <div className="notif-item">
                <div className="notif-text">
                    <h3>New Client Registrations</h3>
                    <p>Receive alerts for new FP registrations</p>
                </div>
                <label className="switch">
                    <input type="checkbox" />
                    <span className="slider round"></span>
                </label>
            </div>
            <div className="notif-item">
                <div className="notif-text">
                    <h3>Report Generation</h3>
                    <p>Notifications when report is ready to download</p>
                </div>
                <label className="switch">
                    <input type="checkbox" />
                    <span className="slider round"></span>
                </label>
            </div>
            <div className="notif-item">
                <div className="notif-text">
                    <h3>System Updates</h3>
                    <p>Important system maintenance and updates</p>
                </div>
                <label className="switch">
                    <input type="checkbox" />
                    <span className="slider round"></span>
                </label>
            </div>
        </div>
        </>
    )
}export default NotificationSettings;