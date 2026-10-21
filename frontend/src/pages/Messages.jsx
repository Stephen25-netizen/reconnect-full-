import React, {
    useCallback,
    useEffect,
    useRef,
    useState,
  } from 'react';
  
  import { useLocation } from 'react-router-dom';
  import { api } from '../api';
  import { useAuth } from '../context/AuthContext';
  import '../index.css';
  
  export default function Messages() {
    const location = useLocation();
    const { user } = useAuth();
  
    const requestedConversationId = location.state?.conversationId;
    const currentUserId = Number(user?.id);
  
    const [conversations, setConversations] = useState([]);
    const [selected, setSelected] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState('');
  
    const [loadingConversations, setLoadingConversations] =
      useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);
  
    const [error, setError] = useState('');
  
    const bottomRef = useRef(null);
    const selectedRef = useRef(null);
  
    // Keep the selected conversation ID available to asynchronous functions.
    useEffect(() => {
      selectedRef.current = selected?.id ?? null;
    }, [selected?.id]);
  
    // Load all conversations belonging to the logged-in user.
    const loadConversations = useCallback(async () => {
      try {
        const data = await api('/messages/conversations');
  
        const list = Array.isArray(data)
          ? data
          : data.conversations || [];
  
        setConversations(list);
  
        return list;
      } catch (err) {
        setError(
          err.message || 'Could not load conversations.'
        );
  
        return [];
      } finally {
        setLoadingConversations(false);
      }
    }, []);
  
    // Load messages for a selected conversation.
    const loadMessages = useCallback(
      async (conversationId, showLoading = false) => {
        if (!conversationId) return;
  
        try {
          if (showLoading) {
            setLoadingMessages(true);
          }
  
          const data = await api(
            `/messages/conversations/${conversationId}/messages`
          );
  
          // Do not display messages if the user switched conversations
          // while this request was running.
          if (
            Number(selectedRef.current) !== Number(conversationId)
          ) {
            return;
          }
  
          const list = Array.isArray(data)
            ? data
            : data.messages || [];
  
          setMessages(list);
  
          // Mark incoming messages as read.
          await api(
            `/messages/conversations/${conversationId}/read`,
            {
              method: 'PATCH',
            }
          );
  
          // Refresh unread counts and conversation previews.
          await loadConversations();
        } catch (err) {
          setError(
            err.message || 'Could not load messages.'
          );
        } finally {
          if (showLoading) {
            setLoadingMessages(false);
          }
        }
      },
      [loadConversations]
    );
  
    // Initial inbox loading.
    useEffect(() => {
      loadConversations();
    }, [loadConversations]);
  
    // Automatically select a conversation when arriving from an item page.
    useEffect(() => {
      if (!requestedConversationId) return;
  
      if (loadingConversations) return;
  
      const conversation = conversations.find(
        (item) =>
          Number(item.id) === Number(requestedConversationId)
      );
  
      if (conversation) {
        setSelected((previous) =>
          Number(previous?.id) === Number(conversation.id)
            ? previous
            : conversation
        );
  
        return;
      }
  
      // A newly created conversation might not appear in the first
      // inbox response, so refresh once before reporting an error.
      let cancelled = false;
  
      async function findConversation() {
        const updatedConversations = await loadConversations();
  
        if (cancelled) return;
  
        const found = updatedConversations.find(
          (item) =>
            Number(item.id) === Number(requestedConversationId)
        );
  
        if (found) {
          setSelected(found);
        } else {
          setError(
            'The requested conversation was not found in your inbox.'
          );
        }
      }
  
      findConversation();
  
      return () => {
        cancelled = true;
      };
    }, [
      requestedConversationId,
      conversations,
      loadingConversations,
      loadConversations,
    ]);
  
    // Load messages whenever the selected conversation changes.
    useEffect(() => {
      if (!selected?.id) {
        setMessages([]);
        return;
      }
  
      setMessages([]);
  
      loadMessages(selected.id, true);
  
      // Refresh messages periodically so new messages appear automatically.
      const interval = setInterval(() => {
        loadMessages(selected.id);
      }, 5000);
  
      return () => clearInterval(interval);
    }, [selected?.id, loadMessages]);
  
    // Scroll to the newest message.
    useEffect(() => {
      bottomRef.current?.scrollIntoView({
        behavior: 'smooth',
      });
    }, [messages]);
  
    // Send a message.
    async function sendMessage(event) {
      event.preventDefault();
  
      const text = messageText.trim();
  
      if (!text || !selected || sending) return;
  
      try {
        setSending(true);
        setError('');
  
        await api(
          `/messages/conversations/${selected.id}/messages`,
          {
            method: 'POST',
            body: JSON.stringify({
              message_text: text,
            }),
          }
        );
  
        setMessageText('');
  
        await loadMessages(selected.id);
        await loadConversations();
      } catch (err) {
        setError(
          err.message || 'Could not send your message.'
        );
      } finally {
        setSending(false);
      }
    }
  
    // Select a conversation from the inbox.
    function selectConversation(conversation) {
      setError('');
      setSelected(conversation);
    }
  
    return (
      <main className="messages-page">
        <div className="messages-heading">
          <div>
            <h1>Messages</h1>
  
            <p>
              Connect with people to help reunite lost items
              with their owners.
            </p>
          </div>
  
          <button
            type="button"
            className="messages-refresh"
            onClick={loadConversations}
            disabled={loadingConversations}
          >
            {loadingConversations ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
  
        {error && (
          <div className="messages-error" role="alert">
            {error}
  
            <button
              type="button"
              onClick={() => setError('')}
              aria-label="Dismiss error"
              style={{
                marginLeft: '12px',
                fontWeight: 'bold',
              }}
            >
              ×
            </button>
          </div>
        )}
  
        <section className="messages-layout">
          {/* Conversation list */}
          <aside className="conversation-sidebar">
            <div className="conversation-sidebar-heading">
              <h2>Inbox</h2>
              <span>{conversations.length}</span>
            </div>
  
            {loadingConversations ? (
              <p className="messages-empty">
                Loading conversations...
              </p>
            ) : conversations.length === 0 ? (
              <div className="messages-empty">
                <div className="messages-empty-icon">✉</div>
  
                <h3>No conversations yet</h3>
  
                <p>
                  Start a conversation from a lost or found
                  item's details page.
                </p>
              </div>
            ) : (
              <div className="conversation-list">
                {conversations.map((conversation) => {
                  const isActive =
                    Number(selected?.id) ===
                    Number(conversation.id);
  
                  const participantName =
                    conversation.other_participant_name ||
                    'User';
  
                  return (
                    <button
                      type="button"
                      key={conversation.id}
                      className={`conversation-card ${
                        isActive ? 'active' : ''
                      }`}
                      onClick={() =>
                        selectConversation(conversation)
                      }
                    >
                      <div className="conversation-avatar">
                        {participantName
                          .charAt(0)
                          .toUpperCase()}
                      </div>
  
                      <div className="conversation-info">
                        <div className="conversation-topline">
                          <strong>{participantName}</strong>
  
                          {Number(conversation.unread_count) > 0 && (
                            <span className="unread-badge">
                              {conversation.unread_count}
                            </span>
                          )}
                        </div>
  
                        <p className="conversation-item-title">
                          {conversation.item_title ||
                            'Lost or found item'}
                        </p>
  
                        <p className="conversation-preview">
                          {conversation.last_message ||
                            'Start a conversation'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>
  
          {/* Chat panel */}
          <section className="chat-panel">
            {!selected ? (
              <div className="chat-placeholder">
                <div className="messages-empty-icon">💬</div>
  
                <h2>Your conversations</h2>
  
                <p>
                  Select a conversation to read and send messages.
                </p>
              </div>
            ) : (
              <>
                <header className="chat-header">
                  <div className="conversation-avatar">
                    {(
                      selected.other_participant_name || 'U'
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </div>
  
                  <div>
                    <h2>
                      {selected.other_participant_name || 'User'}
                    </h2>
  
                    <p>
                      About:{' '}
                      {selected.item_title || 'Lost or found item'}
                    </p>
                  </div>
                </header>
  
                <div className="chat-messages">
                  {loadingMessages && messages.length === 0 ? (
                    <p className="messages-empty">
                      Loading messages...
                    </p>
                  ) : messages.length === 0 ? (
                    <div className="chat-placeholder">
                      <p>
                        No messages yet. Send the first message!
                      </p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const senderId = Number(message.sender_id);
  
                      const mine =
                        Number.isFinite(currentUserId) &&
                        currentUserId > 0 &&
                        senderId === currentUserId;
  
                      return (
                        <div
                          key={message.id}
                          className={`message-row ${
                            mine ? 'mine' : 'theirs'
                          }`}
                        >
                          <div className="message-bubble">
                            <p>{message.message_text}</p>
  
                            <time>
                              {message.created_at
                                ? new Date(
                                    message.created_at
                                  ).toLocaleString()
                                : ''}
                            </time>
                          </div>
                        </div>
                      );
                    })
                  )}
  
                  <div ref={bottomRef} />
                </div>
  
                <form
                  className="chat-composer"
                  onSubmit={sendMessage}
                >
                  <input
                    type="text"
                    value={messageText}
                    onChange={(event) =>
                      setMessageText(event.target.value)
                    }
                    placeholder="Write a message..."
                    maxLength={5000}
                    aria-label="Message"
                    disabled={sending}
                  />
  
                  <button
                    type="submit"
                    disabled={!messageText.trim() || sending}
                  >
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </form>
              </>
            )}
          </section>
        </section>
      </main>
    );
  }