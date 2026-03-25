import { api } from "./http";

export type ChannelUser = {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
};

export type Channel = {
    id: string;
    name: string;
    isPrivate: boolean;
    members: ChannelUser[];
    createdBy: string;
    joinedMemberIds: string[];
    joined: boolean;
};

export const channelsApi = {
    getChannels: async () => {
        const response = await api.get<Channel[]>("/channels");
        return response.data;
    },

    createChannel: async (data: { name: string; isPrivate: boolean; members: string[] }) => {
        const response = await api.post<Channel>("/channels", data);
        return response.data;
    },

    getChannel: async (channelId: string) => {
        const response = await api.get<Channel>(`/channels/${channelId}`);
        return response.data;
    },

    joinChannel: async (channelId: string) => {
        const response = await api.post<Channel>(`/channels/${channelId}/join`);
        return response.data;
    },

    addMember: async (channelId: string, memberId: string) => {
        const response = await api.post<Channel>(`/channels/${channelId}/members`, { memberId });
        return response.data;
    },

    getUsers: async () => {
        const response = await api.get<ChannelUser[]>("/channels/users");
        return response.data;
    },

    getMessages: async (channelId: string) => {
        const response = await api.get(`/channels/${channelId}/messages`);
        return response.data;
    },
};
