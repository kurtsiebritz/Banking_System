import https from "https";
import fs from "fs";
import express from "express";
import cors from "cors";
import dashboard from "./routes/dashboard.mjs";
import users from "./routes/user.mjs";
import payments from "./routes/payments.mjs";
import { initializeRoles } from "./roles/initialize-roles.mjs";

// Set the port
const PORT = 3000;
const app = express();

const options = {
    key: fs.readFileSync('keys/privatekey.pem'),
    cert: fs.readFileSync('keys/certificate.pem')
};

app.use(cors());
app.use(express.json());

// Initialize roles
initializeRoles().then(() => {
    console.log("Roles initialized.");


    app.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Access-Control-Allow-Methods', '*');
        next();
    });

    // Set up routes
    app.use('/user', users);
    app.use("/dashboard", dashboard);
    app.use("/payments", payments);

    // Create HTTPS server
    const server = https.createServer(options, app);
    console.log("Server is running on port:", PORT);

    // Start the server
    server.listen(PORT);
}).catch(error => {
    console.error("Failed to initialize roles:", error);
});
