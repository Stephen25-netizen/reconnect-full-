import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { api } from '../api';

export default function PostItem() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title:'', description:'', category:'Electronics', location:'', type:'lost', item_date:'' });
  const [image, setImage] = useState(null);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    const body = new FormData();
    Object.entries(form).forEach(([k,v]) => body.append(k,v));
    if (image) body.append('image', image);

    try {
      await api('/items', { method:'POST', body });
      navigate('/');
    } catch (err) { setError(err.message); }
  }

  return <><Navbar /><div className="max-w-2xl mx-auto p-6">
    <form onSubmit={submit} className="bg-white border rounded-xl p-7 shadow-sm">
      <h1 className="text-2xl font-bold mb-5">Post Lost / Found Item</h1>
      {error && <p className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</p>}
      <label className="block text-sm font-medium mb-1">Type</label>
      <select className="w-full border p-3 rounded-lg mb-3" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
        <option value="lost">I lost this item</option><option value="found">I found this item</option>
      </select>
      <input className="w-full border p-3 rounded-lg mb-3" placeholder="Item title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required />
      <select className="w-full border p-3 rounded-lg mb-3" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
        <option>Electronics</option><option>Accessories</option><option>Documents</option><option>Clothing</option><option>Keys</option><option>Other</option>
      </select>
      <input className="w-full border p-3 rounded-lg mb-3" placeholder="Location" value={form.location} onChange={e=>setForm({...form,location:e.target.value})} required />
      <input className="w-full border p-3 rounded-lg mb-3" type="date" value={form.item_date} onChange={e=>setForm({...form,item_date:e.target.value})} />
      <textarea className="w-full border p-3 rounded-lg mb-3" rows="5" placeholder="Describe the item and useful identifying details..." value={form.description} onChange={e=>setForm({...form,description:e.target.value})} required />
      <input className="w-full border p-3 rounded-lg mb-5" type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setImage(e.target.files[0])} />
      <button className="w-full bg-blue-600 text-white py-3 rounded-lg">Publish Item</button>
    </form>
  </div></>;
}
