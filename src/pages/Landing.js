import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";

function Landing() {
  const navigate = useNavigate();
  const [showVideo, setShowVideo] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [backgroundMode, setBackgroundMode] = useState('image'); // Add this state
  const videoRef = useRef(null);

  useEffect(() => {
    // User authentication check
    const user =
      JSON.parse(localStorage.getItem("nova_current_user")) ||
      JSON.parse(sessionStorage.getItem("nova_current_user"));
    if (user) navigate("/dashboard");

    // Video transition timer
    const timer = setTimeout(() => setShowVideo(true), 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  const handleVideoError = () => {
    const errorMessages = {
      1: "Video loading aborted",
      2: "Network error occurred",
      3: "Video decoding failed",
      4: "Video not supported"
    };
    
    const errorCode = videoRef.current?.error?.code || 0;
    setVideoError(errorMessages[errorCode] || "Video failed to load");
    
    // Fallback to static image if video fails
    setTimeout(() => setShowVideo(false), 2000);
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 text-white overflow-hidden">
      {/* Background Section */}
      <div className="absolute inset-0 z-0">
        {/* Static Image Background */}
        <div className={`w-full h-full transition-opacity duration-1000 ${showVideo ? 'opacity-0' : 'opacity-100'}`}>
          <img
            src="/repair-bg.jpg"
            alt="Repair Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/70"></div>
        </div>

        {/* Video Background */}
        {showVideo && (
          <div className="absolute inset-0 transition-opacity duration-1000 opacity-100">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
              poster="/repair-bg.jpg" // Shows while loading
              onError={(e) => {
                console.error('Video error:', e.target.error);
                setBackgroundMode('image'); // Switch to image mode on error
              }}
            >
              <source 
                src="/background-video.mp4" 
                type="video/mp4"
              />
            </video>
            {/* Striped Overlay */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            ></div>
          </div>
        )}

        {/* Error Message Overlay */}
        {videoError && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="bg-black/80 p-4 rounded-lg max-w-md mx-4 text-center">
              <p className="text-red-400 font-medium mb-2">Background Video Error</p>
              <p className="text-gray-300 text-sm">{videoError}</p>
              <p className="text-gray-500 text-xs mt-2">Using static background instead</p>
            </div>
          </div>
        )}
      </div>

      {/* Rest of your existing content (unchanged) */}
      <div className="absolute inset-0 z-1 overflow-hidden">
        {/* Your animated grid overlay */}
      </div>

      {/* Main Content */}
      <div className="z-20 text-center space-y-8 max-w-2xl mx-auto px-8 py-12 bg-gray-900/80 backdrop-blur-sm rounded-xl border border-gray-700/50 shadow-2xl animate-fade-in">
        {/* Animated Logo */}
        <div className="relative inline-block mb-6 group">
          <img
            src="/logo.png"
            alt="Nova Tech Logo"
            className="w-32 h-32 object-contain transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-md animate-pulse-slow -z-10"></div>
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 leading-tight">
          Nova Tech <span className="text-white">Service Hub</span>
        </h1>
        
        <h2 className="text-xl text-gray-300 mt-3">
          Internal <span className="text-blue-400">Management System</span>
        </h2>

        {/* Description */}
        <div className="text-gray-300 max-w-md mx-auto space-y-4">
          <p>
            Secure portal for managers, technicians, and interns to manage customer repairs and service history.
          </p>
          <div className="border-t border-gray-700/50 pt-4">
            <p className="text-sm text-gray-400">
              Authorized personnel only. All activities are monitored.
            </p>
          </div>
        </div>

        {/* Role Indicators */}
        <div className="grid grid-cols-3 gap-3 mt-8">
          {[
            { title: "Managers", color: "bg-blue-600/50" },
            { title: "Technicians", color: "bg-purple-600/50" },
            { title: "Interns", color: "bg-gray-700/50" }
          ].map((role, i) => (
            <div 
              key={i}
              className={`${role.color} py-2 rounded-lg border border-gray-700/50 hover:scale-105 transition-transform`}
            >
              <span className="text-sm font-medium">{role.title}</span>
            </div>
          ))}
        </div>

        {/* Login Button */}
        <div className="mt-10">
          <Link
            to="/auth"
            className="relative inline-flex items-center justify-center px-8 py-3.5 overflow-hidden font-medium group bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all"
          >
            <span className="relative z-10 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
              </svg>
              Employee Login
            </span>
            <span className="absolute inset-0 bg-gradient-to-br from-blue-700 to-purple-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
          </Link>
        </div>

        {/* Security Footer */}
        <div className="mt-8 text-xs text-gray-500 border-t border-gray-700/30 pt-4">
          <p>Nova Tech Internal System • v1.0</p>
        </div>
      </div>

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
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.4; }
        }
        .animate-float {
          animation: float infinite ease-in-out;
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
        .animate-pulse-slow {
          animation: pulse-slow 6s infinite;
        }
      `}</style>
    </div>
  );
}

export default Landing;