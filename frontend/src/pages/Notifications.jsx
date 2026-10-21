import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Notifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);

    try {
      const data = await api('/notifications');
      setNotifications(data.notifications || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications(true);

    const interval = setInterval(() => {
      loadNotifications();
    }, 15000);

    return () => clearInterval(interval);
  }, [loadNotifications]);

  async function markAsRead(id) {
    setBusyId(id);
    setError('');

    try {
      await api(`/notifications/${id}/read`, {
        method: 'PATCH',
      });

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id
            ? { ...notification, is_read: true }
            : notification
        )
      );

      return true;
    } catch (err) {
      setError(err.message || 'Unable to mark notification as read.');
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function markAllAsRead() {
    setMarkingAll(true);
    setError('');

    try {
      await api('/notifications/read-all', {
        method: 'PATCH',
      });

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          is_read: true,
        }))
      );
    } catch (err) {
      setError(err.message || 'Unable to mark all notifications as read.');
    } finally {
      setMarkingAll(false);
    }
  }

  async function openNotification(notification) {
    if (busyId === notification.id) return;

    setError('');

    // Mark the notification as read before navigating.
    if (!notification.is_read) {
      const success = await markAsRead(notification.id);

      if (!success) return;
    }

    // Possible-match notifications open the matching item.
    if (notification.type === 'possible_match') {
      if (notification.related_item_id) {
        navigate(`/items/${notification.related_item_id}`);
      } else {
        setError('This matching notification has no linked item.');
      }

      return;
    }

    // New-message notifications open the specific conversation.
    if (notification.type === 'new_message') {
      if (notification.related_conversation_id) {
        navigate('/messages', {
          state: {
            conversationId: notification.related_conversation_id,
          },
        });
      } else {
        setError(
          'This message notification has no linked conversation.'
        );
      }

      return;
    }

    // Other notifications with an associated item open that item.
    if (notification.related_item_id) {
      navigate(`/items/${notification.related_item_id}`);
    }
  }

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Notifications
          </h1>

          <p className="mt-1 text-gray-600">
            Stay updated about your Reconnect activity.
          </p>
        </div>

        <button
          type="button"
          onClick={markAllAsRead}
          disabled={unreadCount === 0 || markingAll}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {markingAll ? 'Updating...' : 'Mark all as read'}
        </button>
      </div>

      {unreadCount > 0 && (
        <p className="mb-4 text-sm font-medium text-blue-700">
          You have {unreadCount} unread notification
          {unreadCount === 1 ? '' : 's'}.
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border bg-white p-8 text-center text-gray-500">
          Loading notifications...
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-xl border bg-white p-10 text-center">
          <div className="mb-3 text-4xl" aria-hidden="true">
            🔔
          </div>

          <h2 className="text-lg font-semibold text-gray-900">
            No notifications yet
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            Updates about your activity will appear here.
          </p>

          <Link
            to="/"
            className="mt-5 inline-block font-semibold text-blue-600 hover:underline"
          >
            Browse items
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const isBusy = busyId === notification.id;

            let actionLabel = '';

            if (notification.type === 'possible_match') {
              actionLabel = 'View Matching Item';
            } else if (notification.type === 'new_message') {
              actionLabel = 'View Conversation';
            } else if (notification.related_item_id) {
              actionLabel = 'View Related Item';
            }

            return (
              <article
                key={notification.id}
                className={`rounded-xl border p-5 shadow-sm ${
                  notification.is_read
                    ? 'border-gray-200 bg-white'
                    : 'border-blue-200 bg-blue-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                      notification.is_read
                        ? 'bg-gray-300'
                        : 'bg-blue-600'
                    }`}
                    aria-label={
                      notification.is_read ? 'Read' : 'Unread'
                    }
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h2 className="font-semibold text-gray-900">
                        {notification.title}
                      </h2>

                      {!notification.is_read && (
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                          New
                        </span>
                      )}
                    </div>

                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">
                      {notification.message}
                    </p>

                    <p className="mt-3 text-xs text-gray-500">
                      {notification.created_at
                        ? new Date(
                            notification.created_at
                          ).toLocaleString()
                        : ''}
                    </p>

                    {actionLabel && (
                      <button
                        type="button"
                        onClick={() => openNotification(notification)}
                        disabled={isBusy}
                        className="mt-3 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isBusy ? 'Opening...' : actionLabel}
                      </button>
                    )}

                    {!notification.is_read && (
                      <div>
                        <button
                          type="button"
                          onClick={() => markAsRead(notification.id)}
                          disabled={isBusy}
                          className="mt-3 block text-sm font-semibold text-blue-700 hover:underline disabled:opacity-50"
                        >
                          {isBusy ? 'Updating...' : 'Mark as read'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}