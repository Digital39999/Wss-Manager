import LocalDataBase from '../modules/database/core';
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
export type StripeEvents = 'started' | 'ended' | 'canceled' | 'unpaid' | 'other' | 'oneTimePaid';
export type MessageTypes = 'shutdown' | 'restart' | 'auth' | 'requireReply' | 'stripeEvent' | 'eval' | 'raw';
export type StripGatewayIdentifications = Exclude<GatewayIdentifications, 'Guardian' | 'SystemUpdates' | 'TextionalVoice'>;
export type ResponseData = { timeAdded: number; resolve: ResolveFunction; clientId: GatewayIdentifications; keyWhichIsKey: string; shouldWait?: boolean; message?: BaseMessage; };
export type BaseMessage = { type: MessageTypes; data: { eventData: object | string | boolean | number; eventType?: EventTypes; }; key?: string; };

export interface CustomClient extends Client {
	gatewayManager?: GatewayManager;
	stripeManager?: StripeManager;
	httpManager?: HttpManager;

	localDataBase?: LocalDataBase;
}

export interface WsClient {
	socket: ws.WebSocket,
	lastHeartbeat?: number
}
