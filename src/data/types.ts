import GatewayManager from '../modules/gateway';
import HttpManager from '../modules/routes';
import { Client } from 'discord.js';
import config from './config';
import ws from 'ws';

export type GatewayIdentifications = keyof typeof config.gatewayIdentifications;

export interface CustomClient extends Client {
	gatewayManager?: GatewayManager;
	httpManager?: HttpManager;
}

export interface WsClient {
	socket: ws.WebSocket,
	lastHeartbeat?: number
}
