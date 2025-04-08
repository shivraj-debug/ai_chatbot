import mongoose, { Document, Schema } from "mongoose";

export interface Iuser extends Document{
    email:string,
    name:string,
    password:string,
    confirmPassword:string,
    timestamps:Date
}

 const userSchema=new Schema<Iuser>({
    name:{
        type:String,
        required:true,
        trim:true
    },
    email:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true,

    },
    confirmPassword:{
        type:String,
        required:true,
    }
 },{
    timestamps:true
 })

 const User=mongoose.model<Iuser>("User",userSchema)

 export  default User

