
import './App.css';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ChatPage from './pages/ChatPage';
import UserListPage from './pages/NewChat';
import { Route, Routes, BrowserRouter } from 'react-router-dom';
import ProtectedRoute from './pages/ProtectedRoute';
import Layout from './pages/Layout';
import InboxPage from './pages/InboxPage';


function App() {
  return (
    <BrowserRouter>
     <Routes>
  <Route path="/" element={<LoginPage />} />
  <Route path="/signup" element={<SignupPage />} />

  <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
    <Route path="/inbox" element={<InboxPage />} />
    <Route path="/new" element={<UserListPage />} />
    <Route path="/chat/:conversationId" element={<ChatPage />} />
  </Route>
</Routes>
    </BrowserRouter>
  );      
    
  
}

export default App;
