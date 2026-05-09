import React from 'react';
import { Helmet } from 'react-helmet-async';

const TermsConditions = () => {
  return (
    <div className="bg-white dark:bg-[#1a1a1b] rounded-xl border border-gray-200 dark:border-[#343536] p-6 md:p-10 text-gray-900 dark:text-gray-100 max-w-4xl mx-auto shadow-sm my-4 animate-fade-in">
      <Helmet>
        <title>Terms & Conditions - Vartalap</title>
        <meta name="description" content="Terms and Conditions for using Vartalap." />
      </Helmet>

      <h1 className="text-3xl font-extrabold mb-6 text-orange-600 dark:text-orange-500">Terms and Conditions</h1>
      
      <div className="space-y-6 text-sm md:text-base leading-relaxed">
        <p><strong>Last Updated:</strong> May 2026</p>

        <section>
          <h2 className="text-xl font-bold mb-3 border-b border-gray-200 dark:border-[#343536] pb-2">1. Acceptance of Terms</h2>
          <p>By accessing or using Vartalap, you agree to be bound by these Terms and Conditions and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 border-b border-gray-200 dark:border-[#343536] pb-2">2. User Accounts</h2>
          <p>When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 border-b border-gray-200 dark:border-[#343536] pb-2">3. User Content</h2>
          <p>You are solely responsible for the content that you post, upload, publish, or display on Vartalap. You agree not to post any content that is illegal, abusive, harassing, defamatory, or otherwise objectionable.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 border-b border-gray-200 dark:border-[#343536] pb-2">4. Third-Party Links</h2>
          <p>Our Service may contain links to third-party web sites or services that are not owned or controlled by Vartalap. We have no control over, and assume no responsibility for, the content, privacy policies, or practices of any third party web sites or services.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 border-b border-gray-200 dark:border-[#343536] pb-2">5. Changes to Terms</h2>
          <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will try to provide at least 30 days' notice prior to any new terms taking effect.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 border-b border-gray-200 dark:border-[#343536] pb-2">6. Contact Us</h2>
          <p>If you have any questions about these Terms, please contact us at vartalapsupport@gmail.com.</p>
        </section>
      </div>
    </div>
  );
};

export default TermsConditions;
