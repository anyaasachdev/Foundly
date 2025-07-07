import React, { useState } from 'react';
import { Bell, Check, CheckCheck, Trash2, X, Calendar, Users, Megaphone } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';

const NotificationCenter = ({ isOpen, onClose }) => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications();
  
  const [filter, setFilter] = useState('all'); // all, unread, announcements, projects

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'announcement':
        return <Megaphone className="w-4 h-4" />;
      case 'project':
        return <Users className="w-4 h-4" />;
      case 'event':
        return <Calendar className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'announcement':
        return '#8B5CF6';
      case 'project':
        return '#10B981';
      case 'event':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.read;
      case 'announcements':
        return notification.type === 'announcement';
      case 'projects':
        return notification.type === 'project';
      default:
        return true;
    }
  });

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.3)',
          zIndex: 998
        }}
        onClick={onClose}
      />
      
      {/* Notification Panel */}
      <div style={{
        position: 'fixed',
        top: '70px',
        right: '20px',
        width: '400px',
        maxHeight: '600px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        zIndex: 999,
        overflow: 'hidden',
        border: '1px solid #E5E7EB'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #E5E7EB',
          background: '#F9FAFB'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '15px'
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#1F2937',
              margin: 0
            }}>
              Notifications
            </h3>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#8B5CF6',
                    padding: '4px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.875rem'
                  }}
                  title="Mark all as read"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6B7280',
                  padding: '4px'
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Filter Tabs */}
          <div style={{
            display: 'flex',
            gap: '4px',
            background: '#E5E7EB',
            padding: '4px',
            borderRadius: '8px'
          }}>
            {[
              { key: 'all', label: 'All', count: notifications.length },
              { key: 'unread', label: 'Unread', count: unreadCount },
              { key: 'announcements', label: 'Announcements', count: notifications.filter(n => n.type === 'announcement').length },
              { key: 'projects', label: 'Projects', count: notifications.filter(n => n.type === 'project').length }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                style={{
                  padding: '6px 12px',
                  border: 'none',
                  borderRadius: '6px',
                  background: filter === tab.key ? 'white' : 'transparent',
                  color: filter === tab.key ? '#8B5CF6' : '#6B7280',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: filter === tab.key ? '600' : '500',
                  transition: 'all 0.2s'
                }}
              >
                {tab.label} {tab.count > 0 && `(${tab.count})`}
              </button>
            ))}
          </div>
        </div>
        
        {/* Notifications List */}
        <div style={{
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {filteredNotifications.length === 0 ? (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: '#6B7280'
            }}>
              <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p style={{ margin: 0, fontSize: '0.875rem' }}>
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #F3F4F6',
                  background: notification.read ? 'white' : '#F0F9FF',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onClick={() => !notification.read && markAsRead(notification.id)}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}>
                  <div style={{
                    color: getNotificationColor(notification.type),
                    marginTop: '2px'
                  }}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '4px'
                    }}>
                      <h4 style={{
                        fontSize: '0.875rem',
                        fontWeight: notification.read ? '500' : '600',
                        color: '#1F2937',
                        margin: 0,
                        lineHeight: '1.4'
                      }}>
                        {notification.title}
                      </h4>
                      
                      <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
                        {!notification.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#10B981',
                              padding: '2px'
                            }}
                            title="Mark as read"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#EF4444',
                            padding: '2px'
                          }}
                          title="Delete notification"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    
                    <p style={{
                      fontSize: '0.8125rem',
                      color: '#6B7280',
                      margin: '0 0 8px 0',
                      lineHeight: '1.4'
                    }}>
                      {notification.message}
                    </p>
                    
                    <span style={{
                      fontSize: '0.75rem',
                      color: '#9CA3AF'
                    }}>
                      {formatTimeAgo(notification.createdAt)}
                    </span>
                  </div>
                  
                  {!notification.read && (
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#3B82F6',
                      marginTop: '6px'
                    }} />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationCenter;