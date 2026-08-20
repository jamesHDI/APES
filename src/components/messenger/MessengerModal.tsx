import React, { useState, useEffect, useRef } from "react";
import { User, DirectMessage } from "../../types";
import {
  MessageSquare,
  Send,
  X,
  Search,
  AlertCircle,
  CheckCheck,
  User as UserIcon,
  Plus,
  ArrowLeft,
  Filter,
  Shield,
  Briefcase,
  Building,
  Sparkles,
  HelpCircle
} from "lucide-react";
import { 
  getStoredDirectMessages, 
  sendDirectMessage, 
  markDirectMessagesAsRead 
} from "../../services/storage";

interface MessengerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  allUsers: User[];
  onMessagesUpdated?: () => void;
}

interface ConversationPartner {
  id: string;
  name: string;
  role?: string;
  avatarUrl?: string;
  departmentName?: string;
}

const CONCERN_CATEGORIES = [
  "General Inquiry",
  "Evaluation Concern",
  "KPI & Target Question",
  "Weight Calibration",
  "Rating & Score Dispute",
  "System Support",
  "Other"
];

export const MessengerModal: React.FC<MessengerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  allUsers,
  onMessagesUpdated
}) => {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [isComposingNew, setIsComposingNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "concerns" | "unread">("all");

  // New message form state
  const [newRecipientId, setNewRecipientId] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newMessageText, setNewMessageText] = useState("");
  const [isConcern, setIsConcern] = useState(false);
  const [concernCategory, setConcernCategory] = useState("General Inquiry");

  // Chat thread reply input
  const [replyText, setReplyText] = useState("");
  const [replyIsConcern, setReplyIsConcern] = useState(false);
  const [replyCategory, setReplyCategory] = useState("General Inquiry");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load messages on open
  useEffect(() => {
    if (isOpen) {
      loadMessages();
    }
  }, [isOpen]);

  const loadMessages = () => {
    const all = getStoredDirectMessages();
    setMessages(all);
  };

  // Scroll to bottom when thread changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedPartnerId, messages]);

  // Mark messages as read when selecting a partner
  useEffect(() => {
    if (selectedPartnerId && currentUser?.id) {
      markDirectMessagesAsRead(selectedPartnerId, currentUser.id);
      loadMessages();
      onMessagesUpdated?.();
    }
  }, [selectedPartnerId, currentUser?.id]);

  if (!isOpen || !currentUser) return null;

  // Filter messages relevant to current user
  const myMessages = (messages || []).filter(
    (m) =>
      m &&
      (m.senderId === currentUser.id ||
      m.recipientId === currentUser.id ||
      m.recipientId === "all")
  );

  // Derive active conversation partners
  const partnerMap = new Map<string, { partner: ConversationPartner; lastMessage: DirectMessage; unreadCount: number }>();

  myMessages.forEach((msg) => {
    const isSentByMe = msg.senderId === currentUser.id;
    const partnerId = (isSentByMe ? msg.recipientId : msg.senderId) || "unknown";

    if (!partnerMap.has(partnerId)) {
      let partnerUser: ConversationPartner;
      const foundUser = allUsers.find((u) => u.id === partnerId);

      if (foundUser) {
        partnerUser = {
          id: foundUser.id,
          name: foundUser.name,
          role: foundUser.role,
          avatarUrl: foundUser.avatarUrl,
          departmentName: foundUser.departmentName
        };
      } else if (partnerId === "all") {
        partnerUser = {
          id: "all",
          name: "All HDI Hive Users",
          role: "Company Broadcast",
          departmentName: "HDI Hive",
          avatarUrl: ""
        };
      } else {
        partnerUser = {
          id: partnerId,
          name: isSentByMe ? msg.recipientName : msg.senderName,
          role: isSentByMe ? msg.recipientRole : msg.senderRole,
          avatarUrl: isSentByMe ? msg.recipientAvatarUrl : msg.senderAvatarUrl,
          departmentName: isSentByMe ? msg.recipientDepartment : msg.senderDepartment
        };
      }

      partnerMap.set(partnerId, {
        partner: partnerUser,
        lastMessage: msg,
        unreadCount: 0
      });
    }

    const conv = partnerMap.get(partnerId)!;
    if (!isSentByMe && !msg.read) {
      conv.unreadCount += 1;
    }
  });

  const conversationList = Array.from(partnerMap.values()).filter(({ partner, lastMessage }) => {
    const matchesSearch =
      partner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (partner.departmentName && partner.departmentName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (lastMessage.message && lastMessage.message.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterType === "concerns") return lastMessage.isConcern;
    if (filterType === "unread") return myMessages.some(m => m.senderId === partner.id && !m.read && (m.recipientId === currentUser.id || m.recipientId === 'all'));
    return true;
  });

  // Handle sending a brand new message
  const handleSendNewMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecipientId || !newMessageText.trim()) return;

    const recipient = allUsers.find((u) => u.id === newRecipientId) || {
      id: newRecipientId,
      name: "Recipient",
      role: "employee" as const,
      avatarUrl: "",
      departmentName: ""
    };

    const newMsg: DirectMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      senderAvatarUrl: currentUser.avatarUrl,
      senderDepartment: currentUser.departmentName,
      recipientId: recipient.id,
      recipientName: recipient.name,
      recipientRole: recipient.role,
      recipientAvatarUrl: recipient.avatarUrl,
      recipientDepartment: recipient.departmentName,
      subject: newSubject.trim() || undefined,
      message: newMessageText.trim(),
      isConcern,
      category: isConcern ? concernCategory : undefined,
      read: false,
      createdAt: new Date().toISOString()
    };

    sendDirectMessage(newMsg);
    loadMessages();
    setSelectedPartnerId(recipient.id);
    setIsComposingNew(false);
    setNewMessageText("");
    setNewSubject("");
    setIsConcern(false);
    onMessagesUpdated?.();
  };

  // Handle sending reply inside active conversation
  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartnerId || !replyText.trim()) return;

    const recipient = allUsers.find((u) => u.id === selectedPartnerId) || {
      id: selectedPartnerId,
      name: "Recipient",
      role: "employee" as const,
      avatarUrl: "",
      departmentName: ""
    };

    const replyMsg: DirectMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      senderAvatarUrl: currentUser.avatarUrl,
      senderDepartment: currentUser.departmentName,
      recipientId: recipient.id,
      recipientName: recipient.name,
      recipientRole: recipient.role,
      recipientAvatarUrl: recipient.avatarUrl,
      recipientDepartment: recipient.departmentName,
      message: replyText.trim(),
      isConcern: replyIsConcern,
      category: replyIsConcern ? replyCategory : undefined,
      read: false,
      createdAt: new Date().toISOString()
    };

    sendDirectMessage(replyMsg);
    loadMessages();
    setReplyText("");
    setReplyIsConcern(false);
    onMessagesUpdated?.();
  };

  // Active thread messages
  const activeThreadMessages = selectedPartnerId
    ? myMessages
        .filter(
          (m) =>
            (m.senderId === currentUser.id && m.recipientId === selectedPartnerId) ||
            (m.senderId === selectedPartnerId && (m.recipientId === currentUser.id || m.recipientId === "all"))
        )
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : [];

  const selectedPartner: ConversationPartner | null = selectedPartnerId === "all" 
    ? { id: "all", name: "All HDI Hive Users", role: "Company Broadcast", departmentName: "HDI Hive", avatarUrl: "" } 
    : (allUsers.find((u) => u.id === selectedPartnerId) || (selectedPartnerId ? partnerMap.get(selectedPartnerId)?.partner || null : null));

  // Available users to message (exclude self)
  const candidateRecipients = (allUsers || []).filter((u) => u && currentUser && u.id !== currentUser.id && (u.isApproved !== false && u.isActive !== false));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-850 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-750 w-full max-w-5xl h-[85vh] max-h-[820px] flex flex-col overflow-hidden">
        
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-750 bg-gradient-to-r from-slate-50 via-white to-orange-50/30 dark:from-slate-800 dark:via-slate-850 dark:to-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-[#E96B1A] to-orange-500 rounded-2xl text-white shadow-md shadow-orange-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                HDI Hive Messenger & Concerns Desk
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-[#E96B1A] dark:text-orange-400">
                  Universal Access
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Direct messaging, evaluation inquiries, and concern routing for all registered employees.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsComposingNew(true);
                setSelectedPartnerId(null);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-[#E96B1A] hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              New Message / Concern
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content: Left Split (Conversations) & Right Split (Chat / Compose) */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* LEFT PANEL: Conversation list */}
          <div className={`w-full md:w-80 lg:w-96 border-r border-slate-100 dark:border-slate-750 flex flex-col bg-slate-50/50 dark:bg-slate-900/40 shrink-0 ${
            selectedPartnerId || isComposingNew ? 'hidden md:flex' : 'flex'
          }`}>
            
            {/* Search and Filters */}
            <div className="p-3.5 border-b border-slate-100 dark:border-slate-750 space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search chats, colleagues, concerns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E96B1A]"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setFilterType("all")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                    filterType === "all"
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-100 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterType("concerns")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors ${
                    filterType === "concerns"
                      ? "bg-amber-600 text-white"
                      : "bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-100 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <AlertCircle className="w-3 h-3 text-amber-500" />
                  Concerns
                </button>
                <button
                  onClick={() => setFilterType("unread")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                    filterType === "unread"
                      ? "bg-[#E96B1A] text-white"
                      : "bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-100 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  Unread
                </button>
              </div>
            </div>

            {/* Conversation Items List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {conversationList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <MessageSquare className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="text-xs font-semibold">No messages found</p>
                  <p className="text-[11px]">Click "New Message" to connect with any team member.</p>
                </div>
              ) : (
                conversationList.map(({ partner, lastMessage, unreadCount }) => {
                  const isSelected = selectedPartnerId === partner.id && !isComposingNew;
                  return (
                    <div
                      key={partner.id}
                      onClick={() => {
                        setSelectedPartnerId(partner.id);
                        setIsComposingNew(false);
                      }}
                      className={`p-3.5 cursor-pointer transition-all flex items-start gap-3 hover:bg-orange-50/50 dark:hover:bg-slate-800/80 ${
                        isSelected
                          ? "bg-orange-50 dark:bg-slate-800 border-l-4 border-[#E96B1A]"
                          : ""
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {partner.avatarUrl ? (
                          <img
                            src={partner.avatarUrl}
                            alt={partner.name}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center font-bold text-slate-700 dark:text-white text-xs">
                            {partner.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E96B1A] text-white text-[9px] font-black flex items-center justify-center border-2 border-white dark:border-slate-850">
                            {unreadCount}
                          </span>
                        )}
                      </div>

                      {/* Info & Snippet */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {partner.name}
                          </p>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {new Date(lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 uppercase">
                            {partner.role || 'Member'}
                          </span>
                          {partner.departmentName && (
                            <span className="text-[10px] text-slate-400 truncate">
                              • {partner.departmentName}
                            </span>
                          )}
                        </div>

                        <p className={`text-xs truncate ${
                          unreadCount > 0 
                            ? "font-extrabold text-slate-900 dark:text-white" 
                            : "text-slate-500 dark:text-slate-400"
                        }`}>
                          {lastMessage.isConcern && (
                            <span className="text-amber-600 dark:text-amber-400 font-bold mr-1">[Concern]</span>
                          )}
                          {lastMessage.senderId === currentUser.id ? 'You: ' : ''}{lastMessage.message}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT PANEL: Active Chat Thread OR Compose New */}
          <div className="flex-1 flex flex-col bg-white dark:bg-slate-850 overflow-hidden">
            
            {/* VIEW A: Compose New Message */}
            {isComposingNew ? (
              <div className="flex-1 flex flex-col p-6 overflow-y-auto">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-750">
                  <button
                    onClick={() => setIsComposingNew(false)}
                    className="md:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#E96B1A]" />
                      Compose Direct Message or Official Concern
                    </h3>
                    <p className="text-xs text-slate-500">Send an inquiry or formal concern to any registered colleague or supervisor.</p>
                  </div>
                </div>

                <form onSubmit={handleSendNewMessage} className="space-y-4 max-w-2xl">
                  {/* Recipient Dropdown */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                      Select Recipient *
                    </label>
                    <select
                      value={newRecipientId}
                      onChange={(e) => setNewRecipientId(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#E96B1A]"
                    >
                      <option value="">-- Choose Colleague or Officer --</option>
                      <optgroup label="People Operations & Executives">
                        {candidateRecipients.filter(u => ['pod', 'hr_admin', 'president'].includes(u.role)).map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name} — {u.position || u.role.toUpperCase()} ({u.departmentName})
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Department Heads & Supervisors">
                        {candidateRecipients.filter(u => ['dept_head', 'supervisor'].includes(u.role)).map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name} — {u.position || u.role.toUpperCase()} ({u.departmentName})
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Colleagues & Specialists">
                        {candidateRecipients.filter(u => !['pod', 'hr_admin', 'president', 'dept_head', 'supervisor'].includes(u.role)).map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name} — {u.position || 'Staff'} ({u.departmentName})
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* Flag as Concern Checkbox */}
                  <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-3">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isConcern}
                        onChange={(e) => setIsConcern(e.target.checked)}
                        className="w-4 h-4 rounded text-[#E96B1A] focus:ring-[#E96B1A]"
                      />
                      <div>
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          Tag as Official Performance / Evaluation Concern
                        </span>
                        <p className="text-[10px] text-amber-700 dark:text-amber-400">
                          Highlights this message as a priority inquiry regarding KPI standards, calibration, or evaluation routing.
                        </p>
                      </div>
                    </label>

                    {isConcern && (
                      <div className="pt-2 border-t border-amber-200 dark:border-amber-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase mb-1">
                            Concern Category
                          </label>
                          <select
                            value={concernCategory}
                            onChange={(e) => setConcernCategory(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg text-xs border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          >
                            {CONCERN_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase mb-1">
                            Subject / KPI Topic (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Sales Target Weight Question"
                            value={newSubject}
                            onChange={(e) => setNewSubject(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg text-xs border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Message Body */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                      Message Content *
                    </label>
                    <textarea
                      rows={5}
                      required
                      placeholder="Type your message, inquiry, or detailed concern..."
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-[#E96B1A] resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#E96B1A] to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
                    >
                      <Send className="w-4 h-4" />
                      Send Message
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsComposingNew(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : selectedPartner ? (
              /* VIEW B: Active Conversation Thread */
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                
                {/* Chat Header */}
                <div className="p-3.5 px-6 border-b border-slate-100 dark:border-slate-750 flex items-center justify-between bg-white dark:bg-slate-850 shrink-0">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedPartnerId(null)}
                      className="md:hidden p-1 rounded-lg text-slate-400 hover:bg-slate-100"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    {selectedPartner.avatarUrl ? (
                      <img
                        src={selectedPartner.avatarUrl}
                        alt={selectedPartner.name}
                        className="w-9 h-9 rounded-full object-cover border"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-orange-100 text-[#E96B1A] font-bold text-xs flex items-center justify-center">
                        {selectedPartner.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                        {selectedPartner.name}
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 uppercase">
                          {selectedPartner.role}
                        </span>
                      </h3>
                      <p className="text-[10px] text-slate-400">
                        {selectedPartner.departmentName || 'HDI Hive Member'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Message Bubbles Container */}
                <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/30 dark:bg-slate-900/20">
                  {activeThreadMessages.length === 0 ? (
                    <div className="text-center text-slate-400 py-12">
                      <p className="text-xs">Start a conversation with {selectedPartner.name}.</p>
                    </div>
                  ) : (
                    activeThreadMessages.map((msg) => {
                      const isMe = msg.senderId === currentUser.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                        >
                          {/* Sender name for group/broadcaster */}
                          {!isMe && (
                            <span className="text-[10px] font-bold text-slate-400 mb-1 ml-1">
                              {msg.senderName} • {msg.senderRole?.toUpperCase()}
                            </span>
                          )}

                          {/* Message Card / Bubble */}
                          <div
                            className={`max-w-[80%] rounded-2xl p-3.5 shadow-sm space-y-1.5 ${
                              isMe
                                ? "bg-gradient-to-tr from-[#E96B1A] to-orange-600 text-white rounded-br-none"
                                : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-bl-none"
                            }`}
                          >
                            {/* Concern Tag Badge if flagged */}
                            {msg.isConcern && (
                              <div className={`p-1.5 px-2.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 ${
                                isMe 
                                  ? "bg-black/20 text-white" 
                                  : "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                              }`}>
                                <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                                <span>[Concern: {msg.category || 'General'}] {msg.subject ? `• ${msg.subject}` : ''}</span>
                              </div>
                            )}

                            <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.message}</p>

                            <div className={`flex items-center justify-end gap-1 text-[9px] ${
                              isMe ? "text-orange-200" : "text-slate-400"
                            }`}>
                              <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {isMe && <CheckCheck className="w-3 h-3 text-orange-200" />}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply Input Bar */}
                <form
                  onSubmit={handleSendReply}
                  className="p-4 border-t border-slate-100 dark:border-slate-750 bg-white dark:bg-slate-850 space-y-2 shrink-0"
                >
                  {/* Concern Toggle in Reply */}
                  <div className="flex items-center justify-between text-xs px-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={replyIsConcern}
                        onChange={(e) => setReplyIsConcern(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-[#E96B1A]"
                      />
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-500" />
                        Tag reply as Performance Concern
                      </span>
                    </label>

                    {replyIsConcern && (
                      <select
                        value={replyCategory}
                        onChange={(e) => setReplyCategory(e.target.value)}
                        className="px-2 py-0.5 rounded text-[10px] border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-200 font-bold"
                      >
                        {CONCERN_CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Message ${selectedPartner.name}...`}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E96B1A]"
                    />
                    <button
                      type="submit"
                      disabled={!replyText.trim()}
                      className="p-2.5 rounded-xl bg-[#E96B1A] hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-md shadow-orange-500/20 active:scale-95 transition-all shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* VIEW C: Empty State */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
                <div className="p-4 bg-orange-50 dark:bg-slate-800 rounded-3xl text-[#E96B1A]">
                  <MessageSquare className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">
                    Select a conversation or start a new chat
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    Connect with any department head, peer, supervisor, or POD representative to discuss appraisals, calibrations, or concerns.
                  </p>
                </div>
                <button
                  onClick={() => setIsComposingNew(true)}
                  className="px-4 py-2 rounded-xl bg-[#E96B1A] hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-500/20"
                >
                  <Plus className="w-4 h-4" />
                  Compose Message
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
