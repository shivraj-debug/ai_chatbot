import jwt from "jsonwebtoken";
import dotenv from "dotenv"

dotenv.config()

const SECRET_TOKEN = process.env.JWT_SECRET  as string;

export const generateToken=(id:string)=>{
    return jwt.sign({ id }, SECRET_TOKEN, { expiresIn: "7d" });
}
