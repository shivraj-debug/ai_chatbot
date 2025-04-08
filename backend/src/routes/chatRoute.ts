import express from "express"
import authMiddleware from "../auth/middleware"
import {chatHistory,chat,conversation,deleteconversation,updateconversation,chatSummary,topqueries} from "../controllers/chat.controller"
const router=express.Router();

router.get("/history",authMiddleware,chatHistory)
router.post("/message",authMiddleware,chat);
router.get("/getConversations",authMiddleware,conversation);
router.delete("/deleteConversation",authMiddleware,deleteconversation);
router.put("/updateConversation",authMiddleware,updateconversation);
router.get("/chatSummary",chatSummary);
router.get("/topQueries",topqueries);
// router.get("/",authMiddleware,conversation);


export  default router


