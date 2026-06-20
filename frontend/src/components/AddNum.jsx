import { useNavigate } from 'react-router-dom';

export default function AddNum() {
    const navigate = useNavigate();

    return (
        <button
            className="add-num-btn"
            onClick={() => navigate('/search-number')}
            style={{
                backgroundColor: '#388e3c',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: '55px',
                height: '55px',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.2s',
                zIndex: 1000,
                margin: '10px'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
            {/* Icon Tambah (+) */}
            <svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="#e3e3e3">
                <path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/>
            </svg>
        </button>
    );
}