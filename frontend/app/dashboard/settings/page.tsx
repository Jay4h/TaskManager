"use client";

import { useState, useEffect, useRef } from "react";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { Avatar } from "primereact/avatar";
import { Password } from "primereact/password";
import { authApi } from "../../../src/api/auth.api";
import axios from "axios";

type SettingsSection = "profile" | "account" | "appearance" | "audio-video" | "accessibility" | "notifications";

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("profile");
  
  // User Profile State
  const [user, setUser] = useState<{ firstName: string; lastName: string; email: string; avatar?: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  // Password State
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [accentColor, setAccentColor] = useState("#4F46E5");
  
  // Audio/Video State
  const [devices, setDevices] = useState<{ audioIn: any[]; videoIn: any[] }>({ audioIn: [], videoIn: [] });
  const [selectedDevices, setSelectedDevices] = useState({ mic: "", camera: "" });
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser({ 
          firstName: parsed.firstName || "", 
          lastName: parsed.lastName || "", 
          email: parsed.email || "",
          avatar: parsed.avatar || ""
        });
      } catch (e) {
        console.error("Failed to parse user", e);
      }
    }

    if (typeof window !== "undefined") {
      const storedTheme = localStorage.getItem("theme-mode");
      const isDark = storedTheme === "dark" || document.documentElement.classList.contains("dark");
      setIsDarkMode(isDark);

      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        navigator.mediaDevices.enumerateDevices().then((devs) => {
          setDevices({
            audioIn: devs.filter(d => d.kind === "audioinput").map(d => ({ label: d.label || `Mic ${d.deviceId.slice(0,5)}`, value: d.deviceId })),
            videoIn: devs.filter(d => d.kind === "videoinput").map(d => ({ label: d.label || `Camera ${d.deviceId.slice(0,5)}`, value: d.deviceId }))
          });
        }).catch(err => console.warn("Media devices access denied", err));
      }
      
      const storedMic = localStorage.getItem("preferred-mic");
      const storedCam = localStorage.getItem("preferred-camera");
      if (storedMic || storedCam) {
        setSelectedDevices({ mic: storedMic || "", camera: storedCam || "" });
      }

      const storedColor = localStorage.getItem("accent-color");
      if (storedColor) {
        setAccentColor(storedColor);
        applyAccentColor(storedColor);
      }
    }
  }, []);

  const applyAccentColor = (color: string) => {
    const root = document.documentElement;
    root.style.setProperty("--accent", color);
    root.style.setProperty("--ring", color);
    root.style.setProperty("--sidebar-ring", color);
    root.style.setProperty("--ck-blue", color);
    root.style.setProperty("--chart-1", color);
    // Darker version for hover
    root.style.setProperty("--accent-hover", color + "CC"); 
  };

  const updateAccentColor = (color: string) => {
    setAccentColor(color);
    applyAccentColor(color);
    localStorage.setItem("accent-color", color);
    window.dispatchEvent(new Event("accent-color-updated"));
  };

  const handleProfileUpdate = async (e?: React.FormEvent, updatedAvatar?: string) => {
    if (e) e.preventDefault();
    if (!user) return;
    
    setProfileLoading(true);
    setProfileError("");
    setProfileSuccess("");
    
    try {
      const payload = { 
        firstName: user.firstName, 
        lastName: user.lastName,
        avatar: updatedAvatar !== undefined ? updatedAvatar : user.avatar
      };
      
      const res = await authApi.updateProfile(payload);
      setProfileSuccess(res.message);
      
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      const newUser = { ...stored, ...payload };
      localStorage.setItem("user", JSON.stringify(newUser));
      
      window.dispatchEvent(new Event("user-profile-updated"));
      
      if (updatedAvatar !== undefined) {
        setUser(prev => prev ? { ...prev, avatar: updatedAvatar } : null);
      }
    } catch (err: any) {
      setProfileError(err.response?.data?.error || "Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        handleProfileUpdate(undefined, base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    setPasswordLoading(true);
    setPasswordError("");
    setPasswordSuccess("");
    try {
      const res = await authApi.changePassword(passwordForm.currentPassword, passwordForm.newPassword, passwordForm.confirmPassword);
      setPasswordSuccess(res.message);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      setPasswordError(err.response?.data?.error || "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme-mode", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme-mode", "light");
    }
    window.dispatchEvent(new Event("appearance-updated"));
  };

  const menuItems = [
    { id: "profile", label: "Profile", icon: "pi pi-user" },
    { id: "account", label: "Account & Security", icon: "pi pi-lock" },
    { id: "appearance", label: "Appearance", icon: "pi pi-palette" },
    { id: "audio-video", label: "Audio & Video", icon: "pi pi-video" },
    { id: "accessibility", label: "Accessibility", icon: "pi pi-eye" },
    { id: "notifications", label: "Notifications", icon: "pi pi-bell" },
  ];

  return (
    <div className="flex flex-col h-full animate-fade-in bg-[var(--bg-canvas)]">
      <div className="px-8 py-6 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
        <p className="text-[13px] text-[var(--text-muted)] mt-1">Manage your account settings and preferences.</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar Nav */}
        <div className="w-72 bg-[var(--bg-surface)] border-r border-[var(--border-subtle)] flex flex-col p-4 gap-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as SettingsSection)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-[14px] font-medium ${
                activeSection === item.id 
                  ? "bg-[var(--accent-subtle)] text-[var(--accent)]" 
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-canvas)]"
              }`}
            >
              <i className={`${item.icon} text-[16px]`} />
              {item.label}
            </button>
          ))}
        </div>

        {/* Right Content Pane */}
        <div className="flex-1 overflow-y-auto bg-[var(--bg-canvas)] p-8">
          <div className="max-w-3xl mx-auto animate-slide-up">
            
            {activeSection === "profile" && (
              <div className="space-y-8">
                <section>
                  <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">Public Profile</h2>
                  <div className="flex items-start gap-8">
                    <div className="flex flex-col items-center gap-4">
                      <div 
                        className="relative group cursor-pointer" 
                        onClick={handleAvatarClick}
                      >
                        <Avatar 
                          image={user?.avatar} 
                          label={!user?.avatar ? `${user?.firstName?.[0]}${user?.lastName?.[0]}` : undefined} 
                          shape="circle" 
                          size="xlarge" 
                          className="w-32 h-32 text-2xl border-4 border-[var(--bg-surface)] shadow-md"
                        />
                        <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <i className="pi pi-camera text-white text-2xl" />
                        </div>
                        {profileLoading && (
                          <div className="absolute inset-0 bg-[var(--bg-surface)]/60 rounded-full flex items-center justify-center">
                            <i className="pi pi-spin pi-spinner text-[var(--accent)] text-2xl" />
                          </div>
                        )}
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                      />
                      <p className="text-[12px] text-[var(--text-muted)] text-center">Click to change avatar</p>
                    </div>

                    <form onSubmit={handleProfileUpdate} className="flex-1 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                          <label className="text-[13px] font-semibold text-[var(--text-secondary)]">First Name</label>
                          <InputText 
                            value={user?.firstName || ""} 
                            onChange={(e) => setUser(u => u ? {...u, firstName: e.target.value} : null)} 
                            className="w-full bg-[var(--bg-surface)] border-[var(--border-subtle)]"
                            placeholder="e.g. John"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-[13px] font-semibold text-[var(--text-secondary)]">Last Name</label>
                          <InputText 
                            value={user?.lastName || ""} 
                            onChange={(e) => setUser(u => u ? {...u, lastName: e.target.value} : null)} 
                            className="w-full bg-[var(--bg-surface)] border-[var(--border-subtle)]"
                            placeholder="e.g. Doe"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[13px] font-semibold text-[var(--text-secondary)]">Bio</label>
                        <textarea 
                          rows={4}
                          className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-md p-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all resize-none"
                          placeholder="Tell us a little about yourself..."
                        />
                      </div>
                      <div className="flex items-center gap-4 pt-4">
                        <button 
                          type="submit" 
                          disabled={profileLoading} 
                          className="claude-btn-primary px-8 py-2.5 flex items-center gap-2 min-w-[140px] justify-center text-[14px]"
                        >
                          {profileLoading ? (
                            <i className="pi pi-spin pi-spinner" />
                          ) : (
                            "Update Profile"
                          )}
                        </button>
                        {profileSuccess && <span className="text-green-500 text-[13px] font-medium"><i className="pi pi-check-circle mr-1" /> {profileSuccess}</span>}
                        {profileError && <span className="text-red-500 text-[13px] font-medium"><i className="pi pi-times-circle mr-1" /> {profileError}</span>}
                      </div>
                    </form>
                  </div>
                </section>
              </div>
            )}

            {activeSection === "account" && (
              <div className="space-y-8 animate-fade-in">
                <section>
                  <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">Security Settings</h2>
                  
                  <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden">
                    <div className="p-6 flex items-center justify-between hover:bg-[var(--nav-hover-bg)]/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                          <i className="pi pi-lock text-lg" />
                        </div>
                        <div>
                          <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">Password</h3>
                          <p className="text-[13px] text-[var(--text-muted)]">Set a unique password to protect your account.</p>
                        </div>
                      </div>
                      <Button 
                        label={showPasswordForm ? "Cancel" : "Change Password"} 
                        onClick={() => setShowPasswordForm(!showPasswordForm)}
                        className={showPasswordForm ? "p-button-text p-button-secondary" : "p-button-primary px-6"} 
                      />
                    </div>

                    {showPasswordForm && (
                      <div className="px-6 pb-6 pt-2 border-t border-[var(--border-subtle)] animate-slide-up bg-[var(--bg-canvas)]/20">
                        <form onSubmit={handlePasswordUpdate} className="max-w-md space-y-6 pt-4">
                          <div className="space-y-4">
                            <div className="flex flex-col gap-2">
                              <label className="text-[13px] font-semibold text-[var(--text-secondary)]">Current Password</label>
                              <Password 
                                value={passwordForm.currentPassword} 
                                onChange={(e) => setPasswordForm(p => ({...p, currentPassword: e.target.value}))} 
                                toggleMask 
                                feedback={false}
                                className="w-full"
                                inputClassName="w-full"
                                placeholder="Current password"
                              />
                            </div>
                            <div className="flex flex-col gap-2">
                              <label className="text-[13px] font-semibold text-[var(--text-secondary)]">New Password</label>
                                <Password 
                                  value={passwordForm.newPassword} 
                                  onChange={(e) => setPasswordForm(p => ({...p, newPassword: e.target.value}))} 
                                  toggleMask 
                                  promptLabel="Choose a strong password"
                                  appendTo="self"
                                  className="w-full"
                                  inputClassName="w-full"
                                  placeholder="New password"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                              <label className="text-[13px] font-semibold text-[var(--text-secondary)]">Confirm New Password</label>
                              <Password 
                                value={passwordForm.confirmPassword} 
                                onChange={(e) => setPasswordForm(p => ({...p, confirmPassword: e.target.value}))} 
                                toggleMask 
                                feedback={false}
                                className="w-full"
                                inputClassName="w-full"
                                placeholder="Confirm new password"
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 pt-4 border-t border-[var(--border-subtle)]">
                            <button 
                              type="submit" 
                              disabled={passwordLoading} 
                              className="claude-btn-primary w-full py-3 flex items-center justify-center gap-2 text-[14px] font-bold"
                            >
                              {passwordLoading ? (
                                <i className="pi pi-spin pi-spinner" />
                              ) : (
                                "Update Password"
                              )}
                            </button>
                          </div>
                          {passwordSuccess && <p className="text-green-500 text-[13px] font-medium text-center">{passwordSuccess}</p>}
                          {passwordError && <p className="text-red-500 text-[13px] font-medium text-center">{passwordError}</p>}
                        </form>
                      </div>
                    )}
                  </div>
                </section>
                
                <section className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-2xl p-6">
                  <h3 className="text-red-600 dark:text-red-400 font-bold mb-2">Danger Zone</h3>
                  <p className="text-[13px] text-[var(--text-muted)] mb-4">Once you delete your account, there is no going back. Please be certain.</p>
                  <Button label="Delete Account" className="p-button-danger p-button-outlined" />
                </section>
              </div>
            )}

            {activeSection === "appearance" && (
              <div className="space-y-8">
                <section>
                  <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">Interface Customization</h2>
                  <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-8 space-y-10">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">Theme Mode</h3>
                        <p className="text-[13px] text-[var(--text-muted)] mt-1">Switch between light and dark interface.</p>
                      </div>
                      <Button 
                        icon={isDarkMode ? "pi pi-sun" : "pi pi-moon"} 
                        label={isDarkMode ? "Light Mode" : "Dark Mode"} 
                        className={isDarkMode ? "p-button-outlined p-button-warning" : "p-button-outlined p-button-secondary"}
                        onClick={toggleTheme}
                      />
                    </div>

                    <div className="border-t border-[var(--border-subtle)] pt-8">
                      <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">Accent Color</h3>
                      <p className="text-[13px] text-[var(--text-muted)] mt-1 mb-6">Personalize the primary highlights and buttons.</p>
                      <div className="flex flex-wrap gap-4">
                        {["#4F46E5", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#0ea5e9"].map(color => (
                          <div 
                            key={color} 
                            className={`w-12 h-12 rounded-2xl cursor-pointer border-4 transition-all shadow-md flex items-center justify-center hover:scale-110
                              ${accentColor === color ? "border-[var(--text-primary)]" : "border-transparent"}`}
                            style={{ backgroundColor: color }}
                            onClick={() => updateAccentColor(color)}
                          >
                            {accentColor === color && <i className="pi pi-check text-white" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeSection === "audio-video" && (
              <div className="space-y-8">
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">Calling Preferences</h2>
                <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 space-y-6">
                  <div className="grid grid-cols-1 gap-6 max-w-md">
                    <div className="flex flex-col gap-2">
                      <label className="text-[13px] font-semibold text-[var(--text-secondary)]">Input Microphone</label>
                      <Dropdown 
                        value={selectedDevices.mic} 
                        options={devices.audioIn} 
                        optionLabel="label" 
                        optionValue="value"
                        placeholder="Select Microphone"
                        onChange={(e) => {
                          setSelectedDevices(prev => ({...prev, mic: e.value}));
                          localStorage.setItem("preferred-mic", e.value);
                        }}
                        className="w-full"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[13px] font-semibold text-[var(--text-secondary)]">Output Speaker</label>
                        <Dropdown placeholder="Default Output Device" className="w-full opacity-60" disabled />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[13px] font-semibold text-[var(--text-secondary)]">Video Camera</label>
                      <Dropdown 
                        value={selectedDevices.camera} 
                        options={devices.videoIn} 
                        optionLabel="label" 
                        optionValue="value"
                        placeholder="Select Camera"
                        onChange={(e) => {
                          setSelectedDevices(prev => ({...prev, camera: e.value}));
                          localStorage.setItem("preferred-camera", e.value);
                        }}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(activeSection === "accessibility" || activeSection === "notifications") && (
              <div className="h-96 flex flex-col items-center justify-center text-center opacity-40">
                <i className="pi pi-hammer text-4xl mb-4" />
                <h2 className="text-xl font-bold">Coming Soon</h2>
                <p className="text-[13px]">This section is currently under development.</p>
              </div>
            )}

          </div>
        </div>
      </div>

    </div>
  );
}
