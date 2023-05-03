import { Message, APIEmbed, EmbedType, Activity } from 'discord.js';
import { StripGatewayIdentifications } from '../data/types';
import config from '../data/config';
import Stripe from 'stripe';

export function formatMessage(message: Message) {
	const formatedMessage: { content: string; embeds: APIEmbed[]; files: string[]; channelId: string; } = {
		channelId: message.channel.id,
		content: message.content,
		embeds: [],
		files: [],
	};

	for (const embed of message.embeds || []) {
		// Deprecated, looking for solutions!
		if (embed.data.type !== EmbedType.Rich) continue;

		formatedMessage.embeds.push({
			title: embed.title || undefined,
			description: embed.description || undefined,
			url: embed.url || undefined,
			timestamp: embed.timestamp || undefined,
			color: 0x5c6ceb || undefined,
			footer: {
				text: 'Support Us! ' + config.support,
			},
			thumbnail: embed.thumbnail || undefined,
			image: embed.image || undefined,
			fields: embed.fields,
		});
	}

	for (const attachment of message.attachments.values() || []) formatedMessage.files.push(attachment.url);
	return formatedMessage;
}

export function formatActivities(activities: Activity[]) {
	const newActivities = [];

	for (const activity of activities) newActivities.push({
		applicationId: activity.applicationId,
		name: activity.name,
		url: activity.url,
		details: activity.details,
		state: activity.state,
		createdTimestamp: activity.createdTimestamp,
		timestamps: {
			start: activity.timestamps?.start ? new Date(activity.timestamps?.start).getTime() : null,
			end: activity.timestamps?.end ? new Date(activity.timestamps?.end).getTime() : null,
		},
		assets: {
			large: {
				text: activity.assets?.largeText,
				image: activity.name === 'Spotify' ? (activity.assets?.largeImage ? (activity.assets.largeImage.startsWith('spotify:') ? `https://i.scdn.co/image/${activity.assets.largeImage.replace(/spotify:/, '')}` : `https://i.scdn.co/image/${activity.assets.largeImage}.png`) : null) : activity.type !== 4 ? (activity.assets?.largeImage ? (activity.assets.largeImage.startsWith('mp:external') ? `https://media.discordapp.net/${activity.assets.largeImage.replace(/mp:/, '')}` : `https://cdn.discordapp.com/app-assets/${activity.applicationId}/${activity.assets.largeImage}.png`) : null) : null,
			},
			small: {
				text: activity.assets?.smallText,
				image: activity.name === 'Spotify' ? (activity.assets?.smallImage ? (activity.assets.smallImage.startsWith('mp:external') ? `https://media.discordapp.net/${activity.assets.smallImage.replace(/mp:/, '')}` : `https://cdn.discordapp.com/app-assets/${activity.applicationId}/${activity.assets.smallImage}.png`) : null) : activity.type !== 4 ? (activity.assets?.smallImage ? (activity.assets.smallImage.startsWith('mp:external') ? `https://media.discordapp.net/${activity.assets.smallImage.replace(/mp:/, '')}` : `https://cdn.discordapp.com/app-assets/${activity.applicationId}/${activity.assets.smallImage}.png`) : null) : null,
			},
		},
	});
}

export function getIdentifierFromKey(input: string) {
	const index = Object.values(config.gatewayIdentifications).indexOf(input);
	if (index > -1) return Object.keys(config.gatewayIdentifications)[index] as StripGatewayIdentifications;

	return null;
}

export function checkDestination(event: Stripe.Event) {
	const clientId = (event.data.object as Stripe.Subscription | Stripe.Invoice)?.metadata?._clientId;
	if (!clientId) return null;

	for (const key of Object.keys(config.gatewayIdentifications)) {
		if (key.toLowerCase() === clientId.toLowerCase()) return key as StripGatewayIdentifications;
	}

	return null;
}
