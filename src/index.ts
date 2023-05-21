import { ActivityType, ChannelType, Client, GatewayIntentBits, Options } from 'discord.js';
import { CustomClient, GatewayIdentifications } from './data/typings';
import LoggerModule, { LoggerBoot } from './modules/logger';
import DataManager from './modules/dataManager';
import GatewayManager from './modules/gateway';
import StripeManager from './modules/stripe';
import HttpManager from './modules/routes';
import config from './data/config';
import { connectMongoose } from './modules/utils';

/* ----------------------------------- Process ----------------------------------- */

process.env.NODE_NO_WARNINGS = '1';
process.on('warning', (warning) => catchError(warning));
process.on('uncaughtException', (error) => catchError(error));
process.on('unhandledRejection', (error) => catchError(error as Error));

/* ----------------------------------- Console ----------------------------------- */

console.clear(); LoggerBoot(); LoggerModule('Client', 'Wss Manager is booting up.. please wait..', 'cyan');
config.devMode ? LoggerModule('Client', 'Developer mode is enabled, some features may not work properly.\n', 'cyan') : null;

/* ----------------------------------- Client ----------------------------------- */

const WssManager: CustomClient = new Client({
	intents: [
		GatewayIntentBits.Guilds, // Bot
		GatewayIntentBits.GuildMembers, // API
		GatewayIntentBits.GuildMessages, // System
		GatewayIntentBits.MessageContent, // System
		GatewayIntentBits.GuildPresences, // API
	],
	presence: {
		status: 'online',
		activities: [{
			name: 'clients..',
			type: ActivityType.Watching,
		}],
	},
	makeCache: Options.cacheWithLimits({
		AutoModerationRuleManager: 0,
		ApplicationCommandManager: 0,
		BaseGuildEmojiManager: 0,
		GuildEmojiManager: 0,
		GuildMemberManager: {
			maxSize: 1, // change this (https://github.com/discordjs/discord.js/pull/9534)
			keepOverLimit: (member) => config.developerIds.some((id) => member.id === id),
		},
		GuildBanManager: 0,
		GuildForumThreadManager: 0,
		GuildInviteManager: 0,
		GuildScheduledEventManager: 0,
		GuildStickerManager: 0,
		GuildTextThreadManager: 0,
		MessageManager: 0,
		PresenceManager: {
			maxSize: 1,
			keepOverLimit: (presence) => config.developerIds.some((id) => presence.userId === id),
		},
		ReactionManager: 0,
		ReactionUserManager: 0,
		StageInstanceManager: 0,
		ThreadManager: 0,
		ThreadMemberManager: 0,
		UserManager: 0,
		VoiceStateManager: 0,
	}),
});

/* ----------------------------------- Custom ----------------------------------- */

(async () => {
	const DB = await connectMongoose();

	WssManager.dataManager = new DataManager(DB);
	WssManager.httpManager = new HttpManager();
	WssManager.stripeManager = new StripeManager();
	WssManager.gatewayManager = new GatewayManager();
})();

/* ----------------------------------- Utils ----------------------------------- */

export function catchError(error: Error) {
	if (error?.name?.includes('ExperimentalWarning') || error?.name?.includes('Unknown interaction')) return;

	LoggerModule('Client', 'An error has occurred.', 'red');
	console.error(error);
}

export async function evalExecute(where: GatewayIdentifications | 'wss', code: string) {
	if (where !== 'wss') return await WssManager.gatewayManager?.evaluate(where, code);

	try {
		const result = function (str: string) { return eval(str); }.call(WssManager, code);
		return JSON.stringify(result, null, 5);
	} catch (error) {
		if (typeof error === 'string') return error;
		if (error instanceof EvalError) return `EvalError: ${error.message}`;

		try {
			return error?.toString();
		} catch (e) {
			catchError(e as Error);
			return 'Failed to get error message, check console for more information.';
		}
	}
}

/* ----------------------------------- Events & Login ----------------------------------- */

WssManager.on('ready', () => {
	setTimeout(() => {
		LoggerModule('Client', `Logged in as ${WssManager.user?.tag}!`, 'magenta', true);
		LoggerModule('Logging', 'Listening for logs:\n', 'white');
	}, 1000);
});

WssManager.on('messageCreate', async (message) => {
	if (message.channel.type !== ChannelType.GuildText) return;
	if (message.channel.parentId !== config.systemUpdatesCategory) return;
	if (message.channelId === '1104023489381412897') message.crosspost(); // Someones's Media

	await WssManager.gatewayManager?.processSystemMessage(message);
});

/* ----------------------------------- Exports & Errors ----------------------------------- */

WssManager.rest.on('rateLimited', (info) => {
	LoggerModule('Ratelimit', `Below:\n- Timeout: ${info.timeToReset}\n- Limit: ${info.limit}\n- Global: ${info.global ? 'True' : 'False'}\n- Route: ${info.route}\n- Path: ${info.url}\n- Method: ${info.method}\n`, 'yellow');
});

export default WssManager;
WssManager.login(config.token);

/* ----------------------------------- End Of File ----------------------------------- */
