import React, { useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { BarChart2, CheckCircle2 } from 'lucide-react';

const PollView = ({ post, currentUser, onVoteSuccess }) => {
  const [isVoting, setIsVoting] = useState(false);
  const token = localStorage.getItem('token');

  const curUserId = currentUser?.id || currentUser?._id;

  // Check if poll has ended
  const isExpired = post.pollEndsAt && new Date(post.pollEndsAt) < new Date();
  
  // Calculate total votes
  const totalVotes = post.pollOptions?.reduce((acc, opt) => acc + (opt.votes?.length || 0), 0) || 0;
  
  // Find if user already voted and for which option
  const userVotedIndex = post.pollOptions?.findIndex(opt => opt.votes?.some(id => (typeof id === 'object' ? id._id : id) === curUserId));
  const hasVoted = userVotedIndex > -1;

  // Render results if user voted, poll expired, or user is author
  const showResults = hasVoted || isExpired || (curUserId && post.author?._id === curUserId);

  const handleVote = async (optionIndex) => {
    if (!token) {
      toast.error("Please log in to vote on this poll!");
      return;
    }
    if (isExpired) {
      toast.error("This poll has already ended.");
      return;
    }

    setIsVoting(true);
    try {
      const res = await api.put(`/api/posts/${post._id}/vote`, { optionIndex });
      if (onVoteSuccess) {
        onVoteSuccess(post._id, res.data.post);
      }
      toast.success("Vote recorded successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to vote.");
      console.error(err);
    } finally {
      setIsVoting(false);
    }
  };

  if (!post.pollOptions || post.pollOptions.length === 0) return null;

  return (
    <div className="bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-3 text-sm font-bold text-gray-700 dark:text-gray-300">
        <BarChart2 size={16} className="text-orange-500" />
        {isExpired ? (
          <span className="text-gray-500">Poll Ended</span>
        ) : (
          <span>Poll ends on {new Date(post.pollEndsAt).toLocaleDateString()}</span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {post.pollOptions.map((opt, idx) => {
          const votes = opt.votes?.length || 0;
          const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const isUserVote = idx === userVotedIndex;

          if (showResults) {
            return (
              <div key={idx} className="relative overflow-hidden rounded-md bg-gray-100 dark:bg-[#272729] border border-gray-200 dark:border-[#343536] p-3">
                {/* Progress Bar Background */}
                <div 
                  className={`absolute top-0 left-0 h-full opacity-20 dark:opacity-30 ${isUserVote ? 'bg-orange-500' : 'bg-gray-400 dark:bg-gray-500'}`}
                  style={{ width: `${percentage}%`, transition: 'width 0.5s ease-out' }}
                />
                <div className="relative z-10 flex justify-between items-center text-sm font-bold">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-900 dark:text-white">{opt.option}</span>
                    {isUserVote && <CheckCircle2 size={14} className="text-orange-500" />}
                  </div>
                  <div className="text-gray-700 dark:text-gray-300">
                    <span className="mr-2 text-xs font-medium">{votes} votes</span>
                    <span>{percentage}%</span>
                  </div>
                </div>
              </div>
            );
          }

          // Voting Mode
          return (
            <button
              key={idx}
              onClick={() => handleVote(idx)}
              disabled={isVoting}
              className="w-full text-left bg-white dark:bg-[#1a1a1b] hover:bg-orange-50 dark:hover:bg-orange-900/10 border border-gray-300 dark:border-[#343536] hover:border-orange-500 dark:hover:border-orange-500 text-gray-900 dark:text-white font-bold p-3 rounded-md transition-all disabled:opacity-50 text-sm"
            >
              {opt.option}
            </button>
          );
        })}
      </div>
      
      <div className="mt-3 text-xs text-gray-500 font-medium">
        {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'} total
      </div>
    </div>
  );
};

export default PollView;
