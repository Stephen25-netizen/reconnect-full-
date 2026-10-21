import React from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    try { await login(form.email, form.password); navigate('/'); }
    catch (err) { setError(err.message); }
  }

  return <><Navbar /><div className="max-w-md mx-auto p-6">
    <form onSubmit={submit} className="bg-white p-7 rounded-xl shadow-sm border">
      <h1 className="text-2xl font-bold mb-5">Login</h1>
      {error && <p className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</p>}
      <input className="w-full border p-3 rounded-lg mb-3" type="email" placeholder="Email" value={form.email} onChange={e => setForm({...form,email:e.target.value})} required />
      <input className="w-full border p-3 rounded-lg mb-4" type="password" placeholder="Password" value={form.password} onChange={e => setForm({...form,password:e.target.value})} required />
      <button className="w-full bg-blue-600 text-white py-3 rounded-lg">Login</button>
      <p className="text-sm text-gray-500 mt-4">No account? <Link className="text-blue-600" to="/register">Register</Link></p>
    </form>
  </div></>;
}
