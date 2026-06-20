const isProd = window.location.hostname !== "localhost";

const CONFIG = {
    // Di Vercel, backend diarahkan ke /_/backend via vercel.json experimentalServices
    BACKEND_URL: isProd ? "/_/backend" : "http://localhost:8080",
    WS_URL: isProd 
        ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/_/backend/ws`
        : "ws://localhost:8080/ws"
};

export default CONFIG;
