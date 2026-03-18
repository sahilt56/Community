import React, { useState, useEffect } from 'react'; // FIX: Hooks import kiye gaye hain
import api from '../api';
import toast from 'react-hot-toast';
import TipTapEditor from './TipTapEditor';
import { FileText, Image, Link as LinkIcon, UploadCloud, Camera, Film, Home, BarChart2, Plus, Trash2 } from 'lucide-react';

const isVideoFile = (fileOrPreview) => {
  const type = fileOrPreview.type || '';
  const name = fileOrPreview.name || '';
  if (type.startsWith('video/')) return true;
  // Fallback: check extension when MIME type is missing/empty
  const ext = name.split('.').pop().toLowerCase();
  return ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext);
};

const CreatePost = ({ onPostCreated, preselectedCommunityId, initialType }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]); // Array for multiple files
  const [previews, setPreviews] = useState([]); // Array for multiple previews
  const [communities, setCommunities] = useState([]);
  const [selectedCommunity, setSelectedCommunity] = useState('');
  
  // FIX: Replaced Date.now() with a simple number state to keep the component pure
  const [fileInputKey, setFileInputKey] = useState(0); 
  const [postType, setPostType] = useState(initialType || 'text'); // 'text', 'media', 'link', 'poll'
  const [link, setLink] = useState('');
  
  // Track files added directly into the TipTap Editor via local blobs
  const [pendingEditorFiles, setPendingEditorFiles] = useState([]);
  const [isCreating, setIsCreating] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem('user'));
  const curUserId = currentUser?.id || currentUser?._id;

  // Poll state
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollDurationDays, setPollDurationDays] = useState(3);

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const res = await api.get('/api/communities/joined'); // Fetch only joined communities
        setCommunities(res.data);
        if (preselectedCommunityId) {
          const found = res.data.find(c => c._id === preselectedCommunityId);
          if (found) setSelectedCommunity(found._id);
          else if (res.data.length > 0) setSelectedCommunity(res.data[0]._id);
        } else if (res.data.length > 0) {
          setSelectedCommunity(res.data[0]._id);
        }
      } catch (err) {
        console.error("Error fetching communities", err);
      }
    };
    fetchCommunities();
  }, []);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    // Combine existing + new files for validation
    const allFiles = [...files, ...selectedFiles];
    const imageCount = allFiles.filter(f => !isVideoFile(f)).length;
    const videoCount = allFiles.filter(f => isVideoFile(f)).length;

    // Max 13 images + Max 3 videos
    if (imageCount > 13) {
      toast.error("Maximum 13 images allowed per post!");
      setFileInputKey(prev => prev + 1); // FIX: Incremented state instead of Date.now()
      return;
    }
    if (videoCount > 3) {
      toast.error("Maximum 3 videos allowed per post!");
      setFileInputKey(prev => prev + 1);
      return;
    }

    // Video size check: Max 10MB per video
    const oversizedVideo = selectedFiles.find(f => isVideoFile(f) && f.size > 10 * 1024 * 1024);
    if (oversizedVideo) {
      toast.error(`Video "${oversizedVideo.name}" is too large. Max 10MB allowed!`);
      setFileInputKey(prev => prev + 1);
      return;
    }

    // Image size check: Max 5MB per image
    const oversizedImage = selectedFiles.find(f => !isVideoFile(f) && f.size > 5 * 1024 * 1024);
    if (oversizedImage) {
      toast.error(`Image "${oversizedImage.name}" is too large. Max 5MB allowed!`);
      setFileInputKey(prev => prev + 1);
      return;
    }

    // Build previews — store name too for fallback detection
    const newPreviews = [...previews, ...selectedFiles.map(file => ({
      url: URL.createObjectURL(file),
      type: file.type || '',
      name: file.name || ''
    }))];

    setFiles(allFiles);
    setPreviews(newPreviews);
  };

  const removeFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    
    // Revoke URL to avoid memory leaks
    URL.revokeObjectURL(previews[index].url);
    
    setFiles(newFiles);
    setPreviews(newPreviews);
    setFileInputKey(prev => prev + 1); // FIX: Incremented state instead of Date.now()
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isCreating) return;
    
    if (!selectedCommunity) {
      toast.error("Please select a community first!");
      return;
    }

    if (postType === 'link' && !link.trim()) {
      toast.error("Please enter a valid URL for the link post!");
      return;
    }

    if (postType === 'poll') {
      const filledOptions = pollOptions.filter(opt => opt.trim());
      if (filledOptions.length < 2) {
        toast.error("Please provide at least 2 options for your poll!");
        return;
      }
    }

    setIsCreating(true);
    let finalContent = content;

    // --- LAZY UPLOAD EDITOR FILES ---
    if (postType === 'text') {
      const filesToUpload = pendingEditorFiles.filter(item => finalContent.includes(item.url));
      if (filesToUpload.length > 0) {
        const loadingId = toast.loading('Uploading media inside post...');
        try {
          for (const item of filesToUpload) {
            if (!item.file) {
              console.warn("Warning: item.file is missing for", item.url);
              continue;
            }
            const fd = new FormData();
            fd.append('media', item.file);
            const res = await api.post('/api/upload', fd);
            const realUrl = res.data.url.startsWith('http') ? res.data.url : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${res.data.url}`;
            finalContent = finalContent.split(item.url).join(realUrl);
          }
          toast.success('Media embedded successfully!', { id: loadingId });
        } catch (err) {
          console.error("Editor upload error:", err.response?.data || err);
          toast.error("Failed to upload media inside the post.", { id: loadingId });
          setIsCreating(false);
          return; // Abort submission
        }
      }
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', (postType === 'text' || postType === 'poll') ? finalContent : '');
    formData.append('communityId', selectedCommunity);
    formData.append('postType', postType);
    formData.append('link', postType === 'link' ? link : '');
    
    if (postType === 'poll') {
      const validOptions = pollOptions.filter(opt => opt.trim());
      formData.append('pollOptions', JSON.stringify(validOptions));
      formData.append('pollDurationDays', pollDurationDays);
    }
    
    // Append all media files
    if (postType === 'media') {
      files.forEach(file => {
        formData.append('media', file);
      });
    }

    const loadingId = toast.loading('Uploading media and creating post, please wait...');
    try {
      await api.post('/api/posts/create', formData);
      setTitle('');
      setContent('');
      setFiles([]);
      setPreviews([]);
      setLink('');
      setPendingEditorFiles([]);
      setPollOptions(['', '']);
      setPollDurationDays(3);
      setFileInputKey(prev => prev + 1); // FIX: Incremented state instead of Date.now()
      toast.success(`Post Created Successfully!`, { id: loadingId });
      onPostCreated(); 
    } catch (err) {
      console.error("Post creation error:", err);
      toast.error(err.response?.data?.error || err.response?.data?.message || "Error creating post", { id: loadingId });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-md mb-6 shadow-lg overflow-hidden transition-colors">
      
      {/* 🛑 Empty State if no communities joined */}
      {communities.length === 0 ? (
        <div className="p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
          <Home size={48} strokeWidth={1.5} className="text-gray-400 dark:text-gray-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">You haven't joined any communities yet!</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
            To create a post, you need to be a member of at least one community. Join a community that interests you to start sharing your thoughts!
          </p>
        </div>
      ) : (
        <>
          {/* Post Type Tabs */}      {!initialType && (
      <div className="flex border-b border-gray-200 dark:border-[#343536] transition-colors overflow-x-auto no-scrollbar">
        <button 
          type="button"
          onClick={() => setPostType('text')}
          className={`flex-1 min-w-20 py-3 text-xs md:text-sm font-bold flex items-center justify-center gap-1 md:gap-2 transition-all ${postType === 'text' ? 'text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white bg-gray-50 dark:bg-white/5' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-[#272729]'}`}
        >
          <FileText size={18} /> <span className="whitespace-nowrap">Post</span>
        </button>
        <button 
          type="button"
          onClick={() => setPostType('media')}
          className={`flex-1 min-w-30 py-3 text-xs md:text-sm font-bold flex items-center justify-center gap-1 md:gap-2 transition-all ${postType === 'media' ? 'text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white bg-gray-50 dark:bg-white/5' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-[#272729]'}`}
        >
          <Image size={18} /> <span className="whitespace-nowrap">Images & Video</span>
        </button>
        <button 
          type="button"
          onClick={() => setPostType('link')}
          className={`flex-1 min-w-20 py-3 text-xs md:text-sm font-bold flex items-center justify-center gap-1 md:gap-2 transition-all ${postType === 'link' ? 'text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white bg-gray-50 dark:bg-white/5' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-[#272729]'}`}
        >
          <LinkIcon size={18} /> <span className="whitespace-nowrap">Link</span>
        </button>
        {(() => {
          const currentComm = communities.find(c => c._id === selectedCommunity);
          const isAdmin = currentComm && (
            currentComm.creator === curUserId ||
            (currentComm.moderators && currentComm.moderators.includes(curUserId))
          );
          if (!isAdmin) return null;
          return (
            <button 
              type="button"
              onClick={() => setPostType('poll')}
              className={`flex-1 min-w-20 py-3 text-xs md:text-sm font-bold flex items-center justify-center gap-1 md:gap-2 transition-all ${postType === 'poll' ? 'text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white bg-gray-50 dark:bg-white/5' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-[#272729]'}`}
            >
              <BarChart2 size={18} /> <span className="whitespace-nowrap">Poll</span>
            </button>
          );
        })()}
      </div>
      )}

      <div className="p-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-3 md:gap-4">
            <select 
              value={selectedCommunity} 
              onChange={(e) => {
                const newCommId = e.target.value;
                setSelectedCommunity(newCommId);
                const currentComm = communities.find(c => c._id === newCommId);
                const isAdmin = currentComm && (
                  currentComm.creator === curUserId ||
                  (currentComm.moderators && currentComm.moderators.includes(curUserId))
                );
                if (postType === 'poll' && !isAdmin) {
                  setPostType('text');
                }
              }}
              className="w-full md:w-auto bg-gray-50 dark:bg-[#272729] text-gray-900 dark:text-white border border-gray-300 dark:border-[#343536] px-4 py-2.5 md:py-2 rounded-md outline-none focus:border-orange-500 dark:focus:border-gray-500 cursor-pointer text-sm font-bold min-w-37.5 transition-colors"
              required
            >
              {communities.length === 0 && <option value="" disabled>Select Community</option>}
              {communities.map(c => (
                <option key={c._id} value={c._id}>v/{c.name}</option>
              ))}
            </select>
            <input 
              type="text" 
              placeholder="Title" 
              value={title}
              className="flex-1 bg-gray-50 dark:bg-[#272729] text-gray-900 dark:text-white border border-gray-300 dark:border-[#343536] p-2.5 rounded outline-none focus:border-orange-500 dark:focus:border-gray-500 transition-all font-bold text-sm md:text-base"
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {postType === 'text' && (
            <div className="border border-gray-200 dark:border-[#343536] rounded-xl overflow-hidden shadow-sm transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 bg-white dark:bg-[#1a1a1b] min-h-[12rem] sm:min-h-[16rem] h-auto resize-none sm:resize-y flex flex-col">
              <TipTapEditor
                value={content}
                onChange={setContent}
                onPendingFile={(file, url) => setPendingEditorFiles(prev => [...prev, { file, url }])}
                placeholder="Write your post content here... (Supports Markdown ✨)"
                minHeight="100%"
              />
            </div>
          )}

          {postType === 'link' && (
            <input 
              type="url"
              placeholder="https://example.com" 
              value={link}
              className="bg-gray-50 dark:bg-[#272729] text-gray-900 dark:text-white border border-gray-300 dark:border-[#343536] p-3 rounded outline-none focus:border-orange-500 dark:focus:border-gray-500 transition-all overflow-hidden w-full font-medium"
              onChange={(e) => setLink(e.target.value)}
              required
            />
          )}

          {postType === 'poll' && (
            <div className="flex flex-col gap-3">
              <TipTapEditor
                value={content}
                onChange={setContent}
                onPendingFile={() => {}} // Usually polls don't have images in body, but supported
                placeholder="Ask your community a question..."
                minHeight="100px"
              />
              <div className="bg-gray-50 dark:bg-[#272729] rounded-lg border border-gray-300 dark:border-[#343536] p-4 mt-2">
                <p className="font-bold text-gray-900 dark:text-white mb-3 text-sm">Poll Options</p>
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex gap-2 mb-2 items-center">
                    <input 
                      type="text" 
                      placeholder={`Option ${idx + 1}`} 
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...pollOptions];
                        newOpts[idx] = e.target.value;
                        setPollOptions(newOpts);
                      }}
                      className="flex-1 bg-white dark:bg-[#1a1a1b] text-sm text-gray-900 dark:text-white border border-gray-300 dark:border-[#343536] p-2.5 rounded outline-none focus:border-orange-500 dark:focus:border-gray-500 transition-all font-medium"
                    />
                    {pollOptions.length > 2 && (
                      <button 
                        type="button" 
                        onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                        className="text-gray-400 hover:text-red-500 transition-colors p-2"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 6 && (
                  <button 
                    type="button"
                    onClick={() => setPollOptions([...pollOptions, ''])}
                    className="flex items-center gap-1.5 text-sm font-bold text-orange-600 dark:text-orange-400 mt-2 hover:bg-orange-50 dark:hover:bg-orange-900/20 px-3 py-1.5 rounded-full transition-colors"
                  >
                    <Plus size={16} /> Add Option
                  </button>
                )}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-[#343536] flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Poll Duration</span>
                  <select 
                    value={pollDurationDays}
                    onChange={(e) => setPollDurationDays(Number(e.target.value))}
                    className="bg-white dark:bg-[#1a1a1b] text-xs text-gray-900 dark:text-white border border-gray-300 dark:border-[#343536] p-2 rounded outline-none w-32 font-bold cursor-pointer"
                  >
                    <option value={1}>1 Day</option>
                    <option value={2}>2 Days</option>
                    <option value={3}>3 Days</option>
                    <option value={5}>5 Days</option>
                    <option value={7}>7 Days</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {postType === 'media' && (
            <div className="group flex flex-col gap-4 min-h-40 border-2 border-dashed border-gray-300 dark:border-[#343536] hover:border-orange-500 dark:hover:border-orange-500 rounded-2xl items-center justify-center p-8 bg-gray-50 dark:bg-[#272729]/30 hover:bg-orange-50/50 dark:hover:bg-orange-500/10 relative transition-all duration-300 cursor-pointer overflow-hidden">
              <input 
                key={fileInputKey}
                type="file" 
                accept="image/*,video/*"
                multiple
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="flex flex-col items-center gap-3 pointer-events-none z-0">
                <div className="p-3 bg-white dark:bg-[#1a1a1b] rounded-full shadow-sm group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300 group-hover:shadow-md border border-gray-200 dark:border-[#343536]">
                  <UploadCloud size={32} strokeWidth={2.5} className="text-gray-400 dark:text-gray-500 group-hover:text-orange-500 transition-colors" />
                </div>
                <div className="text-center">
                  <p className="text-gray-700 dark:text-gray-300 font-bold text-sm mb-1">Click or drag & drop files here</p>
                  <p className="text-gray-400 dark:text-gray-500 text-[11px] uppercase tracking-wider font-bold">Images (max 13) • Videos (max 3, 10MB)</p>
                </div>
              </div>

              {files.length > 0 && (
            <div className="flex gap-4 text-xs font-bold mt-4">
              <span className="text-blue-500 dark:text-blue-400 flex items-center gap-1.5"><Camera size={14} /> {files.filter(f => !isVideoFile(f)).length}/13 Images</span>
              <span className="text-purple-500 dark:text-purple-400 flex items-center gap-1.5"><Film size={14} /> {files.filter(f => isVideoFile(f)).length}/3 Videos</span>
                </div>
              )}

              {previews.length > 0 && (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3 w-full mt-4">
                  {previews.map((prev, index) => {
                    const isVideo = isVideoFile(prev);
                    return (
                      <div key={index} className="relative aspect-square rounded-md overflow-hidden border border-gray-300 dark:border-[#343536] bg-black/10 dark:bg-black/40 group">
                        {isVideo ? (
                          <video src={prev.url} muted playsInline className="w-full h-full object-cover" />
                        ) : (
                          <img src={prev.url} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                        )}
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                          className="absolute top-1 right-1 bg-black/70 text-white w-5 h-5 rounded-full flex items-center justify-center hover:bg-red-600 transition-all border border-white/10 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-[#343536] transition-colors">
            <button 
              type="button" 
              disabled={isCreating}
              onClick={() => onPostCreated()} 
              className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white font-bold py-2 px-6 rounded-full transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isCreating}
              className="bg-gray-900 dark:bg-white text-white dark:text-black font-bold py-2 px-8 rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isCreating ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black animate-spin"></span>
                  Posting...
                </>
              ) : (
                "Post"
              )}
            </button>
          </div>
        </form>
      </div>
      </>
      )}
    </div>
  );
};

export default CreatePost;