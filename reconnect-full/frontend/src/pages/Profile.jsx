import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [claims, setClaims] = useState([]);

  useEffect(() => {
    api('/items/mine').then(d=>setItems(d.items));
    api('/claims/mine').then(d=>setClaims(d.claims));
  }, []);

  return <><Navbar /><main className="max-w-5xl mx-auto p-6">
    <div className="bg-white border rounded-xl p-6 mb-6">
      <h1 className="text-2xl font-bold">{user?.name}</h1>
      <p className="text-gray-500">{user?.email}</p>
      <p className="text-gray-500">{user?.phone || 'No phone number added'}</p>
    </div>
    <div className="grid md:grid-cols-2 gap-6">
      <section className="bg-white border rounded-xl p-5">
        <h2 className="font-bold text-xl mb-4">My Items</h2>
        {items.map(i=><div key={i.id} className="border-b py-3">{i.title} <span className="text-xs text-gray-500">({i.status})</span></div>)}
        {!items.length && <p className="text-gray-500">No posted items yet.</p>}
      </section>
      <section className="bg-white border rounded-xl p-5">
        <h2 className="font-bold text-xl mb-4">My Claims</h2>
        {claims.map(c=><div key={c.id} className="border-b py-3">{c.title} <span className="text-xs text-gray-500">({c.status})</span></div>)}
        {!claims.length && <p className="text-gray-500">No claims yet.</p>}
      </section>
    </div>
  </main></>;
}
