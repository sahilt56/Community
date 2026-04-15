import React from 'react';
import { Helmet } from 'react-helmet-async';
import { BookOpen, Users, Sparkles, TrendingUp, ShieldCheck, Zap } from 'lucide-react';
import logo from '../assets/logo.png';

const Blog = () => {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#030303] text-gray-900 dark:text-white transition-colors duration-300">
            <Helmet>
                <title>Vartalap Blog - Insights, Updates, and Community Stories</title>
                <meta name="description" content="Explore the Vartalap blog for the latest updates on the best Indian community platform. Learn about Vartalap (also known as Vartlap or Vartalp) and how it's revolutionizing student networking." />
                <meta name="keywords" content="Vartalap blog, Vartlap news, Vartalp updates, VARTALAP community, Indian forum blog, student networking insights" />
            </Helmet>

            {/* Hero Section */}
            <header className="relative py-16 md:py-24 overflow-hidden border-b border-gray-200 dark:border-[#1a1a1b] bg-white dark:bg-[#0a0a0b]">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none opacity-20 dark:opacity-30">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/30 rounded-full blur-[120px]"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/30 rounded-full blur-[120px]"></div>
                </div>

                <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-bold uppercase tracking-widest mb-6 animate-fade-in">
                        <Sparkles size={14} /> Official Blog
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 bg-linear-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-white dark:via-gray-300 dark:to-white bg-clip-text text-transparent">
                        Discover the Power of <span className="text-orange-500">Vartalap</span>
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed font-medium">
                        Your gateway to the latest news, expert insights, and community highlights from Vartalap—India's fastest-growing forum for students and professionals.
                    </p>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-16">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Main Content Areas */}
                    <div className="lg:col-span-2 space-y-16">
                        
                        {/* Featured Post */}
                        <article className="group cursor-pointer">
                            <div className="aspect-video rounded-3xl overflow-hidden mb-6 bg-gray-200 dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] relative">
                                <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent flex items-end p-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-white font-bold flex items-center gap-2">Read Article <TrendingUp size={18} /></span>
                                </div>
                                <div className="w-full h-full flex items-center justify-center text-6xl font-black text-gray-300 dark:text-gray-800">
                                    VARTALAP
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-xs font-bold text-orange-500 mb-3 uppercase tracking-wider">
                                <Zap size={14} /> Platform Update
                            </div>
                            <h2 className="text-3xl font-bold mb-4 group-hover:text-orange-500 transition-colors tracking-tight">
                                Why Vartalap is the Next Big Thing for Indian Communities
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                                Vartalap (often searched as Vartlap or Vartalp) is more than just a forum. It's a space where talent meets opportunity. In this post, we explore the core features that make Vartalap the best alternative to global platforms for the Indian audience...
                            </p>
                            <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                                <span>April 15, 2026</span> • <span>5 min read</span>
                            </div>
                        </article>

                        {/* SEO Sub-section */}
                        <section className="bg-white dark:bg-[#151516] p-8 md:p-12 rounded-[2.5rem] border border-gray-100 dark:border-[#262627] shadow-sm">
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                <ShieldCheck className="text-green-500" /> Connecting Students Across India
                            </h2>
                            <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 space-y-4">
                                <p>
                                    Whether you spell it <strong>Vartalap</strong>, <strong>Vartlap</strong>, or even <strong>Vartalp</strong>, the mission remains the same: democratizing knowledge. Our platform allows users to create communities, share posts, and engage in real-time chats.
                                </p>
                                <p>
                                    The <strong>VARTALAP</strong> experience is built on the concept of "Anubhav"—a karma system that rewards meaningful contributions. This ensures that only the most valuable content rises to the top, helping users find exactly what they need without the noise.
                                </p>
                            </div>
                        </section>

                    </div>

                    {/* Sidebar */}
                    <aside className="space-y-12">
                        {/* Search / Newsletter */}
                        <div className="bg-linear-to-br from-orange-500 to-red-600 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden group">
                           <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
                           <h3 className="text-xl font-bold mb-2 relative z-10">Stay Updated!</h3>
                           <p className="text-white/80 text-sm mb-6 relative z-10">Get the latest Vartalap stories delivered to your inbox.</p>
                           <div className="space-y-3 relative z-10">
                               <input type="email" placeholder="email@example.com" className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm placeholder:text-white/60 outline-none focus:bg-white/20 transition-all" />
                               <button className="w-full bg-white text-orange-600 font-bold py-2.5 rounded-xl text-sm hover:bg-orange-50 transition-colors shadow-lg">Subscribe</button>
                           </div>
                        </div>

                        {/* Categories */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 px-2">Top Categories</h3>
                            <div className="space-y-2">
                                {[
                                    { label: 'Platform News', count: 12 },
                                    { label: 'Community Spotlight', count: 8 },
                                    { label: 'Engineering', count: 5 },
                                    { label: 'User Stories', count: 14 }
                                ].map((cat) => (
                                    <button key={cat.label} className="w-full flex items-center justify-between px-4 py-3 rounded-2xl hover:bg-white dark:hover:bg-[#1a1a1b] border border-transparent hover:border-gray-100 dark:hover:border-[#343536] transition-all group">
                                        <span className="text-sm font-bold text-gray-600 dark:text-gray-400 group-hover:text-orange-500">{cat.label}</span>
                                        <span className="text-[10px] font-black bg-gray-100 dark:bg-[#272729] px-2 py-1 rounded-full">{cat.count}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Recent Posts Mini */}
                        <div className="space-y-6">
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 px-2">Trending on Vartalap</h3>
                            {[
                                "Mastering the Vartlap API",
                                "Vartalp: Designing for Scale",
                                "Building meaningful communities in 2026"
                            ].map((title, i) => (
                                <div key={i} className="flex gap-4 group cursor-pointer">
                                    <div className="w-12 h-12 shrink-0 bg-gray-100 dark:bg-[#1a1a1b] rounded-xl flex items-center justify-center font-bold text-gray-400 group-hover:text-orange-500 transition-colors border border-gray-100 dark:border-[#343536]">
                                        {i + 1}
                                    </div>
                                    <h4 className="text-sm font-bold leading-tight group-hover:text-orange-500 transition-colors">
                                        {title}
                                    </h4>
                                </div>
                            ))}
                        </div>
                    </aside>
                </div>
            </main>

            {/* CTA Section */}
            <section className="bg-white dark:bg-[#0a0a0b] py-20 border-t border-gray-200 dark:border-[#1a1a1b]">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <img src={logo} alt="Logo" className="w-16 h-16 mx-auto mb-8 opacity-50 grayscale hover:grayscale-0 transition-all" />
                    <h2 className="text-3xl md:text-5xl font-black mb-6 tracking-tight">Ready to join the conversation?</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-10 max-w-xl mx-auto">
                        Whether you know us as Vartalap, Vartlap, or Vartalp, you're welcome here. Build your tribe today.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button className="bg-linear-to-r from-orange-500 to-red-600 text-white font-bold px-8 py-4 rounded-full shadow-xl hover:shadow-orange-500/20 active:scale-95 transition-all">Get Started for Free</button>
                        <button className="bg-gray-100 dark:bg-[#1a1a1b] text-gray-900 dark:text-white font-bold px-8 py-4 rounded-full hover:bg-gray-200 dark:hover:bg-[#272729] active:scale-95 transition-all border border-gray-200 dark:border-[#343536]">Learn More</button>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Blog;
