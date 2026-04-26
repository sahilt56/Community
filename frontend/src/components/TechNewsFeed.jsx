import React, { useEffect, useState } from 'react';
import api from '../api';
import { Newspaper, MessageCircle, ArrowUp, ArrowDown, Share2, Clock, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import SkeletonLoader from './SkeletonLoader';

const TechNewsFeed = ({ category = 'all' }) => {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNews = async () => {
            setLoading(true);
            try {
                const res = await api.get('/api/tech-news', { params: { category } });
                setNews(res.data);
            } catch (err) {
                console.error('Error fetching tech news:', err);
                toast.error('Failed to load tech news.');
            } finally {
                setLoading(false);
            }
        };
        fetchNews();
    }, [category]);

    const handleShare = (url) => {
        navigator.clipboard.writeText(url).then(() => {
            toast.success('Link copied! 📋');
        }).catch(err => console.error(err));
    };

    if (loading) return (
        <div className="flex flex-col gap-4">
            {[1, 2, 3].map(i => <SkeletonLoader key={i} />)}
        </div>
    );

    if (news.length === 0) return (
        <div className="text-center py-12 bg-white dark:bg-[#1a1a1b] rounded-xl border border-gray-100 dark:border-[#343536]">
            <p className="text-gray-500">No tech news found.</p>
        </div>
    );

    return (
        <div className="flex flex-col gap-4 animate-fade-up">
            {news.map((article, index) => (
                <div 
                    key={article.id} 
                    className="bg-white dark:bg-[#1a1a1b] border border-gray-100 dark:border-[#343536] rounded-xl overflow-hidden hover:shadow-md transition-all duration-300"
                    style={{ animationDelay: `${index * 50}ms` }}
                >
                    <div className="flex flex-col sm:flex-row">
                        {/* Article Image - Adjusted for mobile */}
                        {article.coverImage && (
                            <div className="sm:w-32 md:w-48 lg:w-64 h-40 sm:h-auto shrink-0 relative">
                                <img 
                                    src={article.coverImage} 
                                    alt={article.title}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                                <div className="absolute top-2 left-2 sm:hidden">
                                    <span className="px-2 py-0.5 bg-orange-600 text-white text-[9px] font-bold rounded uppercase">
                                        {article.source}
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="flex-1 p-4 flex flex-col">
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                    <img src={article.author.profileImage} alt="" className="w-5 h-5 rounded-full" />
                                    <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                                        {article.author.username} • {new Date(article.publishedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                                <span className="hidden sm:block text-[9px] font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded uppercase">
                                    {article.source}
                                </span>
                            </div>

                            <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight mb-2 hover:text-orange-500 transition-colors">
                                <a href={article.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-1">
                                    {article.title}
                                </a>
                            </h3>

                            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                                {article.description}
                            </p>

                            <div className="flex flex-wrap gap-1 mb-4">
                                {article.tags.slice(0, 3).map(tag => (
                                    <span key={tag} className="text-[9px] font-bold text-gray-400 bg-gray-100 dark:bg-[#272729] px-1.5 py-0.5 rounded">
                                        #{tag}
                                    </span>
                                ))}
                            </div>

                            <div className="mt-auto flex items-center justify-between border-t border-gray-50 dark:border-[#272729] pt-3">
                                <div className="flex items-center justify-end w-full gap-2">
                                    <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                                        <Clock size={10} /> {article.readingTime}m
                                    </span>
                                    <button onClick={() => handleShare(article.url)} className="p-1 hover:bg-gray-100 dark:hover:bg-[#272729] rounded-full">
                                        <Share2 size={14} className="text-gray-400" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default TechNewsFeed;
