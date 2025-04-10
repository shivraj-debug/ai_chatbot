import { Request, Response } from "express";
import User from "../models/user";
import bcrypt from "bcrypt";
import { generateToken } from "../auth/generate_token";
import { conversation } from "./chat.controller";
import Chat from "../models/chat";

export const signup = async (req: Request, res: Response):Promise<void> => {
    try {
        const { name, email, password, confirmPassword } = req.body;
        
        // Check if passwords match
        if (password !== confirmPassword) {
            res.status(400).json({ error: "Passwords do not match" });
            return;
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            res.status(400).json({ error: "Email already registered" });
            return;
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            confirmPassword:hashedPassword
        })

        await newUser.save();

        res.status(201).json({ message: "Signup successful", name: newUser.name });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ error: "Server error" });
    }
};

export const login = async (req: Request, res: Response):Promise<void> => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
             res.status(400).json({ message: "Invalid credentials" });
             return
        }

        // Validate password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
           res.status(400).json({ error: "Invalid credentials" });
           return 
        }

        //generate token
        const accessToken = generateToken(user.id );
        // const refreshToken = generateRefreshToken(user.id)

        res.cookie("token", accessToken, {
            sameSite: "none", 
            httpOnly: true,
            secure: true,
            maxAge:7* 24 * 60 * 60 * 1000, // 1 day
          });
        
        res.json({ message: "Login successful", cookie:accessToken});
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Server error" });
    }
};

export const logout=async(req:Request,res:Response):Promise<void>=>{
     try{
        res.cookie("token" , "" , {
            maxAge: 0,         // Expire the cookie immediately
          });
          res.status(200).json({message:"logged out successfully"})
   
     }catch(err){
        throw new Error("error during logout")
     }
}

export const user=async(req:Request,res:Response):Promise<void>=>{
        try{
            const userId=(req.user as { id: string })?.id;
            console.log(userId)

            const detail=await User.findById({_id:userId},"name email");
            console.log(detail)
            res.status(200).json(detail)
        }catch(err){
            throw new Error("error during fetching user")
            res.status(500).json({error:"error during fetching user"})
        }
}

export const userCount=async(req:Request,res:Response):Promise<void>=>{
    try{
        const usersWithSessions = await User.aggregate([
            {
              $lookup: {
                from: "chats",        // Join with the "chats" collection
                localField: "_id",    // Match _id from "users"
                foreignField: "userId", // Match userId from "chats"
                as: "userChats"       // Store result in "userChats"
              }
            },
            {
              $addFields: {
                conversation: { $size: { $setUnion: ["$userChats.sessionId"] } }
              }
            },
            {
              $project: {
                userId: 1,
                name: 1,
                email: 1,
                conversation: 1 // Count of unique session IDs
              }
            }
          ]);

          usersWithSessions.forEach((user) => {
            user.status = "active",
            user.lastActive = "just now"
          });


          res.status(200).json(usersWithSessions)
    }catch(err){
        throw new Error("error during fetching user")
        console.log(err)
        res.status(500).json({error:"error during fetching user"})
    }
}