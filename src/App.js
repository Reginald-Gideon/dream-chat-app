
import './App.css';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ChatPage from './pages/ChatPage';
import UserListPage from './pages/NewChat';
import { Route, Routes, BrowserRouter } from 'react-router-dom';
import ProtectedRoute from './pages/ProtectedRoute';
import Layout from './pages/Layout';
import InboxPage from './pages/InboxPage';
import RequestsPage from './pages/RequestsPage.jsx'
import CreateGroup from './pages/CreateGroup';
import GroupsPage from './pages/GroupsPage';
import GroupChatPage from './pages/GroupChatPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import Feed from './pages/Feed.jsx'
import NotificationsPage from './pages/NotificationsPage';
function App() {
  return (
    <BrowserRouter>
     <Routes>
  <Route path="/" element={<LoginPage />} />
  <Route path="/signup" element={<SignupPage />} />

  <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
  <Route path="/feed" element={<Feed/> }/>
  <Route path="/notifications" element={<NotificationsPage />} />

<Route path='/settings' element={<SettingsPage />} />
<Route path="/profile" element={<ProfilePage />} />
<Route path="/create-group" element={<CreateGroup />} />
<Route path="/groups" element={<GroupsPage />} />
<Route path="/group/:groupId" element={<GroupChatPage />} />
  <Route path="/requests" element={<RequestsPage />} />
    <Route path="/inbox" element={<InboxPage />} />
    <Route path="/new" element={<UserListPage />} />
    <Route path="/chat/:conversationId" element={<ChatPage />} />
  </Route>
</Routes>
    </BrowserRouter>
  );      
    
  
}

export default App;
