import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CONFIG from '../config';

export default function NumSearch() {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [customName, setCustomName] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const navigate = useNavigate();

    // Proteksi Auto-Logout jika user_id mendadak hilang
    const currentUserId = localStorage.getItem("user_id");
    useEffect(() => {
        if (!currentUserId) {
            localStorage.clear();
            navigate('/login');
        }
    }, [currentUserId, navigate]);

    async function handleAddContact(e) {
        e.preventDefault();
        if (!phoneNumber) {
            setIsError(true);
            setMessage("Nomor handphone wajib diisi!");
            return;
        }

        setLoading(true);
        setMessage('');
        setIsError(false);

        try {
            const res = await fetch(`${CONFIG.BACKEND_URL}/contacts/add`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    user_id: currentUserId,
                    number_phone: phoneNumber,
                    custom_name: customName
                })
            });

            const data = await res.json().catch(() => null);

            if (res.ok) {
                setIsError(false);
                setMessage(data?.message || "Kontak berhasil ditambahkan!");
                setPhoneNumber('');
                setCustomName('');

                // Kembalikan ke halaman utama setelah 1.5 detik agar user sempat membaca pesan sukses
                setTimeout(() => {
                    navigate('/');
                }, 1500);
            } else {
                setIsError(true);
                setMessage(data?.message || data?.error || "Gagal menambahkan kontak.");
            }
        } catch (error) {
            console.error("Error:", error);
            setIsError(true);
            setMessage("Server tidak merespons.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="search-page-cover" style={{ padding: '20px', color: 'var(--text)', maxWidth: '400px', margin: '50px auto' }}>
            {/* Tombol Kembali */}
            <button
                onClick={() => navigate('/')}
                style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', marginBottom: '20px' }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="var(--text)"><path d="m313-440 224 224-57 57-320-320 320-320 57 57-224 224h487v80H313Z" /></svg>
                &nbsp;Kembali
            </button>

            <h2>Tambah Kontak Baru</h2>
            <p style={{ color: 'var(--text)', opacity: 0.8, fontSize: '0.9em', marginBottom: '20px' }}>Cari teman kamu menggunakan nomor handphone terdaftar.</p>

            {message && (
                <p style={{
                    color: isError ? '#ff8080' : '#81c784',
                    textAlign: 'center',
                    backgroundColor: 'var(--accent-bg)',
                    padding: '10px',
                    borderRadius: '5px'
                }}>
                    {message}
                </p>
            )}

            <form onSubmit={handleAddContact} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '0.85em', color: 'var(--text)' }}>Nomor Handphone</label>
                    <input
                        type="text"
                        placeholder="Contoh: +62812345678"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text-h)' }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '0.85em', color: 'var(--text)' }}>Nama Custom (Opsional)</label>
                    <input
                        type="text"
                        placeholder="Nama tampilan di chat kamu"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text-h)' }}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        padding: '12px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: 'var(--accent)',
                        color: 'var(--text-h)',
                        fontWeight: 'bold',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        marginTop: '10px'
                    }}
                >
                    {loading ? "Mencari..." : "Simpan Kontak"}
                </button>
            </form>
        </div>
    );
}