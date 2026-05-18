import "./account.css"
import Settings from "../../pages/Settings/settings";
import profileLogo from "../../assets/profile.png";
import uploadLogo from "../../assets/upload.png";
import memoryLogo from "../../assets/memory.png";
function Account(){

    return(
        <>
         
        <h1>Account Settings</h1>
        <h5>Manage your personal information and preferences</h5>

       <div id="account-settings-container">
            <h2>Profile Information</h2>

            <div id="profile-field">
            
                <div id="profile-picture">
                    <img id="profile-logo"src={profileLogo} alt="Profile Picture" />
                    <button  id="upload-picture-button"><img id="upload-logo" src={uploadLogo} alt="Upload Logo" />Upload Photo</button>
                </div>
            

            <div id="personal-info">

                <div id="name-field">
                <div className="info-field">
                    <h3>Username</h3>
                    <input type="text" placeholder="Enter your username" />
                </div>

                <div className="info-field">
                    <h3>Full Name</h3>
                    <input type="text" placeholder="Enter your full name" />
                </div>
                </div>
            

            <div id="email-field">
                <h3>Email Address</h3>
                <input type="email" placeholder="Enter your email address" />
            </div>

        <div id="phone-dept-field">
            <div className="info-field">
                <h3>Phone Number</h3>
                <input type="text" placeholder="+63 9xx xxx xxxx" />
            </div>

            <div className="info-field">
                <h3>Position</h3>
                <input type="text" placeholder="CPD Personnel" />
            </div>
        </div>

            <div id="buttons-field">
                <button id="cancel-button">Cancel</button>
                <button id="save-button"><img id="memory-logo" src={memoryLogo} alt="Memory Logo" />Update Changes</button>

            </div>
            

            
            


</div>
       </div>
       </div>
        </>
    )

}export default Account;