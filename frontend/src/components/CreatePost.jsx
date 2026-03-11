import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Helper: Check if a file/preview is a video (MIME type + extension fallback)
const isVideoFile = (fileOrPreview) => {
  const type = fileOrPreview.type || '';
  const name = fileOrPreview.name || '';
  if (type.startsWith('video/')) return true;
  // Fallback: check extension when MIME type is missing/empty
  const ext = name.split('.').pop().toLowerCase();
  return ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext);
};

const CreatePost = ({ onPostCreated }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]); // Array for multiple files
  const [previews, setPreviews] = useState([]); // Array for multiple previews
  const [communities, setCommunities] = useState([]);
  const [selectedCommunity, setSelectedCommunity] = useState('');
  
  // FIX: Replaced Date.now() with a simple number state to keep the component pure
  const [fileInputKey, setFileInputKey] = useState(0); 
  const [postType, setPostType] = useState('text'); // 'text', 'media', 'link'
  const [link, setLink] = useState('');

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const res = await axios.get(`${apiUrl}/api/communities`);
        setCommunities(res.data);
        if (res.data.length > 0) {
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
      alert("Ek post mein max 13 images hi allow hain! 📸🛑");
      setFileInputKey(prev => prev + 1); // FIX: Incremented state instead of Date.now()
      return;
    }
    if (videoCount > 3) {
      alert("Ek post mein max 3 videos hi allow hain! 🎬🛑");
      setFileInputKey(prev => prev + 1);
      return;
    }

    // Video size check: Max 5MB per video
    const oversizedVideo = selectedFiles.find(f => isVideoFile(f) && f.size > 5 * 1024 * 1024);
    if (oversizedVideo) {
      alert(`Video "${oversizedVideo.name}" ka size ${(oversizedVideo.size / (1024 * 1024)).toFixed(1)}MB hai. Max 5MB allowed! 🎬🛑`);
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
    if (!selectedCommunity) {
      alert("Please select a community first!");
      return;
    }

    if (postType === 'link' && !link.trim()) {
      alert("Please enter a valid URL for the link post!");
      return;
    }

    const token = localStorage.getItem('token');
    
    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    formData.append('communityId', selectedCommunity);
    formData.append('postType', postType);
    formData.append('link', link);
    
    // Append all media files
    if (postType === 'media') {
      files.forEach(file => {
        formData.append('media', file);
      });
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.post(`${apiUrl}/api/posts/create`, 
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          } 
        }
      );
      setTitle('');
      setContent('');
      setFiles([]);
      setPreviews([]);
      setLink('');
      setFileInputKey(prev => prev + 1); // FIX: Incremented state instead of Date.now()
      alert(`Post Created (${postType})! 🚀✨`);
      onPostCreated(); 
    } catch (err) {
      console.error("Post creation error:", err);
      alert(err.response?.data?.message || "Error creating post");
    }
  };

  return (
    <div className="bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-md mb-6 shadow-lg overflow-hidden transition-colors">
      {/* Post Type Tabs */}
      <div className="flex border-b border-gray-200 dark:border-[#343536] transition-colors overflow-x-auto no-scrollbar">
        <button 
          type="button"
          onClick={() => setPostType('text')}
          className={`flex-1 min-w-20 py-3 text-xs md:text-sm font-bold flex items-center justify-center gap-1 md:gap-2 transition-all ${postType === 'text' ? 'text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white bg-gray-50 dark:bg-white/5' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-[#272729]'}`}
        >
          <span className="text-sm md:text-base">📝</span> <span className="whitespace-nowrap">Post</span>
        </button>
        <button 
          type="button"
          onClick={() => setPostType('media')}
          className={`flex-1 min-w-30 py-3 text-xs md:text-sm font-bold flex items-center justify-center gap-1 md:gap-2 transition-all ${postType === 'media' ? 'text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white bg-gray-50 dark:bg-white/5' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-[#272729]'}`}
        >
          <span className="text-sm md:text-base">🖼️</span> <span className="whitespace-nowrap">Images & Video</span>
        </button>
        <button 
          type="button"
          onClick={() => setPostType('link')}
          className={`flex-1 min-w-20 py-3 text-xs md:text-sm font-bold flex items-center justify-center gap-1 md:gap-2 transition-all ${postType === 'link' ? 'text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white bg-gray-50 dark:bg-white/5' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-[#272729]'}`}
        >
          <span className="text-sm md:text-base">🔗</span> <span className="whitespace-nowrap">Link</span>
        </button>
      </div>

      <div className="p-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-3 md:gap-4">
            <select 
              value={selectedCommunity} 
              onChange={(e) => setSelectedCommunity(e.target.value)}
              className="w-full md:w-auto bg-gray-50 dark:bg-[#272729] text-gray-900 dark:text-white border border-gray-300 dark:border-[#343536] px-4 py-2.5 md:py-2 rounded-md outline-none focus:border-orange-500 dark:focus:border-gray-500 cursor-pointer text-sm font-bold min-w-37.5 transition-colors"
              required
            >
              {communities.length === 0 && <option value="" disabled>Select Community</option>}
              {communities.map(c => (
                <option key={c._id} value={c._id}>r/{c.name}</option>
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
            <textarea 
              placeholder="Text (optional)" 
              value={content}
              className="bg-gray-50 dark:bg-[#272729] text-gray-900 dark:text-white border border-gray-300 dark:border-[#343536] p-3 rounded h-48 outline-none focus:border-orange-500 dark:focus:border-gray-500 resize-none transition-all"
              onChange={(e) => setContent(e.target.value)}
            />
          )}

          {postType === 'link' && (
            <textarea 
              placeholder="Url" 
              value={link}
              className="bg-gray-50 dark:bg-[#272729] text-gray-900 dark:text-white border border-gray-300 dark:border-[#343536] p-3 rounded h-20 outline-none focus:border-orange-500 dark:focus:border-gray-500 resize-none transition-all overflow-hidden"
              onChange={(e) => setLink(e.target.value)}
              required
            />
          )}

          {postType === 'media' && (
            <div className="flex flex-col gap-4 min-h-37.5 border-2 border-dashed border-gray-300 dark:border-[#343536] rounded-md items-center justify-center p-6 bg-gray-50 dark:bg-[#272729]/30 relative transition-colors">
              <input 
                key={fileInputKey}
                type="file" 
                accept="image/*,video/*"
                multiple
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-2 pointer-events-none">
                <span className="text-4xl">📁</span>
                <p className="text-gray-500 dark:text-gray-400 font-bold">Drag and drop or click to upload</p>
                <p className="text-gray-400 dark:text-gray-500 text-xs text-center">Images (max 13) and Videos (max 3, 5MB each)</p>
              </div>

              {files.length > 0 && (
                <div className="flex gap-3 text-xs font-bold mt-4">
                  <span className="text-blue-500 dark:text-blue-400">📸 {files.filter(f => !isVideoFile(f)).length}/13 Images</span>
                  <span className="text-purple-500 dark:text-purple-400">🎬 {files.filter(f => isVideoFile(f)).length}/3 Videos</span>
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
              onClick={() => onPostCreated()} 
              className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white font-bold py-2 px-6 rounded-full transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="bg-gray-900 dark:bg-white text-white dark:text-black font-bold py-2 px-8 rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 transition-all shadow-md"
            >
              Post
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePost;