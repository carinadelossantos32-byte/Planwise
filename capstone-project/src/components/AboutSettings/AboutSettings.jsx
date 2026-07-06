// import "./about-settings.css";
import Settings from "../../pages/Settings/settings";
function AboutSettings(){
    return(
        <>

        <div className="p-2 w-full bg-gray min-h-screen">
         <h1 className="text-2xl font-bold mb-8">About Planwise</h1>
        <div className="card bg-white border border-gray-300 rounded-lg p-3 w-full mx-auto mt-16 min-h-110 ">

            <div className="flex items-start gap-4 px-7 py-10 border-b border-gray-300">
                <img id="planwise-logo"className="w-25 h-25 object-contain shrink-0" src="https://maloloscity.gov.ph/wp-content/uploads/2021/09/logo.png" alt="PlanWise Logo"/>
                <div>
                    <h1 className="text-sm font-bold leading-none m-0">PlanWise Family Planning System</h1>
                    <p >A comprehensive family planning management system for health workers and administrators in Malolos City Health Office.</p>
                </div>
            </div>

            <div className="flex flex-row justify-center px-7 py-6 gap-15">
                <div className="flex flex-col bg-gray-50 border border-gray-200 rounded-lg p-4 w-80 gap-2">
                    <h3 className="text-xl font-bold mb-1">Contact Support</h3>
                    <p className=" mb-2">Email: <a href="mailto:support@planwise.gov.ph" 
                    className="font-normal hover:text-blue-600 hover:underline transition-colors cursor-pointer "
                    >support@planwise.gov.ph
                    </a></p>
                    
                  <p >Phone: (044) 791-1234</p>
                </div>

                <div className="flex flex-col bg-gray-50 border border-gray-200 rounded-lg p-4 w-80 gap-2">
                    <h3 className="text-xl font-bold mb-1">Office Hours</h3>
                    <p className="mb-2">Monday - Friday: 8:00 AM - 5:00 PM</p>
                    <p >Saturday: 8:00 AM - 12:00 PM</p>
                </div>
            </div>

            <div className="flex items-center justify-center border-gray-300">
                <p className="text-sm">© 2026 Malolos City Health Office. All rights reserved.</p>
            </div>
        </div>
        </div>
        </>
    )
}

export default AboutSettings;