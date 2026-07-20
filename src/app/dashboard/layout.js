"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutGrid, 
  Code2, 
  GraduationCap, 
  Search, 
  Users, 
  LogOut, 
  Menu, 
  X,
  Sun,
  Moon,
  Settings,
  Save,
  Loader2,
  User
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { DashboardProvider } from "@/context/DashboardContext";
import { API_CONFIG } from "@/utils/api";

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [profileData, setProfileData] = useState({ admin_name: "", email: "", password: "" });

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(API_CONFIG.admin.me, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });
      const data = await res.json();
      if (data.success) {
        alert("Profile updated successfully! Please login again.");
        setIsProfileModalOpen(false);
        setTimeout(() => logout(), 1500);
      } else {
        alert(data.message || "Failed to update profile");
      }
    } catch (err) {
      alert("Server error updating profile");
    } finally {
      setIsUpdating(false);
    }
  };

  const navigation = [
    { name: "Overview", href: "/dashboard", icon: LayoutGrid },
    { name: "Practice Tracking", href: "/dashboard/practice", icon: Code2 },
    { name: "Exam Results", href: "/dashboard/results", icon: GraduationCap },
    { name: "Student Search", href: "/dashboard/search", icon: Search },
    { name: "Live Roster", href: "/dashboard/live-roster", icon: Users },
  ];

  if (pathname && pathname.includes("/details-analysis")) {
    return (
      <DashboardProvider>
        {children}
      </DashboardProvider>
    );
  }

  return (
    <div className="min-h-screen neu-page transition-colors duration-300 relative">
      <div className="hidden dark:block fixed top-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none z-0 transform-gpu will-change-transform" />
      <div className="hidden dark:block fixed bottom-0 left-0 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[120px] pointer-events-none z-0 transform-gpu will-change-transform" />

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 z-[100] neu-rail transform transition-all duration-300 ease-in-out overflow-hidden flex flex-col ${
          isHovered ? "w-72 shadow-2xl" : "w-20"
        } ${sidebarOpen ? "translate-x-0 w-72" : "-translate-x-full lg:translate-x-0"}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="flex items-center justify-between h-20 px-5 border-b border-[var(--neu-divider)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 shrink-0 rounded-xl neu-btn-primary flex items-center justify-center font-bold text-xl">
                E
              </div>
              <span className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 whitespace-nowrap transition-opacity duration-300 ${isHovered || sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
                TheEduCode
              </span>
            </div>
            {(isHovered || sidebarOpen) && (
              <div className="flex items-center gap-2">
                <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                  <X className="w-6 h-6" />
                </button>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto custom-scrollbar overflow-x-hidden">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={(!isHovered && !sidebarOpen) ? item.name : undefined}
                  className={`flex items-center gap-3 px-3 py-3.5 rounded-xl font-medium transition-all duration-200 group ${
                    isActive
                      ? "neu-rail-active"
                      : "text-gray-600 dark:text-gray-400 hover:bg-[var(--neu-success-soft)] hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  <Icon className={`w-6 h-6 shrink-0 transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
                  <span className={`whitespace-nowrap transition-opacity duration-300 ${isHovered || sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="p-3 border-t border-[var(--neu-divider)] flex flex-col gap-2 pb-4">
            <button
              onClick={toggleTheme}
              title={(!isHovered && !sidebarOpen) ? "Toggle Theme" : undefined}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              {theme === "dark" ? <Sun className="w-6 h-6 shrink-0" /> : <Moon className="w-6 h-6 shrink-0" />}
              <span className={`whitespace-nowrap transition-opacity duration-300 ${isHovered || sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
                Toggle Theme
              </span>
            </button>

            <button 
              onClick={() => {
                setProfileData({ admin_name: user?.name || "", email: user?.email || "", password: "" });
                setIsProfileModalOpen(true);
              }}
              title={(!isHovered && !sidebarOpen) ? "My Profile" : undefined}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              <User className="w-6 h-6 shrink-0" />
              <span className={`whitespace-nowrap transition-opacity duration-300 ${isHovered || sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
                My Profile
              </span>
            </button>

            <button 
              onClick={logout}
              title={(!isHovered && !sidebarOpen) ? "Logout" : undefined}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="w-6 h-6 shrink-0" />
              <span className={`whitespace-nowrap transition-opacity duration-300 ${isHovered || sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
                Logout
              </span>
            </button>
            
            {(isHovered || sidebarOpen) && (
              <div className="flex items-center gap-3 px-3 py-3 rounded-xl neu-inset mt-2">
                <div className="w-8 h-8 shrink-0 rounded-full neu-tile flex items-center justify-center neu-accent-text font-bold" suppressHydrationWarning>
                  {user?.name?.charAt(0) || "A"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate" suppressHydrationWarning>
                    {user?.name || "Admin User"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate" suppressHydrationWarning>
                    {user?.email || "admin@educode.com"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="neu-raised rounded-2xl p-6 shadow-2xl max-w-md w-full animate-slideInRight">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Edit Profile</h3>
              <button onClick={() => setIsProfileModalOpen(false)} className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input 
                  type="text" 
                  value={profileData.admin_name}
                  onChange={(e) => setProfileData({...profileData, admin_name: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input 
                  type="email" 
                  value={profileData.email}
                  onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password (Optional)</label>
                <input 
                  type="password" 
                  value={profileData.password}
                  onChange={(e) => setProfileData({...profileData, password: e.target.value})}
                  placeholder="Leave blank to keep current"
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <button 
                type="submit"
                disabled={isUpdating}
                className="w-full mt-6 flex items-center justify-center gap-2 neu-btn-primary py-3 rounded-xl font-semibold transition-colors disabled:opacity-50"
              >
                {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {isUpdating ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="lg:pl-20 flex flex-col min-h-screen relative z-10 transition-all duration-300">
        {/* Top Header - Mobile Only */}
        <header className="lg:hidden sticky top-0 z-30 h-16 neu-raised border-b border-[var(--neu-divider)] px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {navigation.find(n => n.href === pathname)?.name || "Dashboard"}
            </h1>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-4 py-4 sm:px-4 lg:px-6 lg:pt-4 lg:pb-8">
          <div className="max-w-7xl mx-auto">
            <DashboardProvider>
              {children}
            </DashboardProvider>
          </div>
        </main>
      </div>
    </div>
  );
}
