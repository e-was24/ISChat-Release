import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./Pages/Login";
import Register from "./Pages/Register";
import Home from './Pages/Chat';
import Setting from './Pages/Setting';
import PageNotFound from './Pages/PageNotFound';
import Landing from './Pages/Landing';
import Status from './Pages/Status';
import NumSearch from './Pages/NumSearch';
import Profile from './Pages/Profile';
import Community from './Pages/Community';
import Call from './Pages/Call';
import MessageRoom  from "./Pages/MessageRoom";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route index element={<Register />} />
        <Route path="/profile" element={<Profile />}/>
        <Route path="/message/:id" element={<MessageRoom />} />
        <Route path="/" element={<Landing />}>
          <Route path="/home" element={<Home />} />
          <Route path="/setting" element={<Setting />} />
          <Route path="/status" element={<Status />} />
          <Route path="/community" element={<Community />} />
          <Route path="/call" element={<Call />} />
          <Route path="/search-number" element={<NumSearch />}/>
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;