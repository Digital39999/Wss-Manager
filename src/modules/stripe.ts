import { GatewayIdentifications } from '../data/types';
import LoggerModule from './logger';
import config from '../data/config';
import Stripe from 'stripe';

export default class StripeManager {
	private stripeClient: Stripe;
	private stripeDevClient: Stripe;

	constructor() {
		this.stripeClient = new Stripe(config.stripe.key, { apiVersion: '2022-11-15' });
		this.stripeDevClient = new Stripe(config.stripe.devKey, { apiVersion: '2022-11-15' });
	}

	/* ----------------------------------- Internal ----------------------------------- */

	private _convertUser(identify: string): { userId: string; email: string; } {
		return {
			userId: identify.split('|')[0],
			email: identify.split('|')[1],
		};
	}

	public async _signWebhook(body: Buffer, header?: string | string[], isDev?: boolean) {
		if (!header || !header.length) return null;

		try {
			return this[(isDev ? 'stripeDevClient' : 'stripeClient')].webhooks.constructEvent(body, (Array.isArray(header) ? header.find((h) => !!h) : header) as string, config.stripe[(isDev ? 'devWebhook' : 'webhook')]);
		} catch (err: unknown) {
			LoggerModule('Stripe', 'Failed to construct webhook events.', 'red');
			console.log(err);
			return null;
		}
	}

	/* ----------------------------------- Mutual ----------------------------------- */

	// Customers.
	public async getCustomer<T extends boolean>(who: GatewayIdentifications, options: { identify?: string; customerId?: string; }, createOnFail?: T): Promise<Stripe.Customer | null> {
		if (!options.identify && !options.customerId) return null;

		let customer: Stripe.Customer | null;
		if (options.identify) {
			const idAndEmail = this._convertUser(options.identify);

			customer = await this[(who.includes('|') ? 'stripeDevClient' : 'stripeClient')].customers.list({ email: idAndEmail.email }).then((customers) => customers?.data.find((customerData) => customerData.metadata?.userId === idAndEmail.userId && customerData.metadata?._clientId === who)) || null;
		} else customer = await this[(who.includes('|') ? 'stripeDevClient' : 'stripeClient')].customers.retrieve(options.customerId || '').catch(() => null) as Stripe.Customer;

		if (!customer && createOnFail && options.identify) {
			const idAndEmail = this._convertUser(options.identify);

			customer = await this[(who.includes('|') ? 'stripeDevClient' : 'stripeClient')].customers.create({
				email: idAndEmail.email,
				metadata: {
					userId: idAndEmail.userId,
					_clientId: who,
				},
			});
		}

		return customer;
	}

	public async getAllCustomers(who: GatewayIdentifications) {
		return (await this[(who.includes('|') ? 'stripeDevClient' : 'stripeClient')].customers.list()).data?.filter((customer) => customer.metadata?._clientId === who);
	}

	// Sessions.
	public async getSession(who: GatewayIdentifications, options: { identify?: string; customerId?: string; sessionId?: string; }): Promise<Stripe.Checkout.Session | null> {
		if (!options.identify && !options.customerId && !options.sessionId) return null;

		const customer = !options.sessionId ? await this.getCustomer(who, { identify: options.identify, customerId: options.customerId }) : null;

		if (!customer) return await this[(who.includes('|') ? 'stripeDevClient' : 'stripeClient')].checkout.sessions.retrieve(options.sessionId || '');
		else return await this[(who.includes('|') ? 'stripeDevClient' : 'stripeClient')].checkout.sessions.list({ customer: customer.id }).then((sessions) => sessions?.data.find((sessionData) => sessionData.metadata?._clientId === who)) || null;
	}

	// Subscriptions.
	public async getAllSubscriptions(who: GatewayIdentifications): Promise<Stripe.Subscription[] | null> {
		return (await this[(who.includes('|') ? 'stripeDevClient' : 'stripeClient')].subscriptions.list()).data?.filter((subscription) => subscription.metadata?._clientId === who);
	}

