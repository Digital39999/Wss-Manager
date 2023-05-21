import { CustomClient, EventType } from '../data/typings';
import { readdirSync } from 'node:fs';
import path from 'node:path';

export default function loadEvents(client: CustomClient) {
	readdirSync(path.join(__dirname, '..', 'events')).filter((file: string) => file.endsWith('.js')).map(async (file: string) => {
		const pull: EventType = await import(path.join(__dirname, '..', 'events', file)).then((file) => file.default);

		if (pull.options.emit) {
			if (pull.options.once) client.once(pull.name, (...args) => pull.run(client, ...args) as unknown as void);
			else client.on(pull.name, (...args) => pull.run(client, ...args) as unknown as void);
		}
	});
}
