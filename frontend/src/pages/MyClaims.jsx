import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { api } from '../api';

export default function MyClaims() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadClaims() {
    try {
      setLoading(true);
      setError('');

      const data = await api('/claims/mine');
      setClaims(data.claims || []);
    } catch (err) {
      setError(err.message || 'Could not load your claims.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClaims();
  }, []);

  const statusStyles = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };

  function formatDate(date) {
    if (!date) return 'Date unavailable';

    const parsed = new Date(date);

    return Number.isNaN(parsed.getTime())
      ? 'Date unavailable'
      : parsed.toLocaleDateString();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-5xl mx-auto p-6">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">
              My Claims
            </h1>

            <p className="text-gray-600 mt-2">
              Track the status of items you have claimed.
            </p>
          </div>

          <button
            type="button"
            onClick={loadClaims}
            disabled={loading}
            className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-100 disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh Claims'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-5">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-xl border p-8 text-center text-gray-600">
            Loading your claims...
          </div>
        ) : claims.length === 0 ? (
          <div className="bg-white rounded-xl border p-10 text-center">
            <div className="text-5xl mb-4">📋</div>

            <h2 className="text-xl font-bold text-gray-800">
              No claims yet
            </h2>

            <p className="text-gray-600 mt-2 mb-5">
              When you submit a claim for an item, it will appear here.
            </p>

            <Link
              to="/"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg font-semibold"
            >
              Browse Items
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {claims.map((claim) => {
              const status = String(claim.status || 'pending').toLowerCase();

              return (
                <article
                  key={claim.id}
                  className="bg-white border rounded-xl p-5 shadow-sm"
                >
                  <div className="flex flex-wrap justify-between items-start gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        {claim.title || 'Untitled item'}
                      </h2>

                      <p className="text-gray-500 text-sm mt-1">
                        Category: {claim.category || 'Not specified'}
                      </p>

                      <p className="text-gray-500 text-sm mt-1">
                        Owner: {claim.owner_name || 'Not available'}
                      </p>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        statusStyles[status] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {status.toUpperCase()}
                    </span>
                  </div>

                  <div className="mt-5">
                    <h3 className="font-semibold text-gray-800">
                      Your claim message
                    </h3>

                    <p className="text-gray-700 whitespace-pre-wrap mt-1">
                      {claim.message}
                    </p>
                  </div>

                  <div className="mt-4 bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800">
                      Identifying details
                    </h3>

                    <p className="text-gray-700 whitespace-pre-wrap mt-1">
                      {claim.identifying_details ||
                        'No identifying details recorded.'}
                    </p>
                  </div>

                  {claim.proof_image_url && (
                    <p className="mt-3 text-sm text-gray-600">
                      Supporting proof image submitted.
                    </p>
                  )}

                  <p className="text-sm text-gray-500 mt-4">
                    Submitted: {formatDate(claim.created_at)}
                  </p>

                  <Link
                    to={`/items/${claim.item_id}`}
                    className="inline-block mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold"
                  >
                    View Item
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}