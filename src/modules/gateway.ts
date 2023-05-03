import { BaseMessage, GatewayIdentifications, MessageTypes, ResolveFunction, EventTypes, WsClient } from '../data/types';
import { formatMessage } from './utils';
import { randomBytes } from 'crypto';
import { Message } from 'discord.js';
import LoggerModule from './logger';
import config from '../data/config';
import ws from 'ws';

abstract class BaseGatewayManager {
	private wss: ws.Server;
	public clients: Map<GatewayIdentifications, WsClient>;
	private waitingToResend: Map<string, { lastTried: number; resolve: ResolveFunction; isStripe?: { subType: EventTypes; where: GatewayIdentifications; timeAdded?: number; } }>;
	private waitingForResponse: Map<string, { timeAdded: number; resolve: ResolveFunction; isStripe?: { subType: EventTypes; where: GatewayIdentifications; } }>;

	constructor() {
		this.wss = new ws.Server({ port: config.ports.ws });
		this.waitingForResponse = new Map();
		this.waitingToResend = new Map();
		this.clients = new Map();

		this.wss.on('connection', async (socket) => {
			const key = await this.waitForAuth(socket);
			const identify = this.getIdentification(key as string);

			if (!key || !identify) return socket.close(1008, 'You are not allowed to connect to this gateway.');
			else socket.send(JSON.stringify({ type: 'auth', data: true })); // Client successfully authenticated.

			LoggerModule('Gateway', `${identify} connected to the gateway.`, 'green');
			this.clients.set(identify, { socket, lastHeartbeat: Date.now() });

			socket.on('message', (data) => {
				const message: BaseMessage = JSON.parse(data.toString());

				switch (message.type) {
					case 'requireReply': {
						if (!message.key) return;

						const data = this.waitingToResend.get(message.key) || this.waitingForResponse.get(message.key);
						if (data?.resolve) {
							data.resolve(message.data);

							this.waitingToResend.delete(message.key);
							this.waitingForResponse.delete(message.key);
						}

						break;
					}
				}
			});

			socket.on('pong', () => {
				const client = this.clients.get(identify);
				if (client) client.lastHeartbeat = Date.now();
			});

			socket.on('close', () => {
				this.clients.delete(identify);
				LoggerModule('Gateway', `${identify} disconnected from the gateway.`, 'yellow');
			});

			socket.on('error', (error) => {
				this.clients.delete(identify);
				LoggerModule('Gateway', `${identify} disconnected from the gateway.`, 'yellow');
				console.error(error);
			});
		});

		this.sendHeartbeat();
		this.handleUnresolvedPromises();
		this.handleNondeliveredEvents();

		LoggerModule('Gateway', `Listening on port ${config.ports.ws}.`, 'green');
	}

	/* ----------------------------------- Utils ----------------------------------- */

	private async waitForAuth(socket: ws.WebSocket) {
		return new Promise<string | null>((resolve) => {
			setTimeout(() => resolve(null), 15000); // 15 seconds

			socket.once('message', (data) => {
				const message: BaseMessage = JSON.parse(data.toString());
				if (message.type === 'auth') resolve(message.key as string);
				else resolve(null);
			});
		});
	}

	private handleUnresolvedPromises() {
		setInterval(() => {
			for (const [key, value] of this.waitingForResponse) {
				if (Date.now() - value.timeAdded > 20000) {
					if (value.isStripe) this.waitingToResend.set(key, { ...value, lastTried: Date.now() });
					this.waitingForResponse.delete(key);
				}
			}
		}, 20000); // 20 seconds
	}

	private handleNondeliveredEvents() {
		setInterval(() => {
			for (const [key, value] of this.waitingToResend) {
				if (Date.now() - value.lastTried > 20000) {
					this.send(value.isStripe?.where as GatewayIdentifications, 'requireReply', value.resolve, value.isStripe?.subType, undefined, key);

					this.waitingToResend.set(key, {
						...value,
						lastTried: Date.now(),
					});
				}
			}
		}, 20000); // 20 seconds
	}

	private getIdentification(key: string) {
		const identification = Object.entries(config.gatewayIdentifications).find(([, value]) => value === key);
		return identification ? identification[0] as GatewayIdentifications : null;
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
		return [...this.clients.keys(), ...(withWss ? ['wss'] : [])];
	}

	public send(identify: GatewayIdentifications, type: MessageTypes, data: object | string, subType?: EventTypes, checkSuccess?: boolean, _key?: string) {
		const client = this.clients.get(identify);
		if (!client) return LoggerModule('Gateway', `${identify} is not connected to the gateway.`, 'red');

		try {
			if (checkSuccess) {
				const key = randomBytes(16).toString('hex');

				client.socket.send(JSON.stringify({
					type: type, data, key, subType,
				}));

				return new Promise((resolve) => {
					this.waitingForResponse.set(key, { timeAdded: Date.now(), resolve, isStripe: subType ? { subType, where: identify } : undefined });
				});
			} else {
				client.socket.send(JSON.stringify({
					type: type, data, subType, key: _key || undefined,
				}));

				return true;
			}
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
					type: type, data,
				}));
			} catch (error) {
				LoggerModule('Gateway', `Failed to send data to ${key} gateway.`, 'red');
				console.error(error);
			}
		}
	}

	public async evaluate(where: GatewayIdentifications, code: string) {
		const client = this.clients.get(where);
		if (!client) return LoggerModule('Gateway', `${where} is not connected to the gateway.`, 'red');

		return await this.send(where, 'eval', code, undefined, true);
	}
}

export default class GatewayManager extends BaseGatewayManager {
	constructor() {
		super();
	}

	/* ----------------------------------- System Updates ----------------------------------- */

	public async processSystemMessage(message: Message) {
		const client = this.clients.get('SystemUpdates'); // System Updates Internal Manager
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

	/* ----------------------------------- Stripe Subscriptions ----------------------------------- */


}
