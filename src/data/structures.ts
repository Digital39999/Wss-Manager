import { BaseMessage, GatewayIdentifications } from './typings';
import mongoose from 'mongoose';

export type inputGatewayType = {
	key: string;
	data: Omit<BaseMessage, 'key'>;
	fromWho: GatewayIdentifications;
	lastTried: number;
};

export type inputRedirectType = {
	name: string;
	url: string;
};

export const GatewayModel = mongoose?.model<inputGatewayType>('gateway', new mongoose.Schema<inputGatewayType>({
	key: { type: String, required: true, unique: true },

	data: { type: Object, required: true },
	fromWho: { type: String, required: true },
	lastTried: { type: Number, required: true },
}));

export const RedirectModel = mongoose?.model<inputRedirectType>('redirect', new mongoose.Schema<inputRedirectType>({
	name: { type: String, required: true, unique: true },
	url: { type: String, required: true },
}));
