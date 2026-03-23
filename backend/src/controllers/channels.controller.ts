import { Request, Response } from 'express';
import { ChannelMessageModel } from '../models/channelMessage.model.js';

export const getChannelMessages = async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    const messages = await ChannelMessageModel.find({ channelId })
      .populate('sender', 'firstName lastName fullName email')
      .sort({ createdAt: 1 })
      .limit(100); // Last 100 messages
      
    res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching channel messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};
