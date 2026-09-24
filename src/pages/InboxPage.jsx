import {useState , useEffect} from 'react'
import { useNavigate } from 'react-router-dom'

export default function InboxPage(){
    const [conversations,setConversations] = useState([])
    const [error,setError] = useState("")
    const navigate = useNavigate()
    const token = localStorage.getItem('token')

    useEffect(()=>{
        async function fetchConversation(){
            try{
                const response = await fetch("http://localhost:3001/api/conversations",{
                    headers:{ Authorization: `Bearer ${token}`}
                })
                if (!response.ok) throw new Error('Failed to load conversation.')
                    const data = await response.json()
                    setConversations(data)
            }catch(err){
                setError(err.message)
            }
        }
        fetchConversation()
        
    },[token])
      function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  }

    return(
            <div style={{ padding: 24 }}>
<h1 style={{ marginTop: 0 }}>Messages</h1>
<button onClick={handleLogout} className="logout-button">Log out</button>
{error && <p style={{ color: "#ff8a8a" }}>{error}</p>}
{conversations.length === 0 && !error && (
<p style={{ color: "#8891ab"}}>No conversations yet — start one from "Newchat”.</p>
)}
<ul style={{ listStyle: "none", padding: 0 }}>
{conversations.map((c) => (
<li key={c.conversation_id} style={{ marginBottom: 10 }}>
<button
onClick={() => navigate(`/chat/${c.conversation_id}`)}
style={{
width: "100%",
textAlign: "left",
background: "#12182b",
border: "1px solid #232c47",
color: "#f4f6fb",
padding: "14px 16px",
borderRadius: 1,
cursor: "pointer",
}}
>
<div style={{ fontWeight: 600 }}>{c.other_username}</div>
<div style={{ fontSize: 13, color: "#8891a" }}>
{c.last_message || "No messages yet"}
</div>
</button>
</li>
))}
</ul>
</div>
        )
}