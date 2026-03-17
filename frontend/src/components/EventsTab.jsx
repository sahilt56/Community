import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Calendar, MapPin, Users, Plus, Trash2, Clock, CheckCircle2 } from 'lucide-react';
import SkeletonLoader from './SkeletonLoader';

const EventsTab = ({ communityId, currentUser, isMod, isCreator }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const token = localStorage.getItem('token');
  const curUserId = currentUser?.id || currentUser?._id;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: '',
    time: '',
    location: ''
  });

  const fetchEvents = useCallback(async () => {
    try {
      const res = await api.get(`/api/events/community/${communityId}`);
      setEvents(res.data);
    } catch (err) {
      console.error("Error fetching events", err);
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!token) return toast.error("Please log in!");
    
    // Combine date and time
    const eventDateTime = new Date(`${formData.date}T${formData.time}`);
    
    try {
      await api.post('/api/events', {
        name: formData.name,
        description: formData.description,
        date: eventDateTime.toISOString(),
        location: formData.location,
        communityId
      });
      toast.success("Event created successfully! 🎉");
      setShowCreateModal(false);
      setFormData({ name: '', description: '', date: '', time: '', location: '' });
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create event");
    }
  };

  const handleRSVP = async (eventId) => {
    if (!token) return toast.error("Please log in to RSVP!");
    try {
      const res = await api.post(`/api/events/${eventId}/rsvp`);
      toast.success(res.data.message);
      // Update local state to reflect RSVP
      setEvents(prev => prev.map(ev => {
        if (ev._id === eventId) {
          const isAttending = ev.attendees.some(id => (typeof id === 'object' ? id._id : id) === curUserId);
          return {
            ...ev,
            attendees: isAttending 
              ? ev.attendees.filter(id => (typeof id === 'object' ? id._id : id) !== curUserId)
              : [...ev.attendees, curUserId]
          };
        }
        return ev;
      }));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to RSVP");
    }
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    try {
      await api.delete(`/api/events/${eventId}`);
      toast.success("Event deleted!");
      setEvents(prev => prev.filter(ev => ev._id !== eventId));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete event");
    }
  };

  if (loading) return <div className="mt-4"><SkeletonLoader /></div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] p-4 rounded-md shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Community Events</h2>
          <p className="text-sm text-gray-500">Discover and join upcoming events.</p>
        </div>
        {(isMod || isCreator) && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 bg-orange-500 text-white px-4 py-2 rounded-full font-bold text-sm hover:bg-orange-600 transition-colors shadow-md"
          >
            <Plus size={16} /> Create Event
          </button>
        )}
      </div>

      {showCreateModal && (
        <div className="bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] p-6 rounded-md shadow-sm mb-4 animate-fade-in relative">
          <button 
            onClick={() => setShowCreateModal(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >✕</button>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-[#343536] pb-3 mb-4">Host a New Event</h3>
          <form onSubmit={handleCreateEvent} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Event Name</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-gray-50 dark:bg-[#272729] border border-gray-300 dark:border-[#343536] text-gray-900 dark:text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-500" placeholder="e.g. Weekly Gaming Session" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Description (Optional)</label>
              <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-gray-50 dark:bg-[#272729] border border-gray-300 dark:border-[#343536] text-gray-900 dark:text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-500 min-h-[80px]" placeholder="What is this event about?" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Date</label>
                <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-gray-50 dark:bg-[#272729] border border-gray-300 dark:border-[#343536] text-gray-900 dark:text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Time</label>
                <input type="time" required value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full bg-gray-50 dark:bg-[#272729] border border-gray-300 dark:border-[#343536] text-gray-900 dark:text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Location / Link (Optional)</label>
              <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full bg-gray-50 dark:bg-[#272729] border border-gray-300 dark:border-[#343536] text-gray-900 dark:text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-500" placeholder="e.g. Discord server link or a physical location" />
            </div>
            <div className="flex justify-end mt-2">
              <button type="submit" className="bg-orange-500 text-white px-6 py-2 rounded-full font-bold text-sm hover:bg-orange-600 transition-colors shadow-md">Create Event</button>
            </div>
          </form>
        </div>
      )}

      {events.length === 0 ? (
        <div className="bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] p-10 rounded-md text-center">
          <Calendar size={48} className="mx-auto text-gray-300 dark:text-[#343536] mb-4" />
          <p className="text-gray-500 font-bold mb-1">No upcoming events.</p>
          <p className="text-sm text-gray-400">Be the first to host something for the community!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((ev) => {
            const isAttending = currentUser && ev.attendees.some(id => (typeof id === 'object' ? id._id : id) === curUserId);
            const canDelete = isMod || isCreator || (currentUser && ev.creator?._id === curUserId);
            const eventDate = new Date(ev.date);

            return (
              <div key={ev._id} className="bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] p-5 rounded-md shadow-sm relative group hover:border-orange-300 transition-colors">
                {canDelete && (
                  <button onClick={() => handleDelete(ev._id)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={16} />
                  </button>
                )}
                
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 pr-6">{ev.name}</h3>
                
                <div className="flex flex-col gap-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400 font-bold">
                    <Clock size={16} />
                    <span>{eventDate.toLocaleDateString()} at {eventDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  {ev.location && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <MapPin size={16} />
                      <span className="truncate">{ev.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Users size={16} />
                    <span>{ev.attendees?.length || 0} attending</span>
                  </div>
                </div>

                {ev.description && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 bg-gray-50 dark:bg-[#272729] p-2 rounded">
                    {ev.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-[#343536]">
                  <p className="text-[11px] text-gray-400">
                    Hosted by <span className="font-bold text-gray-500 dark:text-gray-300">u/{ev.creator?.username || 'user'}</span>
                  </p>
                  
                  <button 
                    onClick={() => handleRSVP(ev._id)}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full font-bold text-xs transition-colors ${
                      isAttending 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-200 dark:hover:bg-green-900/50' 
                        : 'bg-gray-100 dark:bg-[#272729] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#343536] hover:bg-gray-200 dark:hover:bg-[#343536] hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {isAttending ? <><CheckCircle2 size={14} /> Attending</> : 'RSVP Here'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EventsTab;
