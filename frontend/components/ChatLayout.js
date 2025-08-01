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
  const [currentUser, setCurrentUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());

  const loadMessagesFromStorage = (conversationId) => {
    try {
      const stored = localStorage.getItem(`steel_messages_${conversationId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Error loading messages from localStorage:", error);
      return [];
    }
  };

  const saveMessagesToStorage = (conversationId, messages) => {
    try {
      localStorage.setItem(
        `steel_messages_${conversationId}`,
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

    newSocket.on("userConversations", (conversationsData) => {
      setConversations(conversationsData);
    });

    newSocket.on("conversationData", (data) => {
      const { conversationId, messages: serverMessages } = data;
      const localMessages = loadMessagesFromStorage(conversationId);
      const allMessages = [...localMessages, ...serverMessages];

      const uniqueMessages = allMessages
        .filter(
          (msg, index, self) => index === self.findIndex((m) => m.id === msg.id)
        )
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      setMessages(uniqueMessages);
      saveMessagesToStorage(conversationId, uniqueMessages);
    });

    newSocket.on("messageReceived", (message) => {
      setMessages((prev) => {
        const newMessages = [...prev, message];
        saveMessagesToStorage(message.conversationId, newMessages);
        return newMessages;
      });
    });

    newSocket.on("newMessage", (message) => {
      setMessages((prev) => {
        const newMessages = [...prev, message];
        saveMessagesToStorage(message.conversationId, newMessages);
        return newMessages;
      });

      if (currentConversation === message.conversationId) {
        newSocket.emit("markAsRead", {
          conversationId: message.conversationId,
        });
      }
    });

    newSocket.on("messageStatusUpdate", ({ messageId, status }) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, status } : msg))
      );
    });

    newSocket.on("messageDeleted", ({ messageId, conversationId }) => {
      setMessages((prev) => {
        const newMessages = prev.filter((msg) => msg.id !== messageId);
        saveMessagesToStorage(conversationId, newMessages);
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
  }, [currentConversation]);

  const handleUserJoin = (userData) => {
    if (socket) {
      socket.emit("join", userData);
      setCurrentUser(userData);
      setShowUserModal(false);
    }
  };

  const handleStartConversation = (recipientId) => {
    if (!socket || !currentUser) return;

    const conversationId = [currentUser.id, recipientId].sort().join("_");
    const existingMessages = loadMessagesFromStorage(conversationId);
    setMessages(existingMessages);

    setCurrentConversation(conversationId);

    socket.emit("getConversation", { conversationId });
  };

  const sendMessage = (text, type = "text") => {
    if (socket && text.trim() && currentConversation) {
      const [user1Id, user2Id] = currentConversation.split("_");
      const recipientId = user1Id === currentUser.id ? user2Id : user1Id;

      socket.emit("privateMessage", {
        recipientId,
        text,
        type,
      });
    }
  };

  const sendCodeSnippet = (code, language) => {
    if (socket && code.trim() && currentConversation) {
      const [user1Id, user2Id] = currentConversation.split("_");
      const recipientId = user1Id === currentUser.id ? user2Id : user1Id;

      socket.emit("codeSnippet", {
        recipientId,
        code,
        language,
      });
    }
  };

  const handleTyping = (isTyping) => {
    if (socket && currentConversation) {
      const [user1Id, user2Id] = currentConversation.split("_");
      const recipientId = user1Id === currentUser.id ? user2Id : user1Id;

      socket.emit("typing", { recipientId, isTyping });
    }
  };

  const deleteMessage = (messageId) => {
    if (socket && currentConversation) {
      socket.emit("deleteMessage", {
        messageId,
        conversationId: currentConversation,
      });
    }
  };

  const getCurrentConversationParticipant = () => {
    if (!currentConversation || !currentUser) return null;

    const [user1Id, user2Id] = currentConversation.split("_");
    const otherUserId = user1Id === currentUser.id ? user2Id : user1Id;

    return users.find((user) => user.id === otherUserId);
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
        conversations={conversations}
        currentUser={currentUser}
        currentConversation={currentConversation}
        onUserSelect={handleStartConversation}
        onConversationSelect={setCurrentConversation}
      />

      <div className="flex-1 flex flex-col">
        {currentConversation ? (
          <ChatArea
            messages={messages}
            currentUser={currentUser}
            otherUser={getCurrentConversationParticipant()}
            conversationId={currentConversation}
            onSendMessage={sendMessage}
            onSendCodeSnippet={sendCodeSnippet}
            onTyping={handleTyping}
            onDeleteMessage={deleteMessage}
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
                Select a conversation
              </h3>
              <p className="text-steel-400">
                Choose a user from the sidebar to start chatting
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
