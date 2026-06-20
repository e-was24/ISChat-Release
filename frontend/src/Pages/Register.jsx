import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import '../assets/css/register.css'
import CONFIG from '../config';

function Register() {
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate()

    // Kalau user udah login (ada token), gak usah liat halaman register lagi
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            navigate("/home");
        }
    }, [navigate]);

    // Ganti title tab browser pas di halaman ini
    useEffect(() => {
        document.title = "Register - ISChat";
    }, []);

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch(`${CONFIG.BACKEND_URL}/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    username,
                    password,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                console.log("Register Success:", data);
                alert("Register berhasil! Silakan login.");
                navigate("/login");
            } else {
                const errorText = await res.text();
                setError(errorText || "Register gagal");
            }
        } catch (err) {
            console.error("Gagal terhubung ke server:", err);
            setError("Server tidak merespons.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="register-page">
            <div className="register-tag">
                <span><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M640-280q83 0 141.5-58.5T840-480q0-83-58.5-141.5T640-680q-27 0-52.5 7T540-653q29 36 44.5 80t15.5 93q0 49-15.5 93T540-307q22 13 47.5 20t52.5 7Zm-160-80q19-25 29.5-55.5T520-480q0-34-10.5-64.5T480-600q-19 25-29.5 55.5T440-480q0 34 10.5 64.5T480-360Zm-160 80q27 0 52.5-7t47.5-20q-29-36-44.5-80T360-480q0-49 15.5-93t44.5-80q-22-13-47.5-20t-52.5-7q-83 0-141.5 58.5T120-480q0 83 58.5 141.5T320-280Zm0 80q-117 0-198.5-81.5T40-480q0-117 81.5-198.5T320-760q45 0 85.5 13t74.5 37q34-24 74.5-37t85.5-13q117 0 198.5 81.5T920-480q0 117-81.5 198.5T640-200q-45 0-85.5-13T480-250q-34 24-74.5 37T320-200Z" /></svg></span>
                <p className="register-tagline">Join now, start chatting with your family more safely</p>
            </div>
            <div className="register-cover">
                <h2><span><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M40-160v-160q0-34 23.5-57t56.5-23h131q20 0 38 10t29 27q29 39 71.5 61t90.5 22q49 0 91.5-22t70.5-61q13-17 30.5-27t36.5-10h131q34 0 57 23t23 57v160H640v-91q-35 25-75.5 38T480-200q-43 0-84-13.5T320-252v92H40Zm440-160q-38 0-72-17.5T351-386q-17-25-42.5-39.5T253-440q22-37 93-58.5T480-520q63 0 134 21.5t93 58.5q-29 0-55 14.5T609-386q-22 32-56 49t-73 17ZM160-440q-50 0-85-35t-35-85q0-51 35-85.5t85-34.5q51 0 85.5 34.5T280-560q0 50-34.5 85T160-440Zm640 0q-50 0-85-35t-35-85q0-51 35-85.5t85-34.5q51 0 85.5 34.5T920-560q0 50-34.5 85T800-440ZM480-560q-50 0-85-35t-35-85q0-51 35-85.5t85-34.5q51 0 85.5 34.5T600-680q0 50-34.5 85T480-560Z" /></svg></span>Register</h2>

                {error && <p style={{ color: "#ff8080", textAlign: "center", fontSize: ".85em" }}>{error}</p>}

                <form onSubmit={handleSubmit} className="register-form">
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <br />

                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />

                    <br />

                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    <br />
                    <div className="btn-section">
                        <Link to="/login" className="Link">
                            Login
                        </Link>
                        <button type="submit" disabled={loading}>
                            {loading ? "Mendaftar..." : "Register"}
                        </button>
                    </div>
                </form>
            </div>

            <p className="register-footer" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center'}}>© 2026 - {new Date().getFullYear()} ISChat — Safe chat and fun chat.</p>
        </div>
    );
}

export default Register;