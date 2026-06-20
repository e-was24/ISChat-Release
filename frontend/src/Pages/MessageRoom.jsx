import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../assets/css/messageRoom.css';
import CONFIG from '../config';

export default function MessageRoom() {
    const { id } = useParams(); // ID/UUID lawan bicara dari URL rute
    const navigate = useNavigate();
    const messageEndRef = useRef(null);
    const ws = useRef(null);

    const currentUserId = localStorage.getItem("user_id");
    const [inputMessage, setInputMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [targetUser, setTargetUser] = useState({
        name: 'Memuat...',
        status: 'Offline',
        profile: ''
    });
    const [isTargetTyping, setIsTargetTyping] = useState(false);
    const typingTimeoutRef = useRef(null);
    const [longPressTimer, setLongPressTimer] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, msgId: null, isMe: false });

    // 1. Ambil info profil lawan bicara + status online saat ini
    useEffect(() => {
        if (!id) return;

        fetch(`${CONFIG.BACKEND_URL}/user/profile?user_id=${id}`)
            .then(res => {
                if (!res.ok) throw new Error("Gagal mengambil profil target");
                return res.json();
            })
            .then(data => {
                setTargetUser(prev => ({
                    ...prev,
                    name: data.username || 'Pengguna ISChat',
                    profile: data.profile || 'https://via.placeholder.com/150'
                }));
            })
            .catch(err => {
                console.error("Gagal memuat info target:", err);
                setTargetUser(prev => ({
                    ...prev,
                    name: `User (${id.substring(0, 6)})`
                }));
            });

        // 🔔 Cek status online target saat pertama kali room dibuka
        fetch(`${CONFIG.BACKEND_URL}/user/online-status?user_id=${id}`)
            .then(res => res.json())
            .then(data => {
                setTargetUser(prev => ({ ...prev, status: data.is_online ? 'Online' : 'Offline' }));
            })
            .catch(err => console.error("Gagal memuat status online:", err));
    }, [id]);

    // 2. Ambil Riwayat Chat (History) terdekripsi + tandai sudah dibaca
    useEffect(() => {
        if (!currentUserId) return;
        fetch(`${CONFIG.BACKEND_URL}/messages?from=${currentUserId}&to=${id}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const formattedMsgs = data.map(m => ({
                        sender_id: m.sender_id,
                        text: m.text,
                        time: new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        is_read: m.is_read,
                        is_delivered: m.is_delivered
                    }));
                    setMessages(formattedMsgs);
                }
            })
            .catch(err => console.error("Gagal memuat riwayat chat:", err));

        // 🔔 Tandai semua pesan dari target ke kita sebagai sudah dibaca
        fetch(`${CONFIG.BACKEND_URL}/messages/read?from=${id}&to=${currentUserId}`, {
            method: 'PATCH'
        }).catch(err => console.error("Gagal menandai pesan terbaca:", err));
    }, [id, currentUserId]);

    // 3. Inisialisasi Koneksi WebSocket untuk kirim-terima pesan Real-Time + status
    useEffect(() => {
        if (!currentUserId || !id) return;

        let isActive = true;
        const socket = new WebSocket(`${CONFIG.WS_URL}?user_id=${currentUserId}`);
        ws.current = socket;

        socket.onopen = () => {
            if (isActive) console.log("WebSocket Terhubung!");
        };

        socket.onmessage = (event) => {
            if (!isActive) return;
            const incoming = JSON.parse(event.data);
            console.log("Pesan WebSocket Masuk:", incoming);

            if (incoming.type === "status") {
                if (incoming.sender_id === id) {
                    setTargetUser(prev => ({
                        ...prev,
                        status: incoming.status === "online" ? "Online" : "Offline"
                    }));
                }
                return;
            }

            if (incoming.type === "typing") {
                if (incoming.sender_id === id) {
                    setIsTargetTyping(incoming.is_typing);
                }
                return;
            }

            if (incoming.type === "error") {
                console.error("SERVER ERROR:", incoming.text);
                alert("Gagal mengirim pesan: " + incoming.text);
                return;
            }

            if (incoming.type === "delete") {
                setMessages(prev => prev.filter(m => m.id !== incoming.message_id));
                return;
            }

            const isFromTarget = incoming.sender_id && id && incoming.sender_id.toLowerCase() === id.toLowerCase() && incoming.receiver_id && currentUserId && incoming.receiver_id.toLowerCase() === currentUserId.toLowerCase();
            const isFromMe = incoming.sender_id && currentUserId && incoming.sender_id.toLowerCase() === currentUserId.toLowerCase() && incoming.receiver_id && id && incoming.receiver_id.toLowerCase() === id.toLowerCase();

            if (isFromTarget || isFromMe) {
                const now = incoming.time ? new Date(incoming.time) : new Date();
                setMessages(prev => {
                    if (isFromMe) {
                        // Cari indeks pesan pending pertama yang teksnya sama
                        const pendingIndex = prev.findIndex(m => m.status === 'pending' && m.text === incoming.text);
                        if (pendingIndex !== -1) {
                            const newMsgs = [...prev];
                            newMsgs[pendingIndex] = {
                                ...newMsgs[pendingIndex],
                                status: 'sent',
                                is_read: incoming.is_read || false,
                                is_delivered: incoming.is_delivered || false
                            };
                            return newMsgs;
                        }
                    }
                    // Jika bukan dari kita atau tidak ada pending yang cocok, tambah baru
                    return [...prev, {
                        id: incoming.message_id, // Gunakan ID dari server
                        sender_id: incoming.sender_id,
                        text: incoming.text,
                        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        is_read: incoming.is_read || false,
                        is_delivered: incoming.is_delivered || false,
                        status: 'sent' 
                    }];
                });
            }
            if (isFromTarget) {
                fetch(`${CONFIG.BACKEND_URL}/messages/read?from=${id}&to=${currentUserId}`, {
                    method: 'PATCH'
                }).catch(err => console.error("Gagal menandai pesan terbaca:", err));
            }
        };

        socket.onerror = (error) => {
            if (isActive) console.error("WebSocket Error:", error);
        };

        return () => {
            isActive = false;
            socket.close();
        };
    }, [id, currentUserId]);

    // 4. Auto Scroll otomatis ke gelembung pesan paling bawah
    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // 5. Kirim Pesan aman via WebSocket payload
    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!inputMessage.trim()) return;

        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            const payload = {
                type: "message",
                sender_id: currentUserId,
                receiver_id: id,
                text: inputMessage
            };
            ws.current.send(JSON.stringify(payload));
            
            // Tambahkan pesan secara lokal dengan status pending (jam)
            const now = new Date();
            setMessages(prev => [...prev, {
                sender_id: currentUserId,
                text: inputMessage,
                time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: 'pending'
            }]);
            
            setInputMessage('');

            // Hentikan status mengetik saat pesan dikirim
            sendTypingStatus(false);
        } else {
            alert("Koneksi terputus, mencoba menyambungkan kembali...");
        }
    };

    const sendTypingStatus = (typing) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
                type: "typing",
                sender_id: currentUserId,
                receiver_id: id,
                is_typing: typing
            }));
        }
    };

    const handleInputChange = (e) => {
        setInputMessage(e.target.value);

        if (!typingTimeoutRef.current) {
            sendTypingStatus(true);
        } else {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            sendTypingStatus(false);
            typingTimeoutRef.current = null;
        }, 2000);
    };

    const handleDeleteMessage = async (mode) => {
        const { msgId } = deleteModal;
        if (!msgId) return;

        try {
            const res = await fetch(`${CONFIG.BACKEND_URL}/messages/delete?id=${msgId}&user_id=${currentUserId}&mode=${mode}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setMessages(prev => prev.filter(m => m.id !== msgId));
            } else {
                const data = await res.json();
                alert("Gagal menghapus pesan: " + (data.error || "Unknown error"));
            }
        } catch (err) {
            console.error("Gagal menghapus pesan:", err);
        }
        setDeleteModal({ isOpen: false, msgId: null, isMe: false });
    };

    const handleLongPress = (msg) => {
        setDeleteModal({ 
            isOpen: true, 
            msgId: msg.id, 
            isMe: msg.sender_id === currentUserId 
        });
    };

    const onTouchStart = (msg) => {
        const timer = setTimeout(() => handleLongPress(msg), 500);
        setLongPressTimer(timer);
    };

    const onTouchEnd = () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
        }
    };

    return (
        <div className="chat-room-wrapper">
            <div className="chat-room-header">
                <button onClick={() => navigate('/')} className="room-back-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="var(--text-h)">
                        <path d="m313-440 224 224-57 57-320-320 320-320 57 57-224 224h487v80H313Z" />
                    </svg>
                </button>
                <img
                    src={targetUser.profile || `https://ui-avatars.com/api/?name=${encodeURIComponent(targetUser.name)}&background=333&color=fff`}
                    alt="Profile"
                    className="room-profile-img"
                />
                <div className="room-user-info">
                    <h3>{targetUser.name}</h3>
                    <span style={{ color: isTargetTyping ? 'var(--accent)' : (targetUser.status === 'Online' ? 'var(--accent)' : 'var(--text)') }}>
                        {isTargetTyping ? 'sedang mengetik...' : targetUser.status}
                    </span>
                </div>
            </div>

            {/* Container Gelembung Percakapan */}
            <div className="chat-messages-container">
                {messages.map((msg, index) => {
                    const isMe = msg.sender_id === currentUserId;
                    return (
                        <div key={index} className={`message-bubble-row ${isMe ? 'me' : 'them'}`}>
                            <div 
                                className="message-bubble" 
                                style={{ position: 'relative' }}
                                onMouseDown={() => onTouchStart(msg)}
                                onMouseUp={onTouchEnd}
                                onTouchStart={() => onTouchStart(msg)}
                                onTouchEnd={onTouchEnd}
                                onContextMenu={(e) => { e.preventDefault(); handleLongPress(msg); }}
                            >
                                <p className="message-text">{msg.text}</p>
                                <span className="message-time">
                                    {msg.time}
                                    {isMe && (
                                        <span className="tick-status">
                                            {msg.status === 'pending' ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" height="15px" viewBox="0 -960 960 960" width="15px" fill="var(--text)"><path d="m480-280 160-160-40-40-120 120v-160h-40v160l-120-120-40 40 160 160Zm0-200Zm0 400q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Z"/></svg>
                                            ) : msg.is_read ? (
                                                <div className="double-tick" style={{ position: 'relative', width: '18px', height: '15px' }}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" height="15px" viewBox="0 -960 960 960" width="15px" fill="#4fc3f7" style={{ position: 'absolute', left: 0 }}><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>
                                                    <svg xmlns="http://www.w3.org/2000/svg" height="15px" viewBox="0 -960 960 960" width="15px" fill="#4fc3f7" style={{ position: 'absolute', left: '4px' }}><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>
                                                </div>
                                            ) : msg.is_delivered ? (
                                                <div className="double-tick" style={{ position: 'relative', width: '18px', height: '15px' }}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" height="15px" viewBox="0 -960 960 960" width="15px" fill="var(--text)" style={{ position: 'absolute', left: 0 }}><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>
                                                    <svg xmlns="http://www.w3.org/2000/svg" height="15px" viewBox="0 -960 960 960" width="15px" fill="var(--text)" style={{ position: 'absolute', left: '4px' }}><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>
                                                </div>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" height="15px" viewBox="0 -960 960 960" width="15px" fill="var(--text)"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>
                                            )}
                                        </span>
                                    )}
                                </span>
                            </div>
                        </div>
                    );
                })}
                <div ref={messageEndRef} />
            </div>

            {/* Form Input Ketik Pesan Bawah */}
            <form className="chat-input-bar" onSubmit={handleSendMessage}>
                <input
                    type="text"
                    placeholder="Ketik pesan..."
                    value={inputMessage}
                    onChange={handleInputChange}
                />
                <button type="submit" className="send-msg-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="var(--text-h)"><path d="M120-160v-640l760 320-760 320Zm80-120 474-200-474-200v140l240 60-240 60v140Z" /></svg>
                </button>
            </form>

            {deleteModal.isOpen && (
                <div className="delete-modal-overlay" onClick={() => setDeleteModal({ isOpen: false, msgId: null, isMe: false })}>
                    <div className="delete-modal-content" onClick={e => e.stopPropagation()}>
                        <h4>Hapus pesan?</h4>
                        <div className="delete-modal-options">
                            {deleteModal.isMe && (
                                <button className="delete-option-btn everyone" onClick={() => handleDeleteMessage('everyone')}>Hapus untuk Semua Orang</button>
                            )}
                            <button className="delete-option-btn me" onClick={() => handleDeleteMessage('me')}>Hapus untuk Saya</button>
                            <button className="delete-option-btn cancel" onClick={() => setDeleteModal({ isOpen: false, msgId: null, isMe: false })}>Batal</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}