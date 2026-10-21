import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { api, imageUrl } from '../api';
import { useAuth } from '../context/AuthContext';

export default function ItemDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => { api(`/items/${id}`).then(d=>setItem(d.item)).catch(e=>setNotice(e.message)); }, [id]);

  async function claim() {
    try {
      await api(`/claims/item/${id}`, { method:'POST', body:JSON.stringify({ message }) });
      setNotice('Your claim was submitted successfully.');
      setMessage('');
    } catch (e) { setNotice(e.message); }
  }

  if (!item) return <><Navbar /><p className="p-8 text-center">{notice || 'Loading...'}</p></>;

  return <><Navbar /><main className="max-w-3xl mx-auto p-6">
    <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
      {item.image_url && <img src={imageUrl(item.image_url)} className="w-full max-h-[450px] object-cover" />}
      <div className="p-7">
        <span className="uppercase text-xs font-bold">{item.type}</span>
        <h1 className="text-3xl font-extrabold mt-2">{item.title}</h1>
        <p className="text-gray-500 mt-2">{item.category} · {item.location} · {item.item_date}</p>
        <p className="mt-6 whitespace-pre-wrap">{item.description}</p>
        <div className="border-t mt-6 pt-5">
          <p><b>Posted by:</b> {item.owner_name}</p>
          {user && user.id !== item.user_id && item.status === 'active' && (
            <div className="mt-5">
              <textarea className="w-full border p-3 rounded-lg" rows="4" placeholder="Explain why you believe this is your item..." value={message} onChange={e=>setMessage(e.target.value)} />
              <button onClick={claim} disabled={!message.trim()} className="mt-3 bg-blue-600 disabled:opacity-50 text-white px-5 py-3 rounded-lg">Submit Claim</button>
            </div>
          )}
          {notice && <p className="mt-4 text-blue-600">{notice}</p>}
        </div>
      </div>
    </div>
  </main></>;
}
