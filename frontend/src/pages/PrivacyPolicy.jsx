import React from 'react';
import { Helmet } from 'react-helmet-async';

const PrivacyPolicy = () => {
  return (
    <div className="bg-white dark:bg-[#1a1a1b] rounded-xl border border-gray-200 dark:border-[#343536] p-6 md:p-10 text-gray-900 dark:text-gray-100 max-w-4xl mx-auto shadow-sm my-4 animate-fade-in">
      <Helmet>
        <title>Privacy Policy - Vartalap</title>
        <meta name="description" content="Privacy Policy for Vartalap. Learn how we collect, use, and protect your data." />
      </Helmet>

      <h1 className="text-3xl font-extrabold mb-6 text-orange-600 dark:text-orange-500">Privacy Policy</h1>
      
      <div className="space-y-6 text-sm md:text-base leading-relaxed">
        <p><strong>Last Updated:</strong> May 2026</p>

        <section>
          <h2 className="text-xl font-bold mb-3 border-b border-gray-200 dark:border-[#343536] pb-2">1. Introduction</h2>
          <p>Welcome to Vartalap. Your privacy is critically important to us. This Privacy Policy explains how we collect, use, and disclose information about you when you access or use our website, mobile application, and other online products and services (collectively, the "Services").</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 border-b border-gray-200 dark:border-[#343536] pb-2">2. Information We Collect</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Account Information:</strong> When you register for an account, we may collect your username, email address, and password.</li>
            <li><strong>Content You Submit:</strong> We collect the content you submit to the Services, including posts, comments, and messages.</li>
            <li><strong>Usage Data:</strong> We automatically collect information about how you access and use the Services, such as your IP address, browser type, operating system, and pages viewed.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 border-b border-gray-200 dark:border-[#343536] pb-2">3. Third-Party Services, Advertising, and Analytics</h2>
          <p className="mb-2">We use third-party services to help provide, maintain, and improve our Services, as well as to display advertisements.</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Google AdSense:</strong> We use Google AdSense to display ads on our site. Google, as a third-party vendor, uses cookies to serve ads on Vartalap. Google's use of advertising cookies enables it and its partners to serve ads to our users based on their visit to our sites and/or other sites on the Internet. You may opt out of personalized advertising by visiting Google's Ads Settings.</li>
            <li><strong>Amazon Associates:</strong> Vartalap is a participant in the Amazon Services LLC Associates Program, an affiliate advertising program designed to provide a means for sites to earn advertising fees by advertising and linking to Amazon.com and affiliated sites.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 border-b border-gray-200 dark:border-[#343536] pb-2">4. How We Use Your Information</h2>
          <p>We use the information we collect to provide, maintain, and improve our Services, to personalize your experience, to monitor and analyze trends and usage, and to communicate with you.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 border-b border-gray-200 dark:border-[#343536] pb-2">5. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us at vartalapsupport@gmail.com.</p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
