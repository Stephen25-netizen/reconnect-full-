import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="bg-white shadow-sm border-b px-6 py-4 flex flex-wrap gap-4 justify-between items-center">
      <Link to="/" className="text-2xl font-extrabold text-blue-600">Reconnect</Link>
      <div className="flex items-center gap-3">
        <Link to="/" className="text-sm font-medium hover:text-blue-600">Browse</Link>
        {user && <Link to="/post" className="text-sm font-medium hover:text-blue-600">Post Item</Link>}
        {user ? (
          <>
            <Link to="/profile" className="text-sm font-medium hover:text-blue-600">{user.name}</Link>
            <button onClick={() => { logout(); navigate('/login'); }} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="border px-4 py-2 rounded-lg text-sm">Login</Link>
            <Link to="/register" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
