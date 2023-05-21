import { AllStructureTypesObject, DataStoreTypes, DataType, GatewayStructureType, RedirectStructureType, SearchedData } from '../data/typings';
import { FilterQuery, Model, UpdateQuery, UpdateWithAggregationPipeline } from 'mongoose';
import { GatewayModel, RedirectModel } from '../data/structures';
import config from '../data/config';
import LoggerModule from './logger';

/* ----------------------------------- Data ----------------------------------- */

export interface MapType<T> {
	data: T;
	lastAccessed: number;
}

const Models: { [key in DataType]: Model<AllStructureTypesObject[key]> } = {
	gateway: GatewayModel,
	redirect: RedirectModel,
};

export default class DataManager {
	public state: boolean;

	static nullHitter: string[];
	private gatewayData: Map<string, MapType<GatewayStructureType>>;
	private redirectData: Map<string, MapType<RedirectStructureType>>;

	constructor(state: boolean) {
		this.state = state;
		DataManager.nullHitter = [];

		this.loadCacheSweeper();

		this.gatewayData = new Map();
		this.redirectData = new Map();
	}

	/* ----------------------------------- Cache Functions ----------------------------------- */

	private loadCacheSweeper(): void {
		if (!config.useCache) return;

		setInterval(() => {
			if (config.devMode) {
				const gateway = deleteFromCollection(this.gatewayData);
				const redirect = deleteFromCollection(this.redirectData);

				LoggerModule('Cache Sweeper', `Successfully swept the cache. Deleted ${gateway + redirect} items.`, 'grey');
			} else {
				deleteFromCollection(this.gatewayData);
				deleteFromCollection(this.redirectData);
			}

			function deleteFromCollection(collection: Map<string, { lastAccessed: number, data: AllStructureTypesObject[DataType] }>): number {
				if (collection.size === 0) return 0;
				let deleted = 0;

				for (const [key, value] of collection) {
					if (value.lastAccessed + 300000 < Date.now()) {
						collection.delete(key); deleted++;
					}
				}

				return deleted;
			}
		}, 300000); // 5 minutes
	}

	private getIdentifiers<T extends DataType>(type: T, data: SearchedData<T>): string {
		switch (type) {
			case 'gateway': return `gateway|${(data as Partial<GatewayStructureType>).key}`;
			case 'redirect': return `redirect|${(data as Partial<RedirectStructureType>).name}`;
			default: return '';
		}
	}

	private async getMatchingItems<T extends DataType>(type: T, filter?: SearchedData<T> | FilterQuery<SearchedData<T>>): Promise<{ ids: string[], data: AllStructureTypesObject[T][] }> {
		if (!filter || typeof filter !== 'object') return { ids: [], data: [] };

		return new Promise<{ ids: string[], data: AllStructureTypesObject[T][] }>((resolve) => {
			const result: { ids: string[], data: AllStructureTypesObject[T][] } = { ids: [], data: [] };

			const filterKeys = Object.keys(filter);
			if (!filterKeys.length) return resolve(result);

			const filtered = Array.from((this[(`${type}Data` as DataStoreTypes)] as Map<string, MapType<AllStructureTypesObject[T]>>).values()).filter((data) => {
				for (const key of filterKeys) {
					const value = filter[key as keyof typeof filter];
					switch (key) {
						case '$exists': {
							const keys = value.$exists;
							if (!Array.isArray(keys)) {
								throw new Error('$exists value must be an array');
							}
							for (const k of keys) {
								if (!data.data[k as keyof typeof data.data]) {
									return false;
								}
							}
							break;
						}
						case '$or': {
							const queries = value.$or;
							if (!Array.isArray(queries)) {
								throw new Error('$or value must be an array');
							}
							for (const query of queries) {
								if (typeof query !== 'object') {
									throw new Error('query in $or array must be an object');
								}
								if (Object.keys(query).some((k) => data.data[k as keyof typeof data.data] !== query[k as keyof typeof query])) {
									return false;
								}
							}
							break;
						}
						case '$ne': {
							const keys = value.$ne;
							if (!Array.isArray(keys)) {
								throw new Error('$ne value must be an array');
							}
							for (const k of keys) {
								if (data.data[k as keyof typeof data.data]) {
									return false;
								}
							}
							break;
						}
						default: {
							if (data.data[key as keyof typeof data.data] !== value) {
								return false;
							}
						}
					}
				}

				return true;
			});

			for (const data of filtered) {
				result.ids.push(data.data[type as unknown as keyof typeof data.data] as string);
				result.data.push(data.data);
			}

			return resolve(result);
		});
	}

	/* ----------------------------------- Mongoose Main ----------------------------------- */

