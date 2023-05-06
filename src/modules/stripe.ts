import { StripeUsers, ParsedStripeUsers, Who } from '../data/types';
import LoggerModule from './logger';
import config from '../data/config';
import Stripe from 'stripe';

export default class StripeManager {
	public users: Map<StripeUsers, {
		dev: Stripe; prod: Stripe;
	}>;

	constructor() {
		this.users = new Map();
		this.loadUsers();
	}

	private loadUsers() {
		for (const user of Object.keys(config.stripe)) {
			this.users.set(user as StripeUsers, {
				dev: new Stripe(config.stripe[user as StripeUsers].keys.dev, { apiVersion: '2022-11-15' }),
				prod: new Stripe(config.stripe[user as StripeUsers].keys.prod, { apiVersion: '2022-11-15' }),
			});
		}
	}

	private _convertUser(identify: string) {
		return {
			userId: identify.split('|')[0],
			email: identify.split('|')[1],
		};
	}

	public async _signWebhook(who: ParsedStripeUsers, body: Buffer, header?: string | string[]) {
		if (!header || !header.length) return null;

		try {
			return this.getAccount(who)?.webhooks.constructEvent(body, (Array.isArray(header) ? header.find((h) => !!h) : header) as string, config.stripe[(who?.includes('|') ? who.split('|')[0] : who) as StripeUsers].webhooks[(who.includes('|') ? 'dev' : 'prod')]);
		} catch (err: unknown) {
			LoggerModule('Stripe', 'Failed to construct webhook events.', 'red');
			console.log(err);
			return null;
		}
	}

	// Accounts.
	public getAccount(who: ParsedStripeUsers): Stripe | null {
		const isDev = who.includes('|'), account = who.split('|')[0] as StripeUsers;
		return this.users.get(account)?.[(isDev ? 'dev' : 'prod')] || null;
	}

	// Customers.
	public async getCustomer(who: Who, options: { identify?: string; customerId?: string; }, createOnFail?: boolean): Promise<Stripe.Customer | null> {
		if (!options.identify && !options.customerId) return null;

		let customer: Stripe.Customer | null;
		if (options.identify) {
			const idAndEmail = this._convertUser(options.identify);

			customer = await this.getAccount(who.account)?.customers.list({ email: idAndEmail.email }).then((customers) => customers?.data.find((customerData) => customerData.metadata?.userId === idAndEmail.userId)) || null;
		} else customer = await this.getAccount(who.account)?.customers.retrieve(options.customerId || '').catch(() => null) as Stripe.Customer;

		if (!customer && createOnFail && options.identify) {
			const idAndEmail = this._convertUser(options.identify);

			customer = await this.getAccount(who.account)?.customers.create({
				email: idAndEmail.email,
				metadata: {
					userId: idAndEmail.userId,
					email: idAndEmail.email,
					_clientId: who.clientId,
				},
			}) || null;
		}

		return customer;
	}

	public async getAllCustomers(who: Who): Promise<Stripe.Customer[] | null> {
		return (await this.getAccount(who.account)?.customers.list())?.data || null;
	}

	public async updateCustomer(who: Who, options: { identify?: string; customerId?: string; }, data: { email?: string; metadata?: Record<string, string | number>; }): Promise<Stripe.Customer | null> {
		const customer = await this.getCustomer(who, { identify: options.identify, customerId: options.customerId });
		if (!customer) return null;

		return await this.getAccount(who.account)?.customers.update(customer.id, {
			email: data.email,
			metadata: {
				...(typeof data.metadata === 'object' ? data.metadata : {}),
				userId: customer.metadata.userId,
				email: customer.metadata.email,
				_clientId: who.clientId,
			},
		}) || null;
	}

	public async deleteCustomer(who: Who, options: { identify?: string; customerId?: string; }): Promise<Stripe.DeletedCustomer | null> {
		const customer = await this.getCustomer(who, { identify: options.identify, customerId: options.customerId });
		if (!customer) return null;

		return await this.getAccount(who.account)?.customers.del(customer.id) || null;
	}

