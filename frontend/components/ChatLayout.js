import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import Sidebar from "./Sidebar";
import ChatArea from "./ChatArea";
import UserModal from "./UserModal";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export default function ChatLayout() {
  const [socket, setSocket] = useState(null);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(true);
  const [typingUsers, setTypingUsers] = useState(new Set());

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(BACKEND_URL, {
      transports: ["websocket", "polling"],
    });

    newSocket.on("connect", () => {
      console.log("Connected to server");
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from server");
    });

    newSocket.on("users", (usersList) => {
      setUsers(usersList);
    });

    newSocket.on("messageHistory", (history) => {
      setMessages(history);
    });

    newSocket.on("message", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    newSocket.on("userJoined", (user) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          text: `${user.username} joined the chat`,
          type: "system",
          timestamp: new Date().toISOString(),
        },
      ]);
    });

    newSocket.on("userLeft", (user) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          text: `${user.username} left the chat`,
          type: "system",
          timestamp: new Date().toISOString(),
        },
      ]);
    });

    newSocket.on("userTyping", ({ userId, username, isTyping }) => {
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        if (isTyping) {
          newSet.add(username);
        } else {
          newSet.delete(username);
        }
        return newSet;
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const handleUserJoin = (userData) => {
    if (socket) {
      socket.emit("join", userData);
      setCurrentUser(userData);
      setShowUserModal(false);
    }
  };

  const sendMessage = (text, type = "text") => {
    if (socket && text.trim()) {
      socket.emit("message", { text, type });
    }
  };

  const sendCodeSnippet = (code, language) => {
    if (socket && code.trim()) {
      socket.emit("codeSnippet", { code, language });
    }
  };

  const handleTyping = (isTyping) => {
    if (socket) {
      socket.emit("typing", isTyping);
    }
  };

  if (!socket) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-steel-400">Connecting to Steel Chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-steel-900">
      <Sidebar
        users={users}
        currentUser={currentUser}
        onUserSelect={(user) => console.log("Selected user:", user)}
      />

      <div className="flex-1 flex flex-col">
        <ChatArea
          messages={messages}
          currentUser={currentUser}
          onSendMessage={sendMessage}
          onSendCodeSnippet={sendCodeSnippet}
          onTyping={handleTyping}
          typingUsers={Array.from(typingUsers)}
        />
      </div>

      {showUserModal && (
        <UserModal
          onJoin={handleUserJoin}
          onClose={() => setShowUserModal(false)}
        />
      )}
    </div>
  );
}
