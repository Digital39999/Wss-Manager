import { BaseMessage, GatewayIdentifications } from '../data/typings';
import mongoose, { FilterQuery } from 'mongoose';
import config from '../data/config';
import LoggerModule from './logger';

export type GatewaySchema = {
	key: string;
	data: Omit<BaseMessage, 'key'>;
	fromWho: GatewayIdentifications;
	lastTried: number;
}

export default class DataManager {
	public state: boolean;

	constructor() {
		this.state = false;
		this.init();
	}

	private init() {
		mongoose.set('strictQuery', false);
		mongoose.connect(config?.database as string);

		mongoose.connection.on('connected', async () => {
			LoggerModule('Database', 'Connected to MongoDB.', 'magenta');
			this.WssManagerModels();
			this.state = true;
		});

		mongoose.connection.on('disconnected', async () => {
			LoggerModule('Database', 'Disconnected from MongoDB.\n', 'red');
			this.state = false;
		});

		mongoose.connection.on('error', async (er: unknown) => {
			LoggerModule('Database', 'Failed to connect to MongoDB.\n', 'red');
			this.state = false; throw new Error('Failed to connect to MongoDB. ' + er);
		});
	}

	collectionModel(database: string, model: string) {
		if (!this.state) return null;
		return mongoose.connection.useDb(database)?.model(model) || null;
	}

	private WssManagerModels() {
		const WssDB = mongoose.connection.useDb('WssManager');

		WssDB?.model<GatewaySchema>('gateway', new mongoose.Schema<GatewaySchema>({
			key: { type: String, required: true, unique: true },

			data: { type: Object, required: true },
			fromWho: { type: String, required: true },
			lastTried: { type: Number, required: true },
		}));
	}

	/* ----------------------------------- Mongoose Main ----------------------------------- */

	async createData(model: Awaited<ReturnType<typeof this.collectionModel>>, inputData: object) {
		if (this?.state !== true) return null;

		const data = await model?.create(inputData)?.catch((): null => null) || null;
		return data;
	}

	async getData(model: Awaited<ReturnType<typeof this.collectionModel>>, inputData: FilterQuery<object>, createOnFail?: boolean) {
		if (this.state !== true) return null;

		const data = await model?.findOne(inputData)?.lean().catch((): null => null) || null;
		if (data || !createOnFail) return data;

		return await this.createData(model, inputData) || null;
	}

	async deleteData(model: Awaited<ReturnType<typeof this.collectionModel>>, inputData: FilterQuery<object>) {
		if (this.state !== true) return null;

		const data = await model?.findOneAndDelete(inputData)?.lean().catch((): null => null) || null;
		return data;
	}

	async updateData(model: Awaited<ReturnType<typeof this.collectionModel>>, inputData: FilterQuery<object>, dataToUpdate: object) {
		if (this.state !== true) return null;

		const data = await model?.findOneAndUpdate(inputData, dataToUpdate, { new: true })?.lean().catch((): null => null) || null;
		return data;
	}

	async getAllData(model: Awaited<ReturnType<typeof this.collectionModel>>, inputData?: FilterQuery<object>) {
		if (this.state !== true) return null;

		const data = await model?.find(inputData || {})?.lean().catch((): null => null) || null;
		return data;
	}
}