	public async getUserSubscriptions<T extends { identify?: string; customerId?: string; subscriptionId?: string; }>(who: GatewayIdentifications, options: T): Promise<(T['subscriptionId'] extends string ? Stripe.Subscription : Stripe.Subscription[]) | null> {
		type Internal = (T['subscriptionId'] extends string ? Stripe.Subscription : Stripe.Subscription[]) | null;
		if (options.subscriptionId) {
			const subscription = await this[(who.includes('|') ? 'stripeDevClient' : 'stripeClient')].subscriptions.retrieve(options.subscriptionId);
			return subscription.metadata?._clientId === who ? subscription as unknown as Internal : null as Internal;
		}

		const customer = await this.getCustomer(who, { identify: options.identify, customerId: options.customerId }, true);
		if (!customer) return null;

		return ((await this[(who.includes('|') ? 'stripeDevClient' : 'stripeClient')].subscriptions.list({ customer: customer.id })).data?.find((subscription) => subscription.metadata?._clientId === who) || null) as Internal;
	}

	// Coupons.
	public async managecoupons<T extends ('get' | 'getAll' | 'create' | 'delete')>(who: GatewayIdentifications, action: T, data?: { code: string; percentage?: number; duration?: Stripe.CouponCreateParams.Duration; maxClaims?: number; }, createOnFail?: boolean): Promise<(T extends 'getAll' ? Stripe.Coupon[] : (T extends 'delete' ? Stripe.DeletedCoupon : Stripe.Coupon)) | null> {
		type Internal = (T extends 'getAll' ? Stripe.Coupon[] : (T extends 'delete' ? Stripe.DeletedCoupon : Stripe.Coupon)) | null;

		switch (action) {
			case 'get': {
				const coupon = (await this[(who.includes('|') ? 'stripeDevClient' : 'stripeClient')].coupons.list()).data.find((cupounData) => cupounData.name === data?.code) || null;

				if (!coupon && createOnFail) {
					const newCoupon = await this[(who.includes('|') ? 'stripeDevClient' : 'stripeClient')].coupons.create({
						name: data?.code,
						percent_off: data?.percentage,
						duration: data?.duration || 'once',
						max_redemptions: data?.maxClaims,
						metadata: {
							_clientId: who,
						},
					}) as Stripe.Coupon;

					return newCoupon as Internal;
				}

				return coupon as Internal;
			}
			case 'getAll': {
				const coupons = (await this[(who.includes('|') ? 'stripeDevClient' : 'stripeClient')].coupons.list()).data.filter((cupounData) => cupounData.metadata?._clientId === who) || null;
				return coupons as Internal;
			}
			case 'create': {
				const check = (await this[(who.includes('|') ? 'stripeDevClient' : 'stripeClient')].coupons.list()).data?.find((cupounData) => (cupounData.name === data?.code || cupounData.id === data?.code)) || null;
				if (check) return null;

				const coupon = await this[(who.includes('|') ? 'stripeDevClient' : 'stripeClient')].coupons.create({
					name: data?.code,
					percent_off: data?.percentage,
					duration: data?.duration || 'once',
					max_redemptions: data?.maxClaims,
					metadata: {
						_clientId: who,
					},
				}) as Stripe.Coupon;

				return coupon as Internal;
			}
			case 'delete': {
				const coupon = (await this[(who.includes('|') ? 'stripeDevClient' : 'stripeClient')].coupons.list()).data.find((cupounData) => (cupounData.name === data?.code || cupounData.id === data?.code)) || null;
				if (!coupon) return null;

				return await this[(who.includes('|') ? 'stripeDevClient' : 'stripeClient')].coupons.del(coupon.id) as unknown as Internal;
			}
			default: {
				return null;
			}
		}
	}

	// Customer Portal.
	public async createPortalSession(who: GatewayIdentifications, options: { identify?: string; customerId?: string; }, flowType?: ('payment_method_update' | 'subscription_cancel')) {
		const customer = await this.getCustomer(who, { identify: options.identify, customerId: options.customerId }, true);
		if (!customer) return null;

		return await this[(who.includes('|') ? 'stripeDevClient' : 'stripeClient')].billingPortal.sessions.create({
			customer: customer.id,
			return_url: config.stripe.pages[(who.includes('|') ? who.split('|')[0] : who) as keyof typeof config.stripe.pages].returnUrl,
			flow_data: flowType ? {
				type: flowType,
			} : undefined,
		});
	}

