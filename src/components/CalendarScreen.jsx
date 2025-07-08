import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Search, Filter, Bell, X, Edit, Trash2, Users, MapPin, Repeat, ChevronLeft, ChevronRight, CalendarIcon, Edit3 } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import ApiService from '../services/api';
import './CalendarScreen.css';

const CalendarScreen = ({ user }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [viewMode, setViewMode] = useState('month'); // month, week, day
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(false);
  const { showToast } = useNotifications();
  
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    type: 'meeting',
    location: '',
    attendees: [],
    reminder: '15',
    recurring: 'none',
    color: '#667eea'
  });

  const eventTypes = [
    { value: 'meeting', label: 'Meeting', color: '#667eea', icon: '👥' },
    { value: 'deadline', label: 'Deadline', color: '#ef4444', icon: '⏰' },
    { value: 'milestone', label: 'Milestone', color: '#10b981', icon: '🎯' },
    { value: 'review', label: 'Review', color: '#f59e0b', icon: '📋' },
    { value: 'training', label: 'Training', color: '#8b5cf6', icon: '📚' },
    { value: 'social', label: 'Social', color: '#06b6d4', icon: '🎉' },
    { value: 'personal', label: 'Personal', color: '#84cc16', icon: '👤' }
  ];

  const reminderOptions = [
    { value: '0', label: 'At time of event' },
    { value: '5', label: '5 minutes before' },
    { value: '15', label: '15 minutes before' },
    { value: '30', label: '30 minutes before' },
    { value: '60', label: '1 hour before' },
    { value: '1440', label: '1 day before' }
  ];

  useEffect(() => {
    loadEvents();
  }, [currentDate, user]);

  useEffect(() => {
    filterEvents();
  }, [events, searchTerm, filterType]);

  const loadEvents = async () => {
    try {
      const response = await ApiService.getEvents();
      setEvents(response.events || []);
    } catch (error) {
      console.error('Failed to load events:', error);
      setEvents([]);
    }
  };

  const filterEvents = () => {
    let filtered = events;
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(event => event.type === filterType);
    }
    
    setFilteredEvents(filtered);
  };

  const handleCreateEvent = async () => {
    try {
      if (!newEvent.title || !newEvent.startDate || !newEvent.startTime) {
        alert('Please fill in all required fields.');
        return;
      }
      const eventData = {
        ...newEvent,
        attendees: newEvent.attendees.filter(email => email.trim()),
        organizationId: localStorage.getItem('currentOrganization') || 'default'
      };
      await ApiService.createEvent(eventData);
      await loadEvents();
      setShowEventModal(false);
      resetEventForm();
      showToast('Event created successfully!', 'success');
    } catch (error) {
      console.error('Failed to create event:', error);
      showToast('Failed to create event', 'error');
    }
  };

  const handleUpdateEvent = async () => {
    try {
      await ApiService.updateEvent(selectedEvent._id, newEvent);
      await loadEvents();
      setShowEventModal(false);
      setSelectedEvent(null);
      resetEventForm();
      showToast('Event updated successfully!', 'success');
    } catch (error) {
      console.error('Failed to update event:', error);
      showToast('Failed to update event', 'error');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await ApiService.deleteEvent(eventId);
      await loadEvents();
      showToast('Event deleted successfully!', 'success');
    } catch (error) {
      console.error('Failed to delete event:', error);
      showToast('Failed to delete event', 'error');
    }
  };

  const resetEventForm = () => {
    setNewEvent({
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      type: 'meeting',
      location: '',
      attendees: [],
      reminder: '15',
      recurring: 'none',
      color: '#667eea'
    });
  };

  const openEventModal = (event = null) => {
    if (event) {
      setSelectedEvent(event);
      setNewEvent({ ...event });
    } else {
      setSelectedEvent(null);
      resetEventForm();
      // Set default date to selected date
      const dateStr = selectedDate.toISOString().split('T')[0];
      setNewEvent(prev => ({ ...prev, startDate: dateStr, endDate: dateStr }));
    }
    setShowEventModal(true);
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getEventsForDate = (date) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    
    return filteredEvents.filter(event => {
      // Handle different date formats
      let eventDate;
      if (typeof event.startDate === 'string') {
        eventDate = event.startDate.split('T')[0];
      } else if (event.startDate instanceof Date) {
        eventDate = event.startDate.toISOString().split('T')[0];
      } else {
        return false;
      }
      
      return eventDate === dateStr;
    });
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getEventTypeData = (type) => {
    return eventTypes.find(t => t.value === type) || eventTypes[0];
  };

  const renderCalendarGrid = () => {
    const days = getDaysInMonth(currentDate);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    return (
      <div className="calendar-grid">
        {/* Day headers */}
        <div className="calendar-header">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="day-header">{day}</div>
          ))}
        </div>
        
        {/* Calendar days */}
        <div className="calendar-body">
          {days.map((day, index) => {
            if (!day) {
              return <div key={index} className="calendar-day empty"></div>;
            }
            
            const dayStr = day.toISOString().split('T')[0];
            const dayEvents = getEventsForDate(day);
            const isToday = dayStr === todayStr;
            const isSelected = dayStr === selectedDate.toISOString().split('T')[0];
            
            return (
              <div 
                key={index} 
                className={`calendar-day ${
                  isToday ? 'today' : ''
                } ${
                  isSelected ? 'selected' : ''
                } ${
                  dayEvents.length > 0 ? 'has-events' : ''
                }`}
                onClick={() => setSelectedDate(day)}
              >
                <span className="day-number">{day.getDate()}</span>
                <div className="day-events">
                  {dayEvents.slice(0, 3).map(event => {
                    const typeData = getEventTypeData(event.type);
                    return (
                      <div 
                        key={event._id}
                        className="day-event"
                        style={{ backgroundColor: typeData.color }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEventModal(event);
                        }}
                        title={event.title || 'Untitled Event'}
                      >
                        <span className="event-title">{event.title || 'Untitled Event'}</span>
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div className="more-events">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderEventModal = () => {
    if (!showEventModal) return null;
    
    return (
      <div className="modal-overlay">
        <div className="event-modal">
          <div className="modal-header">
            <h3>{selectedEvent ? 'Edit Event' : 'Create New Event'}</h3>
            <button 
              className="modal-close"
              onClick={() => {
                setShowEventModal(false);
                setSelectedEvent(null);
                resetEventForm();
              }}
            >
              ×
            </button>
          </div>
          
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group full-width">
                <label>Event Title *</label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter event title"
                  className="form-input"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Event Type</label>
                <select
                  value={newEvent.type}
                  onChange={(e) => {
                    const typeData = getEventTypeData(e.target.value);
                    setNewEvent(prev => ({ 
                      ...prev, 
                      type: e.target.value,
                      color: typeData.color
                    }));
                  }}
                  className="form-select"
                >
                  {eventTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Color</label>
                <input
                  type="color"
                  value={newEvent.color}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, color: e.target.value }))}
                  className="color-input"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Start Date *</label>
                <input
                  type="date"
                  value={newEvent.startDate}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, startDate: e.target.value }))}
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label>End Date</label>
                <input
                  type="date"
                  value={newEvent.endDate}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, endDate: e.target.value }))}
                  className="form-input"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Start Time *</label>
                <input
                  type="time"
                  value={newEvent.startTime}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, startTime: e.target.value }))}
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label>End Time</label>
                <input
                  type="time"
                  value={newEvent.endTime}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, endTime: e.target.value }))}
                  className="form-input"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group full-width">
                <label>Location</label>
                <input
                  type="text"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Enter location or meeting link"
                  className="form-input"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group full-width">
                <label>Description</label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter event description"
                  className="form-textarea"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Reminder</label>
                <select
                  value={newEvent.reminder}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, reminder: e.target.value }))}
                  className="form-select"
                >
                  {reminderOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Recurring</label>
                <select
                  value={newEvent.recurring}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, recurring: e.target.value }))}
                  className="form-select"
                >
                  <option value="none">No repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="modal-footer">
            {selectedEvent && (
              <button 
                className="btn-danger"
                onClick={() => {
                  handleDeleteEvent(selectedEvent._id);
                  setShowEventModal(false);
                  setSelectedEvent(null);
                }}
              >
                <Trash2 size={16} />
                Delete
              </button>
            )}
            <div className="modal-actions">
              <button 
                className="btn-secondary"
                onClick={() => {
                  setShowEventModal(false);
                  setSelectedEvent(null);
                  resetEventForm();
                }}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={selectedEvent ? handleUpdateEvent : handleCreateEvent}
              >
                {selectedEvent ? 'Update Event' : 'Create Event'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="calendar-screen" style={{
      padding: '20px',
      maxWidth: '1200px',
      margin: '0 auto',
      paddingTop: '90px',
      fontFamily: 'Poppins, sans-serif'
    }}>
      {/* Header */}
      <div className="calendar-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <div>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            color: '#1F2937',
            marginBottom: '5px',
            fontFamily: 'Poppins, sans-serif'
          }}>
            Calendar
          </h1>
          <p style={{ color: '#6B7280', fontFamily: 'Poppins, sans-serif' }}>
            Manage your organization's events and schedules
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => openEventModal()}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.875rem',
              fontWeight: '500',
              fontFamily: 'Poppins, sans-serif',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 4px 12px rgba(55, 65, 81, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            <Plus className="w-4 h-4" />
            Create Event
          </button>
        </div>
      </div>
      
      <div className="calendar-container">
        {/* Header */}
        <div className="calendar-header-section">
          <div className="calendar-title">
            <CalendarIcon size={24} />
            <h1>Calendar</h1>
          </div>
          
          <div className="calendar-controls">
            <div className="search-filter">
              <div className="search-box">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
              
              <div className="filter-box">
                <Filter size={16} />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Events</option>
                  {eventTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
        
        {/* Calendar Navigation */}
        <div className="calendar-nav">
          <div className="nav-controls">
            <button 
              className="nav-btn"
              onClick={() => navigateMonth(-1)}
            >
              <ChevronLeft size={20} />
            </button>
            
            <h2 className="current-month">
              {currentDate.toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </h2>
            
            <button 
              className="nav-btn"
              onClick={() => navigateMonth(1)}
            >
              <ChevronRight size={20} />
            </button>
          </div>
          
          <div className="view-modes">
            <button 
              className={`view-btn ${viewMode === 'month' ? 'active' : ''}`}
              onClick={() => setViewMode('month')}
            >
              Month
            </button>
            <button 
              className={`view-btn ${viewMode === 'week' ? 'active' : ''}`}
              onClick={() => setViewMode('week')}
            >
              Week
            </button>
            <button 
              className={`view-btn ${viewMode === 'day' ? 'active' : ''}`}
              onClick={() => setViewMode('day')}
            >
              Day
            </button>
          </div>
        </div>
        
        {/* Calendar Content */}
        <div className="calendar-content">
          {viewMode === 'month' && renderCalendarGrid()}
          
          {/* Event Details Sidebar */}
          <div className="event-sidebar">
            <h3>Events for {selectedDate.toLocaleDateString()}</h3>
            <div className="sidebar-events">
              {getEventsForDate(selectedDate).length === 0 ? (
                <div className="no-events">
                  <CalendarIcon size={48} className="no-events-icon" />
                  <p>No events scheduled</p>
                  <button 
                    className="btn-outline"
                    onClick={() => openEventModal()}
                  >
                    Create Event
                  </button>
                </div>
              ) : (
                getEventsForDate(selectedDate).map(event => {
                  const typeData = getEventTypeData(event.type);
                  return (
                    <div 
                      key={event._id} 
                      className="sidebar-event"
                      onClick={() => openEventModal(event)}
                    >
                      <div 
                        className="event-color-bar"
                        style={{ backgroundColor: typeData.color }}
                      ></div>
                      <div className="event-content">
                        <div className="event-header">
                          <span className="event-type">{typeData.icon}</span>
                          <h4 className="event-title">{event.title || 'Untitled Event'}</h4>
                          <button className="event-edit">
                            <Edit3 size={14} />
                          </button>
                        </div>
                        <div className="event-details">
                          <div className="event-time">
                            <Clock size={14} />
                            <span>
                              {formatTime(event.startTime)}
                              {event.endTime && ` - ${formatTime(event.endTime)}`}
                            </span>
                          </div>
                          {event.location && (
                            <div className="event-location">
                              <MapPin size={14} />
                              <span>{event.location}</span>
                            </div>
                          )}
                          {event.attendees && event.attendees.length > 0 && (
                            <div className="event-attendees">
                              <Users size={14} />
                              <span>{event.attendees.length} attendees</span>
                            </div>
                          )}
                        </div>
                        {event.description && (
                          <p className="event-description">{event.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
      
      {renderEventModal()}
    </div>
  );
};

export default CalendarScreen;