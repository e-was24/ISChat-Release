import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import '../assets/css/login.css'
import CONFIG from '../config';

function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const navigate = useNavigate()

    // Jika sudah ada token, langsung lempar ke home
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            navigate('/');
        }
    }, [navigate]);

    // Ganti title tab browser
    useEffect(() => {
        document.title = "Landing - ISChat";
    }, []);

    async function handleSubmit(e) {
        e.preventDefault();

        // Kunci tombol di awal agar mencegah eksekusi ganda jika diklik berkali-kali (Menghindari 401 balapan)
        if (loading) return;

        setError('');
        setLoading(true);

        try {
            const res = await fetch(`${CONFIG.BACKEND_URL}/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    password,
                })
            });

            // Ambil data JSON langsung di awal secara aman
            const data = await res.json().catch(() => null);

            if (res.ok && data) {
                console.log("Login sukses:", data);

                // Simpan Token
                if (data.token) {
                    localStorage.setItem('token', data.token);
                }

                // Simpan User ID
                if (data.user_id) {
                    localStorage.setItem('user_id', data.user_id);
                }

                // Beri jeda 100ms agar localStorage selesai menulis sebelum dipindah ke halaman Chat
                setTimeout(() => {
                    navigate('/');
                }, 100);

            } else {
                // Jika status code bukan 2xx (seperti 401, 400, 500)
                const errorMessage = data && data.error ? data.error : "Email atau password salah!";
                setError(errorMessage);
            }
        } catch (error) {
            console.error("Gagal terhubung ke server:", error);
            setError("Server tidak merespons.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login-page">
            <div className="login-tag">
                <span>
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M160-160v-280 280Zm640 0v-280 280Zm-40-480q17 0 28.5-11.5T800-680q0-17-11.5-28.5T760-720q-17 0-28.5 11.5T720-680q0 17 11.5 28.5T760-640Zm0 80q-51 0-85.5-34.5T640-680q0-50 34.5-85t85.5-35q50 0 85 35t35 85q0 51-35 85.5T760-560ZM480-680q25 0 42.5-17t17.5-43q0-25-17.5-42.5T480-800q-26 0-43 17.5T420-740q0 26 17 43t43 17Zm0 80q-59 0-99.5-40.5T340-740q0-58 40.5-99t99.5-41q58 0 99 41t41 99q0 59-41 99.5T480-600ZM320-425q0 30 32 70t128 127q94-85 127-125t33-72q0-23-15-39t-37-16q-14 0-26.5 6T541-457l-48 57h-27l-48-57q-8-11-20.5-17t-25.5-6q-23 0-37.5 16T320-425Zm-80 0q0-53 36-94t96-41q31 0 59.5 14t48.5 38q20-24 48-38t60-14q60 0 96 41.5t36 93.5q0 53-38.5 104.5T524-160l-44 40-44-40Q315-270 277.5-321T240-425Zm-40-215q17 0 28.5-11.5T240-680q0-17-11.5-28.5T200-720q-17 0-28.5 11.5T160-680q0 17 11.5 28.5T200-640ZM483-80v-80h317v-280H682v-80h118q33 0 56.5 23.5T880-440v360H483Zm-323-80h323v80H80v-360q0-33 23-56.5t57-23.5h118v80H160v280Zm40-400q-51 0-85.5-34.5T80-680q0-50 34.5-85t85.5-35q50 0 85 35t35 85q0 51-35 85.5T200-560Zm280-180Zm-280 60Zm560 0Z" /></svg>
                </span>
                <p className="login-tagline">Welcome back. Keep the harmony starting from the conversation.</p>
            </div>
            <div className="login-cover">
                <h2>Login</h2>

                {error && <p style={{ color: "#ff8080", textAlign: "center", fontSize: ".85em" }}>{error}</p>}

                <form onSubmit={handleSubmit} className="login-form">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email"
                        required
                    />

                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="password"
                        required
                    />
                    <div className="btn-section">
                        <Link to="/register" className='Link'>Register</Link>
                        <button type="submit" disabled={loading}>
                            {loading ? "Masuk..." : "Login"}
                        </button>
                    </div>
                </form>
            </div>

            <p className="login-footer" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Don't know us yet? Come register now &nbsp; <Link to="/register"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M183.5-183.5Q160-207 160-240t23.5-56.5Q207-320 240-320t56.5 23.5Q320-273 320-240t-23.5 56.5Q273-160 240-160t-56.5-23.5Zm0-240Q160-447 160-480t23.5-56.5Q207-560 240-560t56.5 23.5Q320-513 320-480t-23.5 56.5Q273-400 240-400t-56.5-23.5Zm0-240Q160-687 160-720t23.5-56.5Q207-800 240-800t56.5 23.5Q320-753 320-720t-23.5 56.5Q273-640 240-640t-56.5-23.5Zm240 0Q400-687 400-720t23.5-56.5Q447-800 480-800t56.5 23.5Q560-753 560-720t-23.5 56.5Q513-640 480-640t-56.5-23.5Zm240 0Q640-687 640-720t23.5-56.5Q687-800 720-800t56.5 23.5Q800-753 800-720t-23.5 56.5Q753-640 720-640t-56.5-23.5Zm-240 240Q400-447 400-480t23.5-56.5Q447-560 480-560t56.5 23.5Q560-513 560-480t-23.5 56.5Q513-400 480-400t-56.5-23.5ZM520-160v-123l221-220q9-9 20-13t22-4q12 0 23 4.5t20 13.5l37 37q8 9 12.5 20t4.5 22q0 11-4 22.5T863-380L643-160H520Zm300-263-37-37 37 37ZM580-220h38l121-122-18-19-19-18-122 121v38Zm141-141-19-18 37 37-18-19Z" /></svg></Link></p>
        </div>
    )
}

export default Login;