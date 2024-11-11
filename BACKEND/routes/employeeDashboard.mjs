import express from 'express';
import db from '../db/conn.mjs';
import { ObjectId } from 'mongodb';
import { verifyToken } from '../db/check-auth.mjs';

const router = express.Router();

// Middleware for employee role verification
router.use(verifyToken);

router.get('/', async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Access denied" }); 
        }
        
        const transactions = await db.collection('payments').find({}).toArray();
        res.status(200).json({ transactions });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.patch('/verify/:transactionId', async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied" });
        }

        const { transactionId } = req.params;
        const result = await db.collection('payments').updateOne(
            { _id: new ObjectId(transactionId) },
            { $set: { isVerified: true } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "Transaction not found" });
        }

        res.status(200).json({ message: "Transaction verified successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
