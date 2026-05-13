'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, SendHorizonal } from 'lucide-react';

type Message = { role: 'user' | 'assistant'; text: string };

export default function BookChat({ bookTitle, persona: _persona }: { bookTitle: string; persona?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || pending) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setPending(true);
    // TODO: call server action or API route with userMsg + bookTitle
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', text: `(stub) You asked about "${bookTitle}": ${userMsg}` },
    ]);
    setPending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="transcript-container w-full">
      {messages.length === 0 ? (
        <div className="transcript-empty">
          <MessageCircle className="w-12 h-12 text-(--text-primary) mb-4" />
          <p className="transcript-empty-text">No conversation yet</p>
          <p className="transcript-empty-hint">Type a message below to get started</p>
        </div>
      ) : (
        <div className="transcript-messages">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`transcript-message ${msg.role === 'user' ? 'transcript-message-user' : 'transcript-message-assistant'}`}
            >
              <span
                className={`transcript-bubble ${msg.role === 'user' ? 'transcript-bubble-user' : 'transcript-bubble-assistant'}`}
              >
                {msg.text}
              </span>
            </div>
          ))}
          {pending && (
            <div className="transcript-message transcript-message-assistant">
              <span className="transcript-bubble transcript-bubble-assistant">
                <span className="transcript-cursor" />
              </span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="chat-input-bar">
        <textarea
          className="chat-input"
          rows={1}
          placeholder="Ask something about this book…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={pending}
        />
        <button
          className="chat-send-btn"
          onClick={handleSend}
          disabled={!input.trim() || pending}
          aria-label="Send message"
        >
          <SendHorizonal className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
