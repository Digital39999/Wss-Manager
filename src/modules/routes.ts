import client, { evalExecute } from '../index';
import { Activity } from 'discord.js';
import emojis from '../data/emojis';
import config from '../data/config';
import LoggerModule from './logger';
import express from 'express';

export default class HttpManager {
	private app: express.Application;
	private postData: Record<string, string>;

	constructor() {
		this.app = express();
		this.postData = {};

		this.app.get('/', (req, res) => {
			res.status(200).json({
				status: 200,
				message: 'Private Networking API.',
			});
		});

		this.loadRoutes();
	}

	/* ----------------------------------- Internal ----------------------------------- */

	private async loadRoutes() {
		await this.loadEmojis();
		await this.evalEndpoint();
		await this.websiteStatus();

		await this.loadInternal();
	}

	/* ----------------------------------- Routes ----------------------------------- */

	private async loadEmojis() {
		this.app.get('/emojis', (req, res) => {
			return res.status(200).json({
				status: 200,
				message: 'You maybe wondering why? Well why not?',
				data: { ...emojis, iconsLive: this.postData },
			});
		});

		this.app.post('/emojis', (req, res) => {
			if (req.headers.authorization !== config.keys.emojis) return res.status(401).json({
				status: 401,
				message: 'You are not authorized to do this.',
			});

			const emojis = req.body.emojis || {};
			if (!emojis) return res.status(400).json({
				status: 400,
				message: 'Missing parameters, Paul stop being stupid.',
			});

			try {
				const object = JSON.parse(emojis);
				if (typeof object !== 'object') return res.status(400).json({
					status: 400,
					message: 'Invalid JSON.',
				});

				this.postData = object;
			} catch (error) {
				return res.status(400).json({
					status: 400,
					message: 'Invalid JSON.',
				});
			}

			return res.status(200).json({
				status: 200,
				message: 'Successfully updated emojis.',
			});
		});
	}

	private async websiteStatus() {
		this.app.get('/digital', async (req, res) => {
			const client = await import('../index').then((module) => module.default);
			let data = null;

			for await (const guild of client.guilds.cache.values()) {
				const member = guild.members.cache.get(config.developer) || await guild.members.fetch({ user: config.developer, force: true }).catch(() => null);
				if (!member) continue;

				const presence = member.presence || guild.presences.cache.get(config.developer) || await member.fetch(true).then((member) => member.presence) || null;

				data = {
					id: member.user.id,
					username: member.user.username,
					discriminator: member.user.discriminator,
					nickname: member.nickname,
					nickavatar: member.displayAvatarURL({ size: 2048 }) || null,
					status: presence?.status || 'offline',
					activities: presence?.activities?.length ? formatActivities(presence.activities) : [],
					createdTimestamp: member.user.createdTimestamp,
					avatar: member.user.displayAvatarURL({ size: 2048 }) || null,
					banner: member.user.bannerURL({ size: 2048 }) || null,
					accentColor: member.user.accentColor,
				};

				break;
			}

			return res.status(200).json({
				status: 200,
				content: data || null,
			});
		});
	}

	private async evalEndpoint() {
		this.app.get('/eval', (req, res) => {
			return res.status(200).json({
				status: 200,
				data: {
					clients: client.gatewayManager?.getClients(true),
				},
			});
		});

		this.app.post('/eval', async (req, res) => { // Yes, i am aware that this can be potentional security risk.
			if (req.headers.authorization !== config.keys.eval) return res.status(401).json({
				status: 401,
				message: 'You are not authorized to do this.',
			});

			const code = req.body.code || null;
			const onWhere = req.body.onWhere || null;
			const clients = client.gatewayManager?.getClients(true) || [];

			if (!onWhere || !clients?.includes(onWhere)) return res.status(400).json({
				status: 400,
				message: 'Missing eval destination.',
			});

			if (!code) return res.status(400).json({
				status: 400,
				message: 'Missing eval code.',
			});

			const result = await evalExecute(onWhere, code);
			if (!result) return res.status(400).json({
				status: 400,
				message: 'Eval failed.',
			});

			return res.status(200).json({
				status: 200,
				data: result,
			});
		});
	}

	private async loadInternal() {
		this.app.all('*', (req, res) => {
			res.status(404).json({
				status: 404,
				message: 'This endpoint does not exist.',
			});
		});

		this.app.listen(config.ports.http, () => {
			LoggerModule('HTTP', `Listening on port ${config.ports.http}.`, 'green');
		});
	}
}

/* ----------------------------------- Utils ----------------------------------- */

function formatActivities(activities: Activity[]) {
	const newActivities = [];

	for (const activity of activities) {
		if (activity.name === 'Spotify') {
			newActivities.push({
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
						image: (activity.assets?.largeImage ? (activity.assets.largeImage.startsWith('spotify:') ? `https://i.scdn.co/image/${activity.assets.largeImage.replace(/spotify:/, '')}` : `https://i.scdn.co/image/${activity.assets.largeImage}.png`) : null),
					},
					small: {
						text: activity.assets?.smallText,
						image: (activity.assets?.smallImage ? (activity.assets.smallImage.startsWith('mp:external') ? `https://media.discordapp.net/${activity.assets.smallImage.replace(/mp:/, '')}` : `https://cdn.discordapp.com/app-assets/${activity.applicationId}/${activity.assets.smallImage}.png`) : null),
					},
				},
			});
		} else {
			if (activity.type !== 4) {
				newActivities.push({
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
							image: (activity.assets?.largeImage ? (activity.assets.largeImage.startsWith('mp:external') ? `https://media.discordapp.net/${activity.assets.largeImage.replace(/mp:/, '')}` : `https://cdn.discordapp.com/app-assets/${activity.applicationId}/${activity.assets.largeImage}.png`) : null),
						},
						small: {
							text: activity.assets?.smallText,
							image: (activity.assets?.smallImage ? (activity.assets.smallImage.startsWith('mp:external') ? `https://media.discordapp.net/${activity.assets.smallImage.replace(/mp:/, '')}` : `https://cdn.discordapp.com/app-assets/${activity.applicationId}/${activity.assets.smallImage}.png`) : null),
						},
					},
				});
			}
		}
	}
}
