'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface WeatherData {
  city: string;
  temp: number;
  condition: string;
  humidity: number;
}

export default function ChatBox() {
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
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch weather on mount and location change
  useEffect(() => {
    fetchWeather();
  }, [location]);

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
        }),
      });

      if (!res.ok) throw new Error('Failed to get response');

      const data = await res.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

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
    } finally {
      setIsLoading(false);
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

        {/* Location selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm">Location:</span>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="px-2 py-1 rounded bg-primary-700 text-white placeholder-primary-300 text-sm w-24"
            placeholder="City"
          />
        </div>
      </div>

      {/* Weather Bar */}
      {weather && (
        <div className="bg-primary-50 px-4 py-2 flex items-center justify-center gap-4 text-sm text-primary-800 border-b border-primary-100">
          <span className="font-medium">📍 {weather.city}</span>
          <span>🌡️ {weather.temp}°C</span>
          <span>💧 {weather.humidity}% humidity</span>
          <span className="capitalize">☁️ {weather.condition}</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 whitespace-pre-wrap ${
                message.role === 'user'
                  ? 'bg-primary-500 text-white rounded-br-none'
                  : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
              }`}
            >
              <p className="text-sm leading-relaxed">{message.content}</p>
              <span
                className={`text-xs mt-1 block ${
                  message.role === 'user' ? 'text-primary-100' : 'text-gray-400'
                }`}
              >
                {formatTime(message.timestamp)}
              </span>
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

      {/* Quick Actions */}
      <div className="px-4 py-2 bg-white border-t border-gray-100 flex gap-2 overflow-x-auto">
        {['Weather', 'Irrigate', 'Help'].map((action) => (
          <button
            key={action}
            onClick={() => {
              setInput(action.toLowerCase());
              setTimeout(sendMessage, 100);
            }}
            className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm hover:bg-primary-100 transition-colors whitespace-nowrap"
          >
            {action}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="px-6 py-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
