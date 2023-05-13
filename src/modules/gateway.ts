import { BaseMessage, GatewayIdentifications, MessageTypes, WsClient, ResponseData, EventTypes, WsUptimeClient } from '../data/types';
import { formatMessage } from './utils';
import { randomBytes } from 'crypto';
import { Message } from 'discord.js';
import LoggerModule from './logger';
import config from '../data/config';
import WssManager from '../index';
import ws from 'ws';

abstract class BaseGatewayManager {
	private wss: ws.Server;
	public clients: Map<GatewayIdentifications, WsClient>;
	private waitingForResponse: Map<string, ResponseData>;

	constructor() {
		this.wss = new ws.Server({ port: config.ports.ws });
		this.waitingForResponse = new Map();
		this.clients = new Map();

		this.wss.on('connection', async (socket, message) => {
			const identify = this.getIdentification(message.headers?.authorization, message.url?.includes('/dev'));
			if (!message.headers?.authorization || !identify) return socket.close(1008, 'You are not allowed to connect to this gateway.');
			else socket.send(JSON.stringify({ type: 'auth', data: { eventData: true } } as BaseMessage)); // Client successfully authenticated.

			LoggerModule('Gateway', `${identify} connected to the gateway.`, 'green');
			this.clients.set(identify, { socket, lastHeartbeat: Date.now() });

			socket.on('message', (data) => {
				const message: BaseMessage = JSON.parse(data.toString());

				switch (message.type) {
					case 'requireReply': case 'eval': {
						if (!message.key) return null;
						const data = this.waitingForResponse.get(message.key);

						if (data?.resolve) {
							data.resolve(message.data.eventData);
							this.waitingForResponse.delete(message.key);
						}

						WssManager.localDataBase?.delete({ key: message.key });

						break;
					}
				}
			});

			socket.on('pong', () => {
				const client = this.clients.get(identify);
				if (client) this.clients.set(identify, { ...client, lastHeartbeat: Date.now() });
			});

			socket.on('close', () => {
				LoggerModule('Gateway', `${identify} disconnected from the gateway.`, 'yellow');
				this.clients.delete(identify);
			});

			socket.on('error', (error) => {
				LoggerModule('Gateway', `${identify} disconnected from the gateway.`, 'yellow');
				this.clients.delete(identify);
				console.error(error);
			});
		});

		this.sendHeartbeat();
		this.handleUnresolvedPromises();
		this.handleNondeliveredEvents();

		LoggerModule('Gateway', `Listening on port ${config.ports.ws}.`, 'green');
	}

	/* ----------------------------------- Utils ----------------------------------- */

	private handleUnresolvedPromises() {
		setInterval(() => {
			for (const packet of this.waitingForResponse.values()) {
				if ((Date.now() - packet.timeAdded) > 20000) { // 20 seconds
					this.waitingForResponse.delete(packet.keyWhichIsKey);

					if (!packet.shouldWait) packet.resolve(null);
					else WssManager.localDataBase?.get({
						key: packet.keyWhichIsKey,
						fromWho: packet.clientId,
						data: packet.message,
						lastTried: Date.now(),
					}, true);
				}
			}
		}, 20000); // 20 seconds
	}

	private handleNondeliveredEvents() {
		setInterval(async () => {
			for (const packet of WssManager.localDataBase?.data || []) {
				if ((Date.now() - packet.lastTried) > 20000) { // 20 seconds
					const client = this.clients.get(packet.fromWho);
					if (!client) continue;

					client.socket.send(JSON.stringify({
						type: packet.data.type,
						key: packet.key,
						data: packet.data.data,
					} as BaseMessage));

					await WssManager.localDataBase?.update({ key: packet.key }, {
						lastTried: Date.now(),
					});
				}
			}
		}, 20000); // 20 seconds
	}

	private getIdentification(key?: string, isDev?: boolean) {
		const identification = Object.entries(config.gatewayIdentifications).find(([, value]) => value === key);
		return identification ? (isDev ? identification[0] + '|Dev' : identification[0]) as GatewayIdentifications : null;
	}

	private sendHeartbeat() {
		setInterval(() => {
			for (const [key, client] of this.clients) {
				if ((Date.now() - (client.lastHeartbeat || 0)) > 90000) { // 1 minute 30 seconds
					client.socket.close(4000, 'Heartbeat timeout.');
					this.clients.delete(key);
				}

				client.socket.ping();
			}
		}, 45000); // 45 seconds
	}

	/* ----------------------------------- Socket ----------------------------------- */

	public getClients(withWss?: boolean) {
		return [...this.clients.keys(), ...(withWss ? ['Wss'] : [])];
	}

