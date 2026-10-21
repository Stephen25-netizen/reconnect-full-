import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { api, imageUrl } from '../api';

export default function Dashboard() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [type, setType] = useState('All');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadItems() {
    try {
      setLoading(true);
      setError('');

      const q = new URLSearchParams({
        search: search.trim(),
        category,
        type,
      });

      const data = await api(`/items?${q.toString()}`);

      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setError(err.message || 'Could not load items.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, [category, type]);

  function clearFilters() {
    setSearch('');
    setCategory('All');
    setType('All');
    setError('');
  }

  function getStatusStyle(status) {
    switch (status) {
      case 'claimed':
        return 'bg-purple-100 text-purple-700';

      case 'resolved':
        return 'bg-gray-200 text-gray-700';

      default:
        return 'bg-green-100 text-green-700';
    }
  }

  function formatDate(date) {
    if (!date) return 'Date not provided';

    const parsed = new Date(`${String(date).slice(0, 10)}T00:00:00`);

    if (Number.isNaN(parsed.getTime())) {
      return String(date);
    }

    return parsed.toLocaleDateString();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-6xl mx-auto p-6">

        {/* Hero section */}
        <section className="text-center py-10">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3">
            Find What You Lost. Return What You Found.
          </h1>

          <p className="text-gray-600 max-w-2xl mx-auto">
            A centralized recovery system helping people reconnect with
            their lost belongings through detailed listings and photographs.
          </p>

          <Link
            to="/post"
            className="inline-block mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
          >
            + Post a Lost or Found Item
          </Link>
        </section>

        {/* Search and filters */}
        <section className="bg-white p-4 rounded-xl shadow-sm mb-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadItems();
            }}
            className="flex flex-col md:flex-row gap-3"
          >
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by item, description or location..."
              aria-label="Search items"
              className="flex-1 border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Filter by category"
              className="border p-3 rounded-lg"
            >
              <option value="All">All Categories</option>
              <option value="Electronics">Electronics</option>
              <option value="Accessories">Accessories</option>
              <option value="Documents">Documents</option>
              <option value="Clothing">Clothing</option>
              <option value="Keys">Keys</option>
              <option value="Bags">Bags</option>
              <option value="Jewellery">Jewellery</option>
              <option value="Other">Other</option>
            </select>

            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              aria-label="Filter by listing type"
              className="border p-3 rounded-lg"
            >
              <option value="All">Lost & Found</option>
              <option value="lost">Lost Items</option>
              <option value="found">Found Items</option>
            </select>

            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg font-semibold"
            >
              Search
            </button>

            <button
              type="button"
              onClick={clearFilters}
              className="border border-gray-300 hover:bg-gray-100 px-4 py-3 rounded-lg"
            >
              Clear
            </button>
          </form>
        </section>

        {/* Results heading */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">
            Recent Listings
          </h2>

          {!loading && (
            <span className="text-sm text-gray-500">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="bg-red-50 text-red-700 border border-red-200 p-4 rounded-lg mb-5"
          >
            <p className="font-semibold">Unable to load listings</p>
            <p className="text-sm mt-1">{error}</p>

            <button
              type="button"
              onClick={loadItems}
              className="mt-3 underline font-medium"
            >
              Try again
            </button>
          </div>
        )}

        {/* Loading message */}
        {loading && (
          <div className="text-center py-12 text-gray-500">
            Loading lost and found items...
          </div>
        )}

        {/* Item cards */}
        {!loading && !error && items.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <article
                key={item.id}
                className="bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Item photograph */}
                <div className="h-52 bg-gray-100 flex items-center justify-center overflow-hidden">
                  {item.image_url ? (
                    <img
                      src={imageUrl(item.image_url)}
                      alt={`Photograph of ${item.title}`}
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="text-center text-gray-400 p-4">
                      <span className="text-4xl block mb-2">📷</span>
                      <span className="text-sm">
                        No photograph available
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-5">
                  {/* Type and status */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        item.type === 'lost'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {item.type === 'lost' ? 'LOST ITEM' : 'FOUND ITEM'}
                    </span>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusStyle(item.status)}`}
                    >
                      {item.status || 'active'}
                    </span>
                  </div>

                  {/* Item information */}
                  <h3 className="font-bold text-lg break-words">
                    {item.title}
                  </h3>

                  <p className="text-sm text-gray-500 mt-2">
                    <span className="font-medium">Category:</span>{' '}
                    {item.category}
                  </p>

                  <p className="text-sm text-gray-500 mt-1">
                    <span className="font-medium">Location:</span>{' '}
                    {item.location}
                  </p>

                  <p className="text-sm text-gray-500 mt-1">
                    <span className="font-medium">Date:</span>{' '}
                    {formatDate(item.item_date)}
                  </p>

                  <p className="text-sm text-gray-600 mt-3 line-clamp-3">
                    {item.description}
                  </p>

                  {/* Details link */}
                  <Link
                    to={`/items/${item.id}`}
                    className="block text-center bg-blue-50 hover:bg-blue-100 text-blue-700 mt-5 py-3 rounded-lg font-semibold"
                  >
                    View Item Details →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && items.length === 0 && (
          <div className="bg-white border rounded-xl text-center py-12 px-6">
            <div className="text-5xl mb-4">🔎</div>

            <h3 className="text-xl font-bold mb-2">
              No items found
            </h3>

            <p className="text-gray-500 mb-5">
              Try another search term or clear the filters to see more listings.
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg"
            >
              Clear Filters
            </button>
          </div>
        )}
      </main>
    </div>
  );
}