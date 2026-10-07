import "./about-settings.css";
import { Mail, Phone, Clock } from "lucide-react";

function AboutSettings(){
    return(
        <div id="about-settings-page-container" className="settings-page">
            <h1 className="settings-page-title">About</h1>
            <p className="settings-page-sub">System information and where to get help.</p>

            <div id="about-container" className="settings-card">
                <div id="about-header">
                    <img id="planwise-logo" src="/planwise-logo.svg" alt="PlanWise Logo"/>
                    <div>
                        <h2 className="settings-card-title">PlanWise Family Planning System</h2>
                        <p className="settings-card-sub">A comprehensive family planning management system for health workers and administrators in Malolos City Health Office.</p>
                    </div>
                </div>

                <div id="about-content">
                    <div id="contact-support" className="about-tile">
                        <h3>Contact Support</h3>
                        <div className="about-row">
                            <Mail size={16} />
                            <a href="mailto:system.planwise@gmail.com">system.planwise@gmail.com</a>
                        </div>
                        <div className="about-row">
                            <Phone size={16} />
                            <span>(044) 791 1234</span>
                        </div>
                    </div>

                    <div id="office-hours" className="about-tile">
                        <h3>Office Hours</h3>
                        <div className="about-row">
                            <Clock size={16} />
                            <span>Monday to Friday</span>
                            <span className="about-row-value">8:00 AM to 5:00 PM</span>
                        </div>
                        <div className="about-row">
                            <Clock size={16} />
                            <span>Saturday</span>
                            <span className="about-row-value">8:00 AM to 12:00 PM</span>
                        </div>
                    </div>
                </div>

                <div id="about-footer">
                    <p>© 2026 Malolos City Health Office. All rights reserved.</p>
                </div>
            </div>
        </div>
    )
}

export default AboutSettings;