	public send(identify: GatewayIdentifications, type: MessageTypes, data: object | string, eventType?: EventTypes): boolean | null {
		const client = this.clients.get(identify);

		const sendData = (key: string): Promise<unknown> => {
			client?.socket.send(JSON.stringify({
				type: type, key,
				data: {
					eventData: data,
					eventType,
				},
			} as BaseMessage));

			return new Promise((resolve) => {
				this.waitingForResponse.set(key, {
					shouldWait: type !== 'eval',
					timeAdded: Date.now(),
					keyWhichIsKey: key,
					clientId: identify,
					resolve,
					message: {
						type: type, key,
						data: {
							eventData: data,
							eventType,
						},
					},
				});
			});
		};

		try {
			switch (type) {
				case 'requireReply': case 'stripeEvent': {
					if (!client) {
						LoggerModule('Gateway', `${identify} is not connected to the gateway, saving.`, 'cyan');

						WssManager.localDataBase?.create({
							key: randomBytes(16).toString('hex'),
							fromWho: identify,
							lastTried: Date.now(),
							data: {
								type: type,
								data: {
									eventData: data,
									eventType,
								},
							},
						});
					} else sendData(randomBytes(16).toString('hex'));

					break;
				}
				case 'eval': {
					if (!client) return LoggerModule('Gateway', `${identify} is not connected to the gateway.`, 'red');
					sendData(randomBytes(16).toString('hex'));

					break;
				}
				default: {
					if (!client) return LoggerModule('Gateway', `${identify} is not connected to the gateway.`, 'red');

					client.socket.send(JSON.stringify({
						type: type,
						data: {
							eventData: data,
						},
					} as BaseMessage));

					break;
				}
			}

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

	public broadcast(type: MessageTypes, data: object) {
		for (const [key, client] of this.clients) {
			try {
				client.socket.send(JSON.stringify({
					type: type, data: { eventData: data },
				} as BaseMessage));
			} catch (error) {
				LoggerModule('Gateway', `Failed to send data to ${key} gateway.`, 'red');
				console.error(error);
			}
		}
	}

	public async evaluate(where: GatewayIdentifications, code: string) {
		const client = this.clients.get(where);
		if (!client) return LoggerModule('Gateway', `${where} is not connected to the gateway.`, 'red');

		return this.send(where, 'eval', code);
	}
}

abstract class UptimeTracker extends BaseGatewayManager {
	private uptimeWss: ws.Server;
	public uptimeClients: Map<string, WsUptimeClient>;

	constructor() {
		super();

		this.uptimeWss = new ws.Server({ port: config.ports.uptime });
		this.uptimeClients = new Map();

		this.uptimeWss.on('connection', async (socket, message) => {
			const identify = message.headers.authorization;
			const origin = message.socket.remoteAddress || message.headers.origin;

			if (!identify || !origin || identify.length < 20 || !this.canConnect(identify, origin)) return socket.close(1008, 'You are not allowed to connect to this gateway, valid authorization has to be at least 20 characters long.');
			socket.send(JSON.stringify({ connected: true })); // Client successfully authenticated.

			this.uptimeClients.set(identify, {
				socket,
				lastHeartbeat: Date.now(),
				uptimeSinceConnected: Date.now(),
				spamOrigin: origin,
			});

			socket.on('pong', () => {
				const client = this.uptimeClients.get(identify);
				if (client) this.uptimeClients.set(identify, { ...client, lastHeartbeat: Date.now() });
			});

			socket.on('close', () => this.uptimeClients.delete(identify));
			socket.on('error', () => this.uptimeClients.delete(identify));
		});

		LoggerModule('Uptimes', `Listening on port ${config.ports.uptime}.`, 'green');
		this.sendUptimeHeartbeat();
	}

	/* ----------------------------------- Socket ----------------------------------- */

	private sendUptimeHeartbeat() {
		setInterval(() => {
			for (const [key, client] of this.clients) {
				if ((Date.now() - (client.lastHeartbeat || 0)) > 90000) { // 1 minute 30 seconds
					client.socket.close(4000, 'Heartbeat timeout.');
					this.clients.delete(key);
				}

				client.socket.ping();
			}
		}, 45000); // 45 seconds
	}

	private canConnect(identify: string, origin: string) {
		if (this.uptimeClients.get(identify)) return false;

		const spam = [...this.uptimeClients.values()].filter((client) => client.spamOrigin === origin);
		if (spam.length > 10) return false;

		return true;
	}

	public checkOnlineStatus(key?: string) {
		if (!key) {
			const data: Record<string, { uptime: number; state: string; lastHeartbeat?: number; }> = {};

			for (const [key, client] of this.uptimeClients.entries()) {
				data[key] = {
					uptime: Date.now() - (client.uptimeSinceConnected || 0),
					state: ['Connecting', 'Open', 'Closing', 'Closed'][client.socket.readyState],
					lastHeartbeat: client.lastHeartbeat,
				};
			}

			if (Object.keys(data).length === 0) return null;
			return data;
		} else {
			const client = this.uptimeClients.get(key);
			if (!client) return null;

			return {
				uptime: Date.now() - (client.uptimeSinceConnected || 0),
				state: ['Connecting', 'Open', 'Closing', 'Closed'][client.socket.readyState],
				lastHeartbeat: client.lastHeartbeat,
			};
		}
	}
}

export default class GatewayManager extends UptimeTracker {
	constructor() {
		super();
	}

	/* ----------------------------------- System Updates ----------------------------------- */

	public async processSystemMessage(message: Message) {
		const client = this.clients.get('SystemUpdates'); // System Updates Internal Manager
		if (!client) return LoggerModule('Gateway', '\'SystemUpdates\' is not connected to the gateway.', 'red');

		const formatedMessage = formatMessage(message);
		this.send('SystemUpdates', 'requireReply', formatedMessage, 'systemMessage');

		return true;
	}

	/* ----------------------------------- Stripe Subscriptions ----------------------------------- */


}
