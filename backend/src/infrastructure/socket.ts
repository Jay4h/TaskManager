import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { CORS_CONFIG } from '../middlewares/cors.js';
import { ChannelMessageModel } from '../models/channelMessage.model.js';
import { verifyToken } from './database/jwt.js';
import { ChannelModel } from '../models/channel.model.js';

function canAccessChannel(channel: { isPrivate: boolean; members: Array<{ toString: () => string }> }, userId: string): boolean {
  if (!channel.isPrivate) return true;
  return (channel.members || []).some((m) => m.toString() === userId);
}

function canSendMessage(channel: { isPrivate: boolean; members: Array<{ toString: () => string }>; joinedMembers: Array<{ toString: () => string }> }, userId: string): boolean {
  return canAccessChannel(channel, userId) && (channel.joinedMembers || []).some((j) => j.toString() === userId);
}

function canReceiveMessages(channel: { isPrivate: boolean; members: Array<{ toString: () => string }>; joinedMembers: Array<{ toString: () => string }> }, userId: string): boolean {
  return canAccessChannel(channel, userId) && (channel.joinedMembers || []).some((j) => j.toString() === userId);
}

let io: SocketIOServer;

export const initializeSocket = (httpServer: HttpServer) => {
  io = new SocketIOServer(httpServer, {
    cors: CORS_CONFIG
  });

  io.use(async (socket, next) => {
    try {
      const token = (socket.handshake.auth?.token as string | undefined) ||
        (socket.handshake.headers.authorization as string | undefined)?.replace(/^Bearer\s+/i, '');

      if (!token) {
        next(new Error('Unauthorized'));
        return;
      }

      const payload = await verifyToken(token);
      if (!payload?.userId) {
        next(new Error('Unauthorized'));
        return;
      }

      socket.data.userId = payload.userId;
      next();
    } catch (error) {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    const bootstrapRooms = async () => {
      try {
        const userId = socket.data.userId as string | undefined;
        if (!userId) return;

        const channels = await ChannelModel.find({ joinedMembers: userId })
          .select('channelId')
          .lean();

        for (const channel of channels) {
          if (channel.channelId) {
            socket.join(channel.channelId);
          }
        }
      } catch (error) {
        console.error('Error bootstrapping socket rooms:', error);
      }
    };

    bootstrapRooms();

    socket.on('join_channel', async (channelId: string) => {
      try {
        const userId = socket.data.userId as string | undefined;
        if (!userId) return;

        const channel = await ChannelModel.findOne({ channelId }).lean();
        if (!channel) return;
        if (!canReceiveMessages(channel as any, userId)) return;

        socket.join(channelId);
        console.log(`Client ${socket.id} joined channel ${channelId}`);
      } catch (error) {
        console.error('Error joining channel room:', error);
      }
    });

    socket.on('leave_channel', (channelId: string) => {
      socket.leave(channelId);
    });

    socket.on('send_message', async (data: { channelId: string, text: string, senderId?: string }) => {
      try {
        const userId = socket.data.userId as string | undefined;
        if (!userId) return;

        const channel = await ChannelModel.findOne({ channelId: data.channelId });
        if (!channel) return;
        if (!canSendMessage(channel as any, userId)) {
          socket.emit('socket_error', { error: 'Not allowed to send message in this channel' });
          return;
        }

        // Save to database
        const newMessage = await ChannelMessageModel.create({
          channelId: data.channelId,
          text: data.text,
          sender: userId
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
