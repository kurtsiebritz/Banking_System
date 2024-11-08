import express from "express";
import db from "../db/conn.mjs";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import ExpressBrute from "express-brute";
import dotenv from "dotenv";

// Load environment variables from a .env file
dotenv.config();

const router = express.Router();

// Setting up express-brute for brute-force protection
const store = new ExpressBrute.MemoryStore();
const bruteforce = new ExpressBrute(store);

// Predefined roles and permissions
const roles = {
    admin: {
        permissions: ["read", "write", "delete", "admin-access"], //permissions for admin
    },
    user: {
        permissions: ["read", "write"], //permissions for user
    }
};

// Signup route
router.post("/signup", bruteforce.prevent, async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            username,
            password,
            accountNumber,
            idNumber,
        } = req.body;

        // Validate fields
        if (!firstName || !lastName || !email || !username || !password || !accountNumber || !idNumber) {
            return res.status(400).json({ message: "All fields are required." });
        }

        // Check if email already exists
        const existingEmail = await db.collection("users").findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ message: "Email is already taken." });
        }

        // Check if username already exists
        const existingUser = await db.collection("users").findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: "Username already taken." });
        }

        const userRole = await db.collection("roles").findOne({ name: "user" });

        // Hash the password using bcrypt
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user object with default role as 'user'
        const newUser = {
            firstName,
            lastName,
            email,
            username,
            password: hashedPassword,
            accountNumber,
            idNumber,
            balance: 0, // Initial balance
            roleId: userRole._id, // Default role for new users (can be updated to 'admin' later)
        };

        // Insert new user into MongoDB
        const result = await db.collection("users").insertOne(newUser);

        res.status(201).json({ message: "User registered successfully!", userId: result.insertedId });
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ message: "Registration failed due to server error." });
    }
});

// Login route
router.post("/login", bruteforce.prevent, async (req, res) => {
    const { username, password } = req.body;

    try {
        const collection = await db.collection("users");
        const user = await collection.findOne({ username });

        if (!user) {
            return res.status(401).json({ message: "Authentication failed: Invalid credentials." });
        }

        // Compare provided password with hashed password in the database
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ message: "Authentication failed: Invalid credentials." });
        }

        // Determine the role of the user and assign corresponding permissions
        const Role = user.role; // User's role (either "admin" or "user")
        console.log("Users Role: " + Role);
        const userPermissions = roles[Role]?.permissions || []; // Assign permissions based on role

        // Generate JWT token with user ID, role, permissions, and other info
        const token = jwt.sign(
            { 
                userId: user._id, 
                username: user.username, 
                accountNumber: user.accountNumber, 
                role: user.role, 
                permissions: userPermissions // Attach role-based permissions
            },
            process.env.JWT_SECRET || "this_secret_should_be_longer_than_it_is", // Use a more secure secret in production
            { expiresIn: "1h" }
        );

        res.status(200).json({
            message: "Authentication successful",
            token,
            username: user.username,
            accountNumber: user.accountNumber,
            role: user.role,
            permissions: userPermissions, // Optionally send permissions to the frontend
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Login failed due to server error." });
    }
});

export default router;