	// Invoices.
	public async getAllInvoices(who: GatewayIdentifications): Promise<Stripe.Invoice[] | null> {
		return (await this[(who.includes('|') ? 'stripeDevClient' : 'stripeClient')].invoices.list()).data?.filter((invoice) => invoice.metadata?._clientId === who);
	}

	public async getUserInvoices<T extends { identify?: string; customerId?: string; invoiceId?: string; }>(who: GatewayIdentifications, options: T): Promise<(T['invoiceId'] extends string ? Stripe.Invoice : Stripe.Invoice[]) | null> {
		type Internal = (T['invoiceId'] extends string ? Stripe.Invoice : Stripe.Invoice[]) | null;
		if (options.invoiceId) {
			const invoice = await this[(who.includes('|') ? 'stripeDevClient' : 'stripeClient')].invoices.retrieve(options.invoiceId);
			return invoice.metadata?._clientId === who ? invoice as unknown as Internal : null as Internal;
		}

		const customer = await this.getCustomer(who, { identify: options.identify, customerId: options.customerId }, true);
		if (!customer) return null;

		return ((await this[(who.includes('|') ? 'stripeDevClient' : 'stripeClient')].invoices.list({ customer: customer.id })).data?.find((invoice) => invoice.metadata?._clientId === who) || null) as Internal;
	}

	// One Time Payment.
	public async createOneTimePayment(who: GatewayIdentifications, options: { identify?: string; customerId?: string; }, data?: Record<string, string | number | undefined | Record<string, string | number>>): Promise<Stripe.Checkout.Session | null> {
		const customer = await this.getCustomer(who, { identify: options.identify, customerId: options.customerId }, true);
		if (!customer || typeof data?.amount !== 'number') return null;

		const session = await this[(who.includes('|') ? 'stripeDevClient' : 'stripeClient')].checkout.sessions.create({
			customer: customer.id,
			client_reference_id: customer.metadata.userId,
			success_url: config.stripe.pages[(who.includes('|') ? who.split('|')[0] : who) as keyof typeof config.stripe.pages].success,
			cancel_url: config.stripe.pages[(who.includes('|') ? who.split('|')[0] : who) as keyof typeof config.stripe.pages].cancel,
			mode: 'payment',
			allow_promotion_codes: true,
			metadata: {
				...(typeof data?.metadata === 'object' ? data?.metadata : {}),
				_clientId: who,
			},
			line_items: [{
				quantity: 1,
				price_data: {
					currency: 'eur',
					product_data: {
						name: 'One Time Payment',
					},
					unit_amount: Math.round(data.amount * 100),
				},
			}],
		});

		return session;
	}

	/* ----------------------------------- Waya ----------------------------------- */

	public async createWayaSubscription(who: GatewayIdentifications, options: { identify?: string; customerId?: string; }, data?: Record<string, string | number | undefined | Record<string, string | number>>): Promise<Stripe.Checkout.Session | null> {
		const customer = await this.getCustomer(who, { identify: options.identify, customerId: options.customerId }, true);
		if (!customer) return null;

		const session = await this[(who.includes('|') ? 'stripeDevClient' : 'stripeClient')].checkout.sessions.create({
			customer: customer.id,
			client_reference_id: customer.metadata.userId,
			success_url: config.stripe.pages.Waya.success,
			cancel_url: config.stripe.pages.Waya.cancel,
			mode: 'subscription',
			allow_promotion_codes: true,
			metadata: {
				...(typeof data?.metadata === 'object' ? data?.metadata : {}),
				_clientId: 'Waya',
			},
			line_items: [{
				quantity: 1,
				price_data: {
					currency: 'eur',
					product_data: {
						name: 'Waya Subscription',
					},
					unit_amount: typeof data?.amount === 'number' ? Math.round((data.amount || 0) * 100) || 300 : 300,
					recurring: {
						interval: 'month',
						interval_count: 1,
					},
				},
			}],
			subscription_data: {
				metadata: {
					...(typeof data?.metadata === 'object' ? data?.metadata : {}),
					_clientId: 'Waya',
				},
			},
		});

		return session;
	}

	/* ----------------------------------- Status ----------------------------------- */

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public async createStatusSubscription(options: { identify?: string; customerId?: string; }, metadata?: Record<string, string>): Promise<Stripe.Checkout.Session | null> {
		return null; // Unimplemented.
	}
}
