import express from "express";
import {Request} from "express";
import { generateToken } from "../auth/generate_token";

const router = express.Router();

const adminEmail="shiv.org.@raj"
const adminPassword="shiv@123"

router.post("/login", (req:Request, res) => {
        const {email,password}=req.body ;
        if(email===adminEmail && password===adminPassword){
         const token= generateToken(email);

         res.cookie("adminToken",token,{
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000 // 1 day
         });
            res.status(200).json({message:"login successfully"});
        }else{
            res.status(401).json({message:"invalid credentials"});
        }
});

router.get("/logout" ,(req:Request, res) => {
    try{
        res.cookie("adminToken" , "" , {
            maxAge: 0,         // Expire the cookie immediately
          });
          res.status(200).json({message:"logged out successfully"})
        //   res.setHeader("Cache-Control", "no-store");
   
     }catch(err){
        throw new Error("error during logout")
     }
});

export default router;