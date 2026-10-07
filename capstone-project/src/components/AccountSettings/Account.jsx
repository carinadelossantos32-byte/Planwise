import "./account.css"
import { CheckCircle,CardSim } from 'lucide-react';
import { useState,useEffect } from "react";
import { getAuth } from "firebase/auth";
import {db} from "../../firebase-config";
import {doc, getDoc, updateDoc} from "firebase/firestore";
function Account(){
    const [showModal,setShowModal]=useState(false);
    const [hasChanges, setHasChanges]=useState(false);
    const [userData,setUserData] = useState({
        username:"",
        email:"",
        role:""

    });
     const [errors,setErrors] = useState({
        username:"",
        email:"",
       
    });

        function verifyUsername(e) {
            let tempUsername = e.target.value;
            setUserData({...userData, username: tempUsername});
            setErrors({...errors, username: ""});
 
            if (tempUsername.trim().length <= 0) 
                setErrors({...errors, username: "Blankspace is not allowed"});
            else if (tempUsername.trim().length < 3) 
                setErrors({...errors, username: "At least 3 characters"});
            else if(tempUsername.includes(" "))
                setErrors({...errors, username: "No spaces allowed"});
            else if(!tempUsername.trim().match(/^[a-zA-Z0-9_]+$/))
                setErrors({...errors,username:"Only letters, numbers and underscores allowed"})
            else if (!tempUsername.match(/[0-9]/)) 
                 setErrors({...errors, username: "Must contain at least 1 number"});
            else {
                setHasChanges(true);
            }
        }

        function verifyEmail(e) {
            let tempEmail = e.target.value;
            setUserData({...userData, email: tempEmail});
            setErrors({...errors, email: ""});

            if (tempEmail.trim().length <= 0) 
                setErrors({...errors, email: "Blankspace is not allowed"});
            else if (!tempEmail.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) 
                setErrors({...errors, email: "Invalid email address"});
            else {
                setHasChanges(true);
            }
        }

            useEffect(() => {
                const fetchUser = async () => {
                    const auth = getAuth();
                    const currentUserEmail = auth.currentUser?.email;
                    if (!currentUserEmail) {
                        console.log("No logged-in user");
                        return;
                    }

                    const userRef = doc(db, "users", currentUserEmail);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        const data = userSnap.data();
                        setUserData({
                            username: data.username || "",
                            email: data.email || currentUserEmail,
                            role: data.role || ""
                        });
                    } else {
                        console.log("No user document found for", currentUserEmail);
                    }
                };
                fetchUser();
            }, []);

            async function handleUpdateInfo(){
                const nextErrors = { ...errors };
                let hasError = false;

                if (!userData.username.trim()) {
                    nextErrors.username = "Please enter your username";
                    hasError = true;
                } else if (userData.username.trim().length < 3) {
                    nextErrors.username = "At least 3 characters";
                    hasError = true;
                } else if (userData.username.includes(" ")) {
                    nextErrors.username = "No spaces allowed";
                    hasError = true;
                } else if (!/^[a-zA-Z0-9_]+$/.test(userData.username)) {
                    nextErrors.username = "Only letters, numbers and underscores allowed";
                    hasError = true;
                } else if (!/[0-9]/.test(userData.username)) {
                    nextErrors.username = "Must contain at least 1 number";
                    hasError = true;
                }

                if (!userData.email.trim()) {
                    nextErrors.email = "Please enter your email";
                    hasError = true;
                } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(userData.email)) {
                    nextErrors.email = "Invalid email address";
                    hasError = true;
                }

                if (hasError) {
                    setErrors(nextErrors);
                    return;
                }

                if (errors.username || errors.email) return;

                try{
                    const auth = getAuth();
                    const currentUserEmail = auth.currentUser?.email || userData.email;
                    if (!currentUserEmail) {
                        console.log("No logged-in user");
                        return;
                    }

                    await updateDoc(doc(db, "users", currentUserEmail), {
                        username: userData.username,
                        email: userData.email,
                    });
                    setErrors({ username: "", email: "" });
                    setShowModal(true);
                } catch(error) {
                    console.error("error:"+ error);
                }
            }

    return(
        <>
        

<div id="account-settings-page" className="settings-page">
    <h1 className="settings-page-title">Account</h1>
    <p className="settings-page-sub">Manage the profile details for this office account.</p>

    <div id="account-settings-container" className="settings-card">
        <h2 className="settings-card-title">Profile Information</h2>

        <div id="personal-info" className="settings-form">
            <div className="settings-field">
                <label className="settings-label" htmlFor="account-username">Username</label>
                <input id="account-username" className="settings-input" type="text"
                    placeholder="Enter your username"
                    value={userData.username}
                    onChange={verifyUsername}/>
                <p className="settings-error">{errors.username}</p>
            </div>

            <div className="settings-field">
                <label className="settings-label" htmlFor="account-email">Email</label>
                <input id="account-email" className="settings-input" type="email"
                    placeholder="Enter your email address"
                    value={userData.email}
                    onChange={verifyEmail}/>
                <p className="settings-error">{errors.email}</p>
            </div>

            <div className="settings-field">
                <span className="settings-label">Position</span>
                <div className="settings-input settings-input--readonly">
                    {userData.role === "cpd" ? "CPD Personnel" : "Health Personnel"}
                </div>
            </div>

            <div className="settings-actions">
                <button id="save-button" className="settings-btn settings-btn--primary"
                    onClick={handleUpdateInfo}>
                    <CardSim size={16} />Update Changes
                </button>
            </div>
        </div>
    </div>

                    {showModal && (
                        <div className="modal-overlay">
                            <div className="updated-modal-box">
                                
                             <div className="modal-content">
                                <CheckCircle className="updated-icon" />
                                <h3 >Updated Successfully!</h3>
                                <p> Your changes has been saved.</p>
                                
                                </div>
                          
                                    <button className="modal-update-button"
                                    onClick={()=>setShowModal(false)}>OK</button>
                              
                            </div>

                        </div>

                         
                    )}



                   
                      
                   
              

           
                    
        </div>


      
        </>
    )

}export default Account;