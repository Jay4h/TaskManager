import mongoose, { Document, Schema } from 'mongoose';

export interface ChannelMessageDocument extends Document {
  channelId: string;
  text: string;
  sender: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ChannelMessageSchema = new Schema({
  channelId: { type: String, required: true, index: true },
  text: { type: String, required: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export const ChannelMessageModel = mongoose.model<ChannelMessageDocument>('ChannelMessage', ChannelMessageSchema);
