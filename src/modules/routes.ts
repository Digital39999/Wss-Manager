import { checkDestination, formatActivities, getIdentifierFromKey } from './utils';
import { GatewayIdentifications } from '../data/types';
import express, { Request, Response } from 'express';
import WssManager, { evalExecute } from '../index';
import emojis from '../data/emojis';
import config from '../data/config';
import LoggerModule from './logger';
import Stripe from 'stripe';

export default class HttpManager {
	private app: express.Application;
	private postData: Record<string, string>;

	constructor() {
		this.app = express();
		this.postData = {};

		this.app.get('/', express.json(), (req, res) => {
			res.status(200).json({
				status: 200,
				message: 'Private Networking API.',
			});
		});

		this.loadRoutes();
	}

	/* ----------------------------------- Internal ----------------------------------- */

	private _type(type: 'raw' | 'json') {
		if (type === 'raw') return express.raw({ type: 'application/json' });
		else return express.json();
	}

	private checkKey(req: Request, res: Response, cb: (key: GatewayIdentifications) => unknown) {
		const authorization = req.headers.authorization;
		if (!authorization) return res.status(401).json({
			status: 401,
			message: 'Missing authorization header.',
		});

		const key = getIdentifierFromKey(authorization, req.url.includes('/dev'));
		if (!key) return res.status(401).json({
			status: 401,
			message: 'Invalid authorization header.',
		});

		return cb(key);
	}

	private async loadRoutes() {
		await this.loadEmojis();
		await this.evalEndpoint();
		await this.websiteStatus();

		await this.manageStripe();
		await this.manageStripe(true);

		await this.loadInternal();
	}

	/* ----------------------------------- Routes ----------------------------------- */

	private async loadEmojis() {
		this.app.get('/emojis', express.json(), (req, res) => {
			return res.status(200).json({
				status: 200,
				message: 'You maybe wondering why? Well why not?',
				data: { ...emojis, iconsLive: this.postData },
			});
		});

		this.app.post('/emojis', express.json(), (req, res) => {
			if (req.headers.authorization !== config.keys.emojis) return res.status(401).json({
				status: 401,
				message: 'You are not authorized to do this.',
			});

			const emojis = req.body.emojis || {};
			if (!emojis) return res.status(400).json({
				status: 400,
				message: 'Missing parameters, Paul stop being stupid.',
			});

			try {
				if (typeof emojis !== 'object') return res.status(400).json({
					status: 400,
					message: 'Invalid JSON.',
				});

				this.postData = emojis;
			} catch (error) {
				return res.status(400).json({
					status: 400,
					message: 'Invalid JSON.',
				});
			}

			return res.status(200).json({
				status: 200,
				message: 'Successfully updated emojis.',
			});
		});
	}

	private async websiteStatus() {
		this.app.get('/digital', express.json(), async (req, res) => {
			const client = await import('../index').then((module) => module.default);
			let data = null;

			for await (const guild of client.guilds.cache.values()) {
				const member = guild.members.cache.get(config.developer) || await guild.members.fetch({ user: config.developer, force: true }).catch(() => null);
				if (!member) continue;

				const presence = member.presence || guild.presences.cache.get(config.developer) || await member.fetch(true).then((member) => member.presence) || null;

				data = {
					id: member.user.id,
					username: member.user.username,
					discriminator: member.user.discriminator,
					nickname: member.nickname,
					nickavatar: member.displayAvatarURL({ size: 2048 }) || null,
					status: presence?.status || 'offline',
					activities: presence?.activities?.length ? formatActivities(presence.activities) : [],
					createdTimestamp: member.user.createdTimestamp,
					avatar: member.user.displayAvatarURL({ size: 2048 }) || null,
					banner: member.user.bannerURL({ size: 2048 }) || null,
					accentColor: member.user.accentColor,
				};

				break;
			}

			return res.status(200).json({
				status: 200,
				content: data || null,
			});
		});
	}

