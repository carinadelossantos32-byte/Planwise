import Settings from "./pages/Settings/settings";
import Account from "./components/AccountSettings/Account";
import PrivacySettings from "./components/PrivacySettings/PrivacySettings";
import NotificationSettings from "./components/NotificationSettings/NotificationSettings";
import AboutSettings from "./components/AboutSettings/AboutSettings";
import {BrowserRouter, Navigate} from "react-router"
import {Routes, Route} from "react-router"

function App(){
  return(
  <>
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to="/settings/account" />} />
      <Route path="/settings/account" element={<Settings />} />
      <Route path="/settings/privacy" element={<PrivacySettings />} />
      <Route path="/settings/notifications" element={<NotificationSettings />} />
      <Route path="/settings/about" element={<AboutSettings />} />
    </Routes>
  </BrowserRouter>
  </>
  )
}
export default App;