	// Sessions.
	public async getSession(who: Who, options: { sessionId?: string; }): Promise<Stripe.Checkout.Session | null> {
		if (!options.sessionId) return null;

		return await this.getAccount(who.account)?.checkout.sessions.retrieve(options.sessionId) || null;
	}

	public async getUserSessions(who: Who, options: { identify?: string; customerId?: string; }): Promise<Stripe.Checkout.Session[] | null> {
		if (!options.identify && !options.customerId) return null;

		const customer = await this.getCustomer(who, { identify: options.identify, customerId: options.customerId });
		if (!customer) return null;

		return (await this.getAccount(who.account)?.checkout.sessions.list({ customer: customer.id }))?.data || null;
	}

	// Subscriptions.
	public async getSubscription(who: Who, options: { subscriptionId?: string; }): Promise<Stripe.Subscription | null> {
		if (!options.subscriptionId) return null;

		return await this.getAccount(who.account)?.subscriptions.retrieve(options.subscriptionId) || null;
	}

	public async getUserSubscriptions(who: Who, options?: { identify?: string; customerId?: string; }): Promise<Stripe.Subscription[] | null> {
		if (!options?.identify && !options?.customerId) return null;

		const customer = await this.getCustomer(who, { identify: options?.identify, customerId: options?.customerId });
		if (!customer) return null;

		return (await this.getAccount(who.account)?.subscriptions.list({ customer: customer.id }))?.data || null;
	}

	public async getAllSubscriptions(who: Who): Promise<Stripe.Subscription[] | null> {
		return (await this.getAccount(who.account)?.subscriptions.list())?.data || null;
	}

	public async updateSubscription(who: Who, options: { subscriptionId?: string; }, data: { description?: string; metadata?: Record<string, string | number>; }): Promise<Stripe.Subscription | null> {
		if (!options.subscriptionId) return null;

		return await this.getAccount(who.account)?.subscriptions.update(options.subscriptionId, {
			...data,
			metadata: {
				...(typeof data.metadata === 'object' ? data.metadata : {}),
				_clientId: who.clientId,
			},
		}) || null;
	}

	public async deleteSubscription(who: Who, options: { subscriptionId?: string; }): Promise<Stripe.Subscription | null> {
		if (!options.subscriptionId) return null;

		return await this.getAccount(who.account)?.subscriptions.del(options.subscriptionId) || null;
	}

