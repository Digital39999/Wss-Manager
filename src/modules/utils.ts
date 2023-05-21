import { GatewayIdentifications, ParsedStripeUsers } from '../data/typings';
import { Message, APIEmbed, EmbedType, Activity } from 'discord.js';
import mongoose, { Connection } from 'mongoose';
import { Response, Request } from 'express';
import config from '../data/config';
import LoggerModule from './logger';
import WssManager from '../index';
import JWT from 'jsonwebtoken';
import Stripe from 'stripe';

export function connectMongoose() {
	return new Promise<Connection>((resolve, reject) => {
		mongoose.set('strictQuery', false);
		mongoose.connect(config?.database as string);

		mongoose.connection.on('connected', async () => {
			LoggerModule('Database', 'Connected to MongoDB.\n', 'magenta');
			if (WssManager.dataManager) WssManager.dataManager.state = true;

			resolve(mongoose.connection);
		});

		mongoose.connection.on('disconnected', async () => {
			LoggerModule('Database', 'Disconnected from MongoDB.\n', 'red');
			if (WssManager.dataManager) WssManager.dataManager.state = false;
		});

		mongoose.connection.on('error', async (er: unknown) => {
			LoggerModule('Database', 'Failed to connect to MongoDB.\n', 'red');
			if (WssManager.dataManager) WssManager.dataManager.state = false;

			reject('Failed to connect to MongoDB. ' + er);
		});
	});
}

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

	return newActivities;
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

export type ValidKeys = 'userId' | 'email' | Idable | Coupon;
export type Coupon = 'code' | 'percentage' | 'duration' | 'maxClaims';
export type Idable = `${('customer' | 'subscription' | 'session' | 'coupon' | 'invoice')}Id`;
export type BodyOrQuery<T extends ValidKeys, U extends string> = { required: Record<T, string>, optional: Record<U, string> } | false | null;

export function checkBody<T extends ValidKeys, U extends string>(body: Request['body'], required?: T[], optional?: U[]): BodyOrQuery<T, U> {
	if (!body || Object.keys(body).length === 0) return { required: {} as Record<T, string>, optional: {} as Record<U, string> };

	const optionalOutput = {} as { [x in U]: string };
	const requiredOutput = {} as { [K in ValidKeys]: string };

	if (required && !required?.some((k) => body?.[k as keyof typeof body])) return null;

	for (const key of required || []) {
		if (body[key] !== undefined) requiredOutput[key] = body[key];
	}

	for (const key of optional || []) {
		if (body[key] !== undefined) optionalOutput[key] = body[key];
	}

	return checkOutputs({ required: requiredOutput, optional: optionalOutput }, required);
}

export function checkQuery<T extends ValidKeys, U extends string>(query: Request['query'], key: string, required?: T[], optional?: U[]): BodyOrQuery<T, U> {
	if (!query || !query.token) return { required: {} as Record<T, string>, optional: {} as Record<U, string> };

	try {
		const queryData = JWT.verify(query.token as string, key) as Request['body'];

		const optionalOutput = {} as { [x in U]: string };
		const requiredOutput = {} as { [K in ValidKeys]: string };

		if (required && !required?.some((k) => queryData?.[k as keyof typeof queryData])) return null;

		for (const key of required || []) {
			if (queryData[key] !== undefined) requiredOutput[key] = queryData[key];
		}

		for (const key of optional || []) {
			if (queryData[key] !== undefined) optionalOutput[key] = queryData[key];
		}

		return checkOutputs({ required: requiredOutput, optional: optionalOutput }, required);
	} catch (e) {
		return null;
	}
}

export function checkOutputs<T extends ValidKeys, U extends string>(output: { required: { [K in ValidKeys]: string }; optional: { [x in U]: string }; }, required?: T[]): BodyOrQuery<T, U> {
	const checks = {
		1: ((required?.some((r) => r === 'email') && !output.required.email) || (required?.some((r) => r === 'userId') && !output.required.userId)),
		2: (required?.some((r) => r.endsWith('Id')) && !(output.required.customerId || output.required.subscriptionId || output.required.sessionId || output.required.couponId || output.required.invoiceId)),
	};

	if (checks[1] && checks[2]) return false;

	return { required: output.required, optional: output.optional };
}

export function getClientIdentifier(req: Request): string | null {
	let identifier = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket.remoteAddress;

	if (typeof identifier === 'string') {
		if (identifier.indexOf(':') !== -1) identifier = identifier.split(':').pop();
		if (identifier?.includes(',')) identifier = identifier?.split(',')[0];
	}

	for (const possibleIdentifier of [req.headers['user-agent'], req.headers['accept-language']]) {
		if (possibleIdentifier) {
			identifier = possibleIdentifier; break;
		}
	}

	return (Array.isArray(identifier) ? identifier[0] : identifier) || req.ip || null;
}

export function formatTime(milliseconds: number, shortOutput: boolean): string {
	const units: [number, string][] = [
		[86400000, shortOutput ? 'd' : 'day'],
		[3600000, shortOutput ? 'h' : 'hour'],
		[60000, shortOutput ? 'm' : 'minute'],
		[1000, shortOutput ? 's' : 'second'],
		[1, shortOutput ? 'ms' : 'millisecond'],
	];

	const parts = [];

	for (const [divisor, unit] of units) {
		const value = Math.floor(milliseconds / divisor);
		if (value > 0) {
			parts.push(`${value}${unit + (value === 1 ? 's' : '')}`);
			milliseconds -= value * divisor;
		}
	}

	return parts.length > 0 ? parts.join(' ') : '0' + (shortOutput ? 'ms' : ' milliseconds');
}

export function generateRandomString(length?: number): string {
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let result = '';

	for (let i = 0; i < (length || 69); i++) {
		const randomIndex = Math.floor(Math.random() * characters.length);
		result += characters.charAt(randomIndex);
	}

	return result;
}

export function hasKeys(obj?: object): number {
	return Object.keys(obj || {}).length;
}
