import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import ApiService from '../services/api';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  
  const socket = useSocket(
    localStorage.getItem('authToken'),
    localStorage.getItem('currentOrganization')
  );

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('new_announcement', (announcement) => {
        const notification = {
          id: Date.now(),
          type: 'announcement',
          title: announcement.title,
          message: announcement.content,
          data: announcement,
          read: false,
          createdAt: new Date().toISOString()
        };
        
        addNotification(notification);
        showToast({
          type: 'info',
          title: 'New Announcement',
          message: announcement.title,
          duration: 5000
        });
      });

      socket.on('project_update', (project) => {
        const notification = {
          id: Date.now(),
          type: 'project',
          title: 'Project Updated',
          message: `${project.title} has been updated`,
          data: project,
          read: false,
          createdAt: new Date().toISOString()
        };
        
        addNotification(notification);
        showToast({
          type: 'success',
          title: 'Project Update',
          message: `${project.title} has been updated`,
          duration: 4000
        });
      });

      socket.on('new_message', (message) => {
        if (message.senderId !== localStorage.getItem('userId')) {
          showToast({
            type: 'info',
            title: 'New Message',
            message: `${message.senderName}: ${((message.content || '') + '').substring(0, 50)}...`,
            duration: 3000
          });
        }
      });

      return () => {
        socket.off('new_announcement');
        socket.off('project_update');
        socket.off('new_message');
      };
    }
  }, [socket]);

  const loadNotifications = async () => {
    try {
      // In real app, this would fetch from API
      const mockNotifications = [
        {
          id: 1,
          type: 'announcement',
          title: 'Welcome to the Community!',
          message: 'Thank you for joining our organization. We\'re excited to have you on board!',
          read: false,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 2,
          type: 'project',
          title: 'Project Assignment',
          message: 'You have been assigned to the Community Garden Initiative project.',
          read: true,
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      
      setNotifications(mockNotifications);
      setUnreadCount(mockNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // Send email notification if user has email notifications enabled
    if (notification.type === 'announcement' || notification.type === 'project') {
      sendEmailNotification(notification);
    }
  };

  const sendEmailNotification = async (notification) => {
    try {
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) return;
      
      // Call API to send email notification
      await ApiService.sendEmailNotification({
        to: userEmail,
        subject: notification.title,
        message: notification.message,
        type: notification.type
      });
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  };

  const markAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
    setUnreadCount(0);
  };

  const deleteNotification = (notificationId) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const showToast = (toast) => {
    const toastWithId = {
      ...toast,
      id: Date.now() + Math.random()
    };
    
    setToasts(prev => [...prev, toastWithId]);
    
    setTimeout(() => {
      removeToast(toastWithId.id);
    }, toast.duration || 4000);
  };

  const removeToast = (toastId) => {
    setToasts(prev => prev.filter(t => t.id !== toastId));
  };

  const showSuccess = (message, title = 'Success') => {
    showToast({ type: 'success', title, message });
  };

  const showError = (message, title = 'Error') => {
    showToast({ type: 'error', title, message });
  };

  const showInfo = (message, title = 'Info') => {
    showToast({ type: 'info', title, message });
  };

  const showWarning = (message, title = 'Warning') => {
    showToast({ type: 'warning', title, message });
  };

  const value = {
    notifications,
    unreadCount,
    toasts,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    showToast,
    removeToast,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    loadNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};