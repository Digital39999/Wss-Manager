import { checkBody, formatActivities, getClientFromKey, webhookEvents, getClientIdentifier, formatTime, checkQuery, hasKeys } from './utils';
import { RateLimiterMemory, BurstyRateLimiter, RateLimiterRes } from 'rate-limiter-flexible';
import { GatewayIdentifications, ParsedStripeUsers } from '../data/typings';
import express, { Request, Response } from 'express';
import WssManager, { evalExecute } from '../index';
import emojis from '../data/emojis';
import config from '../data/config';
import LoggerModule from './logger';

export default class HttpManager {
	private app: express.Application;
	private liveIcons: Record<string, string>;

	constructor() {
		this.app = express();
		this.liveIcons = {};

		this.app.use((req, res, next) => {
			res.header('Access-Control-Allow-Origin', '*');
			res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, stripe-signature');
			res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

			next();
		});

		this.app.get('/', express.json(), (req, res) => {
			res.status(200).json({
				status: 200,
				message: 'Private Networking API.',
			});
		});

		this.loadRateLimits();
		this.loadRoutes();
	}

	/* ----------------------------------- Internal ----------------------------------- */

	private checkKey(req: Request, res: Response, isDev: boolean, cb: (identify: { account: ParsedStripeUsers; clientId: GatewayIdentifications; key: string; } | null) => unknown) {
		const authorization = req.headers.authorization;
		if (!authorization) return res.status(401).json({
			status: 401,
			message: 'Missing authorization header.',
		});

		const identify = getClientFromKey(authorization, req.url.includes('/dev'));
		if (!identify?.account || !identify.clientId) {
			res.status(401).json({
				status: 401,
				message: 'Invalid authorization header. ClientId (' + identify?.clientId + ') or Account (' + identify?.account + ') is invalid.',
			});

			return cb(null);
		}

		return cb({
			account: identify.account + (isDev ? '|Dev' : '') as ParsedStripeUsers,
			clientId: identify.clientId,
			key: authorization,
		});
	}

	private async loadRateLimits() {
		const burstyLimiter = new BurstyRateLimiter(
			new RateLimiterMemory({ points: 2, duration: 1 }), // 2 requests per 1 second
			new RateLimiterMemory({ keyPrefix: 'burst', points: 5, duration: 10 }), // 5 requests per 10 seconds
		);

		this.app.use((req, res, next) => {
			const identifier = getClientIdentifier(req);
			if (!identifier) return res.status(431).send({ status: 431, message: 'No identifier found.' });

			burstyLimiter.consume(identifier).then(() => next()).catch((rate: RateLimiterRes) => {
				res.set('X-RateLimit-Reset', rate.msBeforeNext.toString());
				res.set('Retry-After', String(rate.msBeforeNext / 1000));

				res.status(429).send({
					status: 429,
					message: 'Too many requests, please try again in ' + formatTime(rate.msBeforeNext, true) + '.',
				});
			});
		});
	}

	private async loadRoutes() {
		await this.loadEmojis();
		await this.loadUptime();
		await this.mainWebsite();
		await this.evalEndpoint();

		await this.manageStripe(true);
		await this.manageStripe(false);

		await this.loadInternal();
	}

	/* ----------------------------------- Routes ----------------------------------- */

