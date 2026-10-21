import ProtectedImage from '../components/ProtectedImage';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { api, imageUrl } from '../api';
import { useAuth } from '../context/AuthContext';

export default function ItemDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

const [startingConversation, setStartingConversation] = useState(false);

  const [item, setItem] = useState(null);
  const [message, setMessage] = useState('');
  const [identifyingDetails, setIdentifyingDetails] = useState('');
  const [proofImage, setProofImage] = useState(null);
  const [notice, setNotice] = useState('');
  const [noticeType, setNoticeType] = useState('info');

  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [updatingClaim, setUpdatingClaim] = useState(null);
  const [resolvingItem, setResolvingItem] = useState(false);

  function showNotice(text, type = 'info') {
    setNotice(text);
    setNoticeType(type);
  }

  async function loadItem() {
    try {
      setLoading(true);

      const data = await api(`/items/${id}`);
      setItem(data.item);
    } catch (error) {
      setItem(null);
      showNotice(error.message || 'Could not load this item.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadClaims() {
    if (!user) return;

    setLoadingClaims(true);

    try {
      const data = await api('/claims/received');

      const itemClaims = (data.claims || []).filter(
        (claim) => String(claim.item_id) === String(id)
      );

      setClaims(itemClaims);
    } catch (error) {
      showNotice(error.message || 'Could not load claim requests.', 'error');
    } finally {
      setLoadingClaims(false);
    }
  }

  useEffect(() => {
    loadItem();
  }, [id]);

  const isOwner =
    Boolean(user && item && String(user.id) === String(item.user_id));

  useEffect(() => {
    if (isOwner) {
      loadClaims();
    } else {
      setClaims([]);
    }
  }, [isOwner, id, user]);

async function startConversation() {
  if (!user) {
    navigate('/login');
    return;
  }

  if (isOwner) {
    showNotice('You cannot message yourself about your own item.', 'error');
    return;
  }

  if (item.status !== 'active') {
    showNotice(
      'Messaging is unavailable because this item is no longer active.',
      'error'
    );
    return;
  }

  try {
    setStartingConversation(true);
    setNotice('');

    const data = await api(`/messages/item/${id}`, {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const conversationId = data.conversation?.id ?? data.id;

    if (!conversationId) {
      throw new Error('The conversation was created, but no conversation ID was returned.');
    }

    navigate('/messages', {
      state: { conversationId },
    });
  } catch (error) {
    showNotice(
      error.message || 'Could not start a conversation. Please try again.',
      'error'
    );
  } finally {
    setStartingConversation(false);
  }
}
  async function submitClaim(event) {
    event.preventDefault();

    if (!message.trim()) {
      showNotice('Please explain why you believe this item belongs to you.', 'error');
      return;
    }

    if (!identifyingDetails.trim()) {
      showNotice('Please provide identifying details to help prove ownership.', 'error');
      return;
    }

    if (proofImage) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(proofImage.type)) {
        showNotice('Proof image must be a JPG, PNG, or WEBP file.', 'error');
        return;
      }
      if (proofImage.size > 5 * 1024 * 1024) {
        showNotice('Proof image must be 5 MB or smaller.', 'error');
        return;
      }
    }

    try {
      setSubmittingClaim(true);
      setNotice('');

      const formData = new FormData();
      formData.append('message', message.trim());
      formData.append('identifying_details', identifyingDetails.trim());
      if (proofImage) formData.append('proof_image', proofImage);

      await api(`/claims/item/${id}`, {
        method: 'POST',
        body: formData,
      });

      setMessage('');
      setIdentifyingDetails('');
      setProofImage(null);
      const fileInput = document.getElementById('claim-proof-image');
      if (fileInput) fileInput.value = '';
      showNotice('Your claim was submitted successfully.', 'success');
    } catch (error) {
      showNotice(error.message || 'Could not submit your claim.', 'error');
    } finally {
      setSubmittingClaim(false);
    }
  }

  async function updateClaim(claimId, status) {
    const action = status === 'approved' ? 'approve' : 'reject';

    if (!window.confirm(`Are you sure you want to ${action} this claim?`)) {
      return;
    }

    try {
      setUpdatingClaim(claimId);
      setNotice('');

      await api(`/claims/${claimId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });

      showNotice(
        status === 'approved'
          ? 'Claim approved successfully.'
          : 'Claim rejected successfully.',
        'success'
      );

      await loadItem();
      await loadClaims();
    } catch (error) {
      showNotice(error.message || 'Could not update the claim.', 'error');
    } finally {
      setUpdatingClaim(null);
    }
  }


  async function resolveItem(resolution) {
    const action =
      resolution === 'returned'
        ? 'mark this item as returned'
        : 'mark this item as resolved';

    if (!window.confirm(`Are you sure you want to ${action}?`)) return;

    try {
      setResolvingItem(true);
      setNotice('');

      await api(`/items/${id}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({ resolution }),
      });

      showNotice(
        resolution === 'returned'
          ? 'Item marked as returned successfully.'
          : 'Item marked as resolved successfully.',
        'success'
      );

      await loadItem();
    } catch (error) {
      showNotice(
        error.message || 'Could not update the item status. Check that the backend resolve route exists.',
        'error'
      );
    } finally {
      setResolvingItem(false);
    }
  }

  function formatDate(date) {
    if (!date) return 'Not provided';

    const parsed = new Date(`${String(date).slice(0, 10)}T00:00:00`);

    return Number.isNaN(parsed.getTime())
      ? String(date)
      : parsed.toLocaleDateString();
  }

  const statusStyle = {
    active: 'bg-green-100 text-green-700',
    claimed: 'bg-purple-100 text-purple-700',
    resolved: 'bg-gray-200 text-gray-700',
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <p className="p-8 text-center text-gray-600">
          Loading item details...
        </p>
      </>
    );
  }

  if (!item) {
    return (
      <>
        <Navbar />

        <main className="max-w-3xl mx-auto p-6 text-center">
          <h1 className="text-2xl font-bold mb-3">
            Item not found
          </h1>

          {notice && (
            <p className="text-red-600 mb-4">{notice}</p>
          )}

          <Link
            to="/"
            className="inline-block bg-blue-600 text-white px-5 py-3 rounded-lg"
          >
            Return to Dashboard
          </Link>
        </main>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-4xl mx-auto p-6">
        <Link
          to="/"
          className="inline-block mb-5 text-blue-600 hover:underline"
        >
          ← Back to Listings
        </Link>

        <article className="bg-white border rounded-xl overflow-hidden shadow-sm">

          {/* Item photograph */}
          <div className="bg-gray-100 flex items-center justify-center min-h-64">
            {item.image_url ? (
              <img
                src={imageUrl(item.image_url)}
                alt={`Photograph of ${item.title}`}
                className="w-full max-h-[500px] object-contain"
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="text-center text-gray-400 p-12">
                <div className="text-6xl mb-3">📷</div>
                <p>No photograph is available for this listing.</p>
              </div>
            )}
          </div>

          <div className="p-6 md:p-8">

            {/* Item type and status */}
            <div className="flex flex-wrap gap-3 items-center mb-4">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  item.type === 'lost'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {item.type === 'lost' ? 'LOST ITEM' : 'FOUND ITEM'}
              </span>

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  statusStyle[item.status] || 'bg-gray-100 text-gray-700'
                }`}
              >
                {item.status || 'active'}
              </span>
            </div>

            <h1 className="text-3xl font-extrabold break-words">
              {item.title}
            </h1>

            {/* Item information */}
            <div className="grid sm:grid-cols-2 gap-4 mt-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Category</p>
                <p className="font-semibold mt-1">{item.category}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Location</p>
                <p className="font-semibold mt-1">{item.location}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Date lost or found</p>
                <p className="font-semibold mt-1">
                  {formatDate(item.item_date)}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Posted by</p>
                <p className="font-semibold mt-1">{item.owner_name}</p>
              </div>
            </div>

            {/* Description */}
            <section className="mt-7">
              <h2 className="text-xl font-bold mb-3">
                Item Description
              </h2>

              <p className="text-gray-700 leading-7 whitespace-pre-wrap">
                {item.description}
              </p>
            </section>

            {/* Contact privacy note */}
            <div className="mt-6 bg-blue-50 border border-blue-100 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Protect your privacy. Verify ownership before returning an
                item, and avoid sharing passwords, PINs, or other sensitive
                information.
              </p>
            </div>
            {/* Messaging */}
{!isOwner && (
  <section className="mt-5">
    {user ? (
      <button
        type="button"
        onClick={startConversation}
        disabled={startingConversation || item.status !== 'active'}
        className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-5 py-3 rounded-lg font-semibold"
      >
        {startingConversation ? 'Opening Conversation...' : 'Message Owner'}
      </button>
    ) : (
      <Link
        to="/login"
        className="inline-block bg-orange-600 hover:bg-orange-700 text-white px-5 py-3 rounded-lg font-semibold"
      >
        Log in to Message Owner
      </Link>
    )}
  </section>
)}


            {/* Item resolution controls - visible only to the item owner */}
            {isOwner && item.status !== 'resolved' && (
              <section className="border-t mt-8 pt-6">
                <h2 className="text-xl font-bold mb-2">Resolve This Item</h2>
                <p className="text-gray-600 text-sm mb-4">
                  If the item has been returned or the matter has otherwise been
                  resolved, update its status here.
                </p>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => resolveItem('returned')}
                    disabled={resolvingItem}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-5 py-3 rounded-lg font-semibold"
                  >
                    {resolvingItem ? 'Updating...' : 'Mark as Returned'}
                  </button>

                  <button
                    type="button"
                    onClick={() => resolveItem('resolved')}
                    disabled={resolvingItem}
                    className="bg-gray-700 hover:bg-gray-800 disabled:opacity-50 text-white px-5 py-3 rounded-lg font-semibold"
                  >
                    {resolvingItem ? 'Updating...' : 'Mark as Resolved'}
                  </button>
                </div>
              </section>
            )}

            {item.status === 'resolved' && (
              <div className="mt-6 bg-gray-100 border border-gray-200 rounded-lg p-4">
                <p className="font-semibold text-gray-800">
                  This item has been marked as resolved.
                </p>
              </div>
            )}

            {/* Claim form */}
            {user && !isOwner && item.status === 'active' && (
              <section className="border-t mt-8 pt-6">
                <h2 className="text-xl font-bold mb-2">
                  Claim This Item
                </h2>

                <p className="text-gray-600 text-sm mb-4">
                  Explain why you believe this item belongs to you. Include
                  identifying details that can help the owner verify your claim.
                </p>

                <form onSubmit={submitClaim}>
                  <label htmlFor="claim-message" className="block font-semibold mb-2">
                    Why is this item yours?
                  </label>
                  <textarea
                    id="claim-message"
                    className="w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    rows={4}
                    maxLength={2000}
                    placeholder="Explain why you believe this item belongs to you..."
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    required
                  />

                  <p className="text-xs text-gray-500 mt-1">
                    {message.length}/2000 characters
                  </p>

                  <label htmlFor="claim-identifying-details" className="block font-semibold mt-5 mb-2">
                    Identifying details <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    id="claim-identifying-details"
                    className="w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    rows={4}
                    maxLength={3000}
                    placeholder="Describe unique marks, contents, serial number, scratches, or other details only the owner may know. Do not include passwords or PINs."
                    value={identifyingDetails}
                    onChange={(event) => setIdentifyingDetails(event.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {identifyingDetails.length}/3000 characters
                  </p>

                  <label htmlFor="claim-proof-image" className="block font-semibold mt-5 mb-2">
                    Supporting proof image (optional)
                  </label>
                  <input
                    id="claim-proof-image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    className="block w-full text-sm border rounded-lg p-3"
                    onChange={(event) => setProofImage(event.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    JPG, PNG, or WEBP; maximum 5 MB.
                  </p>
                  {proofImage && (
                    <p className="text-sm text-gray-700 mt-2">
                      Selected: {proofImage.name}
                      <button
                        type="button"
                        className="ml-3 text-red-600 hover:underline"
                        onClick={() => {
                          setProofImage(null);
                          const input = document.getElementById('claim-proof-image');
                          if (input) input.value = '';
                        }}
                      >
                        Remove
                      </button>
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={!message.trim() || !identifyingDetails.trim() || submittingClaim}
                    className="mt-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-3 rounded-lg font-semibold"
                  >
                    {submittingClaim ? 'Submitting...' : 'Submit Claim'}
                  </button>
                </form>
              </section>
            )}

            {!user && item.status === 'active' && (
              <div className="mt-6 border-t pt-5">
                <p className="text-gray-600 mb-3">
                  Log in to submit a claim for this item.
                </p>

                <Link
                  to="/login"
                  className="inline-block bg-blue-600 text-white px-5 py-3 rounded-lg"
                >
                  Log In
                </Link>
              </div>
            )}

            {/* Claim management */}
            {isOwner && (
              <section className="border-t mt-8 pt-6">
                <h2 className="text-2xl font-bold mb-4">
                  Claim Requests
                </h2>

                {loadingClaims && (
                  <p className="text-gray-500">Loading claims...</p>
                )}

                {!loadingClaims && claims.length === 0 && (
                  <p className="text-gray-600">
                    No claims have been submitted for this item yet.
                  </p>
                )}

                <div className="space-y-4">
                  {claims.map((claim) => (
                    <div
                      key={claim.id}
                      className="border rounded-lg p-4"
                    >
                      <div className="flex flex-wrap justify-between gap-2">
                        <h3 className="font-bold text-lg">
                          {claim.claimant_name}
                        </h3>

                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            statusStyle[claim.status] ||
                            'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {claim.status}
                        </span>
                      </div>

                      <p className="mt-3 whitespace-pre-wrap text-gray-700">
                        <b>Claim message:</b> {claim.message}
                      </p>

                      <div className="mt-3 rounded-lg bg-gray-50 p-3">
                        <p className="font-semibold text-gray-800">Identifying details</p>
                        <p className="mt-1 whitespace-pre-wrap text-gray-700">
                          {claim.identifying_details || 'No identifying details were provided.'}
                        </p>
                      </div>

                      {claim.proof_image_url && (
  <div className="mt-3">
    <p className="font-semibold text-gray-800 mb-2">
      Supporting proof image
    </p>

    <ProtectedImage
      path={claim.proof_image_url}
      alt="Claimant's proof of ownership"
      className="max-w-full max-h-72 rounded-lg border object-contain"
    />
  </div>
)}

                      {claim.status === 'pending' &&
                        item.status === 'active' && (
                          <div className="flex flex-wrap gap-3 mt-4">
                            <button
                              type="button"
                              onClick={() => updateClaim(claim.id, 'approved')}
                              disabled={updatingClaim !== null}
                              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg"
                            >
                              {updatingClaim === claim.id
                                ? 'Updating...'
                                : 'Approve Claim'}
                            </button>

                            <button
                              type="button"
                              onClick={() => updateClaim(claim.id, 'rejected')}
                              disabled={updatingClaim !== null}
                              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg"
                            >
                              {updatingClaim === claim.id
                                ? 'Updating...'
                                : 'Reject Claim'}
                            </button>
                          </div>
                        )}
                    </div>
                  ))}
                </div>
                

                <button
                  type="button"
                  onClick={loadClaims}
                  disabled={loadingClaims}
                  className="mt-4 border px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  {loadingClaims ? 'Refreshing...' : 'Refresh Claims'}
                </button>
              </section>
            )}

            {/* Success and error messages */}
            {notice && (
              <div
                role="status"
                className={`mt-6 p-4 rounded-lg ${
                  noticeType === 'error'
                    ? 'bg-red-50 text-red-700'
                    : noticeType === 'success'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-blue-50 text-blue-700'
                }`}
              >
                {notice}
              </div>
            )}
          </div>
        </article>
      </main>
    </div>
  );
}