	// Waya Subscription.
	public async createWayaSubscription(who: Who, options: { identify?: string; customerId?: string; }, data: { amount?: number; metadata?: Record<string, string | number>; }): Promise<Stripe.Checkout.Session | null> {
		const customer = await this.getCustomer(who, { identify: options.identify, customerId: options.customerId }, true);
		if (!customer) return null;

		return await this.getAccount(who.account)?.checkout.sessions.create({
			customer: customer.id,
			client_reference_id: customer.metadata.userId,
			success_url: config.stripe.Luna.links.success,
			cancel_url: config.stripe.Luna.links.cancel,
			mode: 'subscription',
			allow_promotion_codes: true,
			metadata: {
				...(typeof data?.metadata === 'object' ? data?.metadata : {}),
				userId: customer.metadata.userId,
				email: customer.metadata.email,
				_clientId: who.clientId,
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
					_clientId: who.clientId,
				},
			},
		}) || null;
	}

	// Coupons.
	public async getCoupon(who: Who, options: { couponId?: string; }): Promise<Stripe.Coupon | null> {
		if (!options.couponId) return null;

		return await this.getAccount(who.account)?.coupons.retrieve(options.couponId) || (await this.getAccount(who.account)?.coupons.list())?.data.find((c) => c.name) || null;
	}

	public async getAllCoupons(who: Who): Promise<Stripe.Coupon[] | null> {
		return (await this.getAccount(who.account)?.coupons.list())?.data || null;
	}

	public async createCoupon(who: Who, options: { code: string; percentage: number; duration: ('forever' | 'once' | 'repeating'); maxClaims: number; metadata?: Record<string, string | number>; }): Promise<Stripe.Coupon | null> {
		const check = (await this.getAccount(who.account)?.coupons.list())?.data?.find((cupounData) => (cupounData.name === options.code || cupounData.id === options.code)) || null;
		if (check) return null;

		return await this.getAccount(who.account)?.coupons.create({
			name: options.code,
			percent_off: options.percentage,
			duration: options.duration || 'once',
			max_redemptions: options.maxClaims,
			metadata: {
				...(typeof options.metadata === 'object' ? options.metadata : {}),
				_clientId: who.clientId,
			},
		}) || null;
	}

	public async deleteCoupon(who: Who, options: { couponId?: string; }): Promise<Stripe.DeletedCoupon | null> {
		if (!options.couponId) return null;

		return await this.getAccount(who.account)?.coupons.del(options.couponId) || null;
	}

	// Invoices.
	public async getInvoice(who: Who, options: { invoiceId?: string; }): Promise<Stripe.Invoice | null> {
		if (!options.invoiceId) return null;

		return await this.getAccount(who.account)?.invoices.retrieve(options.invoiceId) || null;
	}

	public async getUserInvoices(who: Who, options: { identify?: string; customerId?: string; }): Promise<Stripe.Invoice[] | null> {
		if (!options.identify && !options.customerId) return null;

		const customer = await this.getCustomer(who, { identify: options.identify, customerId: options.customerId });
		if (!customer) return null;

		return (await this.getAccount(who.account)?.invoices.list({ customer: customer.id }))?.data || null;
	}

	public async getAllInvoices(who: Who): Promise<Stripe.Invoice[] | null> {
		return (await this.getAccount(who.account)?.invoices.list())?.data || null;
	}

	public async updateInvoice(who: Who, options: { invoiceId?: string; }, data: { description?: string; footer?: string; metadata?: Record<string, string | number>; }): Promise<Stripe.Invoice | null> {
		if (!options.invoiceId) return null;

		return await this.getAccount(who.account)?.invoices.update(options.invoiceId, {
			...data,
			metadata: {
				...(typeof data.metadata === 'object' ? data.metadata : {}),
				_clientId: who.clientId,
			},
		}) || null;
	}

	public async deleteInvoice(who: Who, options: { invoiceId?: string; }): Promise<Stripe.DeletedInvoice | null> {
		if (!options.invoiceId) return null;

		return await this.getAccount(who.account)?.invoices.del(options.invoiceId) || null;
	}

	// One Time Payment.
	public async createOneTimePayment(who: Who, options: { identify?: string; customerId?: string; }, data?: { amount: number; metadata: Record<string, string | number>; }): Promise<Stripe.Checkout.Session | null> {
		const customer = await this.getCustomer(who, { identify: options.identify, customerId: options.customerId }, true);
		if (!customer || typeof data?.amount !== 'number') return null;

		return await this.getAccount(who.account)?.checkout.sessions.create({
			customer: customer.id,
			client_reference_id: customer.metadata.userId,
			success_url: config.stripe[(who.account.split('|')[0] as StripeUsers)].links.success,
			cancel_url: config.stripe[(who.account.split('|')[0] as StripeUsers)].links.cancel,
			mode: 'payment',
			allow_promotion_codes: true,
			metadata: {
				...(typeof data?.metadata === 'object' ? data?.metadata : {}),
				userId: customer.metadata.userId,
				email: customer.metadata.email,
				_clientId: who.clientId,
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
		}) || null;
	}

	// Customer Portal.
	public async createPortalSession(who: Who, options: { identify?: string; customerId?: string; }, intention?: ('payment_method_update' | 'subscription_cancel')): Promise<Stripe.BillingPortal.Session | null> {
		const customer = await this.getCustomer(who, { identify: options.identify, customerId: options.customerId });
		if (!customer) return null;

		return await this.getAccount(who.account)?.billingPortal.sessions.create({
			customer: customer.id,
			return_url: config.stripe[(who.account.split('|')[0] as StripeUsers)].links.returnUrl,
			flow_data: intention ? {
				type: intention,
			} : undefined,
		}) || null;
	}
}
