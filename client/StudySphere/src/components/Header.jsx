import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import LogoutBtn from "./LogoutBtn.jsx";
import { Bell, Menu, X } from "lucide-react";
import { io } from "socket.io-client";

// Connect to Socket.io Server
const socket = io("http://localhost:5000", {
  withCredentials: true, // If authentication is required
  transports: ["websocket"], // Ensures WebSocket connection
});

function Header() {
  const authStatus = useSelector((state) => state.auth.status);
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const notificationRef = useRef(null);

  // Set active item based on current path
  useEffect(() => {
    // Update active state based on current location
    const currentPath = location.pathname;
    setActiveItem(currentPath);
  }, [location]);

  // Track active navigation item
  const [activeItem, setActiveItem] = useState("/");

  useEffect(() => {
    if (authStatus && socket) {
      socket.on("new_message_notification", (notification) => {
        setNotifications((prev) => [notification, ...prev]);
      });

      return () => {
        socket.off("new_message_notification");
      };
    }
  }, [authStatus]);

  // Handle clicks outside notification panel
  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleNavigation = (slug) => {
    setActiveItem(slug);
    navigate(slug);
    setMobileMenuOpen(false); // Close mobile menu when navigating
  };

  const clearNotifications = () => {
    setNotifications([]);
    setShowNotifications(false);
  };

  const navItems = [
    { title: "Home", slug: "/", icon: "🏠", authRequired: false },
    { title: "Login", slug: "/login", icon: "🔑", authRequired: false, hideWhenAuth: true },
    { title: "Your Groups", slug: "/group", icon: "👥", authRequired: true },
    { title: "Join Groups", slug: "/joinGroups", icon: "🤝", authRequired: true },
    { title: "Partner", slug: "/Partner", icon: "👋", authRequired: true },
    { title: "Profile", slug: "/profile", icon: "👤", authRequired: true },
  ];

  // Filter nav items based on auth status
  const filteredNavItems = navItems.filter(item => 
    (item.authRequired === false || authStatus) && 
    (!item.hideWhenAuth || !authStatus)
  );

  return (
    <header className="relative w-full">
      <div className="fixed top-0 w-full z-50">
        <div className="w-full flex justify-between items-center px-4 md:px-8 h-16 md:h-20 bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 backdrop-blur-md bg-opacity-90 shadow-lg border-b border-white/10">
          <style jsx>{`
            @keyframes gradient-x {
              0% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
              100% { background-position: 0% 50%; }
            }
            .animate-gradient-x {
              background-size: 200% 200%;
              animation: gradient-x 15s ease infinite;
            }
            .nav-item::before {
              content: '';
              position: absolute;
              bottom: -2px;
              left: 50%;
              width: 0;
              height: 3px;
              background: white;
              transition: all 0.3s ease;
              transform: translateX(-50%);
            }
            .nav-item:hover::before,
            .nav-item.active::before {
              width: 85%;
            }
          `}</style>

          {/* Logo/Branding */}
          <div className="flex items-center">
            <h1 className="text-white font-bold text-xl md:text-2xl">StudyHive</h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center h-full space-x-6 lg:space-x-10">
            {filteredNavItems.map((item) => (
              <div key={item.title} className="h-full flex items-center">
                <button
                  className={`nav-item relative px-3 py-2 text-white font-medium text-base transition-all duration-300 ease-in-out transform hover:scale-105 flex items-center space-x-2 ${
                    activeItem === item.slug ? "active" : ""
                  }`}
                  onClick={() => handleNavigation(item.slug)}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="tracking-wide">{item.title}</span>
                </button>
              </div>
            ))}
          </nav>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white p-2"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Right Section - User Actions */}
          {authStatus && (
            <div className="hidden md:flex items-center space-x-6">
              {/* Notification Bell */}
              <div className="relative" ref={notificationRef}>
                <button 
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell className="text-white w-6 h-6" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {notifications.length}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-72 bg-white text-black shadow-lg rounded-lg overflow-hidden z-50">
                    <div className="p-3 bg-gray-100 border-b border-gray-200 font-medium flex justify-between items-center">
                      <span>Notifications</span>
                      {notifications.length > 0 && (
                        <button
                          className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition-colors"
                          onClick={clearNotifications}
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <p className="p-4 text-gray-500 text-center">No new notifications</p>
                    ) : (
                      <div className="max-h-64 overflow-y-auto">
                        {notifications.map((notif, index) => (
                          <div key={index} className="p-3 border-b border-gray-100 hover:bg-gray-50">
                            <p className="font-medium text-gray-800">{notif.sender}</p>
                            <p className="text-gray-600 text-sm">{notif.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Logout Button */}
              <LogoutBtn />
            </div>
          )}
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-indigo-900 text-white shadow-lg animate-fade-in-down">
            {filteredNavItems.map((item) => (
              <button
                key={item.title}
                className={`w-full text-left px-6 py-3 flex items-center space-x-3 ${
                  activeItem === item.slug ? "bg-indigo-800" : "hover:bg-indigo-800"
                }`}
                onClick={() => handleNavigation(item.slug)}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.title}</span>
              </button>
            ))}
            {authStatus && (
              <>
                <div className="border-t border-indigo-800 mt-2 pt-2">
                  <button
                    className="w-full text-left px-6 py-3 flex items-center space-x-3 hover:bg-indigo-800"
                    onClick={() => {
                      setShowNotifications(!showNotifications);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <Bell className="h-5 w-5" />
                    <span>Notifications</span>
                    {notifications.length > 0 && (
                      <span className="ml-auto bg-red-600 text-white text-xs rounded-full px-2 py-1">
                        {notifications.length}
                      </span>
                    )}
                  </button>
                  <div className="px-6 py-3">
                    <LogoutBtn />
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Spacing to prevent content from hiding under the fixed header */}
      <div className="h-16 md:h-20"></div>
    </header>
  );
}

export default Header;