import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { useGoogleLogin } from '@react-oauth/google';
import { UserPlus } from 'lucide-react';
import logo from '../assets/logo.png';

const Login = () => {
  const location = useLocation();
  
  const [isLogin, setIsLogin] = useState(!location.state?.isSignUp);
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  
  const [userType, setUserType] = useState('student');

  // Forgot Password flow states
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // New states for Google Username flow
  const [showPrompt, setShowPrompt] = useState(false);
  const [googleAccessToken, setGoogleAccessToken] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null); // { available: true/false, message: '' }
  
  useEffect(() => {
    if (location.state?.isSignUp) {
      setIsLogin(false);
    }
  }, [location.state]);

  // Real-time username check
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (username.length >= 1 && (!isLogin || showPrompt)) {
        // Pre-check for strict alphanumeric/underscore pattern
        if (!/^[a-zA-Z0-9_]{1,20}$/.test(username)) {
          setUsernameStatus({ available: false, message: "3-20 chars (alphanumeric/underscore only)" });
          return;
        }

        // Only start checking database after 3 chars
        if (username.length < 3) {
           setUsernameStatus({ available: false, message: "Minimum 3 characters required" });
           return;
        }

        setIsCheckingUsername(true);
        try {
          const res = await api.get(`/api/auth/check-username/${username}`);
          setUsernameStatus(res.data);
        } catch (err) {
          console.error("Error checking username:", err);
        } finally {
          setIsCheckingUsername(false);
        }
      } else {
        setUsernameStatus(null);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [username, isLogin, showPrompt]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email || !username || !password) {
        toast.error("Please fill all fields first.");
        return;
    }

    if (usernameStatus && !usernameStatus.available) {
      toast.error("Username already taken. Please choose another one.");
      return;
    }

    setSendingOtp(true);
    try {
      await api.post('/api/auth/send-otp', { email, username });
      setOtpSent(true);
      toast.success("OTP sent to your email!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!isLogin && usernameStatus && !usernameStatus.available) {
      toast.error("Username is not available!");
      return;
    }

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin ? { email, password } : { username, email, password, otp, userType };
    
    try {
      const res = await api.post(endpoint, payload);
      
      toast.success(isLogin ? "Login Successful! 🎉" : "Account Created Successfully! 🎉");

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user)); 
      window.location.href = '/'; 
    } catch (err) {
      toast.error(err.response?.data?.message || (isLogin ? "Login Failed" : "Registration Failed"));
    }
  };

  const handleForgotPasswordOtp = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error("Please enter your email address.");
      return;
    }
    setSendingOtp(true);
    try {
      await api.post('/api/auth/forgot-password-otp', { email: resetEmail });
      setOtpSent(true);
      toast.success("Password reset OTP sent to your email!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send reset OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail || !otp || !newPassword) {
      toast.error("Please fill all fields.");
      return;
    }
    try {
      await api.post('/api/auth/reset-password', { email: resetEmail, otp, newPassword });
      toast.success("Password reset successfully! Please log in.");
      setIsForgotPassword(false);
      setIsLogin(true);
      setOtpSent(false);
      setOtp('');
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reset password.");
    }
  };

  const handleGoogleSubmit = async (providedUsername, token) => {
    try {
      const currentToken = token || googleAccessToken;
      if (!currentToken) return;

      const res = window.location.href('/api/auth/google', {
        access_token: currentToken,
        username: providedUsername,
        userType: providedUsername ? userType : undefined
      });

      if (res.data.status === 'NEED_USERNAME') {
        setGoogleAccessToken(currentToken);
        setShowPrompt(true);
        toast("Please choose a unique username", { icon: '📝' });
      } else {
        toast.success("Login Successful! 🎉");
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user)); 
        window.location.href = '/'; 
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Google Auth Failed");
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      // Pass token directly because state update is async
      await handleGoogleSubmit(undefined, tokenResponse.access_token);
    },
    onError: () => toast.error("Google Login Failed")
  });


  return (
    <div className="flex flex-col items-center justify-center mt-16 transition-colors mb-16">
      <div className="animate-scale-in bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] p-8 md:p-10 rounded-2xl w-full max-w-md shadow-xl text-center transition-colors">
        
        {showPrompt ? (
          <div className="animate-fade-in">
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 bg-orange-50 dark:bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center shadow-sm border border-orange-100 dark:border-orange-500/20"><UserPlus size={32} strokeWidth={2.5} /></div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Almost There!</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Choose a unique username for your Vartalap account.</p>
            
            <div className="flex flex-col gap-2 relative">
              <input
                type="text"
                placeholder="Choose Username"
                className={`focus-ring bg-gray-50 dark:bg-[#272729] border ${usernameStatus ? (usernameStatus.available ? 'border-green-500' : 'border-red-500') : 'border-gray-200'} dark:border-[#343536] text-gray-900 dark:text-white p-3.5 rounded-xl outline-none w-full transition-all text-sm`}
                onChange={(e) => setUsername(e.target.value)}
                value={username}
                required
              />
              
              <div className="flex bg-gray-100 dark:bg-[#272729] rounded-xl p-1 mt-1 border border-gray-200 dark:border-[#343536]">
                <button
                  type="button"
                  onClick={() => setUserType('student')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${userType === 'student' ? 'bg-white dark:bg-[#343536] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setUserType('professional')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${userType === 'professional' ? 'bg-white dark:bg-[#343536] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                  Professional
                </button>
              </div>
              {isCheckingUsername && <div className="absolute right-3 top-3.5"><span className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin block"></span></div>}
              
              {usernameStatus && (
                <p className={`text-xs text-left px-1 ${usernameStatus.available ? 'text-green-600' : 'text-red-500'}`}>
                  {usernameStatus.message}
                </p>
              )}

              <button
                onClick={() => handleGoogleSubmit(username)}
                disabled={!usernameStatus?.available || isCheckingUsername}
                className={`btn-press mt-4 text-white font-bold p-3.5 rounded-xl transition-all shadow-lg text-base tracking-wide flex justify-center items-center gap-2 ${
                  (!usernameStatus?.available || isCheckingUsername)
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                Complete Registration
              </button>
              
              <button onClick={() => setShowPrompt(false)} className="mt-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-center mb-6">
              <div className="p-1 rounded-full border-2 border-orange-500/20 shadow-lg">
                <img src={logo} alt="Vartalap Logo" className="w-24 h-24 object-cover rounded-full animate-float" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {isForgotPassword ? 'Reset Password' : (isLogin ? 'Welcome Back' : 'Join Vartalap')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
              {isForgotPassword 
                ? (otpSent ? 'Enter OTP and your new password' : 'Enter your email to receive a reset code')
                : (isLogin ? 'Login to continue your conversation' : (otpSent ? 'Enter the security code to verify your email' : 'Create an account and dive in'))}
            </p>

            {/* Google Login Button */}
            {(!otpSent && !isForgotPassword) && (
              <div className="mb-6">
                <button 
                  onClick={() => loginWithGoogle()}
                  className="w-full flex items-center justify-center gap-3 bg-white dark:bg-[#272729] border border-gray-300 dark:border-[#343536] text-gray-700 dark:text-white p-3.5 rounded-xl hover:bg-gray-50 dark:hover:bg-[#343536] transition-all shadow-sm font-medium"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    <path d="M1 1h22v22H1z" fill="none"/>
                  </svg>
                  Continue with Google
                </button>
                
                <div className="relative flex py-5 items-center">
                  <div className="grow border-t border-gray-200 dark:border-[#343536]"></div>
                  <span className="shrink-0 mx-4 text-gray-400 text-sm">Or</span>
                  <div className="grow border-t border-gray-200 dark:border-[#343536]"></div>
                </div>
              </div>
            )}

            <form onSubmit={isForgotPassword ? (otpSent ? handleResetPassword : handleForgotPasswordOtp) : (isLogin || otpSent ? handleSubmit : handleSendOtp)} className="flex flex-col gap-3">
              
              {isForgotPassword ? (
                <>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="focus-ring bg-gray-50 dark:bg-[#272729] border border-gray-200 dark:border-[#343536] text-gray-900 dark:text-white p-3.5 rounded-xl outline-none w-full transition-all text-sm mb-2"
                    onChange={(e) => setResetEmail(e.target.value)}
                    value={resetEmail}
                    required
                    disabled={otpSent}
                  />
                  {otpSent && (
                    <div className="animate-fade-in flex flex-col gap-3">
                      <input
                        type="text"
                        placeholder="Enter 6-digit OTP"
                        maxLength={6}
                        className="focus-ring bg-gray-50 dark:bg-[#272729] border border-gray-200 dark:border-[#343536] text-gray-900 dark:text-white p-3.5 rounded-xl outline-none w-full transition-all text-center tracking-widest text-xl font-bold"
                        onChange={(e) => setOtp(e.target.value)}
                        value={otp}
                        required
                      />
                      <input
                        type="password"
                        placeholder="New Password"
                        className="focus-ring bg-gray-50 dark:bg-[#272729] border border-gray-200 dark:border-[#343536] text-gray-900 dark:text-white p-3.5 rounded-xl outline-none w-full transition-all text-sm"
                        onChange={(e) => setNewPassword(e.target.value)}
                        value={newPassword}
                        required
                        minLength={6}
                      />
                    </div>
                  )}
                </>
              ) : (
                (!otpSent || isLogin) && (
                <>
                  {!isLogin && (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Username"
                        className={`focus-ring bg-gray-50 dark:bg-[#272729] border ${usernameStatus ? (usernameStatus.available ? 'border-green-500' : 'border-red-500') : 'border-gray-200'} dark:border-[#343536] text-gray-900 dark:text-white p-3.5 rounded-xl outline-none w-full transition-all text-sm mb-3`}
                        onChange={(e) => setUsername(e.target.value)}
                        value={username}
                        required
                      />
                      {isCheckingUsername && <div className="absolute right-3 top-3.5"><span className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin block"></span></div>}
                      {usernameStatus && (
                        <p className={`text-[10px] text-left mt-0.5 px-1 ${usernameStatus.available ? 'text-green-600' : 'text-red-500'} mb-2`}>
                          {usernameStatus.message}
                        </p>
                      )}

                      <div className="flex bg-gray-100 dark:bg-[#272729] rounded-xl p-1 mb-1 border border-gray-200 dark:border-[#343536]">
                        <button
                          type="button"
                          onClick={() => setUserType('student')}
                          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${userType === 'student' ? 'bg-white dark:bg-[#343536] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                          Student
                        </button>
                        <button
                          type="button"
                          onClick={() => setUserType('professional')}
                          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${userType === 'professional' ? 'bg-white dark:bg-[#343536] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                          Professional
                        </button>
                      </div>
                    </div>
                  )}
                  <input
                    type="email"
                    placeholder="Email"
                    className="focus-ring bg-gray-50 dark:bg-[#272729] border border-gray-200 dark:border-[#343536] text-gray-900 dark:text-white p-3.5 rounded-xl outline-none w-full transition-all text-sm"
                    onChange={(e) => setEmail(e.target.value)}
                    value={email}
                    required
                  />
                  <div className="flex flex-col items-end">
                    <input
                      type="password"
                      placeholder="Password"
                      className="focus-ring bg-gray-50 dark:bg-[#272729] border border-gray-200 dark:border-[#343536] text-gray-900 dark:text-white p-3.5 rounded-xl outline-none w-full transition-all text-sm"
                      onChange={(e) => setPassword(e.target.value)}
                      value={password}
                      required
                    />
                    {isLogin && (
                      <button 
                        type="button" 
                        onClick={() => {
                          setIsForgotPassword(true);
                          setOtpSent(false);
                          setOtp('');
                        }}
                        className="text-xs text-orange-500 hover:text-orange-600 font-medium mt-2"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                </>
              ))}

              {!isLogin && !isForgotPassword && otpSent && (
                <div className="animate-fade-in flex flex-col gap-3">
                  <div className="text-gray-600 dark:text-gray-300 text-sm mb-2 text-left bg-orange-50 dark:bg-orange-500/10 p-3 rounded-xl border border-orange-100 dark:border-orange-500/20">
                    We've sent a 6-digit code to <strong>{email}</strong>
                  </div>
                  <input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    className="focus-ring bg-gray-50 dark:bg-[#272729] border border-gray-200 dark:border-[#343536] text-gray-900 dark:text-white p-3.5 rounded-xl outline-none w-full transition-all text-center tracking-widest text-xl font-bold"
                    onChange={(e) => setOtp(e.target.value)}
                    value={otp}
                    required
                  />
                  <button 
                    type="button" 
                    onClick={() => setOtpSent(false)} 
                    className="text-sm text-gray-500 hover:text-orange-500"
                  >
                    Go back to edit details
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={sendingOtp || (usernameStatus && !usernameStatus.available && !isLogin && !isForgotPassword)}
                className={`btn-press mt-2 text-white font-bold p-3.5 rounded-xl transition-all shadow-lg text-base tracking-wide flex justify-center items-center gap-2 ${
                  (sendingOtp || (usernameStatus && !usernameStatus.available && !isLogin && !isForgotPassword))
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'
                }`}
              >
                {isForgotPassword 
                  ? (otpSent ? 'Reset Password' : (sendingOtp ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : 'Send Reset OTP'))
                  : (isLogin 
                    ? 'Log In' 
                    : (otpSent 
                        ? 'Verify & Create Account' 
                        : (sendingOtp ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : 'Send OTP')
                      ))
                }
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-[#343536] transition-colors">
              {isForgotPassword ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Remembered your password?{' '}
                  <span
                    onClick={() => {
                        setIsForgotPassword(false);
                        setIsLogin(true);
                        setOtpSent(false); 
                    }}
                    className="text-orange-500 font-bold cursor-pointer hover:underline hover:text-orange-600 transition-colors"
                  >
                    Back to Login
                  </span>
                </p>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {isLogin ? "New to Vartalap? " : "Already a member? "}
                  <span
                    onClick={() => {
                        setIsLogin(!isLogin);
                        setOtpSent(false); 
                        setUsernameStatus(null);
                        setIsForgotPassword(false);
                    }}
                    className="text-orange-500 font-bold cursor-pointer hover:underline hover:text-orange-600 transition-colors"
                  >
                    {isLogin ? 'Sign Up' : 'Log In'}
                  </span>
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;