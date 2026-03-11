import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const Login = () => {
  const location = useLocation();
  
  // FIX: Component load hote hi check kar lenge ki SignUp page kholna hai ya nahi
  const [isLogin, setIsLogin] = useState(!location.state?.isSignUp);
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  useEffect(() => {
    if (location.state?.isSignUp) {
      // FIX: ESLint bypass comment kyunki hume router state ko local state se sync karna zaroori hai
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLogin(false);
    }
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? '/api/users/login' : '/api/users/register';
    const payload = isLogin ? { email, password } : { username, email, password };
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.post(`${apiUrl}${endpoint}`, payload);
      
      if (!isLogin) {
        toast.success("Account Created Successfully! 🎉");
      } else {
        toast.success("Login Successful! 🎉");
      }

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user)); 
      
      window.location.href = '/'; 
    } catch (err) {
      toast.error(err.response?.data?.message || (isLogin ? "Login Failed" : "Registration Failed"));
    }
  };

  return (
    <div className="flex flex-col items-center justify-center mt-16 transition-colors">
      <div className="animate-scale-in bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] p-8 md:p-10 rounded-2xl w-full max-w-md shadow-xl text-center transition-colors">
        <div className="text-5xl mb-4">{isLogin ? '👋' : '✨'}</div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{isLogin ? 'Welcome Back' : 'Join Vartalap'}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          {isLogin ? 'Login to continue your conversation' : 'Create an account and dive in'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {!isLogin && (
            <input
              type="text"
              placeholder="Username"
              className="focus-ring bg-gray-50 dark:bg-[#272729] border border-gray-200 dark:border-[#343536] text-gray-900 dark:text-white p-3.5 rounded-xl outline-none w-full transition-all text-sm"
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            className="focus-ring bg-gray-50 dark:bg-[#272729] border border-gray-200 dark:border-[#343536] text-gray-900 dark:text-white p-3.5 rounded-xl outline-none w-full transition-all text-sm"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="focus-ring bg-gray-50 dark:bg-[#272729] border border-gray-200 dark:border-[#343536] text-gray-900 dark:text-white p-3.5 rounded-xl outline-none w-full transition-all text-sm"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            className="btn-press mt-2 bg-linear-to-r from-orange-500 to-orange-600 text-white font-bold p-3.5 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg text-base tracking-wide"
          >
            {isLogin ? 'Log In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-[#343536] transition-colors">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {isLogin ? "New to Vartalap? " : "Already a member? "}
            <span
              onClick={() => setIsLogin(!isLogin)}
              className="text-orange-500 font-bold cursor-pointer hover:underline hover:text-orange-600 transition-colors"
            >
              {isLogin ? 'Sign Up' : 'Log In'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;