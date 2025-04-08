import express from "express"
import {login ,signup,logout,user,userCount} from "../controllers/user.controller"
import middleware from "../auth/middleware";
const router=express.Router();

router.post("/login",login)
router.post("/signup",signup);
router.post("/logout",middleware,logout);
router.get("/",middleware,user);    
router.get("/conversations",userCount);


export  default router

