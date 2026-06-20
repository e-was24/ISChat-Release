import React from 'react';
import { useNavigate } from 'react-router-dom';
import './styles/Setting.css';

export default function Setting() {
    const navigate = useNavigate();
    const username = localStorage.getItem("username") || "Pengguna ISChat";

    const menuItems = [
        { id: 1, name: 'Akun', sub: 'Keamanan, ganti nomor', icon: '👤' },
        { id: 2, name: 'Privasi', sub: 'Blokir kontak, pesan sementara', icon: '🔒' },
        { id: 3, name: 'Chat', sub: 'Tema, wallpaper, riwayat chat', icon: '💬' },
        { id: 4, name: 'Notifikasi', sub: 'Nada pesan, grup & panggilan', icon: '🔔' },
        { id: 5, name: 'Penyimpanan dan Data', sub: 'Penggunaan jaringan, unduh otomatis', icon: '📊' },
        { id: 6, name: 'Bantuan', sub: 'Pusat bantuan, hubungi kami', icon: '❓' }
    ];

    return (
        <div className="setting-container">
            <div className="setting-header">
                <h2>Setelan</h2>
            </div>

            <div className="setting-profile-card" onClick={() => navigate('/profile')}>
                <img src="https://via.placeholder.com/150" alt="Profile" className="setting-avatar" />
                <div className="profile-info">
                    <h3>{username}</h3>
                    <p>Available</p>
                </div>
                <div className="qr-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#00a884"><path d="M120-120v-280h280v280H120Zm0-440v-280h280v280H120Zm440 440v-280h280v280H560Zm0-440v-280h280v280H560ZM200-200h120v-120H200v120Zm0-440h120v-120H200v120Zm440 440h120v-120H640v120Zm0-440h120v-120H640v120ZM240-240v-40h40v40h-40Zm0-440v-40h40v40h-40Zm440 440v-40h40v40h-40Zm0-440v-40h40v40h-40Z"/></svg>
                </div>
            </div>

            <div className="setting-menu-list">
                {menuItems.map(m => (
                    <div key={m.id} className="setting-menu-item">
                        <div className="menu-icon">{m.icon}</div>
                        <div className="menu-text">
                            <h3>{m.name}</h3>
                            <p>{m.sub}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="logout-section">
                <button className="logout-btn" onClick={() => {
                    localStorage.clear();
                    navigate('/login');
                }}>Log Out</button>
            </div>
        </div>
    );
}