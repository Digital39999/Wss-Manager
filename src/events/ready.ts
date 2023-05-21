import { APIApplicationCommand, ActivityType, ApplicationCommandDataResolvable, PermissionsBitField } from 'discord.js';
import { CustomClient, EventType, SlashCommandsType } from '../data/typings';
import LoggerModule from '../modules/logger';
import config from '../data/config';

export default {
	name: 'ready',
	options: {
		emit: true,
		once: true,
	},

	run: async (WssManager: CustomClient) => {
		setTimeout(() => {
			LoggerModule('WssManager', `Logged in as ${WssManager.user?.tag}!`, 'magenta', true);
			LoggerModule('Logging', 'Listening for logs:\n', 'white');
		}, 1000);

		changeStatus(); setInterval(() => changeStatus(), 3600000);

		function changeStatus() {
			WssManager.user?.setPresence({
				status: 'online',
				activities: [{
					name: 'clients..',
					type: ActivityType.Watching,
				}],
			});
		}

		if (!config?.slashCommands) LoggerModule('Client', 'Slash commands are disabled.', 'grey');
		else {
			const interactionsData: Partial<APIApplicationCommand>[] = [];

			Array.from(WssManager?.slashCommands?.values() || []).map((command: SlashCommandsType) => {
				const sendData: Partial<APIApplicationCommand> = { name: command.name };
				if (command?.context) interactionsData.push({ name: command.name, type: command.type, description: command.description });
				else if (command?.register !== false) {
					if (command.id) sendData.id = command.id;
					if (command.type) sendData.type = command.type;
					if (command.name) sendData.name = command.name;
					if (command.options) sendData.options = command.options;
					if (command.description) sendData.description = command.description;
					if (command.dm_permission) sendData.dm_permission = command.dm_permission || false;
					if (command.permissions?.user) sendData.default_member_permissions = new PermissionsBitField().add(command.permissions?.user).bitfield.toString();

					interactionsData.push(sendData);
				}
			});

			await WssManager.application?.commands.set(interactionsData as ApplicationCommandDataResolvable[]);
		}
	},
} as EventType;
