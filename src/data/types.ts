import GatewayManager from '../modules/gateway';
import StripeManager from '../modules/stripe';
import HttpManager from '../modules/routes';
import { Client } from 'discord.js';
import config from './config';
import ws from 'ws';

export type SubWho = 'Waya' | 'StatusBot';
export type ResolveFunction = (data: unknown) => void;
export type EventTypes = StripeEvents | 'systemMessage';
export type GatewayIdentifications = keyof typeof config.gatewayIdentifications;
export type MessageTypes = 'shutdown' | 'restart' | 'auth' | 'requireReply' | 'eval' | 'raw';
export type StripeEvents = 'started' | 'ended' | 'canceled' | 'unpaid' | 'other' | 'oneTimePaid';
export type StripGatewayIdentifications = Exclude<GatewayIdentifications, 'Guardian' | 'SystemUpdates' | 'TextionalVoice'>;
export type BaseMessage = { type: MessageTypes; subType?: EventTypes; data: object | boolean | string | number; key?: string; };

export interface CustomClient extends Client {
	gatewayManager?: GatewayManager;
	stripeManager?: StripeManager;
	httpManager?: HttpManager;
}

export interface WsClient {
	socket: ws.WebSocket,
	lastHeartbeat?: number
}
