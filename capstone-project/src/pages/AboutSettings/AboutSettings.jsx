import "./aboutsettings.css"
import Settings from "../Settings/settings";
function AboutSettings(){
    return(
        <>
        <Settings />   
        <div id="about-container">
            <div id="about-header">
                <h1>PlanWise Family Planning System</h1>
                <p>A comprehensive family planning management system for health workers and administrators in Malolos City Health Office.</p>
            </div>

            <div id="about-content">
                <div id="contact-support">
                    <h3>Contact Support</h3>
                    <p><strong>Email:</strong> support@planwise.gov.ph</p>
                    <p><strong>Phone:</strong> (044) 791-1234</p>
                </div>

                <div id="office-hours">
                    <h3>Office Hours</h3>
                    <p><strong>Monday - Friday:</strong> 8:00 AM - 5:00 PM</p>
                    <p><strong>Saturday:</strong> 8:00 AM - 12:00 PM</p>
                </div>
            </div>

            <div id="about-footer">
                <p>© 2026 Malolos City Health Office. All rights reserved.</p>
            </div>
        </div>
        </>
    )
}

export default AboutSettings;