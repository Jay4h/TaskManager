import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { CORS_CONFIG } from '../middlewares/cors.js';
import { ChannelMessageModel } from '../models/channelMessage.model.js';

let io: SocketIOServer;

export const initializeSocket = (httpServer: HttpServer) => {
  io = new SocketIOServer(httpServer, {
    cors: CORS_CONFIG
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    socket.on('join_channel', (channelId: string) => {
      socket.join(channelId);
      console.log(`Client ${socket.id} joined channel ${channelId}`);
    });

    socket.on('leave_channel', (channelId: string) => {
      socket.leave(channelId);
    });

    socket.on('send_message', async (data: { channelId: string, text: string, senderId: string }) => {
      try {
        // Save to database
        const newMessage = await ChannelMessageModel.create({
          channelId: data.channelId,
          text: data.text,
          sender: data.senderId
        });
        
        // Populate sender details before emitting
        const populatedMessage = await newMessage.populate('sender', 'firstName lastName fullName email');

        // Broadcast to everyone in channel including sender
        io.to(data.channelId).emit('receive_message', populatedMessage);
      } catch (error) {
        console.error('Error handling send_message event:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized!");
  return io;
};
