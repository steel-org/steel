
import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Edit2, Trash2, Reply, MoreHorizontal, Copy, Download } from 'lucide-react';
import { Message as MessageType, User } from '../types';

interface MessageProps {
  message: MessageType;
  currentUser: User;
  otherUser: User;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onReplyToMessage: (message: MessageType) => void;
  onReact?: (messageId: string, reaction: string) => void;
}

const MessageComponent: React.FC<MessageProps> = ({
  message,
  currentUser,
  onEditMessage,
  onDeleteMessage,
  onReplyToMessage,
  onReact
}) => {
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const isOwn = message.sender.id === currentUser.id;
  const isCode = message.type === 'CODE';

  const handleEdit = () => {
    if (onEditMessage && editContent.trim() !== message.content) {
      onEditMessage(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCopyCode = () => {
    if (isCode) {
      navigator.clipboard.writeText(message.content);
    }
  };

  const handleReaction = (reaction: string) => {
    if (onReact) {
      onReact(message.id, reaction);
    }
  };

  const formatTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  return (
    <div
      className={`group flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4 px-2`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-1' : 'order-2'}`}>
        {!isOwn && (
          <div className="flex items-center mb-1">
            <img
              src={message.sender.avatar || '/default-avatar.png'}
              alt={message.sender.username}
              className="w-6 h-6 rounded-full mr-2 ring-2 ring-offset-1 ring-gray-200"
            />
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {message.sender.username}
            </span>
          </div>
        )}

        <div
          className={`px-4 py-3 rounded-lg shadow-sm ${
            isOwn
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-white text-gray-800 border border-gray-200 hover:border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:border-gray-600'
          } ${isCode ? 'font-mono text-sm' : ''} transition-all duration-150`}
        >
          {message.replyTo && (
            <div className="mb-2 pl-2 border-l-2 border-gray-300 opacity-70">
              <div className="text-xs font-medium">
                Replying to {message.replyTo.sender.username}
              </div>
              <div className="text-xs truncate">
                {message.replyTo.content}
              </div>
            </div>
          )}

          {isEditing ? (
            <div>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-2 text-gray-900 bg-white rounded border"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleEdit();
                  }
                  if (e.key === 'Escape') {
                    setIsEditing(false);
                    setEditContent(message.content);
                  }
                }}
              />
              <div className="flex justify-end mt-2 space-x-2">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(message.content);
                  }}
                  className="px-3 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEdit}
                  className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className={isCode ? 'whitespace-pre-wrap' : ''}>
                {message.content}
              </div>
              
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-2">
                  {message.attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center space-x-2">
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-200 hover:text-white underline"
                      >
                        {attachment.filename}
                      </a>
                      <Download size={16} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className={`text-xs ${isOwn ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
            {formatTime(message.createdAt)}
            {message.editedAt && (
              <span className="ml-1 opacity-80">(edited)</span>
            )}
          </div>

          {showActions && !isEditing && (
            <div className={`flex items-center space-x-1 p-1 rounded-full ${isOwn ? 'bg-blue-700/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
              <button
                onClick={() => onReplyToMessage(message)}
                className={`p-1.5 rounded-full ${isOwn ? 'text-blue-100 hover:bg-blue-500/50' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                title="Reply"
              >
                <Reply size={14} />
              </button>
              
              {isCode && (
                <button
                  onClick={handleCopyCode}
                  className={`p-1.5 rounded-full ${isOwn ? 'text-blue-100 hover:bg-blue-500/50' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                  title="Copy code"
                >
                  <Copy size={14} />
                </button>
              )}

              {isOwn && onEditMessage && (
                <button
                  onClick={() => setIsEditing(true)}
                  className={`p-1.5 rounded-full ${isOwn ? 'text-blue-100 hover:bg-blue-500/50' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                  title="Edit"
                >
                  <Edit2 size={14} />
                </button>
              )}

              {isOwn && (
                <button
                  onClick={() => onDeleteMessage(message.id)}
                  className="p-1.5 rounded-full text-red-400 hover:bg-red-500/30 hover:text-red-300"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )}
        </div>

        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {message.reactions.map((reaction) => (
              <button
                key={`${reaction.id}-${reaction.user.id}`}
                onClick={() => handleReaction(reaction.reaction)}
                className="px-2 py-1 text-xs bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
              >
                {reaction.reaction}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageComponent;