	async createData<T extends DataType>(type: T, inputData: SearchedData<T>): Promise<AllStructureTypesObject[T] | null> {
		if (this.state !== true) return null;

		const data: AllStructureTypesObject[T] | null = await Models[type].create(inputData)?.catch((): null => null) as AllStructureTypesObject[T] | null;
		if (!data) return LoggerModule('a', JSON.stringify(data, null, 5), 'red');

		const identifier = this.getIdentifiers(type, inputData);
		if (DataManager.nullHitter.includes(identifier)) nullHitter(identifier, false);

		if (config?.useCache) (this[(`${type}Data` as DataStoreTypes)] as Map<string, MapType<AllStructureTypesObject[T]>>).set(identifier, { lastAccessed: Date.now(), data: data });
		return data;
	}

	async getData<T extends DataType>(type: T, inputData: SearchedData<T> | FilterQuery<SearchedData<T>>, createOnFail?: boolean): Promise<AllStructureTypesObject[T] | null> {
		if (this.state !== true) return null;

		const identifier = this.getIdentifiers(type, inputData as AllStructureTypesObject[T]);
		if (DataManager.nullHitter.includes(identifier) && !createOnFail) return null;

		const data: AllStructureTypesObject[T] | null = (this[(`${type}Data` as DataStoreTypes)] as Map<string, MapType<AllStructureTypesObject[T]>>).get(identifier)?.data || await Models[type].findOne(inputData)?.lean().catch((): null => null) as AllStructureTypesObject[T] | null;

		if (!data) {
			if (createOnFail) return await this.createData(type, inputData);

			nullHitter(identifier, true);
			return null;
		}

		return data;
	}

	async deleteData<T extends DataType, U extends true>(type: T, inputData: SearchedData<T>, reCreate?: U): Promise<(U extends true ? AllStructureTypesObject[T] : boolean) | null> {
		if (this.state !== true) return null;

		const identifier = this.getIdentifiers(type, inputData);
		if (DataManager.nullHitter.includes(identifier)) return null;

		if (config?.useCache) (this[(`${type}Data` as DataStoreTypes)] as Map<string, MapType<AllStructureTypesObject[T]>>).delete(identifier);

		const data = await Models[type].deleteOne(inputData)?.lean().catch((): null => null) as (U extends true ? AllStructureTypesObject[T] : boolean) | null;
		if (data && reCreate) return await this.createData(type, inputData) as (U extends true ? AllStructureTypesObject[T] : boolean) | null;

		return data;
	}

	async updateData<T extends DataType>(type: T, inputData: SearchedData<T>, dataToUpdate: (UpdateQuery<AllStructureTypesObject[T]> | UpdateWithAggregationPipeline)): Promise<AllStructureTypesObject[T] | null> {
		if (this.state !== true) return null;

		const identifier = this.getIdentifiers(type, inputData);
		if (DataManager.nullHitter.includes(identifier)) return null;

		const data: AllStructureTypesObject[T] | null = await Models[type].findOneAndUpdate(inputData, dataToUpdate, { new: true })?.lean().catch((): null => null) as AllStructureTypesObject[T] | null;
		if (config?.useCache && data) (this[(`${type}Data` as DataStoreTypes)] as Map<string, MapType<AllStructureTypesObject[T]>>).set(identifier, { lastAccessed: Date.now(), data });

		return data;
	}

	async getAllData<T extends DataType>(type: T, inputData?: SearchedData<T> | FilterQuery<SearchedData<T>>, mognoose?: boolean, directMongoose?: boolean): Promise<AllStructureTypesObject[T][] | null> {
		if (this.state !== true) return null;
		if (!config.useCache) directMongoose = true;

		if (directMongoose) {
			const data: AllStructureTypesObject[T][] | null = await Models[type].find(inputData || {})?.lean().catch((): null => null) as AllStructureTypesObject[T][] | null;

			return data;
		} else {
			const allFromCache = await this.getMatchingItems(type, inputData);

			if (mognoose) {
				const filter = { ...inputData, [type]: { $nin: allFromCache.ids } }; // Filter out the ones we already have in cache.

				const data: AllStructureTypesObject[T][] | null = await Models[type].find(filter)?.lean().catch((): null => null) as AllStructureTypesObject[T][] | null;
				if (!data?.length && !allFromCache.data.length) return null;

				return [...allFromCache.data, ...(data ?? [])];
			}

			return allFromCache.data;
		}
	}
}

/* ----------------------------------- Util ----------------------------------- */

function nullHitter(identifier: string, add: boolean): boolean | null { // I'm stuid so i wrote comments.
	const hasIt: boolean = DataManager.nullHitter.includes(identifier);
	if ((hasIt && add) || (!hasIt && !add)) return null; // If it already has it and we're adding it, or if it doesn't have it and we're removing it, return null.

	if (!hasIt && add) DataManager.nullHitter.push(identifier); // If it doesn't have it and we're adding it, add it.
	if (hasIt && !add) DataManager.nullHitter.splice(DataManager.nullHitter.indexOf(identifier), 1); // If it has it and we're removing it, remove it.

	return true;
}
