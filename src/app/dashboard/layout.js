"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutGrid, 
  Code2, 
  GraduationCap, 
  Search, 
  MapPin, 
  LogOut, 
  Menu, 
  X,
  Sun,
  Moon
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: "Overview", href: "/dashboard", icon: LayoutGrid },
    { name: "Practice Tracking", href: "/dashboard/practice", icon: Code2 },
    { name: "Exam Results", href: "/dashboard/results", icon: GraduationCap },
    { name: "Student Search", href: "/dashboard/search", icon: Search },
    { name: "Sitting Plan", href: "/dashboard/sitting-attendance", icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] transition-colors duration-300">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 glass-panel border-r border-gray-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="flex items-center justify-between h-20 px-6 border-b border-gray-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                E
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                EduCode
              </span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all duration-200 group ${
                    isActive
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/30 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800/50 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-gray-200 dark:border-slate-800">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold shadow-md">
                {user?.name?.charAt(0) || "A"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {user?.name || "Admin User"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.email || "admin@educode.com"}
                </p>
              </div>
              <button 
                onClick={logout}
                className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:pl-72 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-20 glass-panel border-b border-gray-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white hidden sm:block">
              {navigation.find(n => n.href === pathname)?.name || "Dashboard"}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700 transition-all shadow-sm"
              title="Toggle Theme"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
