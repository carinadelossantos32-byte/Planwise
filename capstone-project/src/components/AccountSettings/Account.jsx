import "./account.css"
import Settings from "../../pages/Settings/settings";
import { Camera, CheckCircle,CardSim } from 'lucide-react';
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
                try{
                    if(errors.username || errors.email) return;
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
                    setShowModal(true);
                } catch(error) {
                    console.error("error:"+ error);
                }
            }

    return(
        <>
        

<div id="account-settings-page">
    <h1 >Account Settings</h1>
    <p >Manage your personal information and preferences</p>

    <div  id="account-settings-container">
            <h2 >Profile Information</h2>

            

                {/* Form */}
                <div id="personal-info">
                    <div id="name-field">
                            <h3>Username</h3>
                            <input type="text" placeholder="Enter your username" 
                            value={userData.username}
                             onChange={verifyUsername}/>
                             <p className="error-text">{errors.username}</p>
                    </div>
                

                 <div id="email-field" className="info-field">
                            <h3>Email</h3>
                            <input type="email" placeholder="Enter your email address" 
                            value={userData.email}
                             onChange={verifyEmail}/>
                             <p className="error-text">{errors.email}</p>
                </div>

                <div id="position-field" className="info-field">
                       <h3>Position</h3>
                       <div id="position-display">
                        {userData.role === "cpd" ? "CPD Personnel" : "Health Personnel"}
                        </div>
                </div>
            </div>

              <div id="buttons-field">
                        <button id="cancel-button">Cancel</button>
                        <button id="save-button"
                        onClick={handleUpdateInfo}><CardSim className="w-5 h-5" />Update Changes
                        </button>
                    </div>

            </div>


                  

                    {showModal && (
                        <div className="modal-overlay">
                            <div className="updated-modal-box">
                                
                             <div className="modal-content">
                                <CheckCircle className="update-icon" />
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