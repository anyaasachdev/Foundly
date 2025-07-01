import React, { useState, useEffect, useRef } from 'react';
import { Send, Search, MoreVertical, Phone, Video, Smile, Users, Hash, Paperclip, Image, File, Download, Heart, ThumbsUp, Laugh, X, Edit3, Reply, Forward, Copy, Trash2, Pin, Archive } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import ApiService from '../services/api';
import { toast } from 'react-hot-toast';

const MessagingScreen = () => {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('direct');
  const [organization, setOrganization] = useState(null);
  const [orgMembers, setOrgMembers] = useState([]);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [showMessageActions, setShowMessageActions] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  const socket = useSocket(
    localStorage.getItem('authToken'),
    localStorage.getItem('currentOrganization')
  );
  
  // Enhanced socket event handlers
  useEffect(() => {
    if (socket) {
      socket.on('new_message', (message) => {
        if (selectedChat && message.chatId === selectedChat.id) {
          setMessages(prev => [...prev, message]);
        }
        
        setChats(prev => prev.map(chat => 
          chat.id === message.chatId 
            ? { ...chat, lastMessage: message.content, lastMessageTime: message.createdAt, unreadCount: selectedChat?.id === chat.id ? 0 : chat.unreadCount + 1 }
            : chat
        ));
      });
      
      socket.on('message_reaction', ({ messageId, reaction, userId }) => {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, reactions: { ...msg.reactions, [reaction]: [...(msg.reactions?.[reaction] || []), userId] } }
            : msg
        ));
      });
      
      socket.on('user_typing', ({ userId, userName, chatId }) => {
        if (selectedChat?.id === chatId) {
          setTypingUsers(prev => {
            const existing = prev.find(u => u.userId === userId);
            if (!existing) {
              return [...prev, { userId, userName }];
            }
            return prev;
          });
          
          setTimeout(() => {
            setTypingUsers(prev => prev.filter(u => u.userId !== userId));
          }, 3000);
        }
      });
      
      socket.on('message_edited', ({ messageId, newContent }) => {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, content: newContent, edited: true }
            : msg
        ));
      });
      
      socket.on('message_deleted', ({ messageId }) => {
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
      });
      
      socket.on('error', (error) => {
        toast.error(error.message);
      });
    }
    
    return () => {
      if (socket) {
        socket.off('new_message');
        socket.off('message_reaction');
        socket.off('user_typing');
        socket.off('message_edited');
        socket.off('message_deleted');
        socket.off('error');
      }
    };
  }, [socket, selectedChat]);
  
  useEffect(() => {
    loadOrganizationData();
    loadChats();
  }, []);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const loadOrganizationData = async () => {
    try {
      const response = await ApiService.getMyOrganizations();
      const currentOrgId = localStorage.getItem('currentOrganization');
      const currentOrg = response.organizations.find(org => org._id === currentOrgId);
      
      if (currentOrg) {
        setOrganization(currentOrg);
        setOrgMembers(currentOrg.members || []);
      }
    } catch (error) {
      console.error('Failed to load organization:', error);
    }
  };
  
  const loadChats = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getMessages();
      
      const chatMap = new Map();
      
      response.messages.forEach(message => {
        const chatId = message.chatId || `${message.sender}-${message.recipient}`;
        if (!chatMap.has(chatId)) {
          chatMap.set(chatId, {
            id: chatId,
            name: message.senderName || 'Unknown',
            avatar: message.senderAvatar,
            lastMessage: message.content,
            lastMessageTime: message.createdAt,
            type: message.type || 'direct',
            unreadCount: 0,
            pinned: false
          });
        }
      });
      
      if (organization?.features?.messaging) {
        chatMap.set('general', {
          id: 'general',
          name: 'General',
          avatar: null,
          lastMessage: 'Welcome to the general channel!',
          lastMessageTime: new Date().toISOString(),
          type: 'channel',
          unreadCount: 0,
          pinned: true
        });
        
        chatMap.set('announcements', {
          id: 'announcements',
          name: 'Announcements',
          avatar: null,
          lastMessage: 'Organization announcements will appear here',
          lastMessageTime: new Date().toISOString(),
          type: 'channel',
          unreadCount: 0,
          pinned: true
        });
      }
      
      setChats(Array.from(chatMap.values()).sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
      }));
    } catch (error) {
      console.error('Failed to load chats:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };
  
  const loadMessages = async (chatId) => {
    try {
      const response = await ApiService.getMessages(chatId);
      const messagesWithReactions = (response.messages || []).map(msg => ({
        ...msg,
        reactions: msg.reactions || {}
      }));
      setMessages(messagesWithReactions);
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load messages');
    }
  };
  
  const sendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !replyingTo) || !selectedChat) return;
    
    try {
      const messageData = {
        content: newMessage,
        chatId: selectedChat.id,
        type: selectedChat.type,
        replyTo: replyingTo?.id
      };
      
      await ApiService.sendMessage(messageData);
      
      const tempMessage = {
        id: Date.now(),
        content: newMessage,
        sender: 'current-user',
        senderName: 'You',
        createdAt: new Date().toISOString(),
        chatId: selectedChat.id,
        replyTo: replyingTo,
        reactions: {}
      };
      
      setMessages(prev => [...prev, tempMessage]);
      setNewMessage('');
      setReplyingTo(null);
      
      if (socket) {
        socket.emit('send_message', messageData);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    }
  };
  
  const handleTyping = () => {
    if (socket && selectedChat) {
      socket.emit('typing', { chatId: selectedChat.id });
      
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop_typing', { chatId: selectedChat.id });
      }, 1000);
    }
  };
  
  const handleFileUpload = async (files) => {
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('chatId', selectedChat.id);
        
        const response = await ApiService.uploadFile(formData);
        
        const fileMessage = {
          content: `📎 ${file.name}`,
          chatId: selectedChat.id,
          type: 'file',
          fileUrl: response.fileUrl,
          fileName: file.name,
          fileSize: file.size
        };
        
        await ApiService.sendMessage(fileMessage);
        
        if (socket) {
          socket.emit('send_message', fileMessage);
        }
        
        toast.success('File uploaded successfully');
      } catch (error) {
        console.error('Failed to upload file:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  };
  
  const addReaction = async (messageId, emoji) => {
    try {
      await ApiService.addReaction(messageId, emoji);
      if (socket) {
        socket.emit('add_reaction', { messageId, emoji });
      }
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };
  
  const editMessage = async (messageId, newContent) => {
    try {
      await ApiService.editMessage(messageId, newContent);
      if (socket) {
        socket.emit('edit_message', { messageId, newContent });
      }
      setEditingMessage(null);
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  };
  
  const deleteMessage = async (messageId) => {
    try {
      await ApiService.deleteMessage(messageId);
      if (socket) {
        socket.emit('delete_message', { messageId });
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };
  
  const selectChat = (chat) => {
    setSelectedChat(chat);
    loadMessages(chat.id);
    setChats(prev => prev.map(c => 
      c.id === chat.id ? { ...c, unreadCount: 0 } : c
    ));
  };
  
  const filteredChats = chats.filter(chat => {
    const matchesTab = activeTab === 'direct' ? chat.type === 'direct' : chat.type === 'channel';
    const matchesSearch = chat.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });
  
  const emojis = ['❤️', '👍', '😂', '😮', '😢', '😡'];
  
  return (
    <div 
      className="messaging-container" 
      style={{
        display: 'flex',
        height: 'calc(100vh - 80px)',
        marginTop: '80px',
        background: '#F9FAFB'
      }}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
    >
      {dragOver && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(139, 92, 246, 0.1)',
          border: '2px dashed #8B5CF6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          fontSize: '1.5rem',
          color: '#8B5CF6',
          fontWeight: 'bold'
        }}>
          Drop files here to upload
        </div>
      )}
      
      {/* Enhanced Sidebar */}
      <div className="messaging-sidebar" style={{
        width: '320px',
        background: 'white',
        borderRight: '1px solid #E5E7EB',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Organization Header */}
        {organization && (
          <div style={{
            padding: '20px',
            borderBottom: '1px solid #E5E7EB',
            background: `linear-gradient(135deg, ${organization.branding?.primaryColor || '#8B5CF6'} 0%, ${organization.branding?.secondaryColor || '#EC4899'} 100%)`,
            color: 'white'
          }}>
            <h3 style={{ fontWeight: 'bold', marginBottom: '5px' }}>
              {organization.name}
            </h3>
            <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>
              {orgMembers.length} members • {chats.filter(c => c.unreadCount > 0).length} unread
            </p>
          </div>
        )}
        
        {/* Chat Type Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #E5E7EB'
        }}>
          <button
            onClick={() => setActiveTab('direct')}
            style={{
              flex: 1,
              padding: '15px',
              border: 'none',
              background: activeTab === 'direct' ? '#F3F4F6' : 'transparent',
              color: activeTab === 'direct' ? '#8B5CF6' : '#6B7280',
              fontWeight: activeTab === 'direct' ? 'bold' : 'normal',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Users className="w-4 h-4" />
            Direct Messages
          </button>
          <button
            onClick={() => setActiveTab('channels')}
            style={{
              flex: 1,
              padding: '15px',
              border: 'none',
              background: activeTab === 'channels' ? '#F3F4F6' : 'transparent',
              color: activeTab === 'channels' ? '#8B5CF6' : '#6B7280',
              fontWeight: activeTab === 'channels' ? 'bold' : 'normal',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Hash className="w-4 h-4" />
            Channels
          </button>
        </div>
        
        {/* Enhanced Search */}
        <div style={{ padding: '15px' }}>
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Search className="w-4 h-4 absolute left-3 text-gray-400" />
            <input
              type="text"
              placeholder={`Search ${activeTab === 'direct' ? 'conversations' : 'channels'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 10px 10px 35px',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#8B5CF6'}
              onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
            />
          </div>
        </div>
        
        {/* Enhanced Chat List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 15px'
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#6B7280' }}>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p style={{ marginTop: '10px' }}>Loading conversations...</p>
            </div>
          ) : filteredChats.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#6B7280' }}>
              {searchQuery ? `No results for "${searchQuery}"` : `No ${activeTab === 'direct' ? 'conversations' : 'channels'} yet`}
            </div>
          ) : (
            filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => selectChat(chat)}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '5px',
                  cursor: 'pointer',
                  background: selectedChat?.id === chat.id ? '#F3F4F6' : 'transparent',
                  border: selectedChat?.id === chat.id ? '1px solid #8B5CF6' : '1px solid transparent',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
                onMouseEnter={(e) => e.target.style.background = selectedChat?.id === chat.id ? '#F3F4F6' : '#F9FAFB'}
                onMouseLeave={(e) => e.target.style.background = selectedChat?.id === chat.id ? '#F3F4F6' : 'transparent'}
              >
                {chat.pinned && (
                  <Pin className="w-3 h-3 absolute top-2 right-2 text-gray-400" />
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: chat.type === 'channel' ? '#8B5CF6' : 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    position: 'relative'
                  }}>
                    {chat.type === 'channel' ? (
                      <Hash className="w-5 h-5" />
                    ) : (
                      chat.name.charAt(0).toUpperCase()
                    )}
                    {chat.unreadCount > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '-2px',
                        right: '-2px',
                        width: '12px',
                        height: '12px',
                        background: '#10B981',
                        borderRadius: '50%',
                        border: '2px solid white'
                      }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '2px'
                    }}>
                      <h4 style={{
                        fontWeight: chat.unreadCount > 0 ? 'bold' : '500',
                        fontSize: '14px',
                        color: '#1F2937',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {chat.type === 'channel' ? `#${chat.name}` : chat.name}
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {chat.unreadCount > 0 && (
                          <span style={{
                            background: '#EF4444',
                            color: 'white',
                            borderRadius: '10px',
                            padding: '2px 6px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            minWidth: '18px',
                            textAlign: 'center'
                          }}>
                            {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                          </span>
                        )}
                        <span style={{
                          fontSize: '11px',
                          color: '#9CA3AF'
                        }}>
                          {new Date(chat.lastMessageTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                    <p style={{
                      fontSize: '12px',
                      color: chat.unreadCount > 0 ? '#374151' : '#6B7280',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontWeight: chat.unreadCount > 0 ? '500' : 'normal'
                    }}>
                      {chat.lastMessage}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* New Chat Button */}
        <div style={{ padding: '15px', borderTop: '1px solid #E5E7EB' }}>
          <button
            onClick={() => setShowNewChatModal(true)}
            style={{
              width: '100%',
              padding: '12px',
              background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'translateY(-1px)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
          >
            + New {activeTab === 'direct' ? 'Message' : 'Channel'}
          </button>
        </div>
      </div>
      
      {/* Enhanced Main Chat Area */}
      <div className="chat-main" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {selectedChat ? (
          <>
            {/* Enhanced Chat Header */}
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #E5E7EB',
              background: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: selectedChat.type === 'channel' ? '#8B5CF6' : 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold'
                }}>
                  {selectedChat.type === 'channel' ? (
                    <Hash className="w-5 h-5" />
                  ) : (
                    selectedChat.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 style={{ fontWeight: 'bold', color: '#1F2937' }}>
                    {selectedChat.type === 'channel' ? `#${selectedChat.name}` : selectedChat.name}
                  </h3>
                  <p style={{ fontSize: '12px', color: '#6B7280' }}>
                    {selectedChat.type === 'channel' ? `${orgMembers.length} members` : 'Direct message'}
                    {typingUsers.length > 0 && (
                      <span style={{ color: '#8B5CF6', fontStyle: 'italic' }}>
                        {' • '}{typingUsers.map(u => u.userName).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                      </span>
                    )}
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                {selectedChat.type === 'direct' && (
                  <>
                    <button style={{
                      padding: '8px',
                      border: 'none',
                      borderRadius: '6px',
                      background: '#F3F4F6',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#E5E7EB'}
                    onMouseLeave={(e) => e.target.style.background = '#F3F4F6'}
                    >
                      <Phone className="w-4 h-4 text-gray-600" />
                    </button>
                    <button style={{
                      padding: '8px',
                      border: 'none',
                      borderRadius: '6px',
                      background: '#F3F4F6',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#E5E7EB'}
                    onMouseLeave={(e) => e.target.style.background = '#F3F4F6'}
                    >
                      <Video className="w-4 h-4 text-gray-600" />
                    </button>
                  </>
                )}
                <button style={{
                  padding: '8px',
                  border: 'none',
                  borderRadius: '6px',
                  background: '#F3F4F6',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#E5E7EB'}
                onMouseLeave={(e) => e.target.style.background = '#F3F4F6'}
                >
                  <MoreVertical className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
            
            {/* Enhanced Messages */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              background: '#F9FAFB'
            }}>
              {messages.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: '#6B7280'
                }}>
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const isCurrentUser = message.sender === 'current-user';
                  const showAvatar = !isCurrentUser && (index === 0 || messages[index - 1].sender !== message.sender);
                  
                  return (
                    <div
                      key={message.id || index}
                      style={{
                        marginBottom: '15px',
                        display: 'flex',
                        justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
                        alignItems: 'flex-end',
                        gap: '8px'
                      }}
                    >
                      {!isCurrentUser && (
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          visibility: showAvatar ? 'visible' : 'hidden'
                        }}>
                          {message.senderName?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      
                      <div style={{
                        maxWidth: '70%',
                        position: 'relative'
                      }}
                      onMouseEnter={() => setShowMessageActions(message.id)}
                      onMouseLeave={() => setShowMessageActions(null)}
                      >
                        {/* Reply indicator */}
                        {message.replyTo && (
                          <div style={{
                            padding: '8px 12px',
                            background: '#F3F4F6',
                            borderRadius: '8px',
                            marginBottom: '4px',
                            borderLeft: '3px solid #8B5CF6',
                            fontSize: '12px',
                            color: '#6B7280'
                          }}>
                            <strong>{message.replyTo.senderName}:</strong> {message.replyTo.content}
                          </div>
                        )}
                        
                        <div style={{
                          padding: '12px 16px',
                          borderRadius: '18px',
                          background: isCurrentUser ? 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)' : 'white',
                          color: isCurrentUser ? 'white' : '#1F2937',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                          position: 'relative'
                        }}>
                          {!isCurrentUser && selectedChat.type === 'channel' && showAvatar && (
                            <p style={{
                              fontSize: '12px',
                              fontWeight: 'bold',
                              marginBottom: '4px',
                              color: '#8B5CF6'
                            }}>
                              {message.senderName}
                            </p>
                          )}
                          
                          {editingMessage === message.id ? (
                            <div>
                              <input
                                type="text"
                                defaultValue={message.content}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    editMessage(message.id, e.target.value);
                                  }
                                  if (e.key === 'Escape') {
                                    setEditingMessage(null);
                                  }
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  outline: 'none',
                                  color: 'inherit',
                                  width: '100%'
                                }}
                                autoFocus
                              />
                              <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.7 }}>
                                Press Enter to save, Escape to cancel
                              </div>
                            </div>
                          ) : (
                            <>
                              {message.type === 'file' ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <File className="w-4 h-4" />
                                  <span>{message.fileName}</span>
                                  <button
                                    onClick={() => window.open(message.fileUrl, '_blank')}
                                    style={{
                                      background: 'rgba(255,255,255,0.2)',
                                      border: 'none',
                                      borderRadius: '4px',
                                      padding: '4px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <Download className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <p style={{ margin: 0 }}>{message.content}</p>
                              )}
                              
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: '4px'
                              }}>
                                <p style={{
                                  fontSize: '11px',
                                  opacity: 0.7,
                                  margin: 0
                                }}>
                                  {new Date(message.createdAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                  {message.edited && <span style={{ marginLeft: '4px' }}>(edited)</span>}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                        
                        {/* Message reactions */}
                        {Object.keys(message.reactions || {}).length > 0 && (
                          <div style={{
                            display: 'flex',
                            gap: '4px',
                            marginTop: '4px',
                            flexWrap: 'wrap'
                          }}>
                            {Object.entries(message.reactions).map(([emoji, users]) => (
                              <button
                                key={emoji}
                                onClick={() => addReaction(message.id, emoji)}
                                style={{
                                  background: '#F3F4F6',
                                  border: '1px solid #E5E7EB',
                                  borderRadius: '12px',
                                  padding: '2px 6px',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px'
                                }}
                              >
                                {emoji} {users.length}
                              </button>
                            ))}
                          </div>
                        )}
                        
                        {/* Message actions */}
                        {showMessageActions === message.id && (
                          <div style={{
                            position: 'absolute',
                            top: '-15px',
                            right: isCurrentUser ? '0' : 'auto',
                            left: isCurrentUser ? 'auto' : '0',
                            background: 'white',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                            display: 'flex',
                            gap: '2px',
                            padding: '4px',
                            zIndex: 10
                          }}>
                            {emojis.map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => addReaction(message.id, emoji)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  padding: '4px',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '14px'
                                }}
                                onMouseEnter={(e) => e.target.style.background = '#F3F4F6'}
                                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                              >
                                {emoji}
                              </button>
                            ))}
                            <div style={{ width: '1px', background: '#E5E7EB', margin: '4px 2px' }} />
                            <button
                              onClick={() => setReplyingTo(message)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                padding: '4px',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                              onMouseEnter={(e) => e.target.style.background = '#F3F4F6'}
                              onMouseLeave={(e) => e.target.style.background = 'transparent'}
                            >
                              <Reply className="w-4 h-4 text-gray-600" />
                            </button>
                            {isCurrentUser && (
                              <>
                                <button
                                  onClick={() => setEditingMessage(message.id)}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    padding: '4px',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                  }}
                                  onMouseEnter={(e) => e.target.style.background = '#F3F4F6'}
                                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                >
                                  <Edit3 className="w-4 h-4 text-gray-600" />
                                </button>
                                <button
                                  onClick={() => deleteMessage(message.id)}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    padding: '4px',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                  }}
                                  onMouseEnter={(e) => e.target.style.background = '#EEE2E2'}
                                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Enhanced Message Input */}
            <div style={{
              padding: '20px',
              background: 'white',
              borderTop: '1px solid #E5E7EB'
            }}>
              {/* Reply indicator */}
              {replyingTo && (
                <div style={{
                  padding: '8px 12px',
                  background: '#F3F4F6',
                  borderRadius: '8px',
                  marginBottom: '10px',
                  borderLeft: '3px solid #8B5CF6',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
                      Replying to <strong>{replyingTo.senderName}</strong>
                    </p>
                    <p style={{ fontSize: '14px', color: '#374151', margin: 0 }}>
                      {replyingTo.content}
                    </p>
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              )}
              
              <form onSubmit={sendMessage} style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-end'
              }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileUpload(Array.from(e.target.files))}
                />
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: '12px',
                    border: 'none',
                    borderRadius: '50%',
                    background: '#F3F4F6',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#E5E7EB'}
                  onMouseLeave={(e) => e.target.style.background = '#F3F4F6'}
                >
                  <Paperclip className="w-5 h-5 text-gray-600" />
                </button>
                
                <div style={{ flex: 1, position: 'relative' }}>
                  <textarea
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping();
                    }}
                    placeholder={`Message ${selectedChat.type === 'channel' ? `#${selectedChat.name}` : selectedChat.name}...`}
                    style={{
                      width: '100%',
                      padding: '12px 45px 12px 15px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '20px',
                      resize: 'none',
                      minHeight: '44px',
                      maxHeight: '120px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#8B5CF6'}
                    onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(e);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    <Smile className="w-5 h-5 text-gray-400" />
                  </button>
                  
                  {/* Emoji picker */}
                  {showEmojiPicker && (
                    <div style={{
                      position: 'absolute',
                      bottom: '100%',
                      right: '0',
                      background: 'white',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                      padding: '10px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(6, 1fr)',
                      gap: '5px',
                      marginBottom: '5px'
                    }}>
                      {['😀', '😂', '😍', '🤔', '😢', '😡', '👍', '👎', '❤️', '🎉', '🔥', '💯'].map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => {
                            setNewMessage(prev => prev + emoji);
                            setShowEmojiPicker(false);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            padding: '5px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '18px'
                          }}
                          onMouseEnter={(e) => e.target.style.background = '#F3F4F6'}
                          onMouseLeave={(e) => e.target.style.background = 'transparent'}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  style={{
                    padding: '12px',
                    background: newMessage.trim() ? '#1e3a8a' : '#D1D5DB',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (newMessage.trim()) {
                      e.target.style.transform = 'scale(1.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)';
                  }}
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'white'
          }}>
            <div style={{ textAlign: 'center', color: '#6B7280' }}>
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                color: 'white'
              }}>
                <Users className="w-16 h-16" />
              </div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '10px', color: '#374151' }}>Welcome to Messaging</h3>
              <p style={{ fontSize: '1rem', marginBottom: '20px' }}>Select a conversation to start messaging</p>
              <p style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>Connect with your team members and collaborate in real-time</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagingScreen;