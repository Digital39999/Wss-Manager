import { SubWho } from '../data/types';
import LoggerModule from './logger';
import config from '../data/config';
import Stripe from 'stripe';

export default class StripeManager {
	private stripeClient: Stripe;

	constructor() {
		this.stripeClient = new Stripe(config.stripe.key, {
			apiVersion: '2022-11-15',
		});
	}

	/* ----------------------------------- Internal ----------------------------------- */

	private _convertUser(identify: string): { userId: string; email: string; } {
		return {
			userId: identify.split('|')[0],
			email: identify.split('|')[1],
		};
	}

	public async _signWebhook(body: Buffer, header?: string | string[]) {
		if (!header || !header.length) return null;

		try {
			return this.stripeClient.webhooks.constructEvent(body, (Array.isArray(header) ? header.find((h) => !!h) : header) as string, config.stripe.webhook);
		} catch (err: unknown) {
			LoggerModule('Stripe', 'Failed to construct webhook events.', 'red');
			console.log(err);
			return null;
		}
	}

	/* ----------------------------------- Mutual ----------------------------------- */

	// Customers.
	public async getCustomer<T extends boolean>(who: SubWho, options: { identify?: string; customerId?: string; }, createOnFail?: T): Promise<Stripe.Customer | null> {
		if (!options.identify && !options.customerId) return null;

		let customer: Stripe.Customer | null;
		if (options.identify) {
			const idAndEmail = this._convertUser(options.identify);

			customer = await this.stripeClient.customers.list({ email: idAndEmail.email }).then((customers) => customers?.data.find((customerData) => customerData.metadata?.userId === idAndEmail.userId && customerData.metadata?._clientId === who)) || null;
		} else customer = await this.stripeClient.customers.retrieve(options.customerId || '').catch(() => null) as Stripe.Customer;

		if (!customer && createOnFail && options.identify) {
			const idAndEmail = this._convertUser(options.identify);

			customer = await this.stripeClient.customers.create({
				email: idAndEmail.email,
				metadata: {
					userId: idAndEmail.userId,
					_clientId: who,
				},
			});
		}

		return customer;
	}

	public async getAllCustomers(who: SubWho) {
		return (await this.stripeClient.customers.list()).data?.filter((customer) => customer.metadata?._clientId === who);
	}

	// Sessions.
	public async getSession(who: SubWho, options: { identify?: string; customerId?: string; sessionId?: string; }): Promise<Stripe.Checkout.Session | null> {
		if (!options.identify && !options.customerId && !options.sessionId) return null;

		const customer = !options.sessionId ? await this.getCustomer(who, { identify: options.identify, customerId: options.customerId }) : null;

		if (!customer) return await this.stripeClient.checkout.sessions.retrieve(options.sessionId || '');
		else return await this.stripeClient.checkout.sessions.list({ customer: customer.id }).then((sessions) => sessions?.data.find((sessionData) => sessionData.metadata?._clientId === who)) || null;
	}

	// Subscriptions.
	public async getAllSubscriptions(who: SubWho): Promise<Stripe.Subscription[] | null> {
		return (await this.stripeClient.subscriptions.list()).data?.filter((subscription) => subscription.metadata?._clientId === who);
	}

	public async getUserSubscriptions<T extends { identify?: string; customerId?: string; subscriptionId?: string; }>(who: SubWho, options: T): Promise<(T['subscriptionId'] extends string ? Stripe.Subscription : Stripe.Subscription[]) | null> {
		type Internal = (T['subscriptionId'] extends string ? Stripe.Subscription : Stripe.Subscription[]) | null;
		if (options.subscriptionId) {
			const subscription = await this.stripeClient.subscriptions.retrieve(options.subscriptionId);
			return subscription.metadata?._clientId === who ? subscription as unknown as Internal : null as Internal;
		}

		const customer = await this.getCustomer(who, { identify: options.identify, customerId: options.customerId }, true);
		if (!customer) return null;

		return ((await this.stripeClient.subscriptions.list({ customer: customer.id })).data?.find((subscription) => subscription.metadata?._clientId === who) || null) as Internal;
	}

	// Coupons.
	public async managecoupons<T extends ('get' | 'getAll' | 'create' | 'delete')>(who: SubWho, action: T, data?: { code: string; percentage?: number; duration?: Stripe.CouponCreateParams.Duration; maxClaims?: number; }, createOnFail?: boolean): Promise<(T extends 'getAll' ? Stripe.Coupon[] : (T extends 'delete' ? Stripe.DeletedCoupon : Stripe.Coupon)) | null> {
		type Internal = (T extends 'getAll' ? Stripe.Coupon[] : (T extends 'delete' ? Stripe.DeletedCoupon : Stripe.Coupon)) | null;

		switch (action) {
			case 'get': {
				const coupon = (await this.stripeClient.coupons.list()).data.find((cupounData) => cupounData.name === data?.code) || null;

				if (!coupon && createOnFail) {
					const newCoupon = await this.stripeClient.coupons.create({
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
				const coupons = (await this.stripeClient.coupons.list()).data.filter((cupounData) => cupounData.metadata?._clientId === who) || null;
				return coupons as Internal;
			}
			case 'create': {
				const check = (await this.stripeClient.coupons.list()).data?.find((cupounData) => (cupounData.name === data?.code || cupounData.id === data?.code)) || null;
				if (check) return null;

				const coupon = await this.stripeClient.coupons.create({
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
				const coupon = (await this.stripeClient.coupons.list()).data.find((cupounData) => (cupounData.name === data?.code || cupounData.id === data?.code)) || null;
				if (!coupon) return null;

				return await this.stripeClient.coupons.del(coupon.id) as unknown as Internal;
			}
			default: {
				return null;
			}
		}
	}

	// Customer Portal.
	public async createPortalSession(who: SubWho, options: { identify?: string; customerId?: string; }, flowType?: ('payment_method_update' | 'subscription_cancel')) {
		const customer = await this.getCustomer(who, { identify: options.identify, customerId: options.customerId }, true);
		if (!customer) return null;

		return await this.stripeClient.billingPortal.sessions.create({
			customer: customer.id,
			return_url: config.stripe.pages[who].returnUrl,
			flow_data: flowType ? {
				type: flowType,
			} : undefined,
		});
	}

	// Invoices.
	public async getAllInvoices(who: SubWho): Promise<Stripe.Invoice[] | null> {
		return (await this.stripeClient.invoices.list()).data?.filter((invoice) => invoice.metadata?._clientId === who);
	}

	public async getUserInvoices<T extends { identify?: string; customerId?: string; invoiceId?: string; }>(who: SubWho, options: T): Promise<(T['invoiceId'] extends string ? Stripe.Invoice : Stripe.Invoice[]) | null> {
		type Internal = (T['invoiceId'] extends string ? Stripe.Invoice : Stripe.Invoice[]) | null;
		if (options.invoiceId) {
			const invoice = await this.stripeClient.invoices.retrieve(options.invoiceId);
			return invoice.metadata?._clientId === who ? invoice as unknown as Internal : null as Internal;
		}

		const customer = await this.getCustomer(who, { identify: options.identify, customerId: options.customerId }, true);
		if (!customer) return null;

		return ((await this.stripeClient.invoices.list({ customer: customer.id })).data?.find((invoice) => invoice.metadata?._clientId === who) || null) as Internal;
	}

	// One Time Payment.
	public async createOneTimePayment(who: SubWho, options: { identify?: string; customerId?: string; }, data?: Record<string, string | number | undefined | Record<string, string | number>>): Promise<Stripe.Checkout.Session | null> {
		const customer = await this.getCustomer(who, { identify: options.identify, customerId: options.customerId }, true);
		if (!customer || typeof data?.amount !== 'number') return null;

		const session = await this.stripeClient.checkout.sessions.create({
			customer: customer.id,
			client_reference_id: customer.metadata.userId,
			success_url: config.stripe.pages[who].success,
			cancel_url: config.stripe.pages[who].cancel,
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

	public async createWayaSubscription(options: { identify?: string; customerId?: string; }, data?: Record<string, string | number | undefined | Record<string, string | number>>): Promise<Stripe.Checkout.Session | null> {
		const customer = await this.getCustomer('Waya', { identify: options.identify, customerId: options.customerId }, true);
		if (!customer) return null;

		const session = await this.stripeClient.checkout.sessions.create({
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
