import React, { useState, useRef } from "react";
import { isToday, isYesterday, format } from "date-fns";
import {
  Edit2,
  Trash2,
  Reply,
  MoreHorizontal,
  Copy,
  Download,
  Check,
  CheckCheck,
  Eye,
  File as FileIcon,
  FileText,
} from "lucide-react";
import { useChatStore } from "@/stores/chatStore";
import { Message as MessageType, User } from "../types";
import { apiService } from "@/services/api";

interface MessageProps {
  message: MessageType;
  currentUser: User;
  otherUser?: User | null;
  isGroup?: boolean;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onReplyToMessage: (message: MessageType) => void;
  onReact?: (messageId: string, reaction: string) => void;
}

const MessageComponent: React.FC<MessageProps> = ({
  message,
  currentUser,
  otherUser,
  isGroup,
  onEditMessage,
  onDeleteMessage,
  onReplyToMessage,
  onReact,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { deleteMessage } = useChatStore();
  const [dragX, setDragX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const swipeTriggered = useRef(false);

  const SWIPE_ACTIVATE_PX = 60;
  const SWIPE_MAX_PX = 80;

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const t = e.touches[0];
    touchStartX.current = t.clientX;
    touchStartY.current = t.clientY;
    setIsSwiping(false);
    setDragX(0);
    swipeTriggered.current = false;
  };

  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartX.current;
    const dy = t.clientY - touchStartY.current;

    if (!isSwiping) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        setIsSwiping(true);
      } else {
        return;
      }
    }

    if (dx > 0) {
      e.preventDefault();
      setDragX(Math.min(dx, SWIPE_MAX_PX));
    } else {
      setDragX(0);
    }
  };

  const onTouchEnd = () => {
    if (!swipeTriggered.current && dragX >= SWIPE_ACTIVATE_PX) {
      swipeTriggered.current = true;
      onReplyToMessage(message);
    }
    setIsSwiping(false);
    setDragX(0);
  };

  const isOwn = message.sender.id === currentUser.id;
  const isCode = message.type === "CODE";

  const handleDelete = async (deleteForEveryone: boolean) => {
    if (deleteMessage) {
      await deleteMessage(message.id, deleteForEveryone);
    }
  };

  const handleDownload = async (
    e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement, MouseEvent>,
    attachment: any,
    name: string
  ) => {
    e.preventDefault();
    let objectUrl: string | null = null;
    const hardNavigateFallback = () => {
      try {
        const a = document.createElement("a");
        a.href = attachment?.url;
        a.download = name || "file";
        a.rel = "noopener";
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch {}
    };

    try {
      let fileId: string | null = attachment?.id || null;
      const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
      if (!fileId && attachment?.url) {
        const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        try {
          const u = new URL(attachment.url, base);
          const m = u.pathname.match(/\/api\/files\/([^/]+)(?:\/|$)/);
          if (m && m[1]) fileId = m[1];
        } catch {}
      }

      if (!fileId || !isUuid(fileId)) {
        try {
          objectUrl = await apiService.downloadViaProxy(attachment.url, name || 'file');
        } catch {
          try {
            const resp = await fetch(attachment.url, { mode: 'cors' });
            if (!resp.ok) throw new Error(`Fetch failed (${resp.status})`);
            const blob = await resp.blob();
            objectUrl = URL.createObjectURL(blob);
          } catch {
            return hardNavigateFallback();
          }
        }
      } else {
        objectUrl = await apiService.downloadFile(fileId);
      }
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = name || "file";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      hardNavigateFallback();
    } finally {
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {}
      }
    }
  };

  const handlePreview = async (attachment: any) => {
    const mime = attachment?.mimeType || "";
    const name = attachment?.originalName || attachment?.filename || "";
    const isPdf = mime.startsWith("application/pdf") || /\.pdf$/i.test(name);
    if (!isPdf) return;
    let objectUrl: string | null = null;
    try {
      let fileId: string | null = attachment?.id || null;
      if (!fileId && attachment?.url) {
        const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        try {
          const u = new URL(attachment.url, base);
          const m = u.pathname.match(/\/api\/files\/([^/]+)(?:\/|$)/);
          if (m && m[1]) fileId = m[1];
        } catch {}
      }
      if (fileId) {
        objectUrl = await apiService.downloadFile(fileId);
        setPdfPreviewUrl(objectUrl);
      } else {
        setPdfPreviewUrl(attachment.url);
      }
    } catch {
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {}
      }
    }
  };

  const formatBytes = (bytes?: number) => {
    if (bytes == null || isNaN(bytes as any)) return "";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    let v = bytes;
    while (v >= 1024 && i < units.length - 1) {
      v /= 1024;
      i++;
    }
    return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
  };

  const getAttachmentName = (att: any) =>
    att?.originalName || att?.filename || "file";
  const getTypeLabel = (att: any) => {
    const mime = att?.mimeType || "";
    if (mime) {
      const [major, minor] = mime.split("/");
      if (major && minor) return minor.toUpperCase();
    }
    const name = getAttachmentName(att);
    const m = name.match(/\.([a-z0-9]+)$/i);
    return m ? m[1].toUpperCase() : "FILE";
  };

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
    setShowReactionPicker(false);
    setShowMenu(false);
  };

  const formatTime = (dateString: string) => {
    const d = new Date(dateString);
    return format(d, "HH:mm");
  };

  const renderTicks = () => {
    if (!isOwn) return null;
    const status = (message.status || "SENT").toUpperCase();
    if (status === "SENT") {
      return (
        <span className="ml-1 inline-flex items-center align-middle">
          <Check size={14} className="opacity-80 text-current" />
        </span>
      );
    }
    if (status === "DELIVERED") {
      return (
        <span className="ml-1 inline-flex items-center align-middle text-gray-300">
          <CheckCheck size={14} />
        </span>
      );
    }
    if (status === "READ") {
      return (
        <span className="ml-1 inline-flex items-center align-middle text-sky-400">
          <CheckCheck size={14} />
        </span>
      );
    }
    return null;
  };

  return (
    <>
      <div
        className={`group flex ${
          isOwn ? "justify-end" : "justify-start"
        } mb-4 px-2`}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div
          className={`max-w-xs lg:max-w-md ${isOwn ? "order-1" : "order-2"}`}
        >
          {isGroup && !isOwn && (
            <div className="flex items-center mb-1">
              <img
                src={message.sender.avatar || "/default-avatar.png"}
                alt={message.sender.username}
                loading="lazy"
                className="w-6 h-6 rounded-full mr-2 object-cover object-center bg-gray-200 dark:bg-gray-700 ring-1 ring-black/10 dark:ring-white/10 ring-offset-0"
              />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {message.sender.username}
              </span>
            </div>
          )}

          {/* Reply preview */}

          {(() => {
            const atts = message.attachments || [];
            const content = (message.content || "").trim();
            let hideText = false;
            if (content && atts.length > 0) {
              const lc = content.toLowerCase();
              for (const a of atts) {
                const n = getAttachmentName(a);
                const candidates = [
                  n,
                  n.replace(/\.[^.]+$/, ""),
                  a?.url,
                ].filter(Boolean) as string[];
                if (candidates.some((c) => (c || "").toLowerCase() === lc)) {
                  hideText = true;
                  break;
                }
              }
            }
            const hasRenderableText = !hideText && !!content;
            const attachmentOnly = !hasRenderableText && atts.length > 0;
            const baseBubble = attachmentOnly
              ? `${isOwn ? "text-white" : "text-gray-800 dark:text-gray-200"}`
              : `${
                  isOwn
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-white text-gray-800 border border-gray-200 hover:border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:border-gray-600"
                }`;
            const pad = attachmentOnly ? "p-0" : "px-4 py-3";
            const extra = `${
              isCode ? "font-mono text-sm" : ""
            } transition-all duration-150 rounded-lg shadow-sm break-words whitespace-pre-wrap`;
            return (
              <div
                className={`${pad} ${baseBubble} ${extra}`}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                style={{
                  transform: dragX ? `translateX(${dragX}px)` : undefined,
                  transition: isSwiping ? "none" : "transform 150ms ease-out",
                  touchAction: "pan-y",
                }}
              >
                {message.replyTo && (
                  <div className="mb-2">
                    <div
                      className={`rounded-md p-2 border ${
                        isOwn
                          ? 'bg-black/20 border-white/30 text-white'
                          : 'bg-black/5 border-black/10 text-gray-800 dark:bg-white/5 dark:border-white/10 dark:text-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className={`w-1 self-stretch rounded ${
                            isOwn ? 'bg-white/70' : 'bg-blue-500/90'
                          }`}
                        />
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold truncate">
                            {message.replyTo.sender?.id === currentUser.id
                              ? 'Replying to you'
                              : `Replying to ${message.replyTo.sender?.username || 'user'}`}
                          </div>
                          <div className="text-xs line-clamp-2 break-words opacity-90">
                            {message.replyTo.content || 'Attachment'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* Text content */}
                {hasRenderableText && (
                  <div
                    className={`whitespace-pre-wrap break-words ${
                      isCode ? "" : ""
                    }`}
                  >
                    {message.content}
                  </div>
                )}
                {/* Attachments */}
                {atts && atts.length > 0 && (
                  <div
                    className={`${hasRenderableText ? "mt-2" : ""} space-y-2`}
                  >
                    {atts.map((attachment) => {
                      const name = getAttachmentName(attachment);
                      const isImage =
                        attachment.mimeType?.startsWith("image/") ||
                        /\.(png|jpe?g|gif|webp|bmp|tiff|svg)$/i.test(name);
                      if (isImage) {
                        return (
                          <div key={attachment.id || attachment.url} className={`${isOwn ? "ml-auto" : "mr-auto"}`}>
                            <img
                              src={attachment.url}
                              alt={name}
                              className="max-h-64 rounded-md cursor-zoom-in shadow-sm"
                              onClick={() => setImagePreviewUrl(attachment.url)}
                            />
                            <div className="mt-1 flex items-center justify-between gap-2">
                              <div className="text-[11px] text-gray-500 truncate" title={name}>
                                {name}
                              </div>
                              <button
                                onClick={(e) => handleDownload(e as any, attachment, name)}
                                className="shrink-0 p-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
                                title={`Download ${name}`}
                              >
                                <Download size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      }
                      const isPdf = (attachment.mimeType || "").startsWith("application/pdf") || /\.pdf$/i.test(name);
                      return (
                        <div
                          key={attachment.id || attachment.url}
                          className={`relative flex items-center justify-between gap-3 p-2 rounded-md bg-black/5 dark:bg-white/5 ${isOwn ? "ml-auto" : "mr-auto"}`}
                        >
                          {/* Triangle for sender side */}
                          <div
                            className={`absolute top-1/2 transform -translate-y-1/2 w-0 h-0
                              ${isOwn
                                ? "right-[-6px] border-l-0 border-r-[6px] border-t-[6px] border-b-[6px] border-r-black/5 dark:border-r-white/5 border-t-transparent border-b-transparent"
                                : "left-[-6px] border-r-0 border-l-[6px] border-t-[6px] border-b-[6px] border-l-black/5 dark:border-l-white/5 border-t-transparent border-b-transparent"
                            }`}
                          />

                          {/* File icon + info */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="shrink-0 w-8 h-8 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                              {isPdf ? (
                                <FileText size={16} className="text-gray-700 dark:text-gray-200" />
                              ) : (
                                <FileIcon size={16} className="text-gray-700 dark:text-gray-200" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm truncate" title={name}>
                                {name}
                              </div>
                              <div className="text-[11px] text-gray-500">
                                <span>{getTypeLabel(attachment)}</span>
                                {attachment.size != null && <span> • {formatBytes(attachment.size)}</span>}
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            {isPdf && (
                              <button
                                onClick={() => handlePreview(attachment)}
                                className="p-1.5 rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                                title="Preview"
                              >
                                <Eye size={16} />
                              </button>
                            )}
                            <button
                              onClick={(e) => handleDownload(e as any, attachment, name)}
                              className="p-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
                              title={`Download ${name}`}
                            >
                              <Download size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
          {isEditing ? (
            <div>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-2 text-gray-900 bg-white rounded border"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleEdit();
                  }
                  if (e.key === "Escape") {
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
          ) : null}
          <div className="flex items-center justify-between mt-2">
            <div
              className={`flex items-center text-xs ${
                isOwn ? "text-blue-100" : "text-gray-500 dark:text-gray-400"
              }`}
            >
              <span>{formatTime(message.createdAt)}</span>
              {message.editedAt && (
                <span className="ml-1 opacity-80">(edited)</span>
              )}
              {renderTicks()}
            </div>

            {showActions && !isEditing && (
              <div
                className={`flex items-center space-x-1 p-1 rounded-full ${
                  isOwn ? "bg-blue-700/30" : "bg-gray-100 dark:bg-gray-700"
                }`}
              >
                <button
                  onClick={() => onReplyToMessage(message)}
                  className={`p-1.5 rounded-full ${
                    isOwn
                      ? "text-blue-100 hover:bg-blue-500/50"
                      : "text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                  title="Reply"
                >
                  <Reply size={14} />
                </button>

                {isCode && (
                  <button
                    onClick={handleCopyCode}
                    className={`p-1.5 rounded-full ${
                      isOwn
                        ? "text-blue-100 hover:bg-blue-500/50"
                        : "text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                    title="Copy code"
                  >
                    <Copy size={14} />
                  </button>
                )}

                {isOwn && onEditMessage && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className={`p-1.5 rounded-full ${
                      isOwn
                        ? "text-blue-100 hover:bg-blue-500/50"
                        : "text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                    title="Edit"
                  >
                    <Edit2 size={14} />
                  </button>
                )}

                <button
                  onClick={() => setShowDeleteDialog(true)}
                  className={`p-1.5 rounded-full ${
                    isOwn
                      ? "text-red-200 hover:bg-red-500/30 hover:text-red-100"
                      : "text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>

                {/* Settings */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowMenu((v) => !v);
                      setShowReactionPicker(false);
                    }}
                    className={`p-1.5 rounded-full ${
                      isOwn
                        ? "text-blue-100 hover:bg-blue-500/50"
                        : "text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                    title="More"
                  >
                    <MoreHorizontal size={14} />
                  </button>
                  {showMenu && (
                    <div
                      className={`absolute right-0 mt-2 w-44 rounded-md shadow-lg z-20 ${
                        isOwn
                          ? "bg-blue-800 text-blue-50"
                          : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                      } border ${
                        isOwn
                          ? "border-blue-700"
                          : "border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      <button
                        onClick={() => {
                          onReplyToMessage(message);
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-black/10 dark:hover:bg-white/10"
                      >
                        Reply
                      </button>
                      <button
                        onClick={() => setShowReactionPicker((v) => !v)}
                        className="w-full text-left px-3 py-2 hover:bg-black/10 dark:hover:bg-white/10"
                      >
                        Add reaction
                      </button>
                      {isOwn && onEditMessage && (
                        <button
                          onClick={() => {
                            setIsEditing(true);
                            setShowMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-black/10 dark:hover:bg-white/10"
                        >
                          Edit
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          setShowDeleteDialog(true);
                        }}
                        className="w-full text-left px-3 py-2 text-red-600 dark:text-red-400 hover:bg-black/10 dark:hover:bg-white/10"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Reaction picker */}
          {showReactionPicker && !isEditing && (
            <div className="mt-2 flex flex-wrap gap-1">
              {["👍", "❤️", "😂", "🔥", "🎉", "😮", "😢", "🙏", "👎"].map(
                (e) => (
                  <button
                    key={e}
                    onClick={() => handleReaction(e)}
                    className="px-2 py-1 text-sm rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                  >
                    {e}
                  </button>
                )
              )}
            </div>
          )}

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

      {/* Image Preview Modal */}
      {imagePreviewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setImagePreviewUrl(null)}
        >
          <img
            src={imagePreviewUrl}
            alt="preview"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-md shadow-2xl cursor-zoom-out"
          />
        </div>
      )}

      {/* PDF Preview Modal */}
      {pdfPreviewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => {
            try {
              if (pdfPreviewUrl.startsWith("blob:"))
                URL.revokeObjectURL(pdfPreviewUrl);
            } catch {}
            setPdfPreviewUrl(null);
          }}
        >
          <div
            className="w-[90vw] h-[90vh] bg-white rounded-md overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={pdfPreviewUrl}
              className="w-full h-full"
              title="PDF preview"
            />
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowDeleteDialog(false)}
          />
          <div className="relative bg-gray-800 border border-gray-700 rounded-lg w-full max-w-sm p-4 text-gray-100">
            <div className="text-lg font-semibold mb-2">Delete message</div>
            <div className="text-sm text-gray-300 mb-4">
              {isOwn
                ? "Do you want to delete this message for everyone or just for you?"
                : "Delete this message for you? Other participants will still see it."}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="px-3 py-1.5 rounded bg-gray-700 text-gray-200 hover:bg-gray-600"
              >
                Cancel
              </button>
              {!isOwn && (
                <button
                  onClick={() => {
                    handleDelete(false);
                    setShowDeleteDialog(false);
                  }}
                  className="px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700"
                >
                  Delete for me
                </button>
              )}
              {isOwn && (
                <>
                  <button
                    onClick={() => {
                      handleDelete(false);
                      setShowDeleteDialog(false);
                    }}
                    className="px-3 py-1.5 rounded bg-amber-600 text-white hover:bg-amber-700"
                  >
                    Delete for me
                  </button>
                  <button
                    onClick={() => {
                      handleDelete(true);
                      setShowDeleteDialog(false);
                    }}
                    className="px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700"
                  >
                    Delete for everyone
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MessageComponent;
