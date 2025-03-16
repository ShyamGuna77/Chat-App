import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, User, Users, LogOut } from "lucide-react";

interface Message {
  userId: string;
  username: string;
  content: string;
  timestamp: string;
}

const WS_URL = "wss://chat-app-1-fgtr.onrender.com"; 


const App: React.FC = () => {
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const ws = useRef<WebSocket | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Connect to WebSocket
  const connectToWebSocket = () => {
    if (!roomId || !username) return alert("Enter Room ID & Username");
    ws.current = new WebSocket(WS_URL);

    ws.current.onopen = () => {
      console.log("Connected to WebSocket");
      ws.current?.send(JSON.stringify({ type: "join", roomId, username }));
      setConnected(true);
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Message received:", data);

      if (data.type === "joined") {
        setUserId(data.userId);
      } else if (data.type === "message") {
        setMessages((prev) => [...prev, data]);
      }
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.current.onclose = () => {
      console.log("Disconnected from WebSocket");
      setConnected(false);
    };
  };

  // Send message
  const sendMessage = () => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) return;
    if (!message.trim()) return;

    ws.current.send(JSON.stringify({ type: "message", content: message }));
    setMessage("");
    inputRef.current?.focus();
  };

  // Disconnect from chat
  const disconnect = () => {
    if (ws.current) {
      ws.current.close();
    }
    setConnected(false);
    setMessages([]);
  };

  // Format date for message timestamp
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {!connected ? (
        <div className="flex items-center justify-center w-full h-full p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-center mb-6">
              <MessageCircle size={32} className="text-blue-500 mr-2" />
              <h1 className="text-2xl font-bold text-gray-800">ChatRoom</h1>
            </div>
            <div className="space-y-5">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Your display name"
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Room ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Users size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Enter room code"
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" && connectToWebSocket()
                    }
                  />
                </div>
              </div>
              <button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition duration-200 shadow-md"
                onClick={connectToWebSocket}
              >
                Join Chat
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col w-full h-full max-w-4xl mx-auto bg-white shadow-xl rounded-lg overflow-hidden">
          {/* Chat Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-blue-600 text-white">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center mr-3">
                <Users size={20} />
              </div>
              <div>
                <h2 className="font-bold">{roomId}</h2>
                <p className="text-xs text-blue-100">
                  {messages.length} messages
                </p>
              </div>
            </div>
            <button
              onClick={disconnect}
              className="text-white hover:bg-blue-700 p-2 rounded-full transition duration-200"
            >
              <LogOut size={20} />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            <div className="space-y-4">
              {messages.map((msg, index) => {
                const isMyMessage = msg.userId === userId;
                const prevMessage = index > 0 ? messages[index - 1] : null;
                const showAvatar =
                  !prevMessage || prevMessage.userId !== msg.userId;

                return (
                  <div
                    key={index}
                    className={`flex ${
                      isMyMessage ? "justify-end" : "justify-start"
                    }`}
                  >
                    {!isMyMessage && showAvatar && (
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center mr-2 flex-shrink-0">
                        <span className="text-xs font-bold text-gray-600">
                          {msg.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div
                      className={`${
                        isMyMessage
                          ? "bg-blue-600 text-white rounded-tl-lg rounded-tr-sm rounded-bl-lg rounded-br-lg"
                          : "bg-white text-gray-800 rounded-tl-sm rounded-tr-lg rounded-bl-lg rounded-br-lg shadow-sm border border-gray-200"
                      } px-4 py-3 max-w-xs break-words`}
                    >
                      {!isMyMessage && showAvatar && (
                        <div className="font-medium text-xs mb-1">
                          {msg.username}
                        </div>
                      )}
                      <p className="text-sm">{msg.content}</p>
                      <div
                        className={`text-xs mt-1 ${
                          isMyMessage ? "text-blue-100" : "text-gray-400"
                        } text-right`}
                      >
                        {formatTime(msg.timestamp)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Chat Input */}
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex items-center">
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a message..."
                className="flex-1 p-3 bg-gray-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              />
              <button
                className={`ml-3 p-3 rounded-full ${
                  message.trim()
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-gray-300 cursor-not-allowed"
                } transition duration-200`}
                onClick={sendMessage}
                disabled={!message.trim()}
              >
                <Send size={20} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
