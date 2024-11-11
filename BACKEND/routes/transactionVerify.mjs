import express from 'express';
import bodyParser from 'body-parser';
import db from '../db/conn.mjs';
import { ConnectionPoolClearedEvent, ObjectId } from 'mongodb';
import fetch from 'node-fetch';
import { verifyToken } from '../db/check-auth.mjs'; // Assuming verifyToken is middleware for token validation

const app = express();
const router = express.Router();
app.use(bodyParser.json());

const Transaction = await db.collection("payments");
const User = await db.collection("users");

// Your actual API URLs for Bank and SWIFT validation
const SWIFT_API_URL = 'https://api.apilayer.com/bank_data/swift_check'; // Apilayer API URL
const BANK_API_URL = 'https://api.apilayer.com/bank_data/iban_validate'; // Apilayer API URL

// Your API key for the Apilayer service
const API_KEY = 'E6PGGOLgG633Mi6tBKJ5UsP3lts80pBS';

// Middleware to check for admin role
const checkAdminRole = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admins only.' });
    }
    next();
};

// Helper function to validate SWIFT/BIC Code using Apilayer API
const validateSwiftCode = async (swiftCode, bankName) => {
    try {
        const response = await fetch(`${SWIFT_API_URL}?swift_code=${swiftCode}`, {
            method: 'GET',
            headers: { 'apikey': API_KEY }
        });

        const data = await response.json();

        if (data && data.valid) {
            const bankNameFromAPI = data.bank_data.name; 

            if (bankNameFromAPI && bankNameFromAPI.toLowerCase() === bankName.toLowerCase()) {
                return { isValid: true, bankName: bankNameFromAPI }; // Bank names match
            }
        }

        return { isValid: false, bankName: null }; // Invalid SWIFT code or bank name mismatch
    } catch (error) {
        console.error('Error validating SWIFT code:', error.message);
        return { isValid: false, bankName: null };
    }
};

// Helper function to fetch bank details using IBAN or account number
const fetchBankDetails = async (accountNo) => {
    try {
        const response = await fetch(`${BANK_API_URL}?iban_number=${accountNo}`, {
            method: 'GET',
            headers: { 'apikey': API_KEY }
        });

        const data = await response.json();

        if (!data.valid || !data.bank_data) {
            return null;
        }

        return data.bank_data.name; // Return the bank name from the API response
    } catch (error) {
        console.error('Error fetching bank details:', error.message);
        return null;
    }
};

// Route to verify SWIFT code and bank name
router.patch('/swiftCode/:transactionId', verifyToken, checkAdminRole, async (req, res) => {
    const { transactionId } = req.params;
    const { swiftCode, bankName } = req.body;

    try {
        const transaction = await Transaction.findOne({ _id: new ObjectId(transactionId) });
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        const { isValid, bankName: verifiedBankName } = await validateSwiftCode(transaction.swiftCode, transaction.recipientBank);
        if (isValid) {
            transaction.isVerified = true; // Mark as verified
            return res.status(200).json({ message: 'SWIFT Code and Bank Name verified successfully', bankName: verifiedBankName });
        } else {
            return res.status(400).json({ message: 'SWIFT Code and Bank Name do not match' });
        }
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Route to verify IBAN and bank name
router.patch('/recipientAccountNo/:transactionId', verifyToken, checkAdminRole, async (req, res) => {
    const { transactionId } = req.params;
    const { bankName, accountNo } = req.body;

    try {
        const transaction = await Transaction.findOne({ _id: new ObjectId(transactionId) });
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        const bankFromApi = await fetchBankDetails(transaction.recipientAccountNo);
        if (bankFromApi && bankFromApi.toLowerCase() === transaction.recipientBank.toLowerCase()) {
            return res.status(200).json({ message: 'Account Number and Bank Name verified successfully', bankName: bankFromApi });
        } else {
            return res.status(400).json({ message: 'Account Number and Bank Name do not match' });
        }
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Route to verify recipient name
router.patch('/recipientName/:transactionId', verifyToken, checkAdminRole, async (req, res) => {
    const { transactionId } = req.params;
    const { recipientName } = req.body;

    try {
        const transaction = await Transaction.findOne({ _id: new ObjectId(transactionId) });
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        if (transaction.recipientName.length === 0) {
            return res.status(400).json({ message: 'Recipient name cannot be empty' });
        }

        if (/\d/.test(transaction.recipientName)) {
            return res.status(400).json({ message: 'Recipient name cannot contain numbers' });
        }


        return res.status(200).json({ message: 'Recipient Name is valid and verified successfully' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Route to verify recipient bank
router.patch('/recipientBank/:transactionId', verifyToken, checkAdminRole, async (req, res) => {

    console.log("verifyToken and checkAdminRole middlewares passed.");  // Passed both middlewares
    const { transactionId } = req.params;
    const { recipientBank } = req.body;

    try {
        const transaction = await Transaction.findOne({ _id: new ObjectId(transactionId) });
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        if (transaction.recipientBank.length === 0) {
            return res.status(400).json({ message: 'Recipient bank cannot be empty' });
        }

        transaction.isVerified = true;
        return res.status(200).json({ message: 'Recipient Bank is valid and verified successfully' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Route to verify transfer amount
router.patch('/amountTransfer/:transactionId', verifyToken, checkAdminRole, async (req, res) => {
    const { transactionId } = req.params;
    const { amountTransfer } = req.body;

    try {
        const transaction = await Transaction.findOne({ _id: new ObjectId(transactionId) });
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        if (isNaN(transaction.amountTransfer) || transaction.amountTransfer <= 0) {
            return res.status(400).json({ message: 'Amount must be a number greater than 0' });
        }

        return res.status(200).json({ message: 'Amount verified successfully' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Route to submit a transaction
router.post('/submit/:transactionId', verifyToken, checkAdminRole, async (req, res) => {
    const { transactionId } = req.params;

    try {
        const result = await Transaction.findOneAndUpdate(
            { _id: new ObjectId(transactionId) },
            { $set: { status: 'Successful' } },
            { new: true }
        );

        if (!result) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        return res.status(200).json({ message: 'Transaction submitted successfully' });
    } catch (error) {
        console.error('Error submitting transaction:', error.message);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Route to reject a transaction and update the user's balance
router.patch('/reject/:transactionId', verifyToken, checkAdminRole, async (req, res) => {
    const { transactionId } = req.params;

    try {
        // Find and update the transaction status to "Rejected"
        const transaction = await Transaction.findOneAndUpdate(
            { _id: new ObjectId(transactionId) },
            { $set: { status: 'Rejected' } },
            { new: true }
        );

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        // Find the user associated with the transaction by userId and update the balance
        const user = await User.findOneAndUpdate(
            { _id: new ObjectId(transaction.userId) },
            { $inc: { balance: transaction.amountTransfer } }, // Increment balance by the transaction amount
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json({ message: 'Transaction rejected and balance updated' });
    } catch (error) {
        console.error('Error rejecting transaction:', error.message);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});



// Export router
export default router;
