import { AllInteractionTypes, CustomClient, EventType } from '../data/typings';
import { getEmojiCheck } from '../data/emojis';
import { catchError } from '../index';
import config from '../data/config';

export default {
	name: 'interactionCreate',
	options: {
		emit: true,
		once: false,
	},

	run: async (WssManager: CustomClient, interaction: AllInteractionTypes) => {
		const globalEmojiPerms = interaction.guild?.roles.everyone.permissions.has('UseExternalEmojis') || false;

		if (!config.developerIds.includes(interaction.user.id)) return interaction.reply({
			content: getEmojiCheck('fromMyServer.error', false, globalEmojiPerms) + ' • You are not allowed to use this bot.',
			ephemeral: true,
		});

		if (interaction.isCommand()) {
			const usedCommand = WssManager.slashCommands?.get(interaction.commandName);
			if (!usedCommand) return interaction.reply({
				content: getEmojiCheck('fromMyServer.error', false, globalEmojiPerms) + ' • This command does not exist.',
				ephemeral: true,
			});

			try {
				usedCommand.run?.(WssManager, interaction, globalEmojiPerms);
			} catch (error: unknown) {
				catchError(error as Error);

				interaction[interaction.replied ? 'editReply' : 'reply']({
					content: getEmojiCheck('fromMyServer.error', false, globalEmojiPerms) + ' • An error occurred while executing this command.',
				}).catch((): null => null);
			}
		}
	},
} as EventType;
