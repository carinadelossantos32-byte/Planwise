import "./privacy-settings.css"
import Settings from "../../pages/Settings/settings";
import {Eye, EyeOff,CheckCircle} from "lucide-react";
import { useState,useEffect } from "react";
import {db} from "../../firebase-config";
import {doc, getDoc, updateDoc} from "firebase/firestore";


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

                 useEffect(() => {
                    const fetchPassword = async () => {
                        const userSnap = await getDoc(doc(db, "testusers", "testUID123"));
                        if (userSnap.exists()) {
                          const data=userSnap.data();
                         setStoredPass(data.password);
                        } else {
                            console.log("No password found");
                        }
                    };
                    fetchPassword();
                }, []);

                async function handleUpdatePassword(){
                    if(errors.currentPassword || errors.newPassword || errors.confirmPassword)return;
                    if(!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword )return;
                     try{
                        await updateDoc(doc(db,"testusers","testUID123"),{
                           password:passwordData.newPassword
                        });
                        setShowModal(true);
                        setPasswordData({currentPassword:"", newPassword:"",confirmPassword:""})
                    }catch(error){console.error("error:"+ error)}
            }               

        function verifyCurrentPassword(e){
            let tempPass = e.target.value;
            setPasswordData({...passwordData, currentPassword: tempPass});
            setErrors({...errors,currentPassword:""});
            
           
            if(tempPass.trim().length<=0){
                setErrors({...errors,currentPassword:"Please enter your current password"});
            }
            else if(tempPass!=storedPass){
                setErrors({...errors,currentPassword:"Password does not match in your database"});
            }
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
            else if (tempNewPass === storedPass)
                setErrors({...errors, newPassword: "New password must be different from current"});
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
             else if (tempNewPass === storedPass)
                setErrors({...errors, newPassword: "New password must be different from current"});
    


        }
    return(
        <>

        
        <div className="p-2 w-full bg-gray-100 min-h-screen flex flex-col">
        <h1 className="text-2xl font-bold mt-0 p-0">Privacy Settings</h1>

        <div className=" card bg-white border border-gray-300 rounded-lg p-3 w-full mt-10 mx-auto flex flex-col justify-between">
                <div className="flex flex-col gap-6 w-2/3 pl-8">
                  <h3 className="text-xl font-bold mb-2 pt-2">Change Password</h3>
                
                 <label className="flex flex-col gap-1">
                    <h5 className="text-base font-bold">Current Password</h5>
                    <div className="relative">
                        <input type={showPassword? "text":"password"} placeholder="Enter your current password" 
                        value={passwordData.currentPassword}
                        onChange={verifyCurrentPassword}
                           className="bg-white text-black font-medium text-base border border-gray-500 placeholder:text-base placeholder:text-gray-500 placeholder:font-medium px-3 focus:outline-none! focus:border-[#4602c5]! w-full h-12 rounded-xl transition-all duration-200"  />
                        <span onClick={() => setShowPassword(!showPassword)} 
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 cursor-pointer">
                         {showPassword ? <Eye className="w-5 h-5 "/> : <EyeOff className="w-5 h-5"/>}
                         </span>
                            
                    </div>
                    <p className="text-red-500 text-sm">{errors.currentPassword}</p>
                </label>
                

                        <label className="flex flex-col gap-1 ">
                            <h5 className="text-base font-bold">New Password</h5>
                             <div className="relative">
                                <input type={showNewPassword? "text":"password"}  placeholder="Enter your new password" 
                                value={passwordData.newPassword}
                                onChange={verifyNewPassword}  
                                className="bg-white text-black font-medium text-base border border-gray-500 placeholder:text-base placeholder:text-gray-500 placeholder:font-medium px-3 focus:outline-none! focus:border-[#4602c5]! w-full h-12 rounded-xl transition-all duration-200" />
                                <span onClick={() => setShowNewPassword(!showNewPassword)} 
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 cursor-pointer">
                                {showNewPassword ? <Eye className="w-5 h-5 "/> : <EyeOff className="w-5 h-5"/>}
                                </span>
                            </div>
                            <p className="text-red-500 text-sm">{errors.newPassword}</p>

                        </label>

                

                    <label className="flex flex-col gap-1">
                        <h5 className="text-base font-bold " >Confirm New Password</h5>
                         <div className="relative">
                            <input type={showConfirmPassword? "text":"password"}  placeholder="Confirm your new password"
                            value={passwordData.confirmPassword}
                            onChange={verifyConfirmPassword}
                             className="bg-white text-black font-medium text-base border border-gray-500 placeholder:text-base placeholder:text-gray-500 placeholder:font-medium px-3 focus:outline-none! focus:border-[#4602c5]! w-full h-12 rounded-xl transition-all duration-200" />
                            <span onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 cursor-pointer">
                            {showConfirmPassword ? <Eye className="w-5 h-5 "/> : <EyeOff className="w-5 h-5"/>}
                            </span>
                         </div>
                         <p className="text-red-500 text-sm">{errors.confirmPassword}</p>

                    </label>
                    </div>

                    <button className="btn btn-soft bg-[#4602c5] text-base text-white hover:bg-[#24035a] border-none w-42 h-11 mb-4 mt-6 ml-8 border-radius"
                    onClick={handleUpdatePassword}>
                    Update Password</button>

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
        </>
        
    )
}export default PrivacySettings;