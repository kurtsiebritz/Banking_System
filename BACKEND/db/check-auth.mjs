import jwt from "jsonwebtoken"; // Import the jsonwebtoken library

export const verifyToken = (req, res, next) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
       
        const decodedToken = jwt.verify(token, "this_secret_should_be_longer_than_it_is");
        req.user = { id: decodedToken.userId };  // Save userId from the decoded token in req.user
        next();
    } catch (error) {
        console.error("Token verification failed:", error);  // Log any errors
        res.status(401).json({
            message: "Token invalid or expired"
        });
    }
};
