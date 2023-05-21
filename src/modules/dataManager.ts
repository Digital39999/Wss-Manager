import { BaseMessage, FnType, GatewayIdentifications } from '../data/typings';
import { FilterQuery, Schema, Connection } from 'mongoose';

export type GatewaySchema = {
	key: string;
	data: Omit<BaseMessage, 'key'>;
	fromWho: GatewayIdentifications;
	lastTried: number;
}

export default class DataManager {
	public state: boolean;
	private connection: Connection;

	constructor(connection: Connection) {
		this.state = false;
		this.connection = connection;

		this.WssManagerModels();
	}

	/* ----------------------------------- Utils ----------------------------------- */


	collectionModel(database: string, model: string) {
		if (!this.state) return null;
		return this.connection.useDb(database)?.model(model) || null;
	}

	private WssManagerModels() {
		const WssDB = this.connection.useDb('WssManager');

		WssDB?.model<GatewaySchema>('gateway', new Schema<GatewaySchema>({
			key: { type: String, required: true, unique: true },

			data: { type: Object, required: true },
			fromWho: { type: String, required: true },
			lastTried: { type: Number, required: true },
		}));
	}

	/* ----------------------------------- Mongoose Main ----------------------------------- */

	async createData(model: FnType, inputData: object) {
		if (this?.state !== true) return null;

		const data = await model?.create(inputData)?.catch((): null => null) || null;
		return data;
	}

	async getData(model: FnType, inputData: FilterQuery<object>, createOnFail?: boolean) {
		if (this.state !== true) return null;

		const data = await model?.findOne(inputData)?.lean().catch((): null => null) || null;
		if (data || !createOnFail) return data;

		return await this.createData(model, inputData) || null;
	}

	async deleteData(model: FnType, inputData: FilterQuery<object>) {
		if (this.state !== true) return null;

		const data = await model?.findOneAndDelete(inputData)?.lean().catch((): null => null) || null;
		return data;
	}

	async updateData(model: FnType, inputData: FilterQuery<object>, dataToUpdate: object) {
		if (this.state !== true) return null;

		const data = await model?.findOneAndUpdate(inputData, dataToUpdate, { new: true })?.lean().catch((): null => null) || null;
		return data;
	}

	async getAllData(model: FnType, inputData?: FilterQuery<object>) {
		if (this.state !== true) return null;

		const data = await model?.find(inputData || {})?.lean().catch((): null => null) || null;
		return data;
	}
}
