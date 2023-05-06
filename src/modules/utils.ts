import { Message, APIEmbed, EmbedType, Activity } from 'discord.js';
import { GatewayIdentifications, ParsedStripeUsers } from '../data/types';
import { Response, Request } from 'express';
import config from '../data/config';
import WssManager from '../index';
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

export function getClientFromKey(input: string, isDev?: boolean): { account: ParsedStripeUsers | null, clientId: GatewayIdentifications } | null {
	const index = Object.values(config.gatewayIdentifications).indexOf(input);
	if (index > -1) {
		const clients = Object.keys(config.gatewayIdentifications)[index];

		return {
			clientId: (isDev ? (clients + '|Dev') : clients) as GatewayIdentifications,
			account: getAccountFromClient((isDev ? (clients + '|Dev') : clients) as GatewayIdentifications),
		};
	}

	return null;
}

export function checkDestination(event: Stripe.Event): { account: ParsedStripeUsers, clientId: GatewayIdentifications } | null {
	const clientId = (event.data.object as Stripe.Subscription | Stripe.Invoice)?.metadata?._clientId as GatewayIdentifications;
	if (!clientId) return null;

	for (const key of [...Object.keys(config.gatewayIdentifications), ...Object.keys(config.gatewayIdentifications).map((k) => `${k}|Dev`)] as GatewayIdentifications[]) {
		if (key.toLowerCase() === clientId.toLowerCase()) return { account: getAccountFromClient(key) as ParsedStripeUsers, clientId: key };
	}

	return null;
}

export function getAccountFromClient(client: GatewayIdentifications): ParsedStripeUsers | null {
	for (const [key, value] of Object.entries(config.stripe)) {
		if (value.ownedClients.includes((client.includes('|') ? client.split('|')[0] : client))) return key as ParsedStripeUsers;
	}

	return null;
}

export async function webhookEvents(event: Stripe.Event, res: Response): Promise<unknown> {
	const identify = checkDestination(event);
	if (!identify || !identify?.clientId || !identify?.account) return res.status(400).json({
		status: 400,
		message: 'Failed to get client (' + identify?.clientId + '), or account (' + identify?.account + ').',
	});

	switch (event.type) {
		case 'checkout.session.completed': {
			const session: { data: null | Stripe.Checkout.Session, previous: Record<string, string> | null; } = { data: null, previous: null };

			if (typeof event.data.object === 'string') session.data = await WssManager.stripeManager?.getSession(identify, { sessionId: event.data.object }) || null;
			else session.data = event.data.object as Stripe.Checkout.Session;

			session.previous = event.data.previous_attributes as Record<string, string> || null;

			if (!session.data) return res.status(400).json({
				status: 400,
				message: 'Failed to get session.',
			});

			if (session.data.subscription) return res.status(200).json({
				status: 200,
				message: 'Thanks but no thanks, only one time payments accepted.',
			});

			if (session.data.payment_status === 'paid' && session.previous?.payment_status !== 'paid') {
				WssManager.gatewayManager?.send(identify.clientId, 'stripeEvent', session.data, 'oneTimePaid');
			}

			break;
		}
		case 'customer.subscription.updated': {
			const subscription: { data: null | Stripe.Subscription, previous: Record<string, string> | null; } = { data: null, previous: null };

			if (typeof event.data.object === 'string') subscription.data = await WssManager.stripeManager?.getSubscription(identify, { subscriptionId: event.data.object }) || null;
			else subscription.data = event.data.object as Stripe.Subscription;

			subscription.previous = event.data.previous_attributes as Record<string, string> || null;

			if (!subscription.data) return res.status(400).json({
				status: 400,
				message: 'Failed to get subscription.',
			});

			if (subscription.data.status === 'active' && typeof subscription.previous?.status === 'string' && subscription.previous?.status !== 'active') {
				WssManager.gatewayManager?.send(identify.clientId, 'stripeEvent', subscription.data, 'started');
			} else if (!subscription.previous.cancel_at_period_end && subscription.data.cancel_at_period_end) {
				WssManager.gatewayManager?.send(identify.clientId, 'stripeEvent', subscription.data, 'canceled');
			} else WssManager.gatewayManager?.send(identify.clientId, 'stripeEvent', subscription.data, 'other');

			break;
		}
		case 'customer.subscription.deleted': {
			const subscription: { data: null | Stripe.Subscription } = { data: null };

			if (typeof event.data.object === 'string') subscription.data = await WssManager.stripeManager?.getSubscription(identify, { subscriptionId: event.data.object }) || null;
			else subscription.data = event.data.object as Stripe.Subscription;

			if (!subscription.data) return res.status(400).json({
				status: 400,
				message: 'Failed to get subscription.',
			});

			WssManager.gatewayManager?.send(identify.clientId, 'stripeEvent', subscription.data, 'ended');
			break;
		}
		case 'invoice.payment_failed': case 'invoice.payment_action_required': {
			const invoice: { data: null | Stripe.Invoice } = { data: null };

			if (typeof event.data.object === 'string') invoice.data = await WssManager.stripeManager?.getInvoice(identify, { invoiceId: event.data.object }) || null;
			else invoice.data = event.data.object as Stripe.Invoice;

			if (!invoice.data || !invoice.data?.subscription) return res.status(400).json({
				status: 400,
				message: 'Failed to get invoice.',
			});

			WssManager.gatewayManager?.send(identify.clientId, 'stripeEvent', invoice.data, 'unpaid');
			break;
		}
		default: {
			WssManager.gatewayManager?.send(identify.clientId, 'stripeEvent', event.data.object, 'other');
			break;
		}
	}

	return res.status(200).json({
		status: 200,
		message: 'Successfully signed webhook.',
	});
}

// lol
export function checkBody<T extends ('identify' | `${('customer' | 'subscription' | 'session' | 'coupon' | 'invoice')}Id`)>(body: Request['body'], keys: T[]): Partial<Record<T, string>> | false | null {
	if (!body || Object.keys(body).length === 0) return false;

	type Keys = Exclude<T, 'identify'> | 'email' | 'userId';

	const modifiedKeys = keys.map((k) => {
		if (k === 'identify') return ['email', 'userId']; return k;
	}).flat() as Keys[];

	const data: Partial<Record<Keys, string>> = {};
	if (!modifiedKeys.some((k) => body?.[k as keyof typeof body])) return null;

	modifiedKeys.map((k) => { if (body[k]) data[k] = body[k]; });

	const checks = {
		1: (Object.keys(data).length > 1 && (!data.email && !data.userId)),
		2: (Object.keys(data).length === 1 && (data.email || data.userId)),
		3: (Object.keys(data).length > 1 && ((data.email && !data.userId) || (!data.email && data.userId))),
		4: data.userId && data.email,
	};

	if (checks[1] || checks[2] || checks[3]) return null;
	if (!data.userId?.match(/^[0-9]{17,19}$/) || !data.email?.match(/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/)) return null;

	return (checks[4] ? { identify: data.userId + '|' + data.email } : data) as Record<T, string>;
}
