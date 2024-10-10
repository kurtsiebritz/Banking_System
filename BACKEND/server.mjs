import https from "https";
import http from "http";
import fs from "fs";
import dashboard from "./routes/dashboard.mjs";
//import fruits from "./models/fruit.mjs"
import users from "./routes/user.mjs";
import payments from "./routes/payments.mjs";
import express from "express"
import cors from "cors"
import {execPath} from "process";

//set the port
const PORT = 3000;
const app = express();

const options = {
    key: fs.readFileSync('keys/privatekey.pem'),
    cert: fs.readFileSync('keys/certificate.pem')
}

app.use(cors());
app.use(express.json());

//Middleware to manually assign 'name' and password to req.body
app.use((req, res, next) => {
   next();
});

app.use((reg,res,next)=>
{
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    next();
})

app.use("/user", users);
app.route("/user", users);
app.use("/dashboard", dashboard);
app.route("/dashboard", dashboard);
app.use("/payments", payments);
app.route("/payments", payments);


let server = https.createServer(options,app)
console.log("Server is running on port:", PORT)

//start express server
server.listen(PORT);