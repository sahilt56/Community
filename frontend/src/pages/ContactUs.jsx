import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Mail, MapPin, Phone, Send } from 'lucide-react';
import toast from 'react-hot-toast';

const ContactUs = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate sending email
    toast.success('Message sent successfully! We will get back to you soon.');
    setFormData({ name: '', email: '', message: '' });
  };

  return (
    <div className="bg-white dark:bg-[#1a1a1b] rounded-xl border border-gray-200 dark:border-[#343536] p-6 md:p-10 text-gray-900 dark:text-gray-100 max-w-4xl mx-auto shadow-sm my-4 animate-fade-in">
      <Helmet>
        <title>Contact Us - Vartalap</title>
        <meta name="description" content="Contact the Vartalap team for support, inquiries, or feedback." />
      </Helmet>

      <h1 className="text-3xl font-extrabold mb-6 text-orange-600 dark:text-orange-500">Contact Us</h1>
      <p className="mb-8 text-gray-600 dark:text-gray-300">We'd love to hear from you. Please fill out this form or reach out via email.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-gray-50 dark:bg-[#272729] border border-gray-300 dark:border-[#343536] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Your Name"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full bg-gray-50 dark:bg-[#272729] border border-gray-300 dark:border-[#343536] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="your.email@example.com"
              />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium mb-1">Message</label>
              <textarea
                id="message"
                name="message"
                required
                rows="5"
                value={formData.message}
                onChange={handleChange}
                className="w-full bg-gray-50 dark:bg-[#272729] border border-gray-300 dark:border-[#343536] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                placeholder="How can we help you?"
              ></textarea>
            </div>
            <button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-6 rounded-lg flex items-center gap-2 transition-colors w-full justify-center"
            >
              <Send size={18} /> Send Message
            </button>
          </form>
        </div>

        <div className="space-y-6 flex flex-col justify-center">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center shrink-0">
              <Mail size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg">Email Us</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-1">For general inquiries and support:</p>
              <a href="mailto:vartalapsupport@gmail.com" className="text-orange-500 hover:underline font-medium">vartalapsupport@gmail.com</a>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center shrink-0">
              <MapPin size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg">Location</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-1">India</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
