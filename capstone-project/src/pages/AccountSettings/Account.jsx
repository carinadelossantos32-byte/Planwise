import "./account.css"
import Settings from "../Settings/settings";
function Account(){

    return(
        <>
        <Settings />   
        <h1>Account Settings</h1>
        <h5>Manage your personal information and preferences</h5>

       <div id="account-settings-container">
            <h3>Profile Information</h3>
            
            <div id="profile-picture">
                <img src="https://via.placeholder.com/150" alt="Profile Picture" />
                <button id="change-picture-button">Change Picture</button>
            </div>

            <div id="personal-info">
                <div>
                    <h3>Username</h3>
                    <input type="text" placeholder="Enter your username" />
                </div>

                <div>
                    <h3>Full Name</h3>
                    <input type="text" placeholder="Enter your full name" />
                </div>
            </div>

            <div id="email-field">
                <h3>Email Address</h3>
                <input type="email" placeholder="Enter your email address" />
            </div>

            <div id="position-field">
                <h3>Position</h3>
                <input type="text" placeholder="CPD Personnel" />
            </div>

            <div id="buttons-field">
                <button id="save-button">Update Changes</button>
                <button id="cancel-button">Cancel</button>
            </div>
            

            
            



       </div>
        </>
    )

}export default Account;