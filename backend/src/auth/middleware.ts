import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const authMiddleware = (req:Request, res: Response, next: NextFunction): void => {
  const token = req.cookies?.token

  if (!token) {
    res.status(401).json({ error: "Access denied. No token provided." });
    return; 
  }

  try {

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string }

    if (!decoded.id) {
      throw new Error("Invalid token structure. Missing 'id'.");
    }

    req.user = { id: decoded.id };    
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token." });
    return; 
  }
};

export default authMiddleware;
