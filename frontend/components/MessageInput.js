import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";

export default function MessageInput({ onSend, onTyping, placeholder }) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        onTyping(false);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [message, isTyping, onTyping]);

  const handleChange = (e) => {
    const value = e.target.value;
    setMessage(value);

    if (!isTyping && value.length > 0) {
      setIsTyping(true);
      onTyping(true);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSend(message);
      setMessage("");
      setIsTyping(false);
      onTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleMention = (username) => {
    const currentValue = message;
    const cursorPosition = inputRef.current?.selectionStart || 0;

    const beforeCursor = currentValue.substring(0, cursorPosition);
    const afterCursor = currentValue.substring(cursorPosition);

    const lastAtSymbol = beforeCursor.lastIndexOf("@");
    if (lastAtSymbol !== -1) {
      const newValue =
        beforeCursor.substring(0, lastAtSymbol) + `@${username} ` + afterCursor;
      setMessage(newValue);

      setTimeout(() => {
        if (inputRef.current) {
          const newPosition = lastAtSymbol + username.length + 2; // +2 for @ and space
          inputRef.current.setSelectionRange(newPosition, newPosition);
          inputRef.current.focus();
        }
      }, 0);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1">
      <div className="flex items-end space-x-2">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={message}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="input-field w-full resize-none min-h-[44px] max-h-32"
            rows={1}
            style={{
              minHeight: "44px",
              maxHeight: "128px",
            }}
          />

          {message.includes("@") && (
            <div className="absolute bottom-full left-0 right-0 bg-steel-700 rounded-lg border border-steel-600 shadow-lg mb-2 max-h-32 overflow-y-auto">
              <div className="p-2">
                <div className="text-xs text-steel-400 mb-2 px-2">
                  Suggestions:
                </div>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => handleMention("user1")}
                    className="w-full text-left px-2 py-1 text-sm text-steel-200 hover:bg-steel-600 rounded"
                  >
                    @user1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMention("user2")}
                    className="w-full text-left px-2 py-1 text-sm text-steel-200 hover:bg-steel-600 rounded"
                  >
                    @user2
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!message.trim()}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <Send className="w-4 h-4" />
          <span>Send</span>
        </button>
      </div>
    </form>
  );
}