	private async loadEmojis() {
		this.app.get('/emojis', express.json(), (req, res) => {
			return res.status(200).json({
				status: 200,
				message: 'You maybe wondering why? Well why not?',
				data: { ...emojis, iconsLive: this.liveIcons },
			});
		});

		this.app.post('/emojis', express.json(), (req, res) => {
			if (req.headers.authorization !== config.clientKeys.emojis) return res.status(401).json({
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

				this.liveIcons = emojis;
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

	private async mainWebsite() {
		this.app.get('/digital', express.json(), async (req, res) => {
			const guild = await WssManager.guilds.fetch('870281239645528085').catch(() => null);
			const member = await guild?.members.fetch({ user: '797012765352001557', withPresences: true }).catch(() => null);
			const custom = member?.presence?.activities.find((a) => a.type === 4) || null;

			return res.status(200).json({
				status: 200,
				data: member ? {
					id: member.user.id,
					bio: 'Hey there, I\'m Digital. I\'m a student from Croatia pursuing full-stack development and software engineering.\n\nI enjoy leveraging technologies such as TypeScript, Next.js, C++, MongoDB, and many others to create scalable and performant applications, and I\'m looking for projects to develop and things to learn in order to expand my knowledge and skillset further.',
					username: member.user.username?.replaceAll('The ', ''),
					accentColor: member.user.accentColor,
					discriminator: member.user.discriminator,
					status: {
						state: {
							text: member.presence?.status,
							color: member.presence?.status === 'online' ? '#7bcba7' : member.presence?.status === 'idle' ? '#fcc061' : member.presence?.status === 'dnd' ? '#f17f7e' : '#999999',
						},
						emote: custom?.emoji?.id ? `https://cdn.discordapp.com/emojis/${custom?.emoji?.id}.${custom?.emoji?.animated ? 'gif' : 'png'}?size=2048` : null,
						text: custom?.state,
					},
					createdTimestamp: member.user.createdTimestamp,
					avatar: member.user.displayAvatarURL({ size: 2048 }) || null,
					activities: member.presence?.activities?.length ? formatActivities(member.presence?.activities) : [],
					banner: member.user.banner ? member.user.bannerURL({ size: 4096 }) : (await member.user.fetch(true)).bannerURL({ size: 4096 }) || null,
				} : null,
			});
		});

		this.app.post('/donate', express.json(), async (req, res) => {
			if (!req.body.amount) return res.status(400).json({
				status: 400,
				message: 'Missing required body key `amount`.',
			});

			const payment = await WssManager.stripeManager?.createOneTimePayment({ account: 'Digital', clientId: 'StatusBot' }, undefined, { amount: req.body.amount });
			if (!payment) return res.status(400).json({
				status: 400,
				message: 'Failed to create one time payment.',
			});

			return res.status(200).json({
				status: 200,
				data: {
					url: payment?.url,
				},
			});
		});
	}

	private async loadUptime() {
		this.app.get('/uptime', express.json(), async (req, res) => {
			const uptime = WssManager.gatewayManager?.checkOnlineStatus();
			if (!uptime) return res.status(503).json({
				status: 503,
				message: 'Failed to get uptimes.',
			});

			return res.status(200).json({
				status: 200,
				data: uptime,
			});
		});

		this.app.get('/uptime/:id', express.json(), async (req, res) => {
			if (!req.params.id) return res.status(400).json({
				status: 400,
				message: 'Missing params Id.',
			});

			const uptime = WssManager.gatewayManager?.checkOnlineStatus(req.params.id);
			if (!uptime) return res.status(503).json({
				status: 503,
				message: 'Failed to get uptime.',
			});

			return res.status(200).json({
				status: 200,
				data: uptime,
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
			if (req.headers.authorization !== config.clientKeys.eval) return res.status(401).json({
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
		this.app.options('*', express.json(), (req, res) => {
			return res.status(200).json({
				status: 200,
				message: 'This endpoint does not exist.',
			});
		});

		this.app.all('*', express.json(), (req, res) => {
			return res.status(404).json({
				status: 404,
				message: 'This endpoint does not exist.',
			});
		});

		this.app.listen(config.ports.http, () => {
			LoggerModule('HTTP', `Listening on port ${config.ports.http}.`, 'green');
		});
	}

	private async manageStripe(dev: boolean) {
		const baseRoute = dev ? '/dev/stripe' : '/stripe';

		// Webhook Events.
		this.app.post(baseRoute + '/luna', express.raw({ type: 'application/json' }), async (req, res) => {
			const event = await WssManager.stripeManager?._signWebhook((dev ? 'Luna|Dev' : 'Luna'), req.body, req.headers['stripe-signature']);
			if (!event?.data) return res.status(400).json({
				status: 400,
				message: 'Failed to sign webhook.',
			});

			return await webhookEvents(event, res);
		});

		this.app.post(baseRoute + '/digital', express.raw({ type: 'application/json' }), async (req, res) => {
			const event = await WssManager.stripeManager?._signWebhook((dev ? 'Digital|Dev' : 'Digital'), req.body, req.headers['stripe-signature']);
			if (!event?.data) return res.status(400).json({
				status: 400,
				message: 'Failed to sign webhook.',
			});

			return await webhookEvents(event, res);
		});

		// Customers.
		this.app.get(baseRoute + '/customers', express.json(), async (req, res) => this.checkKey(req, res, dev, async (identify) => {
			if (!identify) return;

			const stripeCheck = checkQuery(req.query, identify.key, undefined, ['email', 'userId', 'customerId']);
			if (!stripeCheck) return res.status(400).json({
				status: 400,
				message: 'Malformed body or invalid values, allowed keys are either `email` and `userId` or `customerId`.',
			});

			const customer = await WssManager.stripeManager?.[hasKeys(stripeCheck?.optional) ? 'getCustomer' : 'getAllCustomers'](identify, (stripeCheck?.optional || {}) as unknown as Parameters<typeof WssManager.stripeManager.getCustomer>[1]);
			if (Array.isArray(customer) ? !customer.length : !customer) return res.status(400).json({
				status: 400,
				message: 'Failed to get customer(s).',
			});

			return res.status(200).json({
				status: 200,
				data: customer,
			});
		}));

		this.app.post(baseRoute + '/customers', express.json(), async (req, res) => this.checkKey(req, res, dev, async (identify) => {
			if (!identify) return;

			const stripeCheck = checkBody(req.body, ['email', 'userId'], ['name']);
			if (!stripeCheck) return res.status(400).json({
				status: 400,
				message: 'Malformed body or invalid values, allowed keys are `email` and `userId`.',
			});

			const customer = await WssManager.stripeManager?.createCustomer(identify, stripeCheck.required || {}, stripeCheck.optional || {});
			if (Array.isArray(customer) ? !customer.length : !customer) return res.status(400).json({
				status: 400,
				message: 'Failed to create customer.',
			});

			return res.status(200).json({
				status: 200,
				data: customer,
			});
		}));

		this.app.patch(baseRoute + '/customers', express.json(), async (req, res) => this.checkKey(req, res, dev, async (identify) => {
			if (!identify) return;

			const stripeCheck = checkBody(req.body, ['email', 'userId', 'customerId'], ['newEmail', 'metadata', 'name']);
			if (!stripeCheck) return res.status(400).json({
				status: 400,
				message: 'Malformed body or invalid values, required keys are `email` and `userId` or `customerId` and `newEmail`, allowed are `metadata`.',
			});

			const customer = await WssManager.stripeManager?.updateCustomer(identify, stripeCheck.required || {}, (stripeCheck.optional || {}) as unknown as Parameters<typeof WssManager.stripeManager.updateCustomer>[2]);
			if (!customer) return res.status(400).json({
				status: 400,
				message: 'Failed to update customer.',
			});

			return res.status(200).json({
				status: 200,
				data: customer,
			});
		}));

		this.app.delete(baseRoute + '/customers', express.json(), async (req, res) => this.checkKey(req, res, dev, async (identify) => {
			if (!identify) return;

			const stripeCheck = checkBody(req.body, ['email', 'userId', 'customerId']);
			if (!stripeCheck) return res.status(400).json({
				status: 400,
				message: 'Malformed body or invalid values, allowed keys are either `email` and `userId` or `customerId`.',
			});

			const customer = await WssManager.stripeManager?.deleteCustomer(identify, stripeCheck.required || {});
			if (!customer) return res.status(400).json({
				status: 400,
				message: 'Failed to delete customer.',
			});

			return res.status(200).json({
				status: 200,
				data: customer,
			});
		}));

		// Sessions.
		this.app.get(baseRoute + '/sessions', express.json(), async (req, res) => this.checkKey(req, res, dev, async (identify) => {
			if (!identify) return;

			const stripeCheck = checkQuery(req.query, identify.key, ['email', 'userId', 'sessionId', 'customerId']);
			if (!stripeCheck) return res.status(400).json({
				status: 400,
				message: 'Malformed body or invalid values, allowed keys are either `email` and `userId`, `sessionId` or `customerId`.',
			});

			const session = await WssManager.stripeManager?.[(stripeCheck.required.sessionId && Object.keys(stripeCheck.required).length === 1) ? 'getSession' : 'getUserSessions'](identify, stripeCheck.required || {});
			if (Array.isArray(session) ? !session.length : !session) return res.status(400).json({
				status: 400,
				message: 'Failed to get session(s).',
			});

			return res.status(200).json({
				status: 200,
				data: session,
			});
		}));

		// Subscriptions.
		this.app.get(baseRoute + '/subscriptions', express.json(), async (req, res) => this.checkKey(req, res, dev, async (identify) => {
			if (!identify) return;

			const stripeCheck = checkQuery(req.query, identify.key, ['email', 'userId', 'subscriptionId', 'customerId']);
			if (!stripeCheck) return res.status(400).json({
				status: 400,
				message: 'Malformed body or invalid values, allowed keys are either `email` and `userId`, `subscriptionId` or `customerId`.',
			});

			const subscription = await WssManager.stripeManager?.[hasKeys(stripeCheck.required) ? ((stripeCheck.required.subscriptionId && hasKeys(stripeCheck.required) === 1) ? 'getSubscription' : 'getUserSubscriptions') : 'getAllSubscriptions'](identify, stripeCheck.required || {});
			if (Array.isArray(subscription) ? !subscription.length : !subscription) return res.status(400).json({
				status: 400,
				message: 'Failed to get subscription(s).',
			});

			return res.status(200).json({
				status: 200,
				data: subscription,
			});
		}));

		this.app.patch(baseRoute + '/subscriptions', express.json(), async (req, res) => this.checkKey(req, res, dev, async (identify) => {
			if (!identify) return;

			const stripeCheck = checkBody(req.body, ['subscriptionId'], ['metadata', 'description']);
			if (!stripeCheck) return res.status(400).json({
				status: 400,
				message: 'Malformed body or invalid values, required key is `subscriptionId` and either `metadata` or `description`.',
			});

			const subscription = await WssManager.stripeManager?.updateSubscription(identify, stripeCheck.required || {}, (stripeCheck.optional || {}) as unknown as Parameters<typeof WssManager.stripeManager.updateSubscription>[2]);
			if (!subscription) return res.status(400).json({
				status: 400,
				message: 'Failed to update subscription.',
			});

			return res.status(200).json({
				status: 200,
				data: subscription,
			});
		}));

		this.app.delete(baseRoute + '/subscriptions', express.json(), async (req, res) => this.checkKey(req, res, dev, async (identify) => {
			if (!identify) return;

			const stripeCheck = checkBody(req.body, ['subscriptionId']);
			if (!stripeCheck) return res.status(400).json({
				status: 400,
				message: 'Malformed body or invalid values, allowed key is `subscriptionId`.',
			});

			const subscription = await WssManager.stripeManager?.deleteSubscription(identify, stripeCheck.required || {});
			if (!subscription) return res.status(400).json({
				status: 400,
				message: 'Failed to delete subscription.',
			});

			return res.status(200).json({
				status: 200,
				data: subscription,
			});
		}));

		// Waya Subscription.
		this.app.post(baseRoute + '/subscriptions/waya', express.json(), async (req, res) => this.checkKey(req, res, dev, async (identify) => {
			if (!identify) return;

			const stripeCheck = checkBody(req.body, ['email', 'userId', 'customerId'], ['amount', 'metadata', 'name']);
			if (!stripeCheck) return res.status(400).json({
				status: 400,
				message: 'Malformed body or invalid values, required keys are `email` and `userId` or `customerId`, allowed keys are `amount` and `metadata`.',
			});

			const subscription = await WssManager.stripeManager?.createWayaSubscription(identify, stripeCheck.required || {}, (stripeCheck.optional || {}) as unknown as Parameters<typeof WssManager.stripeManager.createWayaSubscription>[2]);
			if (!subscription) return res.status(400).json({
				status: 400,
				message: 'Failed to create subscription.',
			});

			return res.status(200).json({
				status: 200,
				data: subscription,
			});
		}));

		// Invoices.
		this.app.get(baseRoute + '/invoices', express.json(), async (req, res) => this.checkKey(req, res, dev, async (identify) => {
			if (!identify) return;

			const stripeCheck = checkQuery(req.query, identify.key, ['email', 'userId', 'invoiceId', 'customerId']);
			if (!stripeCheck) return res.status(400).json({
				status: 400,
				message: 'Malformed body or invalid values, allowed keys are either `email` and `userId`, `invoiceId` or `customerId`.',
			});

			const invoice = await WssManager.stripeManager?.[hasKeys(stripeCheck.required) ? ((stripeCheck.required.invoiceId && hasKeys(stripeCheck.required) === 1) ? 'getInvoice' : 'getUserInvoices') : 'getAllInvoices'](identify, stripeCheck.required || {});
			if (Array.isArray(invoice) ? !invoice.length : !invoice) return res.status(400).json({
				status: 400,
				message: 'Failed to get invoice(s).',
			});

			return res.status(200).json({
				status: 200,
				data: invoice,
			});
		}));

		// Coupons.
		this.app.get(baseRoute + '/coupons', express.json(), async (req, res) => this.checkKey(req, res, dev, async (identify) => {
			if (!identify) return;

			const stripeCheck = checkQuery(req.query, identify.key, ['couponId', 'code']);
			if (!stripeCheck) return res.status(400).json({
				status: 400,
				message: 'Malformed body or invalid values, allowed key is `couponId` or `code`.',
			});

			const coupon = await WssManager.stripeManager?.[(stripeCheck.required.couponId || stripeCheck.required.code) ? 'getCoupon' : 'getAllCoupons'](identify, stripeCheck.required || {});
			if (Array.isArray(coupon) ? !coupon.length : !coupon) return res.status(400).json({
				status: 400,
				message: 'Failed to get coupon(s).',
			});

			return res.status(200).json({
				status: 200,
				data: coupon,
			});
		}));

		this.app.post(baseRoute + '/coupons', express.json(), async (req, res) => this.checkKey(req, res, dev, async (identify) => {
			if (!identify) return;

			const stripeCheck = checkBody(req.body, ['code', 'percentage', 'duration', 'maxClaims']);
			if (!stripeCheck) return res.status(400).json({
				status: 400,
				message: 'Malformed body or invalid values, allowed keys are `code`, `percentage`, `duration` or `maxClaims`.',
			});

			const coupon = await WssManager.stripeManager?.createCoupon(identify, (stripeCheck.required || {}) as unknown as Parameters<typeof WssManager.stripeManager.createCoupon>[1]);
			if (!coupon) return res.status(400).json({
				status: 400,
				message: 'Failed to create coupon.',
			});

			return res.status(200).json({
				status: 200,
				data: coupon,
			});
		}));

		this.app.delete(baseRoute + '/coupons', express.json(), async (req, res) => this.checkKey(req, res, dev, async (identify) => {
			if (!identify) return;

			const stripeCheck = checkBody(req.body, ['couponId', 'code']);
			if (!stripeCheck) return res.status(400).json({
				status: 400,
				message: 'Malformed body or invalid values, required key is `couponId` or `code.',
			});

			const coupon = await WssManager.stripeManager?.deleteCoupon(identify, stripeCheck.required || {});
			if (Array.isArray(coupon) ? !coupon.length : !coupon) return res.status(400).json({
				status: 400,
				message: 'Failed to delete coupon.',
			});

			return res.status(200).json({
				status: 200,
				data: coupon,
			});
		}));

		// One Time Payment.
		this.app.post(baseRoute + '/payment', express.json(), async (req, res) => this.checkKey(req, res, dev, async (identify) => {
			if (!identify) return;

			const stripeCheck = checkBody(req.body, ['email', 'userId', 'customerId'], ['amount', 'metadata', 'name']);
			if (!stripeCheck) return res.status(400).json({
				status: 400,
				message: 'Malformed body or invalid values, allowed keys are `email` and `userId`, `customerId` or `metadata` and required key is `amount`.',
			});

			const payment = await WssManager.stripeManager?.createOneTimePayment(identify, stripeCheck.required || {}, (stripeCheck.optional || {}) as unknown as Parameters<typeof WssManager.stripeManager.createOneTimePayment>[2]);
			if (!payment) return res.status(400).json({
				status: 400,
				message: 'Failed to create one time payment.',
			});

			return res.status(200).json({
				status: 200,
				data: payment,
			});
		}));

		// Customer Portal.
		this.app.post(baseRoute + '/portal', express.json(), async (req, res) => this.checkKey(req, res, dev, async (identify) => {
			if (!identify) return;

			const stripeCheck = checkBody(req.body, ['email', 'userId', 'customerId'], ['intention']);
			if (!stripeCheck) return res.status(400).json({
				status: 400,
				message: 'Malformed body or invalid values, allowed keys are `email` and `userId`, `customerId` or `intention`.',
			});

			const portal = await WssManager.stripeManager?.createPortalSession(identify, stripeCheck.required || {}, stripeCheck.optional?.intention as ('payment_method_update' | 'subscription_cancel'));
			if (!portal) return res.status(400).json({
				status: 400,
				message: 'Failed to create portal session.',
			});

			return res.status(200).json({
				status: 200,
				data: portal,
			});
		}));
	}
}
