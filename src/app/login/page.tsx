'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';
import toast from 'react-hot-toast';
import { MessageSquare, Users, Shield, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);

  const handleAuth = async (data: any, isLog: boolean) => {
    setFieldErrors({});
    setLoading(true);

    try {
      if (isLog) {
        await authService.login({
          email: data.email,
          password: data.password,
        });
        toast.success('Login successful');
      } else {
        await authService.register({
          username: data.username,
          email: data.email,
          password: data.password,
        });
        toast.success('Registration successful');
      }
      router.push('/');
    } catch (err: any) {
      if (err.error && Array.isArray(err.error)) {
        const errors: { [key: string]: string } = {};
        err.error.forEach((e: any) => {
          errors[e.field] = e.message;
        });
        setFieldErrors(errors);
      } else {
        toast.error(err.message || 'Something went wrong');
      }
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAuth(formData, isLogin);
  };

  const handleAutoLogin = () => {
    setFormData({ ...formData, email: 'test1@gmail.com', password: '123456' });
    setIsLogin(true);
    handleAuth({ email: 'test1@gmail.com', password: '123456' }, true);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* Left Column - Branding / Design */}
      <div className="hidden lg:flex w-5/12 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Background abstract shapes */}
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-96 h-96 bg-white/10 rounded-full blur-3xl rounded-tl-[100px]" />
        <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-white text-violet-600 flex items-center justify-center rounded-xl shadow-lg font-bold text-xl">
              <MessageSquare size={20} fill="currentColor" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight">ChatApp</span>
          </div>

          <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1] mb-6">
            Connect & Collaborate <br /> Instantly.
          </h2>
          <p className="text-white/80 text-lg max-w-sm font-medium mb-10">
            Join thousands of teams who communicate faster, better, and with more clarity.
          </p>

          <div className="space-y-4">
            {[
              { icon: Users, text: 'Real-time Group & Direct Messaging' },
              { icon: Zap, text: 'Lightning Fast Message Delivery' },
              { icon: Shield, text: 'Secure & Private Conversations' }
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3 font-medium text-white/90">
                <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-sm">
                  <feature.icon size={18} className="text-purple-200" />
                </div>
                {feature.text}
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 pt-12 border-t border-white/10 mt-12 w-full max-w-sm">
          <p className="text-sm font-bold text-white/60 uppercase tracking-widest mb-3">What users say</p>
          <p className="text-lg italic font-medium leading-relaxed mb-4">
            &quot;This application completely transformed the way our remote team operates. The speed and design are unparalleled.&quot;
          </p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">AK</div>
            <div>
              <p className="text-sm font-bold">Humayun Imtiaz</p>
              <p className="text-xs text-white/60 font-medium">Head of Engineering</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-24 bg-white relative">
        <div className="w-full max-w-md mx-auto">

          <div className="lg:hidden flex items-center gap-2 mb-10 text-violet-600">
            <div className="w-8 h-8 bg-violet-600 text-white flex items-center justify-center rounded-lg shadow-sm font-bold">
              <MessageSquare size={16} fill="currentColor" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900">ChatApp</span>
          </div>

          <div className="mb-10">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
              {isLogin ? 'Welcome back' : 'Create an account'}
            </h1>
            <p className="text-slate-500 font-medium text-sm">
              {isLogin ? 'Please enter your details to sign in.' : 'Start your journey with us today.'}
            </p>
          </div>

          {/* Test Login Button */}
          {isLogin && (
            <div className="mb-6">
              <button
                type="button"
                onClick={handleAutoLogin}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-violet-50 text-violet-700 hover:bg-violet-100 font-bold rounded-xl border border-violet-100 transition-all group"
              >
                <Zap size={18} className="group-hover:scale-110 transition-transform" />
                Auto-Login as Test User (test1@gmail.com)
              </button>

              <div className="relative mt-6 mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-white text-slate-400 font-medium uppercase tracking-widest text-[10px]">Or continue with email</span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-slate-700">Username</label>
                <input
                  type="text"
                  placeholder="e.g. john_doe"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-medium text-slate-900 placeholder:text-slate-400 ${fieldErrors.username ? 'border-red-400' : 'border-slate-200'
                    }`}
                />
                {fieldErrors.username && <p className="text-red-500 text-xs font-bold mt-1">{fieldErrors.username}</p>}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-slate-700">Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-medium text-slate-900 placeholder:text-slate-400 ${fieldErrors.email ? 'border-red-400' : 'border-slate-200'
                  }`}
              />
              {fieldErrors.email && <p className="text-red-500 text-xs font-bold mt-1">{fieldErrors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-bold text-slate-700">Password</label>
                {isLogin && (
                  <a href="#" className="text-xs font-bold text-violet-600 hover:text-violet-700 transition">Forgot password?</a>
                )}
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-medium text-slate-900 placeholder:text-slate-400 ${fieldErrors.password ? 'border-red-400' : 'border-slate-200'
                  }`}
              />
              {fieldErrors.password && <p className="text-red-500 text-xs font-bold mt-1">{fieldErrors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-bold transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 group mt-2 shadow-lg shadow-slate-200"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center sm:text-left flex items-center justify-center sm:justify-start gap-1 text-sm font-medium text-slate-500">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setFieldErrors({});
                setFormData({ username: '', email: '', password: '' });
              }}
              className="text-violet-600 font-bold hover:text-violet-700 transition hover:underline"
            >
              {isLogin ? "Sign up" : 'Log in'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}