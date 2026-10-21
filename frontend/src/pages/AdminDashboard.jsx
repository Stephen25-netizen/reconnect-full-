import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([]);
  const [claims, setClaims] = useState([]);

  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [claimActionError, setClaimActionError] = useState('');
  const [claimActionMessage, setClaimActionMessage] = useState('');
  const [processingClaimId, setProcessingClaimId] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError('');

    try {
      const [statsData, usersData, itemsData, claimsData] =
        await Promise.all([
          api('/admin/stats'),
          api('/admin/users'),
          api('/admin/items'),
          api('/admin/claims'),
        ]);

        setStats(statsData.stats || statsData);
      setUsers(Array.isArray(usersData) ? usersData : usersData.users || []);
      setItems(Array.isArray(itemsData) ? itemsData : itemsData.items || []);
      setClaims(
        Array.isArray(claimsData) ? claimsData : claimsData.claims || []
      );
    } catch (err) {
      setError(
        err.message ||
          'Unable to load administrator data. Please log in again and try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleClaimAction(claimId, action) {
    const actionLabel = action === 'approve' ? 'approve' : 'reject';

    if (
      !window.confirm(
        `Are you sure you want to ${actionLabel} claim #${claimId}?`
      )
    ) {
      return;
    }

    setClaimActionError('');
    setClaimActionMessage('');
    setProcessingClaimId(claimId);

    try {
      await api(`/admin/claims/${claimId}/${action}`, {
        method: 'PATCH',
      });

      setClaimActionMessage(
        `Claim #${claimId} was ${action === 'approve' ? 'approved' : 'rejected'} successfully.`
      );

      await loadDashboard();
    } catch (err) {
      setClaimActionError(
        err.message || `Unable to ${actionLabel} this claim. Please try again.`
      );
    } finally {
      setProcessingClaimId(null);
    }
  }

  const number = (value) => Number(value || 0).toLocaleString();

  const cards = [
    {
      label: 'Total Users',
      value: stats?.total_users,
      icon: '👥',
    },
    {
      label: 'Total Items',
      value: stats?.total_items,
      icon: '📦',
    },
    {
      label: 'Total Claims',
      value: stats?.total_claims,
      icon: '📋',
    },
    {
      label: 'Total Messages',
      value: stats?.total_messages,
      icon: '💬',
    },
    {
      label: 'Active Items',
      value: stats?.active_items,
      icon: '🔎',
    },
    {
      label: 'Pending Claims',
      value: stats?.pending_claims,
      icon: '⏳',
    },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: 'Users' },
    { id: 'items', label: 'Items' },
    { id: 'claims', label: 'Claims' },
  ];

  function formatDate(value) {
    if (!value) return '—';

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? '—'
      : date.toLocaleDateString();
  }

  function StatusBadge({ status }) {
    const normalized = String(status || 'unknown').toLowerCase();

    const colors = {
      active: 'bg-green-100 text-green-800',
      resolved: 'bg-blue-100 text-blue-800',
      claimed: 'bg-purple-100 text-purple-800',
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };

    return (
      <span
        className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
          colors[normalized] || 'bg-gray-100 text-gray-700'
        }`}
      >
        {normalized.replace(/_/g, ' ')}
      </span>
    );
  }

  function Overview() {
    return (
      <>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <h3 className="mt-2 text-3xl font-bold text-gray-900">
                    {number(card.value)}
                  </h3>
                </div>

                <span className="text-3xl" aria-hidden="true">
                  {card.icon}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-bold">Recent Users</h3>

            {users.slice(0, 5).map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between gap-3 border-b border-gray-100 py-3 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{user.name}</p>
                  <p className="truncate text-sm text-gray-500">
                    {user.email}
                  </p>
                </div>

                <StatusBadge status={user.role} />
              </div>
            ))}

            {users.length === 0 && (
              <p className="text-sm text-gray-500">No users found.</p>
            )}

            <button
              onClick={() => setActiveTab('users')}
              className="mt-4 font-semibold text-indigo-600 hover:underline"
            >
              View all users →
            </button>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-bold">Recent Items</h3>

            {items.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 border-b border-gray-100 py-3 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.title}</p>
                  <p className="truncate text-sm text-gray-500">
                    {item.location || 'Location not specified'}
                  </p>
                </div>

                <StatusBadge status={item.status} />
              </div>
            ))}

            {items.length === 0 && (
              <p className="text-sm text-gray-500">No items found.</p>
            )}

            <button
              onClick={() => setActiveTab('items')}
              className="mt-4 font-semibold text-indigo-600 hover:underline"
            >
              View all items →
            </button>
          </section>
        </div>
      </>
    );
  }

  function UsersTable() {
    return (
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[650px] text-left text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="p-4">ID</th>
              <th className="p-4">Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Role</th>
              <th className="p-4">Joined</th>
            </tr>
          </thead>

          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-gray-100">
                <td className="p-4">{user.id}</td>
                <td className="p-4">{user.name}</td>
                <td className="p-4">{user.email}</td>
                <td className="p-4">
                  <StatusBadge status={user.role} />
                </td>
                <td className="p-4">{formatDate(user.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <p className="p-6 text-gray-500">No users found.</p>
        )}
      </div>
    );
  }

  function ItemsTable() {
    return (
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[750px] text-left text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="p-4">ID</th>
              <th className="p-4">Title</th>
              <th className="p-4">Type</th>
              <th className="p-4">Location</th>
              <th className="p-4">Owner</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-gray-100">
                <td className="p-4">{item.id}</td>
                <td className="p-4">{item.title}</td>
                <td className="p-4">{item.type || '—'}</td>
                <td className="p-4">{item.location || '—'}</td>
                <td className="p-4">
                  {item.owner_name || item.name || '—'}
                </td>
                <td className="p-4">
                  <StatusBadge status={item.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {items.length === 0 && (
          <p className="p-6 text-gray-500">No items found.</p>
        )}
      </div>
    );
  }

  function ClaimsTable() {
    return (
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[750px] text-left text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="p-4">Claim ID</th>
              <th className="p-4">Item</th>
              <th className="p-4">Claimant</th>
              <th className="p-4">Message</th>
              <th className="p-4">Status</th>
              <th className="p-4">Date</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>

          <tbody>
            {claims.map((claim) => (
              <tr key={claim.id} className="border-t border-gray-100">
                <td className="p-4">{claim.id}</td>
                <td className="p-4">
                  {claim.item_title || claim.title || '—'}
                </td>
                <td className="p-4">
                  {claim.claimant_name || claim.name || '—'}
                </td>
                <td className="max-w-xs p-4">
                  <p className="line-clamp-2">
                    {claim.message || '—'}
                  </p>
                </td>
                <td className="p-4">
                  <StatusBadge status={claim.status} />
                </td>
                <td className="p-4">{formatDate(claim.created_at)}</td>
                <td className="p-4">
                  {String(claim.status || '').toLowerCase() === 'pending' ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={processingClaimId === claim.id}
                        onClick={() => handleClaimAction(claim.id, 'approve')}
                        className="rounded bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {processingClaimId === claim.id ? 'Please wait…' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        disabled={processingClaimId === claim.id}
                        onClick={() => handleClaimAction(claim.id, 'reject')}
                        className="rounded bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {processingClaimId === claim.id ? 'Please wait…' : 'Reject'}
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500">Reviewed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {claims.length === 0 && (
          <p className="p-6 text-gray-500">No claims found.</p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 px-5 py-6 text-white sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-400">RECONNECT ADMINISTRATION</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
              Administrator Dashboard
            </h1>
            <p className="mt-2 text-sm text-gray-300">
              Manage users, lost and found items, and claims.
            </p>
          </div>

          <Link
            to="/"
            className="rounded-lg bg-white px-4 py-2 font-semibold text-gray-900 hover:bg-gray-200"
          >
            Back to website
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-5 py-3 text-sm font-semibold ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}

          <button
            onClick={loadDashboard}
            className="ml-auto rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold hover:bg-gray-100"
          >
            Refresh data
          </button>
        </div>

        {loading ? (
          <div className="rounded-xl bg-white p-10 text-center">
            <p className="text-gray-600">Loading administrator data...</p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <p className="font-semibold text-red-700">
              Could not load dashboard
            </p>
            <p className="mt-2 text-sm text-red-600">{error}</p>

            <button
              onClick={loadDashboard}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'claims' && claimActionError && (
              <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {claimActionError}
              </div>
            )}
            {activeTab === 'claims' && claimActionMessage && (
              <div role="status" className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                {claimActionMessage}
              </div>
            )}
            {activeTab === 'overview' && <Overview />}
            {activeTab === 'users' && <UsersTable />}
            {activeTab === 'items' && <ItemsTable />}
            {activeTab === 'claims' && <ClaimsTable />}
          </>
        )}
      </main>
    </div>
  );
}