	private async evalEndpoint() {
		this.app.get('/eval', express.json(), (req, res) => {
			return res.status(200).json({
				status: 200,
				data: {
					clients: WssManager.gatewayManager?.getClients(true),
				},
			});
		});

		this.app.post('/eval', express.json(), async (req, res) => { // Yes, i am aware that this can be potentional security risk.
			if (req.headers.authorization !== config.keys.eval) return res.status(401).json({
				status: 401,
				message: 'You are not authorized to do this.',
			});

			const code = req.body?.code || null;
			const onWhere = req.body?.onWhere || null;
			const clients = WssManager.gatewayManager?.getClients(true) || [];

			if (!onWhere || !clients?.includes(onWhere)) return res.status(400).json({
				status: 400,
				message: 'Missing eval destination.',
			});

			if (!code) return res.status(400).json({
				status: 400,
				message: 'Missing eval code.',
			});

			const result = await evalExecute(onWhere, code);
			if (!result) return res.status(400).json({
				status: 400,
				message: 'Eval failed.',
			});

			return res.status(200).json({
				status: 200,
				data: result,
			});
		});
	}

	private async loadInternal() {
		this.app.all('*', express.json(), (req, res) => {
			res.status(404).json({
				status: 404,
				message: 'This endpoint does not exist.',
			});
		});

		this.app.listen(config.ports.http, () => {
			LoggerModule('HTTP', `Listening on port ${config.ports.http}.`, 'green');
		});
	}

