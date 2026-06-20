import { Outlet } from 'react-router-dom';
import BtmBar from '../components/BottomBar'
import HdrBar from '../components/HeaderBar'
import '../assets/css/Landing.css'

function Landing() {
    return (
        <div className="Landing-cover">
            <div className="header-bar-cover">
                <HdrBar />
            </div>

            <div className="outlate">
                <Outlet />
            </div>
            <div className="bottom-bar-cover">
                <BtmBar />
            </div>
        </div>
    );
}

export default Landing;