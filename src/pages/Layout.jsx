import { NavLink,Outlet,useNavigate } from "react-router-dom";

export default function Layout(){
    const navigate = useNavigate()
    const user = useNavigate()
    
    function handleLogout(){
        localStorage.removeItem('user')
        localStorage.removeItem('user')
        navigate('/')
    }
    return(
        <div className="app-layout">
            <nav className="app-nav">
                <span className="app-nav-user">{user?.username}</span>
                <NavLink to='/inbox' className={({isActive}) => isActive? 'nav-link active' :'nav-link'}>
                Messages
                </NavLink>
                <NavLink to='/new' className={({isActive}) => isActive? 'nav-link active' :'nav-link'}>
                New Chat
                </NavLink>
                <button onClick={handleLogout} className="nav-logout">Log out</button>
            </nav>
            <div className="app-content">
                <Outlet/>{/* whichever page is active renders here*/}
            </div>
        </div>
    )
}