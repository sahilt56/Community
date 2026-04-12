import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { useGoogleLogin } from '@react-oauth/google';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
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
  

  const googleLogin = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      handleGoogleSubmit(undefined, tokenResponse.access_token);
    },
    onError: () => {
      toast.error("Google Login Failed");
    }
  });
  
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

    console.log("[Login] Form submitted, isLogin:", isLogin);

    if (!isLogin && usernameStatus && !usernameStatus.available) {
      toast.error("Username is not available!");
      return;
    }

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin ? { email, password } : { username, email, password, otp, userType };
    
    try {
      console.log("[Login] Sending request to", endpoint);
      const startTime = Date.now();
      const res = await api.post(endpoint, payload);
      const responseTime = Date.now() - startTime;
      
      console.log("[Login] ✅ Response received in " + responseTime + "ms");
      toast.success(isLogin ? "Login Successful! 🎉" : "Account Created Successfully! 🎉");

      console.log("[Login] Setting localStorage with new token");
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      localStorage.setItem('loginTime', Date.now().toString());
      console.log('[Login] Token in localStorage:', !!localStorage.getItem('token'));
      
      console.log("[Login] 📢 Dispatching auth-change event");
      // Dispatch auth-change event to update SocketContext immediately
      window.dispatchEvent(new Event('auth-change'));
      
      console.log("[Login] Waiting 500ms before redirect to ensure event fires");
      setTimeout(() => {
        console.log("[Login] Redirecting to home...");
        // Full clean reload
        window.location.href = '/';
      }, 500);
    } catch (err) {
      console.error("[Login] Error:", err);
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
        access_token: currentToken, // Passed as access_token from the hook
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
        localStorage.setItem('loginTime', Date.now().toString()); // Guard for interceptor
        window.location.href = '/'; // Full clean reload
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Google Auth Failed");
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex bg-white dark:bg-[#0a0a0b] transition-colors overflow-hidden">
      
      {/* LEFT SIDE: Premium Branding Panel (Hidden on smaller screens) */}
      <div className="hidden lg:flex w-1/2 bg-linear-to-br from-orange-500 via-orange-600 to-red-600 p-16 flex-col justify-between relative overflow-hidden">
        {/* Abstract Background Shapes */}
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-red-900/30 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-[20%] left-[20%] w-32 h-32 bg-white/5 rounded-full backdrop-blur-sm border border-white/10 pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-[30%] right-[20%] w-48 h-48 bg-black/5 rounded-full backdrop-blur-sm border border-white/10 pointer-events-none"></div>

        <div className="relative z-10 animate-fade-up">
          <div className="inline-flex p-3 rounded-2xl bg-white shadow-2xl mb-8 border border-orange-100">
            <img src={logo} alt="Vartalap" className="w-12 h-12 object-contain" />
          </div>
          <h2 className="text-5xl xl:text-6xl font-extrabold text-white mb-6 leading-tight tracking-tight drop-shadow-sm">
            Connect, Share, <br/> and <span className="text-transparent bg-clip-text bg-linear-to-r from-yellow-200 to-yellow-400">Grow Together.</span>
          </h2>
          <p className="text-white/90 text-lg xl:text-xl max-w-md leading-relaxed font-medium">
            Vartalap is the ultimate community platform for Indian students and professionals. Dive into meaningful discussions today.
          </p>
        </div>

      </div>

      {/* RIGHT SIDE: Authentication Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative bg-gray-50 dark:bg-[#0a0a0b]">
        
        {/* Subtle mobile background glow (only visible on mobile/tablet) */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none lg:hidden">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[100px]"></div>
          <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[100px]"></div>
        </div>

        <div className="w-full max-w-[420px] bg-white dark:bg-[#151516] p-8 sm:p-10 lg:p-12 rounded-[2.5rem] border border-gray-100 dark:border-[#262627] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08)] dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.4)] relative z-10 animate-fade-up scale-[0.95]">
          
          {/* Logo & Heading */}
          <div className="text-center mb-6">
            <div className="lg:hidden inline-flex p-3 rounded-2xl bg-white shadow-xl mb-6 border border-orange-100">
              <img src={logo} alt="Vartalap" className="w-10 h-10 object-contain" />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">
              {isForgotPassword ? 'Reset Password' : (isLogin ? 'Welcome Back' : 'Create Account')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
              {isForgotPassword 
                ? (otpSent ? 'Confirm your new security credentials.' : 'We\'ll send a reset code to your email.')
                : (isLogin ? 'Enter your details to access your account.' : 'Join the community and start connecting.')}
            </p>
          </div>

        {showPrompt ? (
          <div className="animate-fade-in flex flex-col gap-5">
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-600"><User size={20} /></div>
                <input
                  type="text"
                  placeholder="Choose Username"
                  className={`pl-12 bg-gray-50/50 dark:bg-[#1c1c1d]/50 border ${usernameStatus ? (usernameStatus.available ? 'border-green-500 ring-4 ring-green-500/10' : 'border-red-500 ring-4 ring-red-500/10') : 'border-gray-200'} dark:border-[#262627] text-gray-900 dark:text-white p-3.5 rounded-2xl outline-none w-full transition-all text-sm font-medium focus:bg-white dark:focus:bg-[#202021] focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10`}
                  onChange={(e) => setUsername(e.target.value)}
                  value={username}
                  required
                />
                {isCheckingUsername && <div className="absolute right-4 top-1/2 -translate-y-1/2"><span className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></span></div>}
              </div>
              
              <div className="flex bg-gray-50 dark:bg-[#1c1c1d] rounded-2xl p-1 border border-gray-100 dark:border-[#262627]">
                {['student', 'professional'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setUserType(type)}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all tracking-wider uppercase ${userType === type ? 'bg-white dark:bg-[#262627] text-gray-900 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-500'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              
              {usernameStatus && (
                <p className={`text-[11px] font-bold px-2 ${usernameStatus.available ? 'text-green-600' : 'text-red-500'}`}>
                  {usernameStatus.message}
                </p>
              )}
            </div>

            <button
              onClick={() => handleGoogleSubmit(username)}
              disabled={!usernameStatus?.available || isCheckingUsername}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-200 disabled:to-gray-200 dark:disabled:from-[#262627] dark:disabled:to-[#262627] disabled:text-gray-400 text-white font-bold p-4 rounded-2xl transition-all shadow-[0_8px_20px_-6px_rgba(249,115,22,0.4)] hover:shadow-[0_12px_25px_-6px_rgba(249,115,22,0.5)] disabled:shadow-none active:scale-[0.98] text-sm tracking-wide"
            >
              Complete Registration
            </button>
            <button onClick={() => setShowPrompt(false)} className="text-xs font-bold text-gray-400 hover:text-gray-600 tracking-widest uppercase transition-colors">Go Back</button>
          </div>
        ) : (
          <div className="animate-fade-up">
            
            {/* Social Header */}
            {(!otpSent && !isForgotPassword) && (
              <>
                <button
                  type="button"
                  onClick={() => googleLogin()}
                  className="w-full flex items-center justify-center gap-3 bg-white dark:bg-[#151516] border border-gray-200 dark:border-[#262627] hover:bg-gray-50 dark:hover:bg-[#1c1c1d] text-gray-700 dark:text-gray-300 font-bold py-3.5 px-4 rounded-2xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] text-sm group"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span>Continue with Google</span>
                </button>
                
                <div className="relative flex py-6 items-center w-full">
                  <div className="grow border-t border-gray-100 dark:border-[#262627]"></div>
                  <span className="shrink-0 mx-4 text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em]">Or continue with email</span>
                  <div className="grow border-t border-gray-100 dark:border-[#262627]"></div>
                </div>
              </>
            )}

            <form onSubmit={isForgotPassword ? (otpSent ? handleResetPassword : handleForgotPasswordOtp) : (isLogin || otpSent ? handleSubmit : handleSendOtp)} className="flex flex-col gap-4">
              
              <div className="space-y-4">
                {isForgotPassword ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-600"><Mail size={19} /></div>
                      <input
                        type="email"
                        placeholder="Email Address"
                        className="pl-12 bg-gray-50/50 dark:bg-[#1c1c1d]/50 border border-gray-200 dark:border-[#262627] text-gray-900 dark:text-white p-3.5 rounded-2xl outline-none w-full transition-all text-sm font-medium focus:bg-white dark:focus:bg-[#202021] focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                        onChange={(e) => setResetEmail(e.target.value)}
                        value={resetEmail}
                        required
                        disabled={otpSent}
                      />
                    </div>
                    {otpSent && (
                      <div className="animate-fade-in space-y-4">
                         <div className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center px-2">Verification Code</div>
                         <input
                          type="text"
                          placeholder="000000"
                          maxLength={6}
                          className="bg-gray-50/50 dark:bg-[#1c1c1d]/50 border border-gray-200 dark:border-[#262627] text-gray-900 dark:text-white p-3.5 rounded-2xl outline-none w-full transition-all text-center tracking-[1em] text-2xl font-black focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 focus:bg-white dark:focus:bg-[#202021] shadow-inner"
                          onChange={(e) => setOtp(e.target.value)}
                          value={otp}
                          required
                        />
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-600"><Lock size={19} /></div>
                          <input
                            type={showNewPassword ? "text" : "password"}
                            placeholder="New Password"
                            className="pl-12 pr-12 bg-gray-50/50 dark:bg-[#1c1c1d]/50 border border-gray-200 dark:border-[#262627] text-gray-900 dark:text-white p-3.5 rounded-2xl outline-none w-full transition-all text-sm font-medium focus:bg-white dark:focus:bg-[#202021] focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                            onChange={(e) => setNewPassword(e.target.value)}
                            value={newPassword}
                            required
                            minLength={8}
                          />
                          <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                            {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  (!otpSent || isLogin) && (
                    <div className="space-y-4">
                      {!isLogin && (
                        <div className="space-y-4">
                          <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-600"><User size={19} /></div>
                            <input
                              type="text"
                              placeholder="Username"
                              className={`pl-12 bg-gray-50/50 dark:bg-[#1c1c1d]/50 border ${usernameStatus ? (usernameStatus.available ? 'border-green-500 ring-4 ring-green-500/10' : 'border-red-500 ring-4 ring-red-500/10') : 'border-gray-200'} dark:border-[#262627] text-gray-900 dark:text-white p-3.5 rounded-2xl outline-none w-full transition-all text-sm font-medium focus:bg-white dark:focus:bg-[#202021] focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10`}
                              onChange={(e) => setUsername(e.target.value)}
                              value={username}
                              required
                            />
                            {isCheckingUsername && <div className="absolute right-4 top-1/2 -translate-y-1/2"><span className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin block"></span></div>}
                          </div>
                          
                          <div className="flex bg-gray-50 dark:bg-[#1c1c1d] rounded-2xl p-1 border border-gray-100 dark:border-[#262627]">
                            <button
                              type="button"
                              onClick={() => setUserType('student')}
                              className={`flex-1 py-1.5 text-[10px] font-black rounded-xl transition-all tracking-wider uppercase ${userType === 'student' ? 'bg-white dark:bg-[#262627] text-gray-900 dark:text-white shadow-sm' : 'text-gray-400'}`}
                            >
                              Student
                            </button>
                            <button
                              type="button"
                              onClick={() => setUserType('professional')}
                              className={`flex-1 py-1.5 text-[10px] font-black rounded-xl transition-all tracking-wider uppercase ${userType === 'professional' ? 'bg-white dark:bg-[#262627] text-gray-900 dark:text-white shadow-sm' : 'text-gray-400'}`}
                            >
                              Professional
                            </button>
                          </div>
                        </div>
                      )}
                      
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-600"><Mail size={19} /></div>
                        <input
                          type="email"
                          placeholder="Email"
                          className="pl-12 bg-gray-50/50 dark:bg-[#1c1c1d]/50 border border-gray-200 dark:border-[#262627] text-gray-900 dark:text-white p-3.5 rounded-2xl outline-none w-full transition-all text-sm font-medium focus:bg-white dark:focus:bg-[#202021] focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                          onChange={(e) => setEmail(e.target.value)}
                          value={email}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-600"><Lock size={19} /></div>
                          <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            className="pl-12 pr-12 bg-gray-50/50 dark:bg-[#1c1c1d]/50 border border-gray-200 dark:border-[#262627] text-gray-900 dark:text-white p-3.5 rounded-2xl outline-none w-full transition-all text-sm font-medium focus:bg-white dark:focus:bg-[#202021] focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                            onChange={(e) => setPassword(e.target.value)}
                            value={password}
                            required
                            minLength={8}
                          />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        {isLogin && (
                          <div className="flex justify-end px-1">
                            <button 
                              type="button" 
                              onClick={() => { setIsForgotPassword(true); setOtpSent(false); }}
                              className="text-[10px] text-gray-400 hover:text-orange-600 font-black uppercase tracking-widest transition-colors"
                            >
                              Forgot Access?
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                )}

                {!isLogin && !isForgotPassword && otpSent && (
                  <div className="animate-fade-in space-y-4 text-center">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Verify 6rd Code</div>
                    <input
                      type="text"
                      placeholder="000000"
                      maxLength={6}
                      className="bg-gray-50/50 dark:bg-[#1c1c1d]/50 border border-gray-200 dark:border-[#262627] text-gray-900 dark:text-white p-3.5 rounded-2xl outline-none w-full transition-all text-center tracking-[1em] text-3xl font-black focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 focus:bg-white dark:focus:bg-[#202021] shadow-inner"
                      onChange={(e) => setOtp(e.target.value)}
                      value={otp}
                      required
                    />
                    <button type="button" onClick={() => setOtpSent(false)} className="text-[10px] text-gray-400 font-bold hover:text-orange-600 tracking-widest uppercase transition-colors">Change Account Email</button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={sendingOtp || (usernameStatus && !usernameStatus.available && !isLogin && !isForgotPassword)}
                className="w-full bg-linear-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-200 disabled:to-gray-200 dark:disabled:from-[#262627] dark:disabled:to-[#262627] disabled:text-gray-400 text-white font-bold p-4 rounded-2xl transition-all shadow-[0_8px_20px_-6px_rgba(249,115,22,0.4)] hover:shadow-[0_12px_25px_-6px_rgba(249,115,22,0.5)] disabled:shadow-none active:scale-[0.98] text-sm tracking-widest mt-4"
              >
                {isForgotPassword 
                  ? (otpSent ? 'Update Access' : (sendingOtp ? '...' : 'Get Security Code'))
                  : (isLogin 
                    ? 'Login' 
                    : (otpSent 
                        ? 'Confirm Signup' 
                        : (sendingOtp ? '...' : 'Signup')
                      ))
                }
              </button>
            </form>

            <div className="mt-12 text-center">
              <p className="text-gray-400 text-[11px] font-bold tracking-widest uppercase">
                {isLogin ? "No account?" : "Have access?"}
                <button
                  onClick={() => { setIsLogin(!isLogin); setOtpSent(false); setUsernameStatus(null); setIsForgotPassword(false); }}
                  className="text-orange-500 hover:text-orange-600 ml-2 transition-colors"
                >
                  {isLogin ? 'Signup' : 'Sign In'}
                </button>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);
};

export default Login;