"use client";
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { authApi } from "../../../src/api/auth.api";
import type { LoginRequest } from "../../../src/types/auth";

type User = {
    firstName: string;
    lastName: string;
    email: string;
};

export default function LoginForm() {
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [error, setError] = useState<string>("");
    const [isUpdatePasswordOpen, setIsUpdatePasswordOpen] = useState(false);
    const [passwordError, setPasswordError] = useState<string>("");
    const [passwordSuccess, setPasswordSuccess] = useState<string>("");
    const [isPasswordLoading, setIsPasswordLoading] = useState(false);
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
        const getApiErrorMessage = (err: unknown, fallback: string) => {
            if (axios.isAxiosError(err)) {
                const data = err.response?.data as { error?: string; message?: string } | undefined;
                return data?.error || data?.message || err.message || fallback;
            }

            if (err instanceof Error) return err.message;
            return fallback;
        };

    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Check for existing token on component mount
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            // Decode token to get user info (basic decode, not verification)
            try {
                // Fetch user details or use stored user data
                const storedUser = localStorage.getItem("user");
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                }
            } catch (error) {
                console.error("Invalid token:", error);
                localStorage.removeItem("token");
                localStorage.removeItem("user");
            }
        }
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        if (isDropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isDropdownOpen]);

    const openModal = () => {
        setIsOpen(true);
        setIsRegisterMode(false);
        setError("");
    };
    const closeModal = () => {
        setIsOpen(false);
        setIsRegisterMode(false);
        setError("");
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        setIsDropdownOpen(false);
        window.dispatchEvent(new CustomEvent("authStateChanged", { detail: { isLoggedIn: false } }));
    };

    const toggleDropdown = () => {
        setIsDropdownOpen(!isDropdownOpen);
    };

    const openUpdatePasswordModal = () => {
        setPasswordError("");
        setPasswordSuccess("");
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setIsUpdatePasswordOpen(true);
        setIsDropdownOpen(false);
    };

    const closeUpdatePasswordModal = () => {
        setIsUpdatePasswordOpen(false);
        setPasswordError("");
        setPasswordSuccess("");
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    };

    const handlePasswordFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswordForm((prev) => ({ ...prev, [name]: value }));
    };

    const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setPasswordError("");
        setPasswordSuccess("");

        // Validation
        if (!passwordForm.currentPassword) {
            setPasswordError("Current password is required");
            return;
        }
        if (!passwordForm.newPassword) {
            setPasswordError("New password is required");
            return;
        }
        if (!passwordForm.confirmPassword) {
            setPasswordError("Confirm password is required");
            return;
        }
        if (passwordForm.newPassword.length < 6) {
            setPasswordError("New password must be at least 6 characters");
            return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordError("New password and confirm password do not match");
            return;
        }

        try {
            setIsPasswordLoading(true);
            const result = await authApi.changePassword(
                passwordForm.currentPassword,
                passwordForm.newPassword,
                passwordForm.confirmPassword
            );
            setPasswordSuccess(result.message);
            setTimeout(() => {
                closeUpdatePasswordModal();
            }, 2000);
        } catch (error) {
            console.error("Password change error:", error);
            setPasswordError(getApiErrorMessage(error, "Failed to change password"));
        } finally {
            setIsPasswordLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());

        // Client-side validation
        const email = (data.email as string).trim();
        const password = (data.password as string);
        const firstName = (data.firstName as string)?.trim();
        const lastName = (data.lastName as string)?.trim();

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("Invalid email format");
            return;
        }

        // Password validation
        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        // Registration specific validation
        if (isRegisterMode) {
            if (!firstName) {
                setError("First name is required");
                return;
            }
            if (!lastName) {
                setError("Last name is required");
                return;
            }
        }

        try {
            setIsLoading(true);
            let result;
            if (isRegisterMode) {
                // Registration mode
                const registerData = {
                    firstName,
                    lastName,
                    email,
                    password,
                } as unknown as LoginRequest;
                result = await authApi.register(registerData);
            } else {
                // Login mode
                result = await authApi.login(email, password);
            }

            // Store JWT token in localStorage
            localStorage.setItem("token", result.data.token);

            // Use response data for user info
            const userData = {
                firstName: result.data.firstName,
                lastName: result.data.lastName,
                email: result.data.email,
            };

            // Store user data
            localStorage.setItem("user", JSON.stringify(userData));
            setUser(userData);
            window.dispatchEvent(new CustomEvent("authStateChanged", { detail: { isLoggedIn: true } }));

            const action = isRegisterMode ? "Registration" : "Login";
            alert(`Welcome! ${action} successful.`);
            closeModal();
        } catch (error) {
            console.error("Auth error:", error);
            setError(getApiErrorMessage(error, "Authentication failed"));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            {/* Show User Icon or Login Button */}
            {user ? (
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={toggleDropdown}
                        className="flex items-center gap-2 rounded-lg hover:bg-gray-100 p-2 transition-colors"
                    >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white font-semibold cursor-pointer">
                            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                        </div>
                        <span className="text-gray-800 font-medium">
                            {user.firstName} {user.lastName}
                        </span>
                        <svg
                            className={`w-4 h-4 text-gray-600 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white shadow-lg border border-gray-200 py-1 z-50">
                            <div className="px-4 py-2 border-b border-gray-100">
                                <p className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                            </div>
                            <button
                                onClick={openUpdatePasswordModal}
                                className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                                Update Password
                            </button>
                            <button
                                onClick={handleLogout}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <button
                    onClick={openModal}
                    className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
                >
                    Login
                </button>
            )}

            {/* Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                        <h2 className="mb-4 text-xl font-bold text-gray-800">
                            {isRegisterMode ? "Register" : "Login"}
                        </h2>

                        {error && (
                            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {isRegisterMode && (
                                <>
                                    <input
                                        type="text"
                                        name="firstName"
                                        placeholder="First Name"
                                        required
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                        aria-required />

                                    <input
                                        type="text"
                                        name="lastName"
                                        placeholder="Last Name"
                                        required
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                        aria-required />
                                </>
                            )}

                            <input
                                type="email"
                                name="email"
                                placeholder="Email"
                                required
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                aria-required />

                            <input
                                type="password"
                                name="password"
                                placeholder="Password"
                                required
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                aria-required />

                            <div className="flex justify-between items-center pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsRegisterMode(!isRegisterMode)}
                                    className="text-sm text-blue-600 hover:underline"
                                >
                                    {isRegisterMode ? "Already have an account? Login" : "Need an account? Register"}
                                </button>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                                    disabled={isLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? "Loading..." : isRegisterMode ? "Register" : "Login"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Update Password Modal */}
            {isUpdatePasswordOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                        <h2 className="mb-4 text-xl font-bold text-gray-800">Update Password</h2>

                        {passwordError && (
                            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3">
                                <p className="text-sm text-red-700">{passwordError}</p>
                            </div>
                        )}

                        {passwordSuccess && (
                            <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3">
                                <p className="text-sm text-green-700">{passwordSuccess}</p>
                            </div>
                        )}

                        <form onSubmit={handlePasswordSubmit} className="space-y-4">
                            <input
                                type="password"
                                name="currentPassword"
                                placeholder="Current Password"
                                value={passwordForm.currentPassword}
                                onChange={handlePasswordFormChange}
                                required
                                disabled={isPasswordLoading}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50"
                            />

                            <input
                                type="password"
                                name="newPassword"
                                placeholder="New Password"
                                value={passwordForm.newPassword}
                                onChange={handlePasswordFormChange}
                                required
                                disabled={isPasswordLoading}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50"
                            />

                            <input
                                type="password"
                                name="confirmPassword"
                                placeholder="Confirm New Password"
                                value={passwordForm.confirmPassword}
                                onChange={handlePasswordFormChange}
                                required
                                disabled={isPasswordLoading}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50"
                            />

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeUpdatePasswordModal}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                                    disabled={isPasswordLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPasswordLoading}
                                    className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isPasswordLoading ? "Updating..." : "Update Password"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
