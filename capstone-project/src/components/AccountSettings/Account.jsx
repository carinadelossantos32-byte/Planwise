// import "./account.css"
import Settings from "../../pages/Settings/settings";
import { Camera, CheckCircle,CardSim } from 'lucide-react';
import { useState,useEffect } from "react";
import { getAuth } from "firebase/auth";
import {db} from "../../firebaseConfig";
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
        

<div className=" p-2 w-full bg-gray-100 min-h-screen flex flex-col ">
    <h1 className="text-2xl font-bold mb-0 mt-0 p-0">Account Settings</h1>
    <p className="text-sm text-[#444343] mt-0 p-0 mb-2">Manage your personal information and preferences</p>

    <div className="card bg-white border border-gray-300 rounded-lg p-3 w-full flex-1 mx-auto my-20 mt-6">
        <div className="card-body">
            <h2 className="text-xl font-bold mb-4">Profile Information</h2>

            <div className="flex gap-5">

                {/* Form */}
                <div className="flex flex-col flex-1 justify-between min-h-0 gap-4 mx-10 my-2">
                    <div className="flex gap-10 ">
                        <label className="flex flex-col flex-1 gap-1">
                            <span className="font-semibold text-[16px] mb-0.5">Username</span>
                            <input type="text" placeholder="Enter your username" 
                            value={userData.username}
                            className="bg-white text-black font-semibold  text-base border border-gray-900 placeholder:text-base placeholder:text-gray-500 placeholder:font-medium px-3 focus:outline-none! focus:border-[#4602c5]! w-120 h-12 rounded-xl transition-all duration-200"
                             onChange={verifyUsername}/>
                             <p className="text-red-500 text-sm font-medium">{errors.username}</p>
                    </label>

                       
                    </div>

                    <label className="flex flex-col gap-1 ">
                        <span className="font-semibold text-[16px] mb-0.5">Email Address</span>
                        <input type="email" placeholder="Enter your email address" 
                         value={userData.email}
                        className="bg-white font-semibold text-base border border-gray-500 placeholder:text-gray-500 placeholder:text-base placeholder:font-medium 
                        px-3 focus:outline-none! focus:border-[#4602c5]! w-120 h-12 rounded-xl transition-all duration-200"
                        onChange={verifyEmail}/> 
                        <p className="text-red-500 text-sm font-medium">{errors.email}</p>
                       </label>

                    <label className="flex flex-col gap-1 ">
                        <span className="font-semibold text-[16px] mb-0.5">Position</span>
                        <div className="bg-gray-100 font-semibold text-base border border-gray-300 rounded-xl px-3 py-3 text-gray-900 flex items-center w-120 h-12">
                            {userData.role === "cpd" ? "CPD Personnel" : "Health Personnel"}
                        </div>
                    </label>

                    <div className="flex justify-end gap-5 py-0  mt-6">
                        <button className="btn btn-outline bg-gray-100 hover:bg-gray-500 py-6 px-5 border rounded-md">Cancel</button>
                        <button className="btn bg-[#4602c5] text-white hover:bg-[#24035a] border-none py-6  border rounded-md"
                        onClick={handleUpdateInfo}><CardSim className="w-5 h-5" />Update Changes
                        </button>
                    </div>

                    {showModal && (
                        <div className="modal modal-open flex items-center justify-center">
                            <div className="modal-box bg-white text-center flex flex-col items-center justify-between gap-6 px-8 py-6 rounded-2xl">
                                
                             <div className="flex flex-col items-center text-center flex-1">
                                <h3 className="font-bold text-lg">Updated Successfully!</h3>
                                <p className="text-sm mb-2"> Your changes has been saved.</p>
                                <CheckCircle className="w-10 h-10 text-green-500" />
                                </div>
                          
                                    <button className="btn w-20 h-12 bg-[#4602c5] text-base text-white hover:bg-[#24035a]  transition-all duration-200 border-none"
                                    onClick={()=>setShowModal(false)}>OK</button>
                              
                            </div>

                        </div>

                         
                    )}



                   
                      
                   
              

            </div>
                    
        </div>
    </div>
</div>
   </div>    
        </>
    )

}export default Account;