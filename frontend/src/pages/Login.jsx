import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
import logo from '../assets/logo.png';

const Login = () => {
  const location = useLocation();
  
  const [isLogin, setIsLogin] = useState(!location.state?.isSignUp);
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  
  const [userType, setUserType] = useState('student');

  // Forgot Password flow states
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

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
      const errorMessage = err.response?.data?.message || err.response?.data?.error || "Failed to send OTP";
      toast.error(errorMessage);
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
      const errorMessage = err.response?.data?.message || err.response?.data?.error || "Failed to send reset OTP";
      toast.error(errorMessage);
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

      const res = await api.post('/api/auth/google', {
        credential: currentToken,
        username: providedUsername,
        userType: providedUsername ? userType : undefined
      },{
        withCredentials: true
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
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {isForgotPassword 
                ? (otpSent ? 'Enter OTP and your new password' : 'Enter your email to receive a reset code')
                : (isLogin ? 'Login to continue your conversation' : (otpSent ? 'Enter the security code to verify your email' : 'Create an account and dive in'))}
            </p>

            {isLogin && !isForgotPassword && (
              <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 p-3 mb-6 rounded-lg text-center animate-fade-in">
                <p className="text-xs text-orange-800 dark:text-orange-300 font-bold">
                  Note: Agar app login nahi kar pa rahe hai to page ko 3 se 4 baar refresh kijiye, login ho jayega.
                </p>
              </div>
            )}

            {/* Google Login Button */}
            {(!otpSent && !isForgotPassword) && (
              <div className="mb-6 flex flex-col items-center">
                <GoogleLogin
                  onSuccess={(credentialResponse) => {
                    handleGoogleSubmit(undefined, credentialResponse.credential);
                  }}
                  onError={() => {
                    toast.error("Google Login Failed");
                  }}
                  theme="outline"
                  size="large"
                  text="continue_with"
                  shape="rectangular"
                  width="100%"
                />
                
                <div className="relative flex py-5 items-center w-full">
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
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          placeholder="New Password"
                          className="focus-ring bg-gray-50 dark:bg-[#272729] border border-gray-200 dark:border-[#343536] text-gray-900 dark:text-white p-3.5 rounded-xl outline-none w-full transition-all text-sm pr-12"
                          onChange={(e) => setNewPassword(e.target.value)}
                          value={newPassword}
                          required
                          minLength={8}
                        />
                        <button
                          type="button"
                          className="absolute right-4 top-3.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 text-left px-1 -mt-1">Password must be at least 8 characters long, contain 1 number, and 1 uppercase letter.</p>
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
                  <div className="flex flex-col items-end w-full">
                    <div className="relative w-full">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        className="focus-ring bg-gray-50 dark:bg-[#272729] border border-gray-200 dark:border-[#343536] text-gray-900 dark:text-white p-3.5 rounded-xl outline-none w-full transition-all text-sm pr-12"
                        onChange={(e) => setPassword(e.target.value)}
                        value={password}
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        className="absolute right-4 top-3.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {!isLogin && (
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 text-left px-1 mt-1.5 w-full">Password must be at least 8 characters long, contain 1 number, and 1 uppercase letter.</p>
                    )}
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