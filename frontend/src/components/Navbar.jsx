import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount] = useState(0);

  const isAdmin = user?.role === 'admin';

  const loadUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      const data = await api('/notifications/unread-count');
      setUnreadCount(Number(data.unreadCount) || 0);
    } catch (error) {
      console.error('Unable to load notification count:', error.message);
    }
  }, [user]);

  useEffect(() => {
    loadUnreadCount();

    if (!user) return undefined;

    const interval = setInterval(loadUnreadCount, 15000);

    return () => clearInterval(interval);
  }, [user, loadUnreadCount]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav className="relative z-20 flex flex-wrap items-center justify-between gap-4 border-b bg-white px-6 py-4 shadow-sm">
      <Link
        to="/"
        className="text-2xl font-extrabold text-blue-600"
      >
        Reconnect
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/"
          className="text-sm font-medium hover:text-blue-600"
        >
          Browse
        </Link>

        {user && (
          <>
            <Link
              to="/post"
              className="text-sm font-medium hover:text-blue-600"
            >
              Post Item
            </Link>

            <Link
              to="/messages"
              className="text-sm font-medium hover:text-blue-600"
            >
              Messages
            </Link>

            <Link
              to="/notifications"
              className="relative inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              aria-label={`Notifications, ${unreadCount} unread`}
            >
              <span aria-hidden="true">🔔</span>
              <span>Notifications</span>

              {unreadCount > 0 && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>

            {/* Only administrators see this link */}
            {isAdmin && (
              <Link
                to="/admin"
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Admin Dashboard
              </Link>
            )}

            <Link
              to="/profile"
              className="text-sm font-medium hover:text-blue-600"
            >
              {user.name}
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700"
            >
              Logout
            </button>
          </>
        )}

        {!user && (
          <>
            <Link
              to="/login"
              className="rounded-lg border px-4 py-2 text-sm"
            >
              Login
            </Link>

            <Link
              to="/register"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}