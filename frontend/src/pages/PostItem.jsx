import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { api } from '../api';

export default function PostItem() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Electronics',
    location: '',
    type: 'lost',
    item_date: new Date().toISOString().slice(0, 10),
  });

  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0];

    setError('');
    setPreview('');

    if (!file) {
      setImage(null);
      return;
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.type)) {
      setImage(null);
      e.target.value = '';
      setError('Please select a JPG, JPEG, PNG, or WEBP image.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImage(null);
      e.target.value = '';
      setError('The image must not exceed 5 MB.');
      return;
    }

    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  async function submit(e) {
    e.preventDefault();
    setError('');

    if (!image) {
      setError('Please upload at least one photo of the item.');
      return;
    }

    if (!form.title.trim() || !form.description.trim() ||
        !form.location.trim()) {
      setError('Please complete the title, description, and location.');
      return;
    }

    const body = new FormData();

    Object.entries(form).forEach(([key, value]) => {
      body.append(key, value);
    });

    // The field name must match the backend upload middleware.
    body.append('image', image);

    try {
      setLoading(true);

      await api('/items', {
        method: 'POST',
        body,
      });

      navigate('/');
    } catch (err) {
      setError(err.message || 'Could not publish the item.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />

      <div className="max-w-2xl mx-auto p-6">
        <form
          onSubmit={submit}
          className="bg-white border rounded-xl p-7 shadow-sm"
        >
          <h1 className="text-2xl font-bold mb-2">
            Post Lost / Found Item
          </h1>

          <p className="text-gray-600 mb-6">
            Provide accurate details and a clear photo to help reunite
            people with their belongings.
          </p>

          {error && (
            <div
              role="alert"
              className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-lg mb-4"
            >
              {error}
            </div>
          )}

          <label
            htmlFor="type"
            className="block text-sm font-medium mb-1"
          >
            Listing type
          </label>

          <select
            id="type"
            name="type"
            className="w-full border p-3 rounded-lg mb-4"
            value={form.type}
            onChange={handleChange}
          >
            <option value="lost">I lost this item</option>
            <option value="found">I found this item</option>
          </select>

          <label
            htmlFor="title"
            className="block text-sm font-medium mb-1"
          >
            Item title
          </label>

          <input
            id="title"
            name="title"
            className="w-full border p-3 rounded-lg mb-4"
            placeholder="e.g. Black leather wallet"
            value={form.title}
            onChange={handleChange}
            maxLength={200}
            required
          />

          <label
            htmlFor="category"
            className="block text-sm font-medium mb-1"
          >
            Category
          </label>

          <select
            id="category"
            name="category"
            className="w-full border p-3 rounded-lg mb-4"
            value={form.category}
            onChange={handleChange}
          >
            <option>Electronics</option>
            <option>Accessories</option>
            <option>Documents</option>
            <option>Clothing</option>
            <option>Keys</option>
            <option>Bags</option>
            <option>Jewellery</option>
            <option>Other</option>
          </select>

          <label
            htmlFor="location"
            className="block text-sm font-medium mb-1"
          >
            Location where it was lost or found
          </label>

          <input
            id="location"
            name="location"
            className="w-full border p-3 rounded-lg mb-4"
            placeholder="e.g. Athi River, near the bus station"
            value={form.location}
            onChange={handleChange}
            maxLength={200}
            required
          />

          <label
            htmlFor="item_date"
            className="block text-sm font-medium mb-1"
          >
            Date lost or found
          </label>

          <input
            id="item_date"
            name="item_date"
            type="date"
            className="w-full border p-3 rounded-lg mb-4"
            value={form.item_date}
            onChange={handleChange}
            max={new Date().toISOString().slice(0, 10)}
          />

          <label
            htmlFor="description"
            className="block text-sm font-medium mb-1"
          >
            Detailed description
          </label>

          <textarea
            id="description"
            name="description"
            className="w-full border p-3 rounded-lg mb-4"
            rows={5}
            placeholder="Describe the item, its colour, brand, distinguishing features, and anything else that may help identify it."
            value={form.description}
            onChange={handleChange}
            maxLength={5000}
            required
          />

          <div className="mb-5">
            <label
              htmlFor="image"
              className="block text-sm font-medium mb-2"
            >
              Item photo <span className="text-red-600">*</span>
            </label>

            <p className="text-sm text-gray-600 mb-3">
              Upload a clear photo in JPG, PNG, or WEBP format.
              Maximum size: 5 MB.
            </p>

            <input
              id="image"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              className="w-full border p-3 rounded-lg"
              required
            />

            {preview && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">
                  Photo preview
                </p>

                <img
                  src={preview}
                  alt="Preview of the selected item"
                  className="w-full max-h-80 object-contain rounded-lg border bg-gray-50"
                />

                <button
                  type="button"
                  onClick={() => {
                    setImage(null);
                    setPreview('');
                  }}
                  className="mt-2 text-sm text-red-600 hover:underline"
                >
                  Remove photo
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-semibold"
          >
            {loading ? 'Publishing...' : 'Publish Item'}
          </button>
        </form>
      </div>
    </>
  );
}