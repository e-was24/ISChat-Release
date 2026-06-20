import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../assets/css/home.css';

import AddNum from '../components/AddNum'
import CONFIG from '../config';

export default function Chat() {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const ws = useRef(null);
    const currentUserId = localStorage.getItem("user_id");

    // 1. Fetch awal daftar kontak dari REST API
    useEffect(() => {
        if (!currentUserId) {
            localStorage.clear();
            navigate('/login');
            return;
        }

        fetch(`${CONFIG.BACKEND_URL}/contacts?user_id=${currentUserId}`)
            .then((response) => {
                if (response.status === 401) {
                    throw new Error("UNAUTHORIZED_SESSION");
                }
                if (response.status === 404) {
                    return [];
                }
                if (!response.ok) {
                    throw new Error("SERVER_ERROR");
                }
                return response.json();
            })
            .then((data) => {
                setContacts(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch((error) => {
                console.error("Gagal memuat kontak:", error.message);
                setLoading(false);

                if (error.message === "UNAUTHORIZED_SESSION") {
                    localStorage.clear();
                    navigate('/login');
                }
            });
    }, [navigate, currentUserId]);

    // 2. WS untuk update real-time: status online/offline + pesan baru masuk (update badge & last message)
    useEffect(() => {
        if (!currentUserId) return;

        let isActive = true;
        const socket = new WebSocket(`${CONFIG.WS_URL}?user_id=${currentUserId}`);
        ws.current = socket;

        socket.onopen = () => {
            if (isActive) console.log("WebSocket Home Terhubung!");
        };

        socket.onmessage = (event) => {
            if (!isActive) return;
            const incoming = JSON.parse(event.data);

            // 🔔 Update status online/offline kontak
            if (incoming.type === "status") {
                setContacts(prev => prev.map(item => {
                    const cid = item.contact_user_id || item.ContactUserID;
                    if (cid === incoming.sender_id) {
                        return { ...item, is_online: incoming.status === "online" };
                    }
                    return item;
                }));
                return;
            }

            const targetId = (incoming.sender_id === currentUserId) ? incoming.receiver_id : incoming.sender_id;

            setContacts(prev => {
                const updated = prev.map(item => {
                    if (item.contact_user_id === targetId) {
                        return {
                            ...item,
                            LastSend: incoming.text,
                            DateTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            UnreadCount: (incoming.sender_id !== currentUserId) ? item.UnreadCount + 1 : item.UnreadCount,
                            last_message_sender_id: incoming.sender_id,
                            last_message_is_read: incoming.is_read || false,
                            last_message_is_delivered: incoming.is_delivered || false
                        };
                    }
                    return item;
                });
                // Sortir agar yang terbaru di atas
                return [...updated].sort((a, b) => {
                    if (a.contact_user_id === targetId) return -1;
                    if (b.contact_user_id === targetId) return 1;
                    return 0;
                });
            });
        };

        socket.onerror = (error) => {
            if (isActive) console.error("WebSocket Home Error:", error);
        };

        return () => {
            isActive = false;
            socket.close();
        };
    }, [currentUserId]);

    if (loading) {
        return <div style={{ color: 'var(--text)', padding: '20px', textAlign: 'center' }}>Memuat aplikasi...</div>;
    }

    // 🔍 DEBUG TOOL: Mengintip struktur data kontak asli dari backend Go di F12 Console
    console.log("Data Kontak dari Backend:", contacts);

    return (
        <div className="home-cover">
            <div className="contact-zone">
                <div className="headers-contact-zone">
                    <div className="search-input-wrapper">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            height="24px"
                            viewBox="0 -960 960 960"
                            width="24px"
                            fill="var(--text)"
                            className="search-icon"
                        >
                            <path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z" />
                        </svg>
                        <input type="text" placeholder="Search" />
                    </div>
                </div>

                {contacts.length === 0 ? (
                    <div style={{ color: 'var(--text)', padding: '40px 20px', textAlign: 'center' }}>
                        Belum ada kontak ditambahkan.<br />
                        <span style={{ fontSize: '0.85em', color: 'var(--text)', opacity: 0.6 }}>Klik tombol (+) di kanan bawah untuk menambah.</span>
                    </div>
                ) : (
                    contacts.map((item, index) => {
                        const targetID = item.contact_user_id || item.ContactUserID || item.id;
                        const unread = item.unread_count || 0;
                        const isOnline = item.is_online;

                        return (
                            <div
                                className="contact-card"
                                key={index}
                                onClick={() => {
                                    if (targetID) {
                                        navigate(`/message/${targetID}`);
                                    } else {
                                        alert(`ID tidak ditemukan! Isi data item: ${JSON.stringify(item)}`);
                                    }
                                }}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="start-item">
                                    <div style={{ position: 'relative' }}>
                                        <img
                                            src={item.Profile || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.NameEditable || item.NumberPhone || "User")}&background=333&color=fff`}
                                            alt="Profile"
                                        />
                                        {isOnline && (
                                            <span style={{
                                                position: 'absolute',
                                                bottom: 0,
                                                right: 0,
                                                width: 10,
                                                height: 10,
                                                borderRadius: '50%',
                                                background: 'var(--accent)',
                                                border: '2px solid var(--bg)'
                                            }} />
                                        )}
                                    </div>
                                    <div className="center-items">
                                        <h3>{item.NameEditable || item.NumberPhone}</h3>
                                        <p>{item.LastSend || "Belum ada pesan"}</p>
                                    </div>
                                </div>
                                <div className="end-item">
                                    <p>{item.DateTime || ""}</p>
                                    {unread > 0 ? (
                                        <span className="unread-badge" style={{
                                            background: '#25d366',
                                            color: '#fff',
                                            borderRadius: '50%',
                                            minWidth: 20,
                                            height: 20,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.75em',
                                            padding: '0 5px'
                                        }}>
                                            {unread}
                                        </span>
                                    ) : (
                                        <div className='chat-status'>
                                            {item.last_message_sender_id === currentUserId && (
                                                <div className="last-msg-ticks" style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: '4px' }}>
                                                    {item.last_message_is_read ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="#4fc3f7"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Zm286-286-56-57 171-171 57 57-172 171ZM382-354l-57-56 128-128 57 57-128 127Z"/></svg>
                                                    ) : item.last_message_is_delivered ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="var(--text)"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Zm286-286-56-57 171-171 57 57-172 171ZM382-354l-57-56 128-128 57 57-128 127Z"/></svg>
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="var(--text)"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
                <div className="add-num-section">
                    <AddNum />
                </div>
            </div>
        </div>
    );
}