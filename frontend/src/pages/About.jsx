import React from 'react';
import { featuresData, platformStats } from '../data/featuresData';
import { Globe, Heart, Sparkles, MessageCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const About = () => {
    return (
        <div className="min-h-screen bg-[#f0f2f5] dark:bg-[#030303] transition-colors pb-20">
            <Helmet>
                <title>About Vartalap | Our Mission & Features</title>
                <meta name="description" content="Discover what Vartalap is all about. Explore our features like communities, real-time chat, Anubhav system, and our mission to connect students and professionals." />
            </Helmet>

            {/* Hero Section */}
            <header className="relative py-16 md:py-24 overflow-hidden border-b border-gray-200 dark:border-[#1a1a1b] bg-white dark:bg-[#1a1a1b]">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-linear-to-bl from-orange-500/5 to-transparent pointer-events-none"></div>
                <div className="max-w-5xl mx-auto px-4 relative z-10 text-center md:text-left">
                    <div className="inline-flex items-center gap-2 bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-6 animate-fade-in">
                        <Sparkles size={14} /> The Future of Connection
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tight leading-tight">
                        What is <span className="text-transparent bg-clip-text bg-linear-to-r from-orange-500 to-red-600">Vartalap</span>?
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
                        {platformStats.mission}
                    </p>
                    <div className="mt-10 flex flex-wrap gap-4 justify-center md:justify-start">
                        <Link to="/explore" className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3 rounded-full shadow-lg transition-all transform hover:scale-105 btn-press">
                            Explore Now
                        </Link>
                        <a href="mailto:vartalapsupport@gmail.com" className="bg-white dark:bg-transparent border border-gray-300 dark:border-[#343536] text-gray-900 dark:text-white font-bold px-8 py-3 rounded-full hover:bg-gray-50 dark:hover:bg-[#272729] transition-all btn-press">
                            Contact Us
                        </a>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-4 py-16">
                
                {/* Features Section */}
                <section className="mb-24">
                    <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-12">
                        <div className="text-center md:text-left">
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Core Features</h2>
                            <p className="text-gray-500 dark:text-gray-400">Everything you need to build and grow your community.</p>
                        </div>
                        <div className="hidden md:block h-px flex-1 bg-gray-200 dark:bg-[#1a1a1b] mx-8 mb-4"></div>
                        <div className="bg-orange-500/10 text-orange-600 dark:text-orange-400 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                            <Globe size={18} /> Built for Everyone
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {featuresData.map((feature, idx) => {
                            const Icon = feature.icon;
                            return (
                                <div 
                                    key={feature.id} 
                                    className="group bg-white dark:bg-[#1a1a1b] p-8 rounded-2xl border border-gray-200 dark:border-[#1a1a1b] hover:border-orange-500/50 dark:hover:border-orange-500/50 transition-all duration-300 shadow-sm hover:shadow-xl animate-fade-up"
                                    style={{ animationDelay: `${idx * 100}ms` }}
                                >
                                    <div className={`w-14 h-14 ${feature.bgColor} ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                                        <Icon size={28} strokeWidth={2.5} />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-orange-500 transition-colors">
                                        {feature.title}
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-6">
                                        {feature.description}
                                    </p>
                                    <div className="pt-4 border-t border-gray-100 dark:border-[#272729]">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Use Case</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                                            "{feature.useCase}"
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* vision Section */}
                <section className="bg-linear-to-r from-orange-600 to-red-600 rounded-3xl p-8 md:p-16 text-white overflow-hidden relative shadow-2xl mb-24">
                   <div className="absolute top-0 right-0 p-8 opacity-10 transform scale-150 rotate-12">
                       <Sparkles size={200} />
                   </div>
                   <div className="relative z-10 max-w-2xl">
                       <h2 className="text-3xl md:text-4xl font-extrabold mb-6">Our Vision</h2>
                       <p className="text-xl md:text-2xl text-white/90 leading-relaxed font-light mb-8 italic">
                           "{platformStats.vision}"
                       </p>
                       <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                               <Heart className="fill-white" />
                           </div>
                           <span className="font-bold tracking-wide uppercase text-sm">Made with Love in India</span>
                       </div>
                   </div>
                </section>

                {/* Developer / Contact CTA */}
                <section className="text-center bg-white dark:bg-[#1a1a1b] p-12 rounded-3xl border border-gray-200 dark:border-[#343536] shadow-sm">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Have Questions or Suggestions?</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-lg mx-auto leading-relaxed">
                        We are constantly evolving. If you have a feature request or want to contribute, don't hesitate to reach out.
                    </p>
                    <a 
                        href="mailto:vartalapsupport@gmail.com" 
                        className="inline-flex items-center gap-2 text-orange-600 dark:text-orange-400 font-bold hover:underline group"
                    >
                        <MessageCircle size={20} />
                        Email us at vartalapsupport@gmail.com
                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </a>
                </section>
            </main>
            
            {/* Simple Footer for About Page */}
            <footer className="max-w-5xl mx-auto px-4 py-10 text-center border-t border-gray-200 dark:border-[#1a1a1b]">
                <p className="text-sm text-gray-400">Vartalap INC &copy; 2026. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default About;
