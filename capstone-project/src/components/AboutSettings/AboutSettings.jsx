import "./about-settings.css";

function AboutSettings(){
    return(
        <>

            <h1 >About Planwise</h1>
            <div id="about-container">
                <div id="about-header">
                    <img id="planwise-logo" src="https://maloloscity.gov.ph/wp-content/uploads/2021/09/logo.png" alt="PlanWise Logo"/>
                    <div>
                        <h1>PlanWise Family Planning System</h1>
                        <p >A comprehensive family planning management system for health workers and administrators in Malolos City Health Office.</p>
                    </div>
                </div>

                <div id="about-content">
                    <div id="contact-support" className="content">
                        <h3>Contact Support</h3>
                        <p>Email: <a href="mailto:support@planwise.gov.ph">support@planwise.gov.ph</a></p>
                        <p>Phone: (044) 791-1234</p>
                    </div>

                     <div id="office-hours" className="content">
                    <h3>Office Hours</h3>
                    <p>Monday - Friday: 8:00 AM - 5:00 PM</p>
                    <p>Saturday: 8:00 AM - 12:00 PM</p>
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