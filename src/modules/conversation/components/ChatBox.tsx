'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { ModelSelector } from '@/modules/conversation/components/ModelSelector';

interface WeatherData {
  city: string;
  temp: number;
  humidity: number;
  condition: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  created_at?: string;
  tools_used?: string[];
  detected_crop?: string;
  llm_provider?: string;
  llm_model?: string;
  weather?: WeatherData;
  type?: string;
  status?: string;
  reply_to?: string;
  is_starred?: boolean;
  retry_count?: number;
}

interface ApiMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  tools_used?: string[];
  detected_crop?: string;
  llm_provider?: string;
  llm_model?: string;
  weather?: WeatherData;
  type?: string;
  status?: string;
  reply_to?: string;
  is_starred?: boolean;
  retry_count?: number;
}

function mapApiMessage(item: ApiMessageItem): Message {
  return {
    id: item.id,
    role: item.role,
    content: item.content,
    timestamp: new Date(item.created_at),
    created_at: item.created_at,
    tools_used: item.tools_used,
    detected_crop: item.detected_crop,
    llm_provider: item.llm_provider,
    llm_model: item.llm_model,
    weather: item.weather,
    type: item.type,
    status: item.status,
    reply_to: item.reply_to,
    is_starred: item.is_starred,
    retry_count: item.retry_count,
  };
}

