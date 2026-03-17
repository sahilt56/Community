import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import api from '../api';

const CreateAnnouncementModal = ({ onClose, onSuccess }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!title.trim() || !content.trim()) {
            return toast.error("Title and Content are required.");
        }

        setIsSubmitting(true);
        try {
            await api.post('/api/system-messages', {
                title: title.trim(),
                content: content.trim()
            });
            toast.success("Announcement broadcasted successfully!");
            onSuccess();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to broadcast message.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return createPortal(
        <div id="announcement-modal-root" className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#1a1a1b] w-full max-w-lg rounded-xl shadow-2xl border border-gray-200 dark:border-[#343536] overflow-hidden flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-[#343536] bg-orange-50 dark:bg-orange-900/10">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <AlertCircle className="text-orange-500" size={20} />
                        New Global Announcement
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4 overflow-y-auto max-h-[85vh]">
                    <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-3 rounded-lg text-sm border border-blue-100 dark:border-blue-900/50 flex items-start gap-2">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <p>This message will be sent to <strong>all users</strong> on the platform immediately. Use this for major feature updates or important notices.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-[#272729] border border-gray-300 dark:border-[#343536] rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder:text-gray-400"
                            placeholder="e.g. New Feature: Voice Parties Available!"
                            maxLength={100}
                            required
                        />
                    </div>

                    <div className="flex flex-col flex-1 min-h-[250px] mb-4">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Message Content</label>
                        <div className="flex-1 overflow-hidden flex flex-col announcement-quill-wrapper">
                            <ReactQuill 
                                theme="snow" 
                                value={content} 
                                onChange={setContent}
                                placeholder="Type the full announcement details here... (You can use bold, italics, links, etc.)"
                                className="h-[200px]"
                                modules={{
                                    toolbar: [
                                        [{ 'header': [1, 2, 3, false] }],
                                        ['bold', 'italic', 'underline', 'strike'],
                                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                                        ['link', 'clean']
                                    ]
                                }}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-2 mt-2 border-t border-gray-100 dark:border-[#343536] gap-3">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#272729] rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting || !title.trim() || !content.trim()}
                            className="px-4 py-2 text-sm font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                        >
                            {isSubmitting ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                <Send size={16} />
                            )}
                            Broadcast
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default CreateAnnouncementModal;
