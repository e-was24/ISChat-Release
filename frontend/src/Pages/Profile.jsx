import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../assets/css/profile.css';
import CONFIG from '../config';
import AvatarPopup from '../components/AvatarPopup';

export default function Profile() {
    const [user, setUser] = useState({
        username: '',
        email: '',
        phoneNumber: '',
        bio: 'Available',
        profileUrl: ''
    });
    const [loading, setLoading] = useState(true);
    const [isEditingName, setIsEditingName] = useState(false);
    const [isEditingBio, setIsEditingBio] = useState(false);
    const [newName, setNewName] = useState('');
    const [newBio, setNewBio] = useState('');
    const [isAvatarPopupOpen, setIsAvatarPopupOpen] = useState(false);
    const navigate = useNavigate();

    const currentUserId = localStorage.getItem("user_id");

    useEffect(() => {
        if (!currentUserId) {
            localStorage.clear();
            navigate('/login');
            return;
        }

        // Menarik data profil berdasarkan user_id (Sesi aktif)
        fetch(`${CONFIG.BACKEND_URL}/user/profile?user_id=${currentUserId}`)
            .then(res => {
                if (!res.ok) throw new Error("Gagal mengambil data profil");
                return res.json();
            })
            .then(data => {
                setUser({
                    username: data.username || 'Nama Belum Diatur',
                    email: data.email || '',
                    phoneNumber: data.phone_number || '-',
                    bio: data.bio || 'Available',
                    profileUrl: data.profile_picture_url || ''
                });
                setNewName(data.username || '');
                setNewBio(data.bio || 'Available');
                setLoading(false);
            })
            .catch(err => {
                console.error("Gagal memuat profil:", err);
                setLoading(false);
            });
    }, [currentUserId, navigate]);

    async function handleUpdateProfile(field, value) {
        if (!value.trim()) return alert("Kolom tidak boleh kosong!");

        const backendField = field === 'profileUrl' ? 'profile_picture_url' : field;

        try {
            const res = await fetch(`${CONFIG.BACKEND_URL}/user/update`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: currentUserId,
                    [backendField]: value
                })
            });

            if (res.ok) {
                setUser(prev => ({ ...prev, [field]: value }));
                if (field === 'username') setIsEditingName(false);
                if (field === 'bio') setIsEditingBio(false);
            } else {
                alert("Gagal memperbarui profil di database");
            }
        } catch (error) {
            console.error("Error update profile:", error);
            alert("Terjadi kesalahan jaringan.");
        }
    }

    const handleChangeAvatar = () => {
        setIsAvatarPopupOpen(true);
    };

    const handleUploadPhoto = () => {
        // Logic for file upload (could trigger hidden file input)
        document.getElementById('avatar-file-input').click();
    };

    const handleTakePhoto = () => {
        alert("Fitur Ambil Foto segera hadir!");
        setIsAvatarPopupOpen(false);
    };

    const handleUploadLink = () => {
        const newUrl = prompt("Masukkan URL Foto Profil Baru:");
        if (newUrl && newUrl.trim()) {
            handleUpdateProfile('profileUrl', newUrl);
        }
        setIsAvatarPopupOpen(false);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Mocking file upload for now as we don't have a backend upload handler with multipart
            // In real app, we would upload to S3/Cloudinary and get URL
            alert("Upload file terdeteksi: " + file.name + "\n(Menunggu integrasi backend upload)");
        }
        setIsAvatarPopupOpen(false);
    };

    if (loading) {
        return <div style={{ color: 'var(--text)', padding: '20px', textAlign: 'center', backgroundColor: 'var(--bg)', minHeight: '100vh' }}>Memuat Profil...</div>;
    }

    return (
        <div className="profile-page-wrapper">
            {/* Header ala WA */}
            <div className="profile-header">
                <button onClick={() => navigate('/')} className="back-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="var(--text-h)"><path d="m313-440 224 224-57 57-320-320 320-320 57 57-224 224h487v80H313Z" /></svg>
                </button>
                <h2>Profil Anda</h2>
            </div>

            {/* Bagian Foto Profil */}
            <div className="avatar-section">
                <div className="avatar-container" onClick={handleChangeAvatar}>
                    <img 
                        src={user.profileUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=333&color=fff`} 
                        alt="Foto Profil" 
                        className="profile-avatar" 
                    />
                    <div className="camera-overlay">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="var(--text-h)"><path d="M480-280q83 0 141.5-58.5T680-480q0-83-58.5-141.5T480-680q-83 0-141.5 58.5T280-480q0 83 58.5 141.5T480-280Zm0-80q-50 0-85-35t-35-85q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35ZM160-160q-33 0-56.5-23.5T80-240v-480q0-33 23-56.5T160-800h144l64-80h224l64 80h144q33 0 56.5 23.5T880-720v480q0 33-23 56.5T800-160H160Z" /></svg>
                        <span style={{ fontSize: '10px', color: 'var(--text-h)', marginTop: '5px' }}>UBAH</span>
                    </div>
                </div>
            </div>

            {/* List Detail Info */}
            <div className="info-list">
                {/* Baris Nama */}
                <div className="info-item">
                    <div className="info-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="var(--text)"><path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-240v-32q0-34 17.5-62.5T226-378q64-46 142-71t112-25q34 0 112 25t142 71q31 13 48.5 41.5T800-272v32q0 33-23 56.5T720-160H240q-33 0-56.5-23.5T160-240Z" /></svg>
                    </div>
                    <div className="info-content">
                        <label>Nama</label>
                        {isEditingName ? (
                            <div className="edit-box">
                                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
                                <button onClick={() => handleUpdateProfile('username', newName)}>Simpan</button>
                            </div>
                        ) : (
                            <div className="display-box">
                                <p>{user.username}</p>
                                <button onClick={() => setIsEditingName(true)} className="edit-icon-btn">✏️</button>
                            </div>
                        )}
                        <span className="hint-text">Ini bukan nama pengguna atau PIN Anda. Nama ini akan terlihat oleh kontak ISChat Anda.</span>
                    </div>
                </div>

                {/* Baris Info / Bio */}
                <div className="info-item">
                    <div className="info-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="var(--text)"><path d="M480-80q-15 0-29.5-6T426-104l-52-52H200q-33 0-56.5-23.5T120-236v-484q0-33 23-56.5T200-800h560q33 0 56.5 23.5T840-720v484q0 33-23 56.5T760-236H584l-52 52q-10 11-24.5 17T480-80Z" /></svg>
                    </div>
                    <div className="info-content">
                        <label>Info</label>
                        {isEditingBio ? (
                            <div className="edit-box">
                                <input type="text" value={newBio} onChange={e => setNewBio(e.target.value)} autoFocus />
                                <button onClick={() => handleUpdateProfile('bio', newBio)}>Simpan</button>
                            </div>
                        ) : (
                            <div className="display-box">
                                <p>{user.bio}</p>
                                <button onClick={() => setIsEditingBio(true)} className="edit-icon-btn">✏️</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Baris Nomor Telepon (Diambil Real-time dari DB) */}
                <div className="info-item">
                    <div className="info-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="var(--text)"><path d="M798-120q-125 0-247-54.5T329-329Q229-429 174.5-551T120-798q0-18 12-30t30-12h162q14 0 25 8.5t13 21.5l26 140q2 14-1.5 27t-11.5 19l-98 98q53 93 125.5 165.5T551-329l98-98q9-9 22-12t26 2l140 26q13 2 21.5 13t8.5 25v162q0 18-12 30t-30 12Z" /></svg>
                    </div>
                    <div className="info-content">
                        <label>Telepon</label>
                        <p className="phone-display">{user.phoneNumber}</p>
                    </div>
                </div>
            </div>

            <AvatarPopup 
                isOpen={isAvatarPopupOpen}
                onClose={() => setIsAvatarPopupOpen(false)}
                onUpload={handleUploadPhoto}
                onTake={handleTakePhoto}
                onLink={handleUploadLink}
            />

            <input 
                type="file" 
                id="avatar-file-input" 
                style={{ display: 'none' }} 
                accept="image/*"
                onChange={handleFileChange}
            />
        </div>
    );
}