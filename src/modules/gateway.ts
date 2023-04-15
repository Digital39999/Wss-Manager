import { GatewayIdentifications, WsClient } from '../data/types';
import { APIEmbed, EmbedType, Message } from 'discord.js';
import LoggerModule from './logger';
import config from '../data/config';
import ws from 'ws';

export default class GatewayManager {
	private wss: ws.Server;
	private clients: Map<GatewayIdentifications, WsClient>;

	constructor() {
		this.wss = new ws.Server({ port: config.ports.ws });
		this.clients = new Map();

		this.wss.on('connection', async (socket) => {
			const key = await this.waitForAuth(socket);
			const identify = this.getIdentification(key as string);

			if (!key || !identify) return socket.close(1008, 'You are not allowed to connect to this gateway.');
			else socket.send(JSON.stringify({ type: 'auth', data: true }));

			LoggerModule('Gateway', `${identify} connected to the gateway.`, 'green');
			this.clients.set(identify, { socket, lastHeartbeat: Date.now() });

			socket.on('message', (data) => {
				const message = JSON.parse(data.toString());

				if (message.type === 'heartbeat') {
					const client = this.clients.get(identify);
					if (client) client.lastHeartbeat = Date.now();
				}
			});

			socket.on('close', () => {
				this.clients.delete(identify);
				LoggerModule('Gateway', `${identify} disconnected from the gateway.`, 'yellow');
			});
		});

		this.sendHeartbeat();
		LoggerModule('Gateway', `Listening on port ${config.ports.ws}.`, 'green');
	}

	/* ----------------------------------- Internal ----------------------------------- */

	private async waitForAuth(socket: ws.WebSocket) {
		return new Promise<string | null>((resolve) => {
			setTimeout(() => resolve(null), 15000); // 15 seconds

			socket.on('message', (data) => {
				const message = JSON.parse(data.toString());

				if (message?.type === 'auth') resolve(message?.data);
				else resolve(null);
			});
		});
	}

	private async waitForEval(key: GatewayIdentifications) {
		return new Promise<null | unknown>((resolve) => {
			const client = this.clients.get(key);
			if (!client) return resolve(null);

			setTimeout(() => resolve(null), 30000); // 30 seconds

			client.socket.on('message', (data) => {
				const message = JSON.parse(data.toString());

				if (message?.type === 'eval') resolve(message?.data);
				else resolve(null);
			});
		});
	}

	private getIdentification(key: string) {
		const identification = Object.entries(config.gatewayIdentifications).find(([, value]) => value === key);
		return identification ? identification[0] as GatewayIdentifications : null;
	}

	private sendHeartbeat() {
		setInterval(() => {
			for (const [key, client] of this.clients) {
				if ((Date.now() - (client.lastHeartbeat || 0)) > 90000) { // 1 minute 30 seconds
					client.socket.close(4000, 'Heartbeat timeout.'); this.clients.delete(key);
				}

				client.socket.send(JSON.stringify({ type: 'heartbeat' }));
			}
		}, 45000); // 45 seconds
	}

	/* ----------------------------------- Socket ----------------------------------- */

	public getClients(withWss?: boolean) {
		return [...this.clients.keys(), ...(withWss ? ['wss'] : [])];
	}

	public send(identify: GatewayIdentifications, data: object) {
		const client = this.clients.get(identify);
		if (!client) return LoggerModule('Gateway', `${identify} is not connected to the gateway.`, 'red');

		try {
			client.socket.send(JSON.stringify({
				type: 'send', data,
			}));

			return true;
		} catch (error) {
			LoggerModule('Gateway', `Failed to send data to ${identify} gateway.`, 'red');
			console.error(error);
		}

		return null;
	}

	public close(key: GatewayIdentifications) {
		const client = this.clients.get(key);
		if (!client) return LoggerModule('Gateway', `${key} is not connected to the gateway.`, 'red');

		client.socket.close();
		this.clients.delete(key);

		return true;
	}

	public broadcast(data: object) {
		for (const [key, client] of this.clients) {
			try {
				client.socket.send(JSON.stringify({
					type: 'broadcast', data,
				}));
			} catch (error) {
				LoggerModule('Gateway', `Failed to send data to ${key} gateway.`, 'red');
				console.error(error);
			}
		}
	}

	public requestRestart() {
		this.broadcast({
			type: 'restart',
		});
	}

	public async evaluate(where: GatewayIdentifications, code: string) {
		const client = this.clients.get(where);
		if (!client) return LoggerModule('Gateway', `${where} is not connected to the gateway.`, 'red');

		try {
			client.socket.send(JSON.stringify({
				type: 'eval', data: code,
			}));

			return await this.waitForEval(where);
		} catch (error) {
			LoggerModule('Gateway', `Failed to send data to ${where} gateway.`, 'red');
			console.error(error);
		}

		return null;
	}

	/* ----------------------------------- System Updates ----------------------------------- */

	public async processSystemMessage(message: Message) {
		const client = this.clients.get('SystemUpdates');
		if (!client) return LoggerModule('Gateway', '\'SystemUpdates\' is not connected to the gateway.', 'red');

		const formatedMessage = formatMessage(message);

		try {
			client.socket.send(JSON.stringify({
				type: 'systemMessage',
				data: formatedMessage,
			}));

			return true;
		} catch (error) {
			LoggerModule('Gateway', 'Failed to send data to \'SystemUpdates\' gateway.', 'red');
			console.error(error);
		}

		return null;
	}
}

/* ----------------------------------- Utils ----------------------------------- */

function formatMessage(message: Message) {
	const formatedMessage: { content: string; embeds: APIEmbed[]; files: string[]; channelId: string; } = {
		channelId: message.channel.id,
		content: message.content,
		embeds: [],
		files: [],
	};

	for (const embed of message.embeds || []) {
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

	for (const attachment of message.attachments.values() || []) {
		formatedMessage.files.push(attachment.url);
	}

	return formatedMessage;
}
