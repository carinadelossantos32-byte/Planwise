import "./privacy-settings.css"
import {Eye, EyeOff,CheckCircle, Asterisk} from "lucide-react";
import { useState,useEffect } from "react";
import {db} from "../../firebase-config";
import {  EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { auth } from "../../firebase-config";


function PrivacySettings(){
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordData, setPasswordData]=useState({
    currentPassword:"",newPassword:"",confirmPassword:""});
    const [errors, setErrors]=useState({
    currentPassword:"",newPassword:"",confirmPassword:""
    });
    const [showModal,setShowModal]=useState(false);
    const [storedPass,setStoredPass]=useState();

                 

                async function handleUpdatePassword(){
                    const nextErrors = {
                        currentPassword: "",
                        newPassword: "",
                        confirmPassword: ""
                    };
                    let hasError = false;

                    if (!passwordData.currentPassword.trim()) {
                        nextErrors.currentPassword = "Please enter your current password";
                        hasError = true;
                    }
                    if (!passwordData.newPassword.trim()) {
                        nextErrors.newPassword = "Please enter your new password";
                        hasError = true;
                    }
                    if (!passwordData.confirmPassword.trim()) {
                        nextErrors.confirmPassword = "Please confirm your new password";
                        hasError = true;
                    }
                    if (passwordData.newPassword && passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword) {
                        nextErrors.confirmPassword = "New Password and Confirm Password field must match";
                        hasError = true;
                    }

                    if (hasError) {
                        setErrors(nextErrors);
                        return;
                    }

                    if(errors.currentPassword || errors.newPassword || errors.confirmPassword) return;

                    const user = auth.currentUser;
                    if(!user){
                        console.log("No user is currently signed in.");
                        return;
                    }

                     try{
                        const credential = EmailAuthProvider.credential(user.email, passwordData.currentPassword);
                        await reauthenticateWithCredential(user, credential);
                        await updatePassword(user, passwordData.newPassword);
                        setShowModal(true);
                        setPasswordData({currentPassword:"",newPassword:"",confirmPassword:""});
                    }catch(error){
                        if(error.code==="auth/wrong-password" ||error.code==="auth/invalid-credential"){
                            setErrors({...errors,currentPassword:"Current password is incorrect"});
                        }
                        else console.error("error:" + error);
                    }
            }               

        function verifyCurrentPassword(e){
            let tempPass = e.target.value;
            setPasswordData({...passwordData, currentPassword: tempPass});
            setErrors({...errors,currentPassword:""});
            
            if (tempPass.trim().length <= 0)
                setErrors({...errors, currentPassword: "Please enter your current password"});
        }

        function verifyNewPassword(e){
            let tempNewPass = e.target.value;
            setPasswordData({...passwordData, newPassword: tempNewPass});
            setErrors({...errors,newPassword:""});

            if (tempNewPass.trim().length <= 0)
                setErrors({...errors, newPassword: "Blankspace is not allowed"});
            else if (tempNewPass.trim().length <= 8)
                setErrors({...errors, newPassword: "At least 8 characters"});
            else if (!tempNewPass.match(/[0-9]/))
                setErrors({...errors, newPassword: "At least 1 number"});
            else if (!tempNewPass.match(/[A-Z]/))
                setErrors({...errors, newPassword: "At least 1 uppercase"});
            else if (!tempNewPass.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?~`]/))
                setErrors({...errors, newPassword: "Must have special characters"});
            
        }

        function verifyConfirmPassword(e){
            let tempConfirmPass = e.target.value;
            setPasswordData({...passwordData, confirmPassword: tempConfirmPass});
            setErrors({...errors,confirmPassword:""});
            
            if (tempConfirmPass.trim().length <= 0)
                setErrors({...errors, confirmPassword: "Blankspace is not allowed"});

            else if(tempConfirmPass!=passwordData.newPassword){
                setErrors({...errors, confirmPassword: "New Password and Confirm Password field must match"});
            }
            
    


        }
    return(
        <>

        
        <div id="privacy-settings-page-container" >
        <h1>Privacy Settings</h1>

        <div id="privacy-settings-container">
                <div id="change-password-section">
                  <h3 >Change Password</h3>
                
                 <div className="info-section">
                    <div className="asterisk">
                      <h5>Current Password</h5>
                      <Asterisk size={16} color="#ff0000" />
                    </div>
                    <div className="password-input-wrapper">
                        <input type={showPassword? "text":"password"} placeholder="Enter your current password" 
                        value={passwordData.currentPassword}
                        onChange={verifyCurrentPassword}
                             />
                        <span className="password-toggle-icon" onClick={() => setShowPassword(!showPassword)} >
                         {showPassword ? <Eye/> : <EyeOff/>}
                         </span>
                            
                    </div>
                    <p className="error-text">{errors.currentPassword}</p>
                </div>

                 <div className="info-section">
                    <div className="asterisk">
                      <h5>New Password</h5>
                      <Asterisk size={16} color="#ff0000" />
                    </div>
                    <div className="password-input-wrapper">
                        <input type={showNewPassword? "text":"password"} placeholder="Enter your new password" 
                        value={passwordData.newPassword}
                        onChange={verifyNewPassword}
                             />
                        <span className="password-toggle-icon" onClick={() => setShowNewPassword(!showNewPassword)} >
                         {showNewPassword ? <Eye /> : <EyeOff/>}
                         </span>
                            
                    </div>
                    <p className="error-text">{errors.newPassword}</p>
                </div>

                <div className="info-section">
                    <div className="asterisk">
                      <h5>Confirm New Password</h5>
                      <Asterisk size={16} color="#ff0000" />
                    </div>
                    <div className="password-input-wrapper">
                        <input type={showConfirmPassword? "text":"password"} placeholder="Confirm your new password" 
                        value={passwordData.confirmPassword}
                        onChange={verifyConfirmPassword}
                             />
                        <span className="password-toggle-icon" onClick={() => setShowConfirmPassword(!showConfirmPassword)} >
                         {showConfirmPassword ? <Eye /> : <EyeOff />}
                         </span>
                            
                    </div>
                    <p className="error-text">{errors.confirmPassword}</p>
                </div>
                   <button id="update-password-button" onClick={handleUpdatePassword}>
                    Update Password</button>
        </div>

                 

                    {showModal && (
                        <div className=" modal-overlay">
                            <div className="success-modal-box">
                                <div className="modal-content">
                                    <CheckCircle className="success-icon"/>
                                    <h3>Updated Successfully!</h3>
                                    <p>Your changes has been saved.</p>
                                    
                                </div>
                                <button className="modal-ok-button" onClick={()=>setShowModal(false)}>OK</button>
                            </div>
                        </div>
                        
                    )}




        </div>

        </div>
        </>
        
    )
}export default PrivacySettings;