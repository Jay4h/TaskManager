import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { UserModel } from "../models/user.model.js";
import type { CreateUserRequest, CreateUserResponse } from "../shared/types/index.js";
import { ForbiddenError, BadRequestError, NotFoundError } from "../shared/types/index.js";

export class UsersService {
    private userModel: UserModel;

    constructor() {
        this.userModel = new UserModel();
    }

    /**
     * Check if a user is admin
     */
    private async isUserAdmin(userId: string): Promise<boolean> {
        try {
            const user = await this.userModel.findById(userId);
            if (!user || !user.role) {
                return false;
            }

            const db = mongoose.connection.db;
            if (!db) {
                return false;
            }

            const adminRole = await db.collection("roles").findOne({ name: "admin" });
            if (!adminRole) {
                return false;
            }

            return user.role.toString() === adminRole._id.toString();
        } catch (error) {
            console.error("Error checking admin status:", error);
            return false;
        }
    }

    /**
     * Get role ObjectId by role name
     */
    private async getRoleIdByName(roleName: "admin" | "user"): Promise<mongoose.Types.ObjectId | undefined> {
        try {
            const db = mongoose.connection.db;
            if (!db) {
                return undefined;
            }

            const role = await db.collection("roles").findOne({ name: roleName });
            return role ? role._id : undefined;
        } catch (error) {
            console.error("Error getting role by name:", error);
            return undefined;
        }
    }

    /**
     * Create a new user (admin only)
     */
    async createUser(data: CreateUserRequest, adminId: string): Promise<CreateUserResponse> {
        // Verify admin access
        const isAdmin = await this.isUserAdmin(adminId);
        if (!isAdmin) {
            throw new ForbiddenError("Only admins can create users");
        }

        // Validate required fields
        if (!data.firstName || typeof data.firstName !== "string" || data.firstName.trim().length === 0) {
            throw new BadRequestError("First name is required");
        }

        if (!data.lastName || typeof data.lastName !== "string" || data.lastName.trim().length === 0) {
            throw new BadRequestError("Last name is required");
        }

        if (!data.email || typeof data.email !== "string" || data.email.trim().length === 0) {
            throw new BadRequestError("Email is required");
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            throw new BadRequestError("Invalid email format");
        }

        if (!data.password || typeof data.password !== "string" || data.password.length < 6) {
            throw new BadRequestError("Password must be at least 6 characters");
        }

        // Check if user already exists
        const existingUser = await this.userModel.findByEmail(data.email);
        if (existingUser) {
            throw new BadRequestError("User with this email already exists");
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(data.password, 10);

        // Get role ID
        const requestedRole = data.role || "user";
        const roleId = await this.getRoleIdByName(requestedRole);

        if (!roleId) {
            throw new BadRequestError(`Role '${requestedRole}' not found in database`);
        }

        // Create user
        const userData = {
            firstName: data.firstName.trim(),
            lastName: data.lastName.trim(),
            email: data.email.trim().toLowerCase(),
            password: hashedPassword,
            role: roleId,
        };

        const result = await this.userModel.create(userData);

        return {
            success: true,
            data: {
                userId: result.insertedId,
                email: result.user.email,
                firstName: result.user.firstName,
                lastName: result.user.lastName,
                role: requestedRole,
            },
            message: "User created successfully",
        };
    }

    /**
     * Get all users (admin only)
     */
    async getAllUsers(adminId: string, page: number = 1, limit: number = 10): Promise<any> {
        const isAdmin = await this.isUserAdmin(adminId);
        if (!isAdmin) {
            throw new ForbiddenError("Only admins can view all users");
        }

        const db = mongoose.connection.db;
        if (!db) {
            throw new BadRequestError("Database connection failed");
        }

        const skip = (page - 1) * limit;

        // Get admin role ID
        const adminRole = await db.collection("roles").findOne({ name: "admin" });
        const userRole = await db.collection("roles").findOne({ name: "user" });

        const [users, total] = await Promise.all([
            db.collection("users")
                .find({})
                .project({ password: 0 }) // Exclude password
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray(),
            db.collection("users").countDocuments({})
        ]);

        const usersWithRoles = users.map((user) => {
            let roleName: "admin" | "user" = "user";
            if (user.role && adminRole && user.role.toString() === adminRole._id.toString()) {
                roleName = "admin";
            } else if (user.role && userRole && user.role.toString() === userRole._id.toString()) {
                roleName = "user";
            }

            return {
                _id: user._id.toString(),
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: roleName,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            };
        });

        return {
            success: true,
            data: usersWithRoles,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: limit,
                hasNextPage: page < Math.ceil(total / limit),
                hasPreviousPage: page > 1,
            },
            message: "Users retrieved successfully",
        };
    }

    /**
     * Delete a user (admin only)
     */
    async deleteUser(userId: string, adminId: string): Promise<any> {
        const isAdmin = await this.isUserAdmin(adminId);
        if (!isAdmin) {
            throw new ForbiddenError("Only admins can delete users");
        }

        // Prevent admin from deleting themselves
        if (userId === adminId) {
            throw new BadRequestError("You cannot delete your own account");
        }

        const db = mongoose.connection.db;
        if (!db) {
            throw new BadRequestError("Database connection failed");
        }

        const user = await db.collection("users").findOne({ _id: new mongoose.Types.ObjectId(userId) });
        if (!user) {
            throw new NotFoundError("User not found");
        }

        await db.collection("users").deleteOne({ _id: new mongoose.Types.ObjectId(userId) });

        return {
            success: true,
            message: "User deleted successfully",
        };
    }
}
