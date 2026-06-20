import React from 'react';
import './styles/Call.css';

export default function Call() {
    const calls = [
        { id: 1, name: 'Satria Elan', time: 'Hari ini, 10:30', type: 'incoming', video: false },
        { id: 2, name: 'Ibu', time: 'Kemarin, 21:15', type: 'outgoing', video: true },
        { id: 3, name: 'Ahmad Supardi', time: '18 Juni, 14:20', type: 'missed', video: false }
    ];

    return (
        <div className="call-container">
            <div className="call-header">
                <h2>Panggilan</h2>
            </div>
            
            <div className="link-item">
                <div className="link-icon-box">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#fff"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg>
                </div>
                <div className="item-text">
                    <h3>Buat tautan panggilan</h3>
                    <p>Bagikan tautan untuk panggilan ISChat Anda</p>
                </div>
            </div>

            <div className="recent-header">
                <h3>Terbaru</h3>
            </div>

            <div className="call-list">
                {calls.map(c => (
                    <div key={c.id} className="call-item">
                        <div className="call-avatar">
                            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random&color=fff`} alt="Avatar" />
                        </div>
                        <div className="item-text">
                            <h3>{c.name}</h3>
                            <div className="call-info">
                                <span className={`call-icon ${c.type}`}>
                                    {c.type === 'incoming' && '↙️'}
                                    {c.type === 'outgoing' && '↗️'}
                                    {c.type === 'missed' && '⚠️'}
                                </span>
                                <p>{c.time}</p>
                            </div>
                        </div>
                        <div className="call-action">
                            {c.video ? (
                                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#00a884"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h480q33 0 56.5 23.5T720-720v180l160-160v440L720-420v180q0 33-23.5 56.5T640-160H160Z"/></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#00a884"><path d="M798-120q-125 0-247-54.5T329-329Q229-429 174.5-551T120-798q0-18 12-30t30-12h162q14 0 25 9.5t13 22.5l26 140q2 16-1 27t-11 19l-97 98q20 37 47.5 71.5T387-386q31 31 65 57.5t72 48.5l94-94q9-9 23.5-13.5T670-390l138 28q14 4 23 14.5t9 23.5v162q0 18-12 30t-30 12Z"/></svg>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="fab-call">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#fff"><path d="M798-120q-125 0-247-54.5T329-329Q229-429 174.5-551T120-798q0-18 12-30t30-12h162q14 0 25 9.5t13 22.5l26 140q2 16-1 27t-11 19l-97 98q20 37 47.5 71.5T387-386q31 31 65 57.5t72 48.5l94-94q9-9 23.5-13.5T670-390l138 28q14 4 23 14.5t9 23.5v162q0 18-12 30t-30 12Z"/></svg>
            </div>
        </div>
    );
}
