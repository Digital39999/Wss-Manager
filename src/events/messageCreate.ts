import { CustomClient, EventType } from '../data/typings';
import { ChannelType, Message } from 'discord.js';
import config from '../data/config';

export default {
	name: 'messageCreate',
	options: {
		emit: true,
		once: false,
	},

	run: async (WssManager: CustomClient, message: Message) => {
		if (message.channel.type !== (ChannelType.GuildText || ChannelType.GuildAnnouncement)) return;
		if (message.channel.parentId !== config.systemUpdatesCategory) return;
		if (message.channelId === '1104023489381412897') message.crosspost(); // Someones's Media

		await WssManager.gatewayManager?.processSystemMessage(message);
	},
} as EventType;
