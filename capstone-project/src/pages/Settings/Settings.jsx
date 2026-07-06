import { useState } from "react"
// import "./settings.css"
import { useNavigate } from "react-router"
import {Info, LockKeyhole, User, Bell, Search } from "lucide-react";
import Account from "../../components/AccountSettings/Account"
import PrivacySettings from "../../components/PrivacySettings/PrivacySettings"
import LowStockSettings from "../../components/LowStockSettings/LowStock"
import AboutSettings from "../../components/AboutSettings/AboutSettings"

function Settings(){
    const navigate = useNavigate();
    const [activePage, setActivePage] = useState("account");
    
    return(
    <>
    <div className="flex h-screen m-0 ">

   <div className="flex flex-col w-70 border-r border-gray-200 px-4 gap-0.5">
    

    <h1 className="text-xl pl-2 m-0 font-bold">Settings</h1>

    <div className="relative mb-2 w-full">
        <input type="text" placeholder="Search..." 
            className="w-full min-h-12 px-4 rounded-[13px] border border-gray-300 text-base bg-[#f0e6ff]"
        />
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" 
        />
    </div> 
        <div className={`flex items-center gap-2.5 cursor-pointer mt-1 py-4 px-4 w-full hover:bg-gray-200 hover:border-l-[7px] hover:border-[#4F39F6] hover:rounded-lg ${activePage === "account" ? "border-l-[7px] border-[#4F39F6] font-bold rounded-lg bg-gray-300" : ""}`}
            onClick={() => setActivePage("account")} >
        <User className={`w-5 h-5 transition-colors duration-150 ${activePage === "account" ? "text-[#3017f3]" : "text-gray-500"}`} 
    />
            <h4>Account</h4>
        </div>

        <div className={`flex items-center gap-2.5 cursor-pointer mt-1 py-4 px-4 w-full rounded-lg hover:bg-gray-200 hover:border-l-[7px] hover:border-[#4F39F6] ${activePage === "privacy" ? "border-l-[7px] border-[#4F39F6] font-bold bg-gray-300": ""}`}
            onClick={() => setActivePage("privacy")} >
           <LockKeyhole className={`w-5 h-5 transition-colors duration-150 ${activePage === "privacy" ? "text-[#3017f3]" : "text-gray-500"}`} />
         
            <h4>Privacy & Security</h4>
        </div>

        <div className={`flex items-center gap-2.5 cursor-pointer border-[#4F39F6] rounded-lg  mt-1  py-4 px-4 w-full hover:bg-gray-200 hover:border-l-[7px] hover:border-[#4F39F6] hover:rounded-lg ${activePage === "notifications" ? "border-l-[7px] border-[#4F39F6] font-bold p-0.5 rounded-lg bg-gray-300" : ""}`}
            onClick={() => setActivePage("notifications")} >
        <Bell className={`w-5 h-5 transition-colors duration-150 ${activePage === "notifications" ? "text-[#3017f3]" : "text-gray-500"}`} />
            <h4>Low Stock</h4>
        </div>

        <div className={`flex items-center gap-2.5 cursor-pointer mt-1  py-4 px-4 w-full hover:bg-gray-200 hover:border-l-[7px] hover:border-[#4F39F6] rounded-lg ${activePage === "about" ? "border-l-[7px] border-[#4F39F6] font-bold rounded-lg bg-gray-300" : ""}`}
            onClick={() => setActivePage("about")} >
            <Info className={`w-5 h-5 transition-colors duration-150 ${activePage === "about" ? "text-[#3017f3]" : "text-gray-500"}`} />
          <h4>About</h4>
        </div>

        
    </div>
    <div className="flex-1 flex flex-col items-center  overflow-y-auto bg-gray-100 px-6 pt-0 mt-0">
        {activePage === "account" && <Account />}
        {activePage === "privacy" && <PrivacySettings />}
        {activePage === "notifications" && <LowStockSettings/>}
        {activePage === "about" && <AboutSettings />}
    </div>
    </div>

    
    
    </>
    )
}

export default Settings;