export default function ChatBox() {
  const { addToast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '🌾 Welcome to Krashaq!\n\nI can help you with:\n• Weather updates\n• Irrigation advice\n• Farming tips\n\nWhat would you like to know?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [location, setLocation] = useState('Delhi');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalMessages, setTotalMessages] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [threadMessages, setThreadMessages] = useState<Record<string, Message[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'txt'>('json');
  const [isExporting, setIsExporting] = useState(false);
  const [llmProvider, setLlmProvider] = useState('groq');
  const [llmModel, setLlmModel] = useState('llama-3.3-70b-versatile');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load message history on mount
  useEffect(() => {
    loadMessageHistory();
  }, []);

  // Fetch weather on mount and location change
  useEffect(() => {
    fetchWeather();
  }, [location]);

  const loadMessageHistory = async (pageNum: number = 0, append: boolean = false) => {
    if (isLoadingHistory) return;

    setIsLoadingHistory(true);
    try {
      const res = await fetch(
        `/api/messages?session_id=${sessionId}&skip=${pageNum * 50}&limit=50`
      );

      if (res.ok) {
        const data = await res.json();
        const historyMessages: Message[] = data.items.map((item: ApiMessageItem) =>
          mapApiMessage(item)
        );

        if (append) {
          setMessages((prev) => [...historyMessages, ...prev]);
        } else {
          setMessages((prev) => [
            ...historyMessages,
            {
              id: 'welcome',
              role: 'assistant',
              content:
                '🌾 Welcome to Krashaq!\n\nI can help you with:\n• Weather updates\n• Irrigation advice\n• Farming tips\n\nWhat would you like to know?',
              timestamp: new Date(),
            },
            ...prev.filter((m) => m.id !== 'welcome'),
          ]);
        }

        setTotalMessages(data.total || 0);
        setHasMore(historyMessages.length === 50);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Failed to load message history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || isLoadingHistory || !hasMore) return;

    if (container.scrollTop === 0) {
      loadMessageHistory(page + 1, true);
    }
  }, [isLoadingHistory, hasMore, page]);

  const fetchWeather = async () => {
    try {
      const res = await fetch(`/api/weather?city=${encodeURIComponent(location)}`);
      if (res.ok) {
        const data = await res.json();
        setWeather(data);
      }
    } catch (error) {
      console.error('Failed to fetch weather:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          location: location,
          session_id: sessionId,
          provider: llmProvider,
          model: llmModel,
        }),
      });

      if (!res.ok) throw new Error('Failed to get response');

      const data = await res.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
        tools_used: data.tools_used,
        detected_crop: data.detected_crop,
        llm_provider: data.llm_provider,
        llm_model: data.llm_model,
        weather: data.weather,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setTotalMessages((prev) => prev + 2);
      addToast('success', 'Message sent successfully');

      // Update weather if included in response
      if (data.weather) {
        setWeather(data.weather);
      }
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "❌ Sorry, I couldn't process your request. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setTotalMessages((prev) => prev + 1);
      addToast('error', 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: Record<string, Message[]> = {};
    messages.forEach((message) => {
      const date = new Date(message.timestamp).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    return groups;
  };

  const handleEditMessage = (message: Message) => {
    setEditingMessageId(message.id);
    setEditContent(message.content);
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !editContent.trim()) return;

    try {
      const res = await fetch(`/api/messages/${editingMessageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent.trim() }),
      });

      if (res.ok) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === editingMessageId ? { ...msg, content: editContent.trim() } : msg
          )
        );
        setEditingMessageId(null);
        setEditContent('');
        addToast('success', 'Message edited successfully');
      }
    } catch (error) {
      console.error('Failed to edit message:', error);
      addToast('error', 'Failed to edit message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  const handleDeleteMessage = (messageId: string) => {
    setDeletingMessageId(messageId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteMessage = async () => {
    if (!deletingMessageId) return;

    try {
      const res = await fetch(`/api/messages/${deletingMessageId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setMessages((prev) => prev.filter((msg) => msg.id !== deletingMessageId));
        setTotalMessages((prev) => Math.max(0, prev - 1));
        addToast('success', 'Message deleted successfully');
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
      addToast('error', 'Failed to delete message. Please try again.');
    } finally {
      setShowDeleteDialog(false);
      setDeletingMessageId(null);
    }
  };

  const cancelDeleteMessage = () => {
    setShowDeleteDialog(false);
    setDeletingMessageId(null);
  };

  const toggleThread = async (messageId: string) => {
    if (expandedThreads.has(messageId)) {
      setExpandedThreads((prev) => {
        const next = new Set(prev);
        next.delete(messageId);
        return next;
      });
    } else {
      setExpandedThreads((prev) => new Set(prev).add(messageId));

      if (!threadMessages[messageId]) {
        try {
          const res = await fetch(`/api/messages/${messageId}/thread`);
          if (res.ok) {
            const data = await res.json();
            const thread: Message[] = data.thread.map((item: ApiMessageItem) =>
              mapApiMessage(item)
            );
            setThreadMessages((prev) => ({ ...prev, [messageId]: thread }));
          }
        } catch (error) {
          console.error('Failed to load thread:', error);
        }
      }
    }
  };

  const toggleStarMessage = async (messageId: string) => {
    try {
      const res = await fetch(`/api/messages/${messageId}/star`, {
        method: 'POST',
      });

      if (res.ok) {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === messageId ? { ...msg, is_starred: !msg.is_starred } : msg))
        );
        addToast('success', 'Message starred successfully');
      }
    } catch (error) {
      console.error('Failed to star message:', error);
      addToast('error', 'Failed to star message. Please try again.');
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setShowSearchResults(false);
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/messages/search?query=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        const results: Message[] = data.items.map((item: ApiMessageItem) => mapApiMessage(item));
        setSearchResults(results);
        setShowSearchResults(true);
      }
    } catch (error) {
      console.error('Failed to search messages:', error);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(
        `/api/messages/export?format=${exportFormat}&session_id=${sessionId}`
      );
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `messages.${exportFormat}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        addToast('success', 'Messages exported successfully');
      }
    } catch (error) {
      console.error('Failed to export messages:', error);
      addToast('error', 'Failed to export messages. Please try again.');
    } finally {
      setIsExporting(false);
      setShowExportDialog(false);
    }
  };

  const handleRetryMessage = async (messageId: string) => {
    try {
      const res = await fetch(`/api/messages/${messageId}/retry`, {
        method: 'POST',
      });

      if (res.ok) {
        const data = await res.json();
        const retryMessage: Message = {
          id: data.id,
          role: data.role,
          content: data.content,
          timestamp: new Date(data.created_at),
          created_at: data.created_at,
          tools_used: data.tools_used,
          detected_crop: data.detected_crop,
          llm_provider: data.llm_provider,
          weather: data.weather,
          type: data.type,
          status: data.status,
          reply_to: data.reply_to,
          is_starred: data.is_starred,
          retry_count: data.retry_count,
        };

        setMessages((prev) => [...prev, retryMessage]);
        setTotalMessages((prev) => prev + 1);
        addToast('success', 'Message retried successfully');
      }
    } catch (error) {
      console.error('Failed to retry message:', error);
      addToast('error', 'Failed to retry message. Please try again.');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    // Use consistent 24-hour format to avoid hydration mismatch
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-primary-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
            <span className="text-2xl">🌾</span>
          </div>
          <div>
            <h2 className="font-semibold text-lg">Krashaq</h2>
            <p className="text-primary-100 text-sm">Smart Farming Assistant</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {/* Search - hidden on small screens */}
          <div className="relative hidden md:block">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="px-3 py-1 rounded bg-primary-700 text-white placeholder-primary-300 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            {showSearchResults && (
              <div className="absolute top-full right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
                {isSearching ? (
                  <div className="p-4 text-center text-gray-500">Searching...</div>
                ) : searchResults.length > 0 ? (
                  <div>
                    <div className="p-2 border-b border-gray-200">
                      <span className="text-xs font-medium text-gray-500">
                        {searchResults.length} results
                      </span>
                    </div>
                    {searchResults.map((result) => (
                      <div
                        key={result.id}
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                        onClick={() => {
                          setSearchQuery('');
                          setShowSearchResults(false);
                          // Scroll to message
                          const element = document.getElementById(`message-${result.id}`);
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-xs text-gray-400 mt-1">
                            {result.role === 'user' ? '👤' : '🤖'}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm text-gray-800 line-clamp-2">{result.content}</p>
                            <span className="text-xs text-gray-400">
                              {formatTime(result.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500">No results found</div>
                )}
              </div>
            )}
          </div>

          {/* Message count */}
          {totalMessages > 0 && (
            <span className="text-xs bg-primary-700 px-2 py-1 rounded-full">
              {totalMessages} messages
            </span>
          )}

          {/* Export button */}
          <button
            onClick={() => setShowExportDialog(true)}
            className="text-xs bg-primary-700 px-2 py-1 rounded hover:bg-primary-800 transition-colors"
            title="Export messages"
          >
            📥 Export
          </button>

          {/* Location selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm hidden md:inline">Location:</span>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="px-2 py-1 rounded bg-primary-700 text-white placeholder-primary-300 text-sm w-20 md:w-24 focus:outline-none focus:ring-2 focus:ring-white/50"
              placeholder="City"
            />
          </div>
        </div>
      </div>

      {/* Weather Bar */}
      {weather && (
        <div className="bg-primary-50 px-4 py-2 flex items-center justify-center gap-2 md:gap-4 text-xs md:text-sm text-primary-800 border-b border-primary-100 flex-wrap">
          <span className="font-medium">📍 {weather.city}</span>
          <span>🌡️ {weather.temp}°C</span>
          <span>💧 {weather.humidity}% humidity</span>
          <span className="capitalize">☁️ {weather.condition}</span>
        </div>
      )}

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50"
      >
        {isLoadingHistory && (
          <div className="flex justify-center py-4">
            <div className="flex items-center gap-2 text-gray-500">
              <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading history...</span>
            </div>
          </div>
        )}

        {Object.entries(messageGroups).map(([date, dateMessages]) => (
          <div key={date}>
            {/* Date header */}
            <div className="flex items-center my-4">
              <div className="flex-1 border-t border-gray-200" />
              <span className="px-4 text-xs text-gray-500 font-medium">
                {new Date(date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <div className="flex-1 border-t border-gray-200" />
            </div>

            {/* Messages for this date */}
            <div className="space-y-4">
              {dateMessages.map((message) => (
                <div
                  key={message.id}
                  id={`message-${message.id}`}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 whitespace-pre-wrap ${
                      message.role === 'user'
                        ? 'bg-primary-500 text-white rounded-br-none'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                    }`}
                  >
                    {editingMessageId === message.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full px-2 py-1 rounded border border-gray-300 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveEdit}
                            className="px-3 py-1 bg-white text-primary-600 rounded text-xs font-medium hover:bg-gray-100 transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-1 bg-transparent text-white border border-white rounded text-xs hover:bg-white/10 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm leading-relaxed">{message.content}</p>
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs ${
                                message.role === 'user' ? 'text-primary-100' : 'text-gray-400'
                              }`}
                            >
                              {formatTime(message.timestamp)}
                            </span>
                            <button
                              onClick={() => toggleStarMessage(message.id)}
                              className={`text-xs transition-opacity ${
                                message.is_starred ? 'opacity-100' : 'opacity-40 hover:opacity-100'
                              }`}
                              title={message.is_starred ? 'Unstar' : 'Star'}
                            >
                              ⭐
                            </button>
                            {message.retry_count && message.retry_count > 0 && (
                              <span
                                className="text-xs text-yellow-400"
                                title={`Retried ${message.retry_count} time(s)`}
                              >
                                🔄 {message.retry_count}
                              </span>
                            )}
                            {message.reply_to && (
                              <button
                                onClick={() => toggleThread(message.id)}
                                className="text-xs opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1"
                                title="View thread"
                              >
                                {expandedThreads.has(message.id) ? '▼' : '▶'} Thread
                              </button>
                            )}
                          </div>
                          <div className="flex gap-1">
                            {message.status === 'failed' && (
                              <button
                                onClick={() => handleRetryMessage(message.id)}
                                className="text-xs opacity-60 hover:opacity-100 transition-opacity"
                                title="Retry"
                              >
                                🔄
                              </button>
                            )}
                            {message.role === 'user' && message.id !== 'welcome' && (
                              <>
                                <button
                                  onClick={() => handleEditMessage(message)}
                                  className="text-xs opacity-60 hover:opacity-100 transition-opacity"
                                  title="Edit"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => handleDeleteMessage(message.id)}
                                  className="text-xs opacity-60 hover:opacity-100 transition-opacity"
                                  title="Delete"
                                >
                                  🗑️
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        {expandedThreads.has(message.id) && threadMessages[message.id] && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs font-medium mb-2 text-gray-500">
                              Thread replies:
                            </p>
                            <div className="space-y-2">
                              {threadMessages[message.id].map((threadMsg) => (
                                <div
                                  key={threadMsg.id}
                                  className={`text-xs p-2 rounded ${
                                    threadMsg.role === 'user'
                                      ? 'bg-primary-100 text-gray-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  <span className="font-medium">
                                    {threadMsg.role === 'user' ? 'You' : 'Assistant'}:
                                  </span>{' '}
                                  {threadMsg.content}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg p-3 rounded-bl-none shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-2">Delete Message</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete this message? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDeleteMessage}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteMessage}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Dialog */}
      {showExportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Export Messages</h3>
            <div className="space-y-3 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="exportFormat"
                  value="json"
                  checked={exportFormat === 'json'}
                  onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv' | 'txt')}
                  className="text-primary-600"
                />
                <span className="text-gray-700">JSON</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="exportFormat"
                  value="csv"
                  checked={exportFormat === 'csv'}
                  onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv' | 'txt')}
                  className="text-primary-600"
                />
                <span className="text-gray-700">CSV</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="exportFormat"
                  value="txt"
                  checked={exportFormat === 'txt'}
                  onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv' | 'txt')}
                  className="text-primary-600"
                />
                <span className="text-gray-700">TXT</span>
              </label>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowExportDialog(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isExporting ? 'Exporting...' : 'Export'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div
        className="px-4 py-2 bg-white border-t border-gray-100 flex gap-2 overflow-x-auto"
        role="toolbar"
        aria-label="Quick actions"
      >
        {['Weather', 'Irrigate', 'Help'].map((action) => (
          <button
            key={action}
            onClick={() => {
              setInput(action.toLowerCase());
              setTimeout(sendMessage, 100);
            }}
            className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs md:text-sm hover:bg-primary-100 transition-colors whitespace-nowrap"
            aria-label={`Quick action: ${action}`}
          >
            {action}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-white border-t border-gray-100 space-y-2">
        <ModelSelector
          provider={llmProvider}
          model={llmModel}
          onProviderChange={setLlmProvider}
          onModelChange={setLlmModel}
        />
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message..."
            rows={1}
            className="flex-1 resize-none border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            aria-label="Message input"
            aria-describedby="message-input-hint"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
            aria-label="Send message"
            aria-disabled={isLoading || !input.trim()}
          >
            {isLoading ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
