import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
    // Check if the Authorization header is present and correctly formatted
    const token = req.headers.authorization && req.headers.authorization.split(" ")[1];

    if (!token) {
        return res.status(403).json({ message: "Token is required" });
    }

    try {
        // Verify the token using the secret key from environment variables
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET || "this_secret_should_be_longer_than_it_is"); // Use environment variable for secret

        // Attach user info to the request object for further processing
        req.user = { 
            id: decodedToken.userId, 
            role: decodedToken.role, // Attach the role to req.user
        };
        
        // Move to the next middleware or route handler
        next();
    } catch (error) {
        console.error("Token verification failed:", error);

        if (error.name === 'TokenExpiredError') {
            // If the token is expired
            return res.status(401).json({ message: "Token expired" });
        }

        // For other errors (invalid token, etc.)
        return res.status(401).json({ message: "Token invalid or expired" });
    }
};
