import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { api, imageUrl } from '../api';

export default function Dashboard() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [type, setType] = useState('All');
  const [error, setError] = useState('');

  async function loadItems() {
    try {
      const q = new URLSearchParams({ search, category, type });
      const data = await api(`/items?${q}`);
      setItems(data.items);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => { loadItems(); }, [category, type]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto p-6">
        <section className="text-center py-8">
          <h1 className="text-4xl font-extrabold mb-2">Find What You Lost. Return What You Found.</h1>
          <p className="text-gray-600">A centralized recovery system for your personal items.</p>
        </section>

        <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex flex-col md:flex-row gap-3">
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadItems()}
            placeholder="Search item, description or location..."
            className="flex-1 border p-3 rounded-lg" />
          <select value={category} onChange={e => setCategory(e.target.value)} className="border p-3 rounded-lg">
            <option>All</option><option>Electronics</option><option>Accessories</option>
            <option>Documents</option><option>Clothing</option><option>Keys</option><option>Other</option>
          </select>
          <select value={type} onChange={e => setType(e.target.value)} className="border p-3 rounded-lg">
            <option value="All">Lost & Found</option><option value="lost">Lost</option><option value="found">Found</option>
          </select>
          <button onClick={loadItems} className="bg-blue-600 text-white px-5 py-3 rounded-lg">Search</button>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">{error}</div>}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map(item => (
            <article key={item.id} className="bg-white border rounded-xl overflow-hidden shadow-sm">
              {item.image_url && <img src={imageUrl(item.image_url)} className="w-full h-48 object-cover" />}
              <div className="p-5">
                <div className="flex justify-between mb-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${item.type === 'lost' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                    {item.type}
                  </span>
                  <span className="text-xs text-gray-400">{item.item_date}</span>
                </div>
                <h2 className="font-bold text-lg">{item.title}</h2>
                <p className="text-sm text-gray-500 mt-1">{item.category} · {item.location}</p>
                <p className="text-sm text-gray-600 mt-3 line-clamp-2">{item.description}</p>
                <Link to={`/items/${item.id}`} className="block text-center bg-blue-50 text-blue-600 mt-4 py-2 rounded-lg font-medium">
                  View Details
                </Link>
              </div>
            </article>
          ))}
        </div>

        {!items.length && <p className="text-center text-gray-500 py-12">No items found.</p>}
      </main>
    </div>
  );
}
