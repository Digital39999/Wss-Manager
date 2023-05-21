import { APIApplicationCommandOption, ApplicationCommandType, ButtonInteraction, ChannelSelectMenuInteraction, ChatInputCommandInteraction, Client, ClientEvents, CommandInteraction, ContextMenuCommandInteraction, MessageContextMenuCommandInteraction, ModalSubmitInteraction, PermissionResolvable, RoleSelectMenuInteraction, SelectMenuInteraction, UserSelectMenuInteraction } from 'discord.js';
import DataManager from '../modules/dataManager';
import GatewayManager from '../modules/gateway';
import StripeManager from '../modules/stripe';
import HttpManager from '../modules/routes';
import config from './config';
import ws from 'ws';

export type StripeUsers = keyof typeof config.stripe;
export type ResolveFunction = (data: unknown) => void;
export type EventTypes = StripeEvents | 'systemMessage';
export type ParsedStripeUsers = StripeUsers | `${StripeUsers}|Dev`;
export type Who = { account: ParsedStripeUsers; clientId: GatewayIdentifications; };
export type SliderActions = 'first' | 'last' | 'next' | 'previous' | 'exit' | 'select';
export type StripeEvents = 'started' | 'ended' | 'canceled' | 'unpaid' | 'other' | 'oneTimePaid';
export type MessageTypes = 'shutdown' | 'restart' | 'auth' | 'requireReply' | 'stripeEvent' | 'eval' | 'raw';
export type ConnectionState = 'Disconnected' | 'Connected' | 'Connecting' | 'Disconnecting' | 'Uninitialized';
export type GatewayIdentifications = keyof typeof config.gatewayIdentifications | `${keyof typeof config.gatewayIdentifications}|Dev`;
export type BaseMessage = { type: MessageTypes; data: { eventData: object | string | boolean | number; eventType?: EventTypes; }; key?: string; };
export type ResponseData = { timeAdded: number; resolve: ResolveFunction; clientId: GatewayIdentifications; keyWhichIsKey: string; shouldWait?: boolean; message?: BaseMessage; };
export type AllInteractionTypes = CommandInteraction | ContextMenuCommandInteraction | ButtonInteraction | ModalSubmitInteraction | SelectMenuInteraction | ChatInputCommandInteraction | MessageContextMenuCommandInteraction | ChannelSelectMenuInteraction | UserSelectMenuInteraction | RoleSelectMenuInteraction;

export type DataType = 'gateway' | 'redirect';
export type DataStoreTypes = `${DataType}Data`;
export type SearchedData<T extends DataType> = Partial<AllStructureTypesObject[T]>;

export type AllStructureTypesObject = {
	gateway: GatewayStructureType;
	redirect: RedirectStructureType;
}

export type GatewayStructureType = import('./structures').inputGatewayType;
export type RedirectStructureType = import('./structures').inputRedirectType;


export interface CustomClient extends Client {
	gatewayManager?: GatewayManager;
	stripeManager?: StripeManager;
	httpManager?: HttpManager;
	dataManager?: DataManager;

	slashCommands?: Map<string, SlashCommandsType>;
}

export interface WsClient {
	socket: ws.WebSocket;
	lastHeartbeat?: number;
}

export interface WsUptimeClient extends WsClient {
	spamOrigin?: string;
	uptimeSinceConnected?: number;
}

export interface MapType<T> {
	data: T;
	lastAccessed: number;
}

export type EventType = {
	name: keyof ClientEvents & 'raw';
	options: {
		emit: boolean;
		once: boolean;
	}

	run: <T extends keyof ClientEvents>(client: CustomClient, ...args: ClientEvents[T]) => unknown;
}

export type SlashCommandsType = {
	id?: string;
	type?: ApplicationCommandType;
	name: string;
	description: string;
	usage?: string;
	register?: boolean;
	context?: boolean;
	options?: APIApplicationCommandOption[];
	default_member_permissions?: Permissions | null;
	dm_permission?: boolean;
	permissions?: {
		user?: PermissionResolvable[];
		client?: PermissionResolvable[];
	}

	run?: (client: CustomClient, interaction: CommandInteraction | ContextMenuCommandInteraction, globalEmojiPerms: boolean) => unknown;
}
