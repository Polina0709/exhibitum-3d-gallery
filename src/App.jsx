import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Exhibition from './pages/Exhibition';
import ArtistProfile from './pages/ArtistProfile';

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/exhibition" element={<Exhibition />} />
                    <Route path="/artist/:id" element={<ArtistProfile />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;