import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

const LoginPage = () => {
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [error, setError] = useState('');
const [loading, setIsLoading] = useState(false);
const navigate = useNavigate();
async function handleSubmit(e) {
    e.preventDefault(); // stop the browser from refreshing the page
    setIsLoading(true);
    setError('');
    //very basic validation for client side before we talk to the server
    if(!email || !password) {
        setError('Please fill in both fields');
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
  try {
      // This endpoint doesn't exist yet — we'll build it in Express + Postgres
      // in a later step. For now this shows the shape the real call will take.
    const response = await fetch("https://dream-chat-app-1.onrender.com/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Invalid email or password.");
      }

    const data = await response.json();
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    navigate("/inbox");
      // Later: store the auth token/session and redirect to the chat room
    } catch (error) {
        console.error('Login failed', error);
        setError(error.message);
    } finally {
        setIsLoading(false);
    }
}
    return (  

    <>
        <div className='login-page'>
        <div className='login-card'>
        <h1 className='login-title'>Welcome back</h1>
        <p>Login to keep the conversation going</p>

        <form onSubmit={handleSubmit} className='login-form' noValidate>
            <label className='login-label' htmlFor='email'>
                Email
            </label>
            <input 
            id='email'
            type='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder='you@email.com'
            autoComplete='email'
            className='login-input'
            />
            <label className='login-label' htmlFor='password'>
                Password
            </label>
            <input 
            id='password'
            type='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder='••••••••'
            autoComplete='current-password'
            className='login-input'
            />
            {error && <p className='login-error'>{error}</p>}
            <button type='submit' className='login-button' disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
            </button>
        </form>
        <p className='login-footer'>
            Don't have an account? <a href='/signup'>Sign up</a>
        </p>
        </div>
        </div>
    </>
    );
}
 
export default LoginPage;