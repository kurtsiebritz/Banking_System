import express from "express";
import db from "../db/conn.mjs"; // MongoDB connection
import { ObjectId } from "mongodb";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import ExpressBrute from "express-brute";

const router = express.Router();

// Setting up express-brute for brute-force protection
const store = new ExpressBrute.MemoryStore();
const bruteforce = new ExpressBrute(store);

// Signup route
router.post("/signup", async (req, res) => {
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

        // Hash the password using bcrypt
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user object
        const newUser = {
            firstName,
            lastName,
            email,
            username,
            password: hashedPassword,
            accountNumber,
            idNumber,
            balance: 0, // Initial balance
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
            return res.status(401).json({ message: "Authentication failed: User not found." });
        }

        // Compare provided password with hashed password in the database
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ message: "Authentication failed: Incorrect password." });
        }

        // Generate JWT token with user ID and account number
        const token = jwt.sign(
            { userId: user._id, username: user.username, accountNumber: user.accountNumber },
            "this_secret_should_be_longer_than_it_is", // Replace with a strong secret in production
            { expiresIn: "1h" }
        );

        res.status(200).json({ message: "Authentication successful", token, username: user.username, accountNumber: user.accountNumber });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Login failed due to server error." });
    }
});

export default router;
