const dev = process.platform === 'win32';

export default {
	ports: {
		ws: 3005,
		http: 3006,
	},

	token: '',
	devMode: dev,

	stripe: {
		key: '',
		webhook: '',

		pages: {
			Waya: {
				accountId: '',
				success: '',
				cancel: '',
				returnUrl: '',
			},
			StatusBot: {
				accountId: '',
				success: '',
				cancel: '',
				returnUrl: '',
			},
		},
	},

	support: '',
	keys: {
		emojis: '',
		eval: '',
	},

	updatesCategory: '',
	developer: '',

	gatewayIdentifications: {
		// -
	},
};
