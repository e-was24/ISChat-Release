import React from 'react';
import './styles/Status.css';

export default function Status() {
    const updates = [
        { id: 1, name: 'Satria Elan', time: '10 menit yang lalu' },
        { id: 2, name: 'Ahmad Supardi', time: '53 menit yang lalu' },
        { id: 3, name: 'Budi Santoso', time: 'Tadi' }
    ];

    return (
        <div className="status-container">
            <div className="status-header">
                <h2>Status</h2>
            </div>

            <div className="status-item my-status">
                <div className="status-avatar-wrapper">
                    <img src="https://via.placeholder.com/150" alt="My Status" />
                    <div className="add-status-icon">+</div>
                </div>
                <div className="item-text">
                    <h3>Status saya</h3>
                    <p>Ketuk untuk menambahkan pembaruan status</p>
                </div>
            </div>

            <div className="section-title">
                <h3>Pembaruan terkini</h3>
            </div>

            <div className="status-list">
                {updates.map(u => (
                    <div key={u.id} className="status-item">
                        <div className="status-avatar-wrapper ring">
                            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random&color=fff`} alt={u.name} />
                        </div>
                        <div className="item-text">
                            <h3>{u.name}</h3>
                            <p>{u.time}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="fab-status">
                <div className="fab-small">
                    <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#b1b1b1"><path d="M480-280q83 0 141.5-58.5T680-480q0-83-58.5-141.5T480-680q-83 0-141.5 58.5T280-480q0 83 58.5 141.5T480-280Z"/></svg>
                </div>
                <div className="fab-main">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#fff"><path d="M480-480ZM200-200v-560h560v560H200Zm80-80h400v-400H280v400Zm40-80h320l-90-120-70 90-50-60-110 90Z"/></svg>
                </div>
            </div>
        </div>
    );
}