	private async manageStripe(dev?: boolean) {
		// https://stripe.com/docs/billing/subscriptions/webhooks#state-changes
		this.app.post((dev ? '/dev/stripe' : '/stripe'), express.raw({ type: 'application/json' }), async (req, res) => {
			const event = await WssManager.stripeManager?._signWebhook(req.body, req.headers['stripe-signature'], dev);
			if (!event?.data) return res.status(400).json({
				status: 400,
				message: 'Failed to sign webhook.',
			});

			const clientId = checkDestination(event, req.headers['Stripe-Account'] as string, dev);
			if (!clientId) return res.status(400).json({
				status: 400,
				message: 'Invalid destination or type. ClientId: ' + clientId + '.',
			});

			switch (event.type) {
				case 'checkout.session.completed': {
					const session: { data: null | Stripe.Checkout.Session, previous: Record<string, string> | null; } = { data: null, previous: null };

					if (typeof event.data.object === 'string') session.data = await WssManager.stripeManager?.getSession(clientId, { sessionId: event.data.object }) || null;
					else session.data = event.data.object as Stripe.Checkout.Session;

					session.previous = event.data.previous_attributes as Record<string, string> || null;

					if (!session.data) return res.status(400).json({
						status: 400,
						message: 'Failed to get session.',
					});

					if (session.data.subscription) return res.status(200).json({
						status: 200,
						message: 'Thanks but no thanks, only one time payments accepted.',
					});

					if (session.data.payment_status === 'paid' && session.previous?.payment_status !== 'paid') {
						WssManager.gatewayManager?.send(clientId, 'stripeEvent', session.data, 'oneTimePaid');
					}

					break;
				}
				case 'customer.subscription.updated': {
					const subscription: { data: null | Stripe.Subscription, previous: Record<string, string> | null; } = { data: null, previous: null };

					if (typeof event.data.object === 'string') subscription.data = await WssManager.stripeManager?.getUserSubscriptions(clientId, { subscriptionId: event.data.object }) || null;
					else subscription.data = event.data.object as Stripe.Subscription;

					subscription.previous = event.data.previous_attributes as Record<string, string> || null;

					if (!subscription.data) return res.status(400).json({
						status: 400,
						message: 'Failed to get subscription.',
					});

					if (subscription.data.status === 'active' && typeof subscription.previous?.status === 'string' && subscription.previous?.status !== 'active') {
						WssManager.gatewayManager?.send(clientId, 'stripeEvent', subscription.data, 'started');
					} else if (!subscription.previous.cancel_at_period_end && subscription.data.cancel_at_period_end) {
						WssManager.gatewayManager?.send(clientId, 'stripeEvent', subscription.data, 'canceled');
					} else WssManager.gatewayManager?.send(clientId, 'stripeEvent', subscription.data, 'other');

					break;
				}
				case 'customer.subscription.deleted': {
					const subscription: { data: null | Stripe.Subscription } = { data: null };

					if (typeof event.data.object === 'string') subscription.data = await WssManager.stripeManager?.getUserSubscriptions(clientId, { subscriptionId: event.data.object }) || null;
					else subscription.data = event.data.object as Stripe.Subscription;

					if (!subscription.data) return res.status(400).json({
						status: 400,
						message: 'Failed to get subscription.',
					});

					WssManager.gatewayManager?.send(clientId, 'stripeEvent', subscription.data, 'ended');
					break;
				}
				case 'invoice.payment_failed': case 'invoice.payment_action_required': {
					const invoice: { data: null | Stripe.Invoice } = { data: null };

					if (typeof event.data.object === 'string') invoice.data = await WssManager.stripeManager?.getUserInvoices(clientId, { invoiceId: event.data.object }) || null;
					else invoice.data = event.data.object as Stripe.Invoice;

					if (!invoice.data || !invoice.data?.subscription) return res.status(400).json({
						status: 400,
						message: 'Failed to get invoice.',
					});

					WssManager.gatewayManager?.send(clientId, 'stripeEvent', invoice.data, 'unpaid');
					break;
				}
				default: {
					WssManager.gatewayManager?.send(clientId, 'stripeEvent', event.data.object, 'other');
					break;
				}
			}

			return res.status(200).json({
				status: 200,
				message: 'Successfully signed webhook.',
			});
		});

		this.app.get((dev ? '/dev/stripe' : '/stripe') + '/customers', express.json(), async (req, res) => this.checkKey(req, res, async (key) => {
			if (!key) return;

			const customers = await WssManager.stripeManager?.getAllCustomers(key);
			if (!customers) return res.status(400).json({
				status: 400,
				message: 'Failed to fetch customers.',
			});

			return res.status(200).json({
				status: 200,
				data: customers,
			});
		}));

		this.app.get((dev ? '/dev/stripe' : '/stripe') + '/customers/:type/:id', express.json(), async (req, res) => this.checkKey(req, res, async (key) => {
			if (!key) return;

			const customer = await WssManager.stripeManager?.getCustomer(key, { [req.params.type === 'stripe' ? 'customerId' : 'identify']: req.params.id }, req.query.create === 'true');
			if (!customer) return res.status(400).json({
				status: 400,
				message: 'Failed to fetch customer.',
			});

			return res.status(200).json({
				status: 200,
				data: customer,
			});
		}));

		this.app.get((dev ? '/dev/stripe' : '/stripe') + '/sessions/:type/:id', express.json(), async (req, res) => this.checkKey(req, res, async (key) => {
			if (!key) return;

			const session = await WssManager.stripeManager?.getSession(key, { [req.params.type === 'stripe' ? 'customerId' : 'identify']: req.params.id });
			if (!session) return res.status(400).json({
				status: 400,
				message: 'Failed to fetch session.',
			});

			return res.status(200).json({
				status: 200,
				data: session,
			});
		}));

		this.app.get((dev ? '/dev/stripe' : '/stripe') + '/subscriptions', express.json(), async (req, res) => this.checkKey(req, res, async (key) => {
			if (!key) return;

			const subscriptions = await WssManager.stripeManager?.getAllSubscriptions(key);
			if (!subscriptions) return res.status(400).json({
				status: 400,
				message: 'Failed to fetch subscriptions.',
			});

			return res.status(200).json({
				status: 200,
				data: subscriptions,
			});
		}));

		this.app.get((dev ? '/dev/stripe' : '/stripe') + '/subscriptions/:type/:id', express.json(), async (req, res) => this.checkKey(req, res, async (key) => {
			if (!key) return;

			const subscriptions = await WssManager.stripeManager?.getUserSubscriptions(key, { [req.params.type === 'stripe' ? 'customerId' : req.params.type === 'subscription' ? 'subscriptionId' : 'identify']: req.params.id });
			if (!subscriptions) return res.status(400).json({
				status: 400,
				message: 'Failed to fetch subscriptions.',
			});

			return res.status(200).json({
				status: 200,
				data: subscriptions,
			});
		}));

		this.app.get((dev ? '/dev/stripe' : '/stripe') + '/coupons', express.json(), async (req, res) => this.checkKey(req, res, async (key) => {
			if (!key) return;

			const coupons = await WssManager.stripeManager?.managecoupons(key, 'getAll');
			if (!coupons) return res.status(400).json({
				status: 400,
				message: 'Failed to fetch coupons.',
			});

			return res.status(200).json({
				status: 200,
				data: coupons,
			});
		}));

		this.app.get((dev ? '/dev/stripe' : '/stripe') + '/coupons/:id', express.json(), async (req, res) => this.checkKey(req, res, async (key) => {
			if (!key) return;

			const cupoun = await WssManager.stripeManager?.managecoupons(key, 'get', { code: req.params.id }, req.query.create === 'true');
			if (!cupoun) return res.status(400).json({
				status: 400,
				message: 'Failed to fetch cupoun.',
			});

			return res.status(200).json({
				status: 200,
				data: cupoun,
			});
		}));

		this.app.post((dev ? '/dev/stripe' : '/stripe') + '/coupons', express.json(), async (req, res) => this.checkKey(req, res, async (key) => {
			if (!key || !req.body.code || !req.body.percentage || !req.body.duration || !req.body.maxClaims) return;

			const cupoun = await WssManager.stripeManager?.managecoupons(key, 'create', { code: req.body.code, percentage: req.body.percentage, duration: req.body.duration, maxClaims: req.body.maxClaims });
			if (!cupoun) return res.status(400).json({
				status: 400,
				message: 'Failed to create cupoun.',
			});

			return res.status(200).json({
				status: 200,
				data: cupoun,
			});
		}));

		this.app.delete((dev ? '/dev/stripe' : '/stripe') + '/coupons/:id', express.json(), async (req, res) => this.checkKey(req, res, async (key) => {
			if (!key) return;

			const cupoun = await WssManager.stripeManager?.managecoupons(key, 'delete', { code: req.params.id });
			if (!cupoun) return res.status(400).json({
				status: 400,
				message: 'Failed to delete cupoun.',
			});

			return res.status(200).json({
				status: 200,
				data: cupoun,
			});
		}));

		this.app.get((dev ? '/dev/stripe' : '/stripe') + '/portal/:type/:id', express.json(), async (req, res) => this.checkKey(req, res, async (key) => {
			if (!key) return;

			const portal = await WssManager.stripeManager?.createPortalSession(key, { [req.params.type === 'stripe' ? 'customerId' : 'identify']: req.params.id });
			if (!portal) return res.status(400).json({
				status: 400,
				message: 'Failed to fetch portal.',
			});

			return res.status(200).json({
				status: 200,
				data: portal,
			});
		}));

		this.app.post((dev ? '/dev/stripe' : '/stripe') + '/checkout/:type/:id', express.json(), async (req, res) => this.checkKey(req, res, async (key) => {
			if (!key) return;

			const checkout = await WssManager.stripeManager?.[key === 'StatusBot' ? 'createStatusSubscription' : 'createWayaSubscription'](dev ? 'Waya|Dev' : 'Waya', { [req.params.type === 'stripe' ? 'customerId' : 'identify']: req.params.id }, req.body || {});
			if (!checkout) return res.status(400).json({
				status: 400,
				message: 'Failed to create checkout session.',
			});

			return res.status(200).json({
				status: 200,
				data: checkout,
			});
		}));

		this.app.post((dev ? '/dev/stripe' : '/stripe') + '/payment/:type/:id', express.json(), async (req, res) => this.checkKey(req, res, async (key) => {
			if (!key) return;

			const payment = await WssManager.stripeManager?.createOneTimePayment(key, { [req.params.type === 'stripe' ? 'customerId' : 'identify']: req.params.id }, req.body || {});
			if (!payment) return res.status(400).json({
				status: 400,
				message: 'Failed to create payment session.',
			});

			return res.status(200).json({
				status: 200,
				data: payment,
			});
		}));
	}
}
