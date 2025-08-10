
import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Edit2, Trash2, Reply, MoreHorizontal, Copy, Download } from 'lucide-react';
import { Message as MessageType, User } from '../types';

interface MessageProps {
  message: MessageType;
  currentUser: User;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  onReply?: (message: MessageType) => void;
  onReact?: (messageId: string, reaction: string) => void;
}

const MessageComponent: React.FC<MessageProps> = ({
  message,
  currentUser,
  onEdit,
  onDelete,
  onReply,
  onReact
}) => {
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const isOwn = message.sender.id === currentUser.id;
  const isCode = message.type === 'code';

  const handleEdit = () => {
    if (onEdit && editContent.trim() !== message.content) {
      onEdit(message.id, editContent.trim());
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

  const formatTime = (date: Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  return (
    <div
      className={`group flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-1' : 'order-2'}`}>
        {!isOwn && (
          <div className="flex items-center mb-1">
            <img
              src={message.sender.avatar || '/default-avatar.png'}
              alt={message.sender.username}
              className="w-6 h-6 rounded-full mr-2"
            />
            <span className="text-sm font-medium text-gray-700">
              {message.sender.username}
            </span>
          </div>
        )}

        <div
          className={`px-4 py-2 rounded-lg ${
            isOwn
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-900'
          } ${isCode ? 'font-mono text-sm' : ''}`}
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
                        {attachment.name}
                      </a>
                      <Download size={16} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between mt-1">
          <div className="text-xs text-gray-500">
            {formatTime(message.createdAt)}
            {message.editedAt && (
              <span className="ml-1">(edited)</span>
            )}
          </div>

          {showActions && !isEditing && (
            <div className="flex items-center space-x-1">
              {onReply && (
                <button
                  onClick={() => onReply(message)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  title="Reply"
                >
                  <Reply size={14} />
                </button>
              )}
              
              {isCode && (
                <button
                  onClick={handleCopyCode}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  title="Copy code"
                >
                  <Copy size={14} />
                </button>
              )}

              {isOwn && onEdit && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  title="Edit"
                >
                  <Edit2 size={14} />
                </button>
              )}

              {isOwn && onDelete && (
                <button
                  onClick={() => onDelete(message.id)}
                  className="p-1 text-gray-400 hover:text-red-600 rounded"
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
                key={`${reaction.emoji}-${reaction.user.id}`}
                onClick={() => handleReaction(reaction.emoji)}
                className="px-2 py-1 text-xs bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
              >
                {reaction.emoji} {reaction.count > 1 && reaction.count}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageComponent;
