import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import Sidebar from "./Sidebar";
import ChatArea from "./ChatArea";
import UserModal from "./UserModal";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:5000";

export default function ChatLayout() {
  const [socket, setSocket] = useState(null);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [replyingTo, setReplyingTo] = useState(null);

  // Load messages from localStorage
  const loadMessagesFromStorage = (userId) => {
    try {
      const stored = localStorage.getItem(`steel_messages_${userId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Error loading messages from localStorage:", error);
      return [];
    }
  };

  // Save messages to localStorage
  const saveMessagesToStorage = (userId, messages) => {
    try {
      localStorage.setItem(
        `steel_messages_${userId}`,
        JSON.stringify(messages)
      );
    } catch (error) {
      console.error("Error saving messages to localStorage:", error);
    }
  };

  useEffect(() => {
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

    newSocket.on("messageReceived", (message) => {
      setMessages((prev) => {
        const newMessages = [...prev, message];
        // Save to localStorage for both sender and recipient
        const otherUserId =
          message.senderId === currentUser?.id
            ? message.recipientId
            : message.senderId;
        saveMessagesToStorage(otherUserId, newMessages);
        return newMessages;
      });
    });

    newSocket.on("newMessage", (message) => {
      setMessages((prev) => {
        const newMessages = [...prev, message];
        // Save to localStorage
        const otherUserId =
          message.senderId === currentUser?.id
            ? message.recipientId
            : message.senderId;
        saveMessagesToStorage(otherUserId, newMessages);
        return newMessages;
      });

      // Mark as read if conversation is active
      if (
        selectedUser &&
        ((message.senderId === selectedUser.id &&
          message.recipientId === currentUser?.id) ||
          (message.recipientId === selectedUser.id &&
            message.senderId === currentUser?.id))
      ) {
        newSocket.emit("markAsRead", {
          senderId: message.senderId,
          messageId: message.id,
        });
      }
    });

    newSocket.on("messageStatusUpdate", ({ messageId, status }) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, status } : msg))
      );
    });

    newSocket.on("messageDeleted", ({ messageId }) => {
      setMessages((prev) => {
        const newMessages = prev.filter((msg) => msg.id !== messageId);
        // Update localStorage
        if (selectedUser) {
          saveMessagesToStorage(selectedUser.id, newMessages);
        }
        return newMessages;
      });
    });

    newSocket.on("userJoined", (user) => {
      setUsers((prev) => {
        const existing = prev.find((u) => u.id === user.id);
        return existing ? prev : [...prev, user];
      });
    });

    newSocket.on("userLeft", (user) => {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? { ...u, isOnline: false, lastSeen: user.lastSeen }
            : u
        )
      );
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
  }, [currentUser, selectedUser]);

  const handleUserJoin = (userData) => {
    if (socket) {
      socket.emit("join", userData);
      setCurrentUser(userData);
      setShowUserModal(false);
    }
  };

  const handleStartConversation = (userId) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    setSelectedUser(user);
    setReplyingTo(null); // Clear reply when switching conversations

    // Load existing messages from localStorage
    const existingMessages = loadMessagesFromStorage(userId);
    setMessages(existingMessages);
  };

  const sendMessage = (text, type = "text") => {
    if (socket && text.trim() && selectedUser) {
      socket.emit("privateMessage", {
        recipientId: selectedUser.id,
        text,
        type,
        replyTo: replyingTo,
      });
      setReplyingTo(null); // Clear reply after sending
    }
  };

  const sendCodeSnippet = (code, language) => {
    if (socket && code.trim() && selectedUser) {
      socket.emit("codeSnippet", {
        recipientId: selectedUser.id,
        code,
        language,
        replyTo: replyingTo,
      });
      setReplyingTo(null); // Clear reply after sending
    }
  };

  const handleTyping = (isTyping) => {
    if (socket && selectedUser) {
      socket.emit("typing", { recipientId: selectedUser.id, isTyping });
    }
  };

  const deleteMessage = (messageId) => {
    if (socket && selectedUser) {
      socket.emit("deleteMessage", {
        messageId,
        recipientId: selectedUser.id,
      });
    }
  };

  const replyToMessage = (message) => {
    setReplyingTo(message);
  };

  const cancelReply = () => {
    setReplyingTo(null);
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
        selectedUser={selectedUser}
        onUserSelect={handleStartConversation}
      />

      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <ChatArea
            messages={messages}
            currentUser={currentUser}
            otherUser={selectedUser}
            replyingTo={replyingTo}
            onSendMessage={sendMessage}
            onSendCodeSnippet={sendCodeSnippet}
            onTyping={handleTyping}
            onDeleteMessage={deleteMessage}
            onReplyToMessage={replyToMessage}
            onCancelReply={cancelReply}
            typingUsers={Array.from(typingUsers)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-steel-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-steel-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-steel-200 mb-2">
                Select a user to start chatting
              </h3>
              <p className="text-steel-400">
                Choose someone from the sidebar to begin a conversation
              </p>
            </div>
          </div>
        )}
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
