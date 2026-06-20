import { Link } from 'react-router-dom';

function NotFound() {
    return (
        <div style={{
            textAlign: 'center',
            padding: '50px 20px',
            fontFamily: 'sans-serif'
        }}>
            <h1 style={{ fontSize: '72px', color: '#ff4d4d', margin: '0' }}>404</h1>
            <h2>Maaf, Halaman Belum Tersedia</h2>
            <p style={{ color: '#666', marginBottom: '30px' }}>
                Halaman yang kamu cari sedang dalam perbaikan atau belum dibuat.
            </p>

            <Link to="/" style={{
                padding: '10px 20px',
                backgroundColor: '#007bff',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '5px',
                fontWeight: 'bold'
            }}>
                Kembali ke Beranda
            </Link>
        </div>
    );
}

export default NotFound;