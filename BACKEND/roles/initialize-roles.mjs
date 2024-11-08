import db from "../db/conn.mjs";
import bcrypt from "bcrypt";

// Function to initialize roles and admin user
export async function initializeRoles() {
    try {
        // Check if the roles collection is empty
        const adminRole = await db.collection("roles").findOne({ name: "admin" });
        if (!adminRole) {
            console.log("Admin role not found, creating role...");
            const newRole = await db.collection("roles").insertOne({ name: "admin" });
            console.log("Admin role created:", newRole);
        }

        const userRole = await db.collection("roles").findOne({ name: "user" });
        if (!userRole) {
            console.log("User role not found, creating role...");
            const newRole = await db.collection("roles").insertOne({ name: "user" });
            console.log("User role created:", newRole);
        }

        // Initialize the admin user if not already exists
        await initializeAdminUser();

    } catch (error) {
        console.error("Error initializing roles:", error);
    }
}

// Function to create the admin user if it doesn't exist
async function initializeAdminUser() {
    try {
        const adminRole = await db.collection("roles").findOne({ name: "admin" });

        // Check if the admin user exists
        const existingAdmin = await db.collection("users").findOne({ username: "admin" });
        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash("adminpassword", 10); // Replace with a secure password

            // Create the admin user
            await db.collection("users").insertOne({
                firstName: "Admin",
                lastName: "User",
                email: "admin@bank.com",
                username: "admin",
                password: hashedPassword,
                accountNumber: "000001",
                idNumber: "0000000001",
                balance: 0,
                roleId: adminRole._id // Assign the admin role
            });
            console.log("Admin user added.");
        } else {
            console.log("Admin user already exists.");
        }
    } catch (error) {
        console.error("Error initializing admin user:", error);
    }
}
