import { CustomClient, SlashCommandsType } from '../data/typings';
import { catchError } from '../index';
import { readdirSync } from 'node:fs';
import path from 'node:path';

export default function loadSlashCommands(client: CustomClient) {
	try {
		readdirSync(path.join(__dirname, '..', 'commands')).filter((file: string) => file.endsWith('.js')).map(async (command: string) => {
			const pull: SlashCommandsType = await import(path.join(__dirname, '..', 'commands', command)).then((file) => file.default);
			if (pull?.name) client?.slashCommands?.set(pull.name, pull);
		});
	} catch (error: unknown) {
		catchError(error as Error);
	}
}
