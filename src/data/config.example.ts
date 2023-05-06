const dev = process.platform === 'win32';

export default {
	ports: {
		ws: 3005,
		http: 3006,
	},

	token: dev ? '' : '',
	devMode: dev,

	stripe: {
		Luna: {
			accountId: '',
			ownedClients: ['Waya'],

			webhooks: {
				prod: '',
				dev: '',
			},

			keys: {
				prod: '',
				dev: '',
			},

			links: {
				success: 'https://waya.one/checkout?session_id={CHECKOUT_SESSION_ID}',
				cancel: 'https://waya.one/checkout?cancelled=true',
				returnUrl: 'https://waya.one/',
			},
		},
		Digital: {
			accountId: '',
			ownedClients: ['StatusBot'],

			webhooks: {
				prod: '',
				dev: '',
			},

			keys: {
				prod: '',
				dev: '',
			},

			links: {
				success: 'https://crni.xyz/success',
				cancel: 'https://crni.xyz/error',
				returnUrl: 'https://crni.xyz',
			},
		},
	},

	support: 'https://discord.gg/4rphpersCa',

	clientKeys: {
		emojis: '',
		eval: '',
	},

	systemUpdatesCategory: '',
	developerIds: ['797012765352001557'],

	gatewayIdentifications: {},
};
