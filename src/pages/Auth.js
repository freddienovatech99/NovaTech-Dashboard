import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Auth() {
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [toast, setToast] = useState(null);
  const [resetModal, setResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");

  useEffect(() => {
    const user =
      JSON.parse(localStorage.getItem("nova_current_user")) ||
      JSON.parse(sessionStorage.getItem("nova_current_user"));
    if (user) navigate("/dashboard");
  }, [navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const users = JSON.parse(localStorage.getItem("nova_users")) || [];

    if (isLogin) {
      const found = users.find((u) => u.email === email && u.password === password);
      if (found) {
        rememberMe
          ? localStorage.setItem("nova_current_user", JSON.stringify(found))
          : sessionStorage.setItem("nova_current_user", JSON.stringify(found));
        setToast({ text: "Login successful!", type: "success" });
        setTimeout(() => navigate("/dashboard"), 1000);
      } else {
        setToast({ text: "Invalid credentials. Please try again.", type: "error" });
      }
    } else {
      if (password !== confirmPassword) return setToast({ text: "Passwords do not match.", type: "error" });
      if (users.find((u) => u.email === email)) return setToast({ text: "Email already registered.", type: "error" });

      const hasOwner = users.some((u) => u.role === "owner");
      const role = hasOwner ? "intern" : "owner";

      const newUser = {
        email,
        password,
        role,
        registeredAt: new Date().toISOString(),
      };
      users.push(newUser);
      localStorage.setItem("nova_users", JSON.stringify(users));
      setToast({ text: `Account created as ${role}. You can log in now.`, type: "success" });
      setIsLogin(true);
    }
  };

  const handleResetPassword = () => {
    const users = JSON.parse(localStorage.getItem("nova_users")) || [];
    const index = users.findIndex((u) => u.email === resetEmail);
    if (index === -1) {
      setToast({ text: "Email not found.", type: "error" });
    } else {
      users[index].password = resetNewPassword;
      localStorage.setItem("nova_users", JSON.stringify(users));
      setToast({ text: "Password updated successfully.", type: "success" });
    }
    setResetModal(false);
    setResetEmail("");
    setResetNewPassword("");
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center text-white overflow-hidden">
      {/* Background with repair-bg.jpg */}
      <div className="absolute inset-0 z-0">
        <img
          src="/repair-bg.jpg"
          alt="Repair Background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/70"></div>
      </div>

      {/* Animated Grid Overlay */}
      <div className="absolute inset-0 z-1 overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}></div>
        {[...Array(6)].map((_, i) => (
          <div 
            key={i}
            className="absolute rounded-full bg-blue-500/20 blur-lg animate-float"
            style={{
              width: `${Math.random() * 200 + 100}px`,
              height: `${Math.random() * 200 + 100}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDuration: `${Math.random() * 20 + 10}s`,
              animationDelay: `${Math.random() * 5}s`
            }}
          ></div>
        ))}
      </div>

      {/* Main Auth Card */}
      <div className="z-20 w-full max-w-md px-8 py-10 bg-gray-900/80 backdrop-blur-sm rounded-xl border border-gray-700/50 shadow-2xl animate-fade-in">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src="/logo.png"
            alt="Nova Tech Logo"
            className="w-20 h-20 object-contain"
          />
        </div>

        {/* Title */}
        <h2 className="text-3xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
          {isLogin ? "Welcome Back" : "Join Nova Tech"}
        </h2>

        {/* Toast Notification */}
        {toast && (
          <div className={`mb-6 p-3 rounded-lg text-center ${
            toast.type === "success" ? "bg-green-600/90" : "bg-red-600/90"
          }`}>
            {toast.text}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Field */}
          <div className="group">
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <div className="relative">
              <input
                type="email"
                placeholder="your@email.com"
                className="w-full p-3 bg-gray-800/70 border border-gray-700 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
                value={email.trim()}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <div className="absolute right-3 top-3 text-blue-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Password Field */}
          <div className="group">
            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="w-full p-3 bg-gray-800/70 border border-gray-700 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-blue-400 transition-colors"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password Field (Sign Up Only) */}
          {!isLogin && (
            <div className="group">
              <label className="block text-sm font-medium text-gray-300 mb-1">Confirm Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full p-3 bg-gray-800/70 border border-gray-700 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          )}

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded"
              />
              <label htmlFor="remember" className="ml-2 text-sm text-gray-300">
                Remember me
              </label>
            </div>
            {isLogin && (
              <button
                type="button"
                onClick={() => setResetModal(true)}
                className="text-sm text-blue-400 hover:text-blue-300 hover:underline transition-colors"
              >
                Forgot password?
              </button>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-lg shadow-lg transition-all duration-300 flex items-center justify-center"
          >
            <span>{isLogin ? "Login" : "Create Account"}</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </button>
        </form>

        {/* Switch Between Login/Signup */}
        <div className="mt-6 text-center text-sm text-gray-400">
          {isLogin ? (
            <p>
              New to Nova Tech?{' '}
              <button
                onClick={() => setIsLogin(false)}
                className="text-blue-400 hover:text-blue-300 hover:underline transition-colors font-medium"
              >
                Create an account
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                onClick={() => setIsLogin(true)}
                className="text-blue-400 hover:text-blue-300 hover:underline transition-colors font-medium"
              >
                Login here
              </button>
            </p>
          )}
        </div>
      </div>

      {/* Password Reset Modal */}
      {resetModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-gray-900/90 border border-gray-700/50 p-8 rounded-xl shadow-2xl w-full max-w-md mx-4">
            <h3 className="text-2xl font-bold mb-4 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              Reset Password
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="w-full p-3 bg-gray-800/70 border border-gray-700 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">New Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full p-3 bg-gray-800/70 border border-gray-700 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  required
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setResetModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetPassword}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-lg transition-all"
                >
                  Reset Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(5%, 5%); }
          50% { transform: translate(10%, 0); }
          75% { transform: translate(5%, -5%); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-float {
          animation: float infinite ease-in-out;
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export default Auth;