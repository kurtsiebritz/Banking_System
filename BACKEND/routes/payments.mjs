import express from 'express';
import db from '../db/conn.mjs'; // Adjust the import according to your database connection
import { verifyToken } from '../db/check-auth.mjs'; // Middleware for authentication
import { ObjectId } from 'mongodb';
import bcrypt from 'bcrypt'; // Ensure you have bcrypt installed for password verification

const router = express.Router();

// Middleware to verify token and get user info
router.use(verifyToken);

// Handle payment submission
router.patch('/', async (req, res) => {
    const { recipientName, recipientBank, recipientAccountNo, amountTransfer, swiftCode, password } = req.body;
    const userId = req.user.id; // Assuming user ID is available in the request after token verification

    // Validation
    if (!recipientName || !recipientBank || !recipientAccountNo || !amountTransfer || !swiftCode || !password) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    // Validate account number to be between 8 and 12 digits
    const accountNoRegex = /^\d{8,12}$/; // Regular expression to check for 8 to 12 digits
    if (!accountNoRegex.test(recipientAccountNo)) {
        return res.status(400).json({ message: 'Recipient account number must be between 8 and 12 digits.' });
    }

    try {
        // Get user's current balance
        const usersCollection = await db.collection('users');
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Check password
        const passwordMatch = await bcrypt.compare(password, user.password); // Assuming user.password stores hashed password
        if (!passwordMatch) {
            return res.status(403).json({ message: 'Invalid password.' });
        }

        // Check if the user has enough balance
        if (user.balance < amountTransfer) {
            return res.status(400).json({ message: 'Insufficient balance.' });
        }

        // Create a new payment entry
        const payment = {
            recipientName,
            recipientBank,
            recipientAccountNo,
            amountTransfer,
            swiftCode,
            userId: userId,
            createdAt: new Date(),
        };

        // Save payment to the database
        const paymentsCollection = await db.collection('payments');
        await paymentsCollection.insertOne(payment);

        // Deduct the amount from the user's balance
        const updatedBalance = user.balance - amountTransfer;

        // Update user's balance in the database
        await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $set: { balance: updatedBalance } }
        );

        // Respond with success message
        res.status(200).json({ message: 'Payment submitted successfully.', newBalance: updatedBalance });
    } catch (error) {
        console.error('Error submitting payment:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

// Route to confirm password (optional) - this can be removed if integrated into payment submission
router.post('/payconfirm', async (req, res) => {
    const { password } = req.body;
    const userId = req.user.id; // Assuming user ID is available in the request after token verification

    try {
        const usersCollection = await db.collection('users');
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Check password
        const passwordMatch = await bcrypt.compare(password, user.password); // Assuming user.password stores hashed password
        res.json({ valid: passwordMatch });

    } catch (error) {
        console.error('Error confirming password:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

export default router;
