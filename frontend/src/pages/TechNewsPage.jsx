import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import TechNewsFeed from '../components/TechNewsFeed';
import { Newspaper, Globe, Cpu, Code, MapPin } from 'lucide-react';

const categories = [
    { id: 'all', label: 'For You', icon: Newspaper },
    { id: 'india', label: 'India Tech', icon: MapPin },
    { id: 'ai', label: 'AI & ML', icon: Cpu },
    { id: 'programming', label: 'Programming', icon: Code },
    { id: 'global', label: 'Global Tech', icon: Globe }
];

const TechNewsPage = () => {
    const [activeCategory, setActiveCategory] = useState('all');

    const handleCategoryClick = (e, categoryId) => {
        setActiveCategory(categoryId);
        // Auto-scroll the clicked tab to the center of the scroll container
        e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    };

    return (
        <div className="w-full flex justify-center pb-20">
            <Helmet>
                <title>Tech News - Vartalap</title>
                <meta name="description" content="Stay updated with the latest tech news, AI trends, programming updates, and India tech news on Vartalap." />
            </Helmet>

            <div className="w-full max-w-4xl px-2 sm:px-0">
                {/* Header Section */}
                <div className="mb-6 mt-4 animate-fade-up">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 bg-orange-100 dark:bg-orange-500/10 rounded-xl">
                            <Newspaper size={24} className="text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white leading-tight">
                                Tech News Hub
                            </h1>
                            <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 font-medium">
                                Your daily dose of tech, AI, and developer news.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Category Navigation */}
                <div className="mb-8 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                    <div className="flex items-center gap-2 pb-2">
                        {categories.map((category) => {
                            const Icon = category.icon;
                            const isActive = activeCategory === category.id;
                            return (
                                <button
                                    key={category.id}
                                    onClick={(e) => handleCategoryClick(e, category.id)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-sm transition-all whitespace-nowrap active:scale-95 border ${
                                        isActive
                                            ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                                            : 'bg-white dark:bg-[#1a1a1b] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-[#343536] hover:bg-gray-50 dark:hover:bg-[#272729] hover:border-gray-300 dark:hover:border-gray-500'
                                    }`}
                                >
                                    <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                                    {category.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Feed Section */}
                <div className="min-h-[500px]">
                    <TechNewsFeed category={activeCategory} />
                </div>
            </div>
        </div>
    );
};

export default TechNewsPage;
