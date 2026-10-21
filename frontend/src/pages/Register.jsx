import React from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name:'', email:'', phone:'', password:'' });
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    try { await register(form); navigate('/'); }
    catch (err) { setError(err.message); }
  }

  return <><Navbar /><div className="max-w-md mx-auto p-6">
    <form onSubmit={submit} className="bg-white p-7 rounded-xl shadow-sm border">
      <h1 className="text-2xl font-bold mb-5">Create Account</h1>
      {error && <p className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</p>}
      {['name','email','phone'].map(field => (
        <input key={field} className="w-full border p-3 rounded-lg mb-3" type={field === 'email' ? 'email' : 'text'} placeholder={field[0].toUpperCase()+field.slice(1)} value={form[field]} onChange={e => setForm({...form,[field]:e.target.value})} required={field !== 'phone'} />
      ))}
      <input className="w-full border p-3 rounded-lg mb-4" type="password" placeholder="Password (minimum 6 characters)" value={form.password} onChange={e => setForm({...form,password:e.target.value})} required />
      <button className="w-full bg-blue-600 text-white py-3 rounded-lg">Create Account</button>
      <p className="text-sm text-gray-500 mt-4">Already registered? <Link className="text-blue-600" to="/login">Login</Link></p>
    </form>
  </div></>;
}
