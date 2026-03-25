import { Request, Response } from 'express';
import { ChannelMessageModel } from '../models/channelMessage.model.js';
import { ChannelModel } from '../models/channel.model.js';
import mongoose from 'mongoose';

type ChannelBody = {
  name?: string;
  isPrivate?: boolean;
  members?: string[];
};

const DEFAULT_CHANNELS = [
  { channelId: 'general', name: 'General' },
  { channelId: 'welcome', name: 'Welcome' },
];

function normalizeChannelId(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
}

async function ensureDefaultChannels(userId: string): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(userId)) return;

  for (const chan of DEFAULT_CHANNELS) {
    const exists = await ChannelModel.findOne({ channelId: chan.channelId }).lean();
    if (!exists) {
      await ChannelModel.create({
        channelId: chan.channelId,
        name: chan.name,
        isPrivate: false,
        members: [],
        joinedMembers: [new mongoose.Types.ObjectId(userId)],
        createdBy: new mongoose.Types.ObjectId(userId),
      });
    }
  }
}

function canAccessChannel(channel: { isPrivate: boolean; members?: Array<mongoose.Types.ObjectId | string> }, userId: string): boolean {
  if (!channel.isPrivate) return true;
  return (channel.members || []).some((m) => m.toString() === userId);
}

function hasJoinedChannel(channel: { joinedMembers?: Array<mongoose.Types.ObjectId | string> }, userId: string): boolean {
  return (channel.joinedMembers || []).some((m) => m.toString() === userId);
}

function toChannelPayload(channel: any, userId: string, includeMembers = true) {
  return {
    id: channel.channelId,
    name: channel.name,
    isPrivate: channel.isPrivate === true,
    members: includeMembers && Array.isArray(channel.members)
      ? channel.members.map((m: any) => ({
        _id: m._id?.toString?.() || m.toString?.() || '',
        firstName: m.firstName || '',
        lastName: m.lastName || '',
        email: m.email,
      }))
      : [],
    createdBy: channel.createdBy?._id?.toString?.() || channel.createdBy?.toString?.() || '',
    joinedMemberIds: Array.isArray(channel.joinedMembers)
      ? channel.joinedMembers.map((j: any) => j._id?.toString?.() || j.toString?.())
      : [],
    joined: Array.isArray(channel.joinedMembers)
      ? channel.joinedMembers.some((j: any) => (j._id?.toString?.() || j.toString?.()) === userId)
      : false,
  };
}

export const getChannels = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await ensureDefaultChannels(userId);

    const channels = await ChannelModel.find({
      $or: [
        { isPrivate: false },
        { members: new mongoose.Types.ObjectId(userId) },
      ],
    })
      .populate('members', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: 1 });

    res.status(200).json(channels.map((c) => toChannelPayload(c, userId, false)));
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
};

export const createChannel = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const body = req.body as ChannelBody;
    const rawName = (body.name || '').trim();
    if (!rawName) {
      res.status(400).json({ error: 'Channel name is required' });
      return;
    }

    const channelId = normalizeChannelId(rawName);
    if (!channelId) {
      res.status(400).json({ error: 'Invalid channel name' });
      return;
    }

    const exists = await ChannelModel.findOne({ channelId }).lean();
    if (exists) {
      res.status(409).json({ error: 'Channel already exists' });
      return;
    }

    const isPrivate = body.isPrivate === true;

    const members = new Set<string>();
    members.add(userId);
    if (isPrivate && Array.isArray(body.members)) {
      for (const memberId of body.members) {
        if (mongoose.Types.ObjectId.isValid(memberId)) members.add(memberId);
      }
    }

    const channel = await ChannelModel.create({
      channelId,
      name: rawName,
      isPrivate,
      members: Array.from(members).map((m) => new mongoose.Types.ObjectId(m)),
      joinedMembers: [new mongoose.Types.ObjectId(userId)],
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    const hydrated = await ChannelModel.findById(channel._id)
      .populate('members', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');

    res.status(201).json(toChannelPayload(hydrated, userId));
  } catch (error) {
    console.error('Error creating channel:', error);
    res.status(500).json({ error: 'Failed to create channel' });
  }
};

export const getChannel = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { channelId } = req.params;
    const channel = await ChannelModel.findOne({ channelId })
      .populate('members', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');

    if (!channel) {
      res.status(404).json({ error: 'Channel not found' });
      return;
    }

    if (!canAccessChannel(channel, userId)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.status(200).json(toChannelPayload(channel, userId));
  } catch (error) {
    console.error('Error fetching channel:', error);
    res.status(500).json({ error: 'Failed to fetch channel' });
  }
};

export const joinChannel = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { channelId } = req.params;
    const channel = await ChannelModel.findOne({ channelId });
    if (!channel) {
      res.status(404).json({ error: 'Channel not found' });
      return;
    }

    if (channel.isPrivate && !canAccessChannel(channel, userId)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const hasJoined = channel.joinedMembers.some((j) => j.toString() === userId);
    if (!hasJoined) {
      channel.joinedMembers.push(userObjectId);
      await channel.save();
    }

    const hydrated = await ChannelModel.findById(channel._id)
      .populate('members', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');

    res.status(200).json(toChannelPayload(hydrated, userId));
  } catch (error) {
    console.error('Error joining channel:', error);
    res.status(500).json({ error: 'Failed to join channel' });
  }
};

export const addChannelMember = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { channelId } = req.params;
    const { memberId } = req.body as { memberId?: string };

    if (!memberId || !mongoose.Types.ObjectId.isValid(memberId)) {
      res.status(400).json({ error: 'Valid memberId is required' });
      return;
    }

    const channel = await ChannelModel.findOne({ channelId });
    if (!channel) {
      res.status(404).json({ error: 'Channel not found' });
      return;
    }

    const isCreator = channel.createdBy.toString() === userId;
    if (!isCreator) {
      res.status(403).json({ error: 'Only channel owner or admin can add members' });
      return;
    }

    const alreadyMember = channel.members.some((m) => m.toString() === memberId);
    if (!alreadyMember) {
      channel.members.push(new mongoose.Types.ObjectId(memberId));
    }

    await channel.save();

    const hydrated = await ChannelModel.findById(channel._id)
      .populate('members', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');

    res.status(200).json(toChannelPayload(hydrated, userId));
  } catch (error) {
    console.error('Error adding channel member:', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
};

export const getChannelMessages = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { channelId } = req.params;
    const channel = await ChannelModel.findOne({ channelId }).lean();
    if (!channel) {
      res.status(404).json({ error: 'Channel not found' });
      return;
    }

    if (!canAccessChannel(channel, userId)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (!hasJoinedChannel(channel, userId)) {
      res.status(403).json({ error: 'Join channel first to receive messages' });
      return;
    }

    const messages = await ChannelMessageModel.find({ channelId })
      .populate('sender', 'firstName lastName email')
      .sort({ createdAt: 1 })
      .limit(200);
    res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching channel messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

export const getChannelUsers = async (_req: Request, res: Response) => {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      res.status(500).json({ error: 'Database connection failed' });
      return;
    }
    const users = await db
      .collection('users')
      .find({}, { projection: { _id: 1, firstName: 1, lastName: 1, email: 1 } })
      .toArray();
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users for channels:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};
