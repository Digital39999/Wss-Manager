import { APIEmbed, CommandInteraction, CommandInteractionOptionResolver } from 'discord.js';
import { CustomClient, RedirectStructureType, SlashCommandsType } from '../data/typings';
import { quickPageSlider } from '../modules/utils';
import { getEmojiCheck } from '../data/emojis';
import config from '../data/config';

export default {
	name: 'redirect',
	description: 'Manage web redirects',
	options: [{
		name: 'view',
		description: 'View all redirects',
		type: 1,
		options: [{
			name: 'hidden',
			description: 'Would you like to make your command usage private?',
			type: 5,
		}],
	}, {
		name: 'create',
		description: 'Create a redirect',
		type: 1,
		options: [{
			name: 'name',
			description: 'What is the name of the redirect?',
			type: 3,
			required: true,
		}, {
			name: 'url',
			description: 'What would you like it to redirect to?',
			type: 3,
			required: true,
		}],
	}, {
		name: 'edit',
		description: 'Edit a redirect',
		type: 1,
		options: [{
			name: 'name',
			description: 'What is the name of the redirect?',
			type: 3,
			required: true,
		}, {
			name: 'url',
			description: 'What would you like it to redirect to?',
			type: 3,
			required: true,
		}, {
			name: 'hidden',
			description: 'Would you like to make your command usage private?',
			type: 5,
		}],
	}, {
		name: 'delete',
		description: 'Delete a redirect',
		type: 1,
		options: [{
			name: 'name',
			description: 'What is the name of the redirect?',
			type: 3,
			required: true,
		}, {
			name: 'hidden',
			description: 'Would you like to make your command usage private?',
			type: 5,
		}],
	}],

	run: async (WssManager: CustomClient, interaction: CommandInteraction, globalEmojiPerms: boolean) => {
		const hidden: boolean = (interaction.options as CommandInteractionOptionResolver).getBoolean('hidden') as boolean;
		await interaction.deferReply({ ephemeral: hidden ?? true });

		const subCommand = (interaction.options as CommandInteractionOptionResolver).getSubcommand();

		switch (subCommand) {
			case 'view': {
				const data = await WssManager.dataManager?.getAllData('redirect');
				if (!data?.length) return interaction.editReply({
					content: getEmojiCheck('fromMyServer.error', false, globalEmojiPerms) + ' • Could not get data.',
				});

				const chunks: RedirectStructureType[][] = [], allPages: APIEmbed[] = [];

				for (let i = 0; i < data.length; i += 25) {
					chunks.push(data.slice(i, i + 25) as unknown as RedirectStructureType[]);
				}

				for (const chunk of chunks) {
					allPages.push({
						title: `Redirects • Page 0/${chunks.length}`,
						description: '> ' + chunk.map((redirect, index) => `${index + 1}. [/${redirect.name}](${redirect.url})`).join('\n> '),
						color: config.color,
					});
				}

				await quickPageSlider(WssManager, interaction, allPages);

				break;
			}
			case 'create': {
				const name = (interaction.options as CommandInteractionOptionResolver).getString('name') as string;
				const url = (interaction.options as CommandInteractionOptionResolver).getString('url') as string;

				if (!name || !url || /[^a-zA-Z0-9-_]/g.test(name) || !url.startsWith('http')) return interaction.editReply({
					content: getEmojiCheck('fromMyServer.error', false, globalEmojiPerms) + ' • Invalid name or url.',
				});

				const data = await WssManager.dataManager?.getData('redirect', { name, url }, true);
				if (!data) return interaction.editReply({
					content: getEmojiCheck('fromMyServer.error', false, globalEmojiPerms) + ' • Could not create data.',
				});

				interaction.editReply({
					content: getEmojiCheck('fromMyServer.success', false, globalEmojiPerms) + ` • Created redirect: [/${data.name}](${data.url})`,
				});

				break;
			}
			case 'edit': {
				const name = (interaction.options as CommandInteractionOptionResolver).getString('name') as string;
				const url = (interaction.options as CommandInteractionOptionResolver).getString('url') as string;

				if (!name || !url || /[^a-zA-Z0-9-_]/g.test(name) || !url.startsWith('http')) return interaction.editReply({
					content: getEmojiCheck('fromMyServer.error', false, globalEmojiPerms) + ' • Invalid name or url.',
				});

				const data = await WssManager.dataManager?.updateData('redirect', { name }, { url }) as RedirectStructureType;
				if (!data) return interaction.editReply({
					content: getEmojiCheck('fromMyServer.error', false, globalEmojiPerms) + ' • Could not edit data.',
				});

				interaction.editReply({
					content: getEmojiCheck('fromMyServer.success', false, globalEmojiPerms) + ` • Edited redirect: [/${data.name}](${data.url})`,
				});

				break;
			}
			case 'delete': {
				const name = (interaction.options as CommandInteractionOptionResolver).getString('name') as string;

				if (!name || /[^a-zA-Z0-9-_]/g.test(name)) return interaction.editReply({
					content: getEmojiCheck('fromMyServer.error', false, globalEmojiPerms) + ' • Invalid name.',
				});

				const data = await WssManager.dataManager?.deleteData('redirect', { name }) as RedirectStructureType;
				if (!data) return interaction.editReply({
					content: getEmojiCheck('fromMyServer.error', false, globalEmojiPerms) + ' • Could not delete data.',
				});

				interaction.editReply({
					content: getEmojiCheck('fromMyServer.success', false, globalEmojiPerms) + ` • Deleted redirect: [/${data.name}](${data.url})`,
				});

				break;
			}
		}
	},
} as SlashCommandsType;
