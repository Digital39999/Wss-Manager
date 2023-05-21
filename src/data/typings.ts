import DataManager from '../modules/dataManager';
import GatewayManager from '../modules/gateway';
import StripeManager from '../modules/stripe';
import HttpManager from '../modules/routes';
import { Client } from 'discord.js';
import config from './config';
import ws from 'ws';

export type StripeUsers = keyof typeof config.stripe;
export type ResolveFunction = (data: unknown) => void;
export type EventTypes = StripeEvents | 'systemMessage';
export type ParsedStripeUsers = StripeUsers | `${StripeUsers}|Dev`;
export type Who = { account: ParsedStripeUsers; clientId: GatewayIdentifications; };
export type FnType = Awaited<ReturnType<typeof DataManager['prototype']['collectionModel']>>;
export type StripeEvents = 'started' | 'ended' | 'canceled' | 'unpaid' | 'other' | 'oneTimePaid';
export type MessageTypes = 'shutdown' | 'restart' | 'auth' | 'requireReply' | 'stripeEvent' | 'eval' | 'raw';
export type ConnectionState = 'Disconnected' | 'Connected' | 'Connecting' | 'Disconnecting' | 'Uninitialized';
export type GatewayIdentifications = keyof typeof config.gatewayIdentifications | `${keyof typeof config.gatewayIdentifications}|Dev`;
export type BaseMessage = { type: MessageTypes; data: { eventData: object | string | boolean | number; eventType?: EventTypes; }; key?: string; };
export type ResponseData = { timeAdded: number; resolve: ResolveFunction; clientId: GatewayIdentifications; keyWhichIsKey: string; shouldWait?: boolean; message?: BaseMessage; };

export interface CustomClient extends Client {
	gatewayManager?: GatewayManager;
	stripeManager?: StripeManager;
	httpManager?: HttpManager;

	dataManager?: DataManager;
}

export interface WsClient {
	socket: ws.WebSocket;
	lastHeartbeat?: number;
}

export interface WsUptimeClient extends WsClient {
	spamOrigin?: string;
	uptimeSinceConnected?: number;
}
