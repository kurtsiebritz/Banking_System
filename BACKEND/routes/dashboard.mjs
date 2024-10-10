import express, { Router } from "express";
import db from "../db/conn.mjs";
import { ObjectId } from "mongodb";
import { verifyToken } from "../db/check-auth.mjs"; // Import your authentication middleware

const router = express.Router();

// Middleware to verify token and get user info
router.use(verifyToken);

// Get dashboard data including user info and payment receipts
router.get("/", async (req, res) => {
    try {
        // You can choose to convert userId into ObjectId if necessary
        const userId = req.user.id; // Using userId directly as a string

        const usersCollection = await db.collection("users");
        const paymentsCollection = await db.collection("payments");

        // Get user details
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
        if (!user) return res.status(404).json({ message: "User not found" });

        console.log("User ID for payments query:", userId);

        // Get payment receipts
        const payments = await paymentsCollection.find({ userId }).toArray(); // Use userId directly

        // Return the user name and payments
        res.status(200).json({
            name: user.firstName, 
            accountNumber: user.accountNumber,
            balance: user.balance,
            payments: payments,
        });

        console.log("Username: " + user.firstName);
        console.log("Payments:", payments);
    } catch (error) {
        console.error("Error fetching dashboard data:", error); // Log error
        res.status(500).json({ message: error.message });
    }
});


// Update user's balance
router.patch('/deposit', async (req, res) => {  
    const { amount } = req.body;
    const userId = new ObjectId(req.user.id); // Convert to ObjectId

    if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid deposit amount." });
    }

    try {
        // Find the user and update the balance using the usersCollection
        const collection = await db.collection("users");
        const user = await collection.findOne({ _id: userId }); // Use findOne to get the user

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Update the user's balance
        const updatedBalance = user.balance + amount; // Calculate the new balance

        // Update the user document in the database
        await collection.updateOne(
            { _id: userId }, // Filter to find the user
            { $set: { balance: updatedBalance } } // Set the new balance
        );

        // Return the updated user balance
        res.json({ balance: updatedBalance });
    } catch (error) {
        console.error("Error updating balance:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});



export default router;
