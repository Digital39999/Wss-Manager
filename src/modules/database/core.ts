import { BaseMessage, GatewayIdentifications } from '../../data/types';
import path from 'node:path';
import fs from 'fs/promises';

export type EventData = {
	key: string;
	data: Omit<BaseMessage, 'key'>;
	fromWho: GatewayIdentifications;
	lastTried: number;
};

export default class LocalDataBase {
	public data: EventData[] = [];
	private clearOnStart?: boolean = false;
	private filePath = path.join(__dirname, 'data.json');

	constructor() {
		this.init(this.filePath, true);
		this.init(this.filePath.replace('dist', 'src'));
	}

	async init(filePath: string, isMain?: boolean) {
		try {
			const data = await fs.readFile(filePath, 'utf8');
			if (!data) throw new Error();

			if (isMain) this.data = JSON.parse(data);
		} catch (error) {
			await fs.writeFile(filePath, '[]');
			await this.init(filePath, isMain);
		}

		if (this.clearOnStart) {
			this.data = []; await this.saveToFile();
		}
	}

	async create(data: EventData): Promise<EventData> {
		const checkIfExists = await this.get(data);
		if (checkIfExists) return checkIfExists;

		this.data.push(data);
		await this.saveToFile();

		return data;
	}

	async get(data: Partial<EventData>, createOnFail?: boolean): Promise<EventData | null> {
		const event = this.data.find((item) => item.key === data.key) || null;
		if (!event && createOnFail) return await this.create(data as EventData);

		return event;
	}

	async delete(data: Partial<EventData>) {
		const index = this.data.findIndex((item) => item.key === data.key);
		if (index === -1) return null;

		this.data.splice(index, 1);
		await this.saveToFile();

		return true;
	}

	async update(data: Partial<EventData>, update: Partial<EventData>): Promise<EventData | null> {
		const index = this.data.findIndex((item) => item.key === data.key);
		if (index === -1) return null;

		this.data[index] = { ...this.data[index], ...update };
		await this.saveToFile();

		return this.data[index];
	}

	private async saveToFile() {
		// clear them
		await fs.writeFile(this.filePath, JSON.stringify(this.data || [], null, 5));
		fs.copyFile(this.filePath, this.filePath.replace('dist', 'src'));
	}
}
