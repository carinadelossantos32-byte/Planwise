import Settings from "./pages/Settings/settings";
import Account from "./pages/AccountSettings/Account";
import PrivacySettings from "./pages/PrivacySettings/PrivacySettings";
import NotificationSettings from "./pages/NotificationSettings/NotificationSettings";
import AboutSettings from "./pages/AboutSettings/AboutSettings";
import {BrowserRouter, Navigate} from "react-router"
import {Routes, Route} from "react-router"

function App(){
  return(
  <>
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to="/settings" />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/settings/account" element={<Account />} />
      <Route path="/settings/privacy" element={<PrivacySettings />} />
      <Route path="/settings/notifications" element={<NotificationSettings />} />
      <Route path="/settings/about" element={<AboutSettings />} />
    </Routes>
  </BrowserRouter>
  </>
  )
}
export default App;