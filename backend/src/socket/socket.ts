import http from "http"
import { Server } from "socket.io"
import {OpenAI} from "openai";
import express from "express"

const app=express();
const server=http.createServer(app);

const io=new Server(server,{
    cors:{
        origin:"http://localhost:3000",
        methods: ["GET", "POST"],
        credentials:true
    }
})


// Socket.io connection handler
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
  
    // Listen for new messages
    socket.on('sendMessage', (message) => {
      // Broadcast the message to all clients (including sender)
      io.emit('newMessage', message);
    });
  
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
  

export {app,server}