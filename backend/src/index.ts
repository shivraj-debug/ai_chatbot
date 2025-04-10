import express from "express"
import dotenv from "dotenv"
import userRoutes from "./routes/userRoutes"
import chatRoute from "./routes/chatRoute"
import adminRoutes from "./routes/adminRoutes"
import cors from "cors"
import connectDB from "./config/db"
import OpenAI from "openai";
import cookieParser from "cookie-parser";
import {app,server} from "../src/socket/socket"


app.use(cookieParser());
app.use(express.json())
dotenv.config();

// connect to mongoDB
connectDB();

// for put user field in Request so that we can access id from there
declare module 'express' {
  interface Request {
    user?: {
      id: string;
    };
  }
}
app.use(
    cors({
      origin: "https://ai-chatbot-ebon-theta.vercel.app",
      methods: ["GET", "POST", "PUT", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true, // Allow cookies if needed
    })
  );

app.use("/api/user",userRoutes)
app.use("/api/chat",chatRoute)
app.use("/api/admin",adminRoutes)

const port=process.env.PORT || 8000

server.listen(port,()=>{
    console.log(`server is running on ${port}`)
})

