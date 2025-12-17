import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import Stripe from 'stripe';

@Injectable()
export class BillingService {
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey, {
        apiVersion: '2024-11-20.acacia',
      });
    }
  }

  async getSubscription(organizationId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      // Return default free plan
      return {
        plan: 'free',
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };
    }

    return subscription;
  }

  async createCheckoutSession(organizationId: string, plan: string, billingCycle: string) {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const priceMap: Record<string, Record<string, string>> = {
      pro: {
        monthly: 'price_pro_monthly', // Replace with actual Stripe price ID
        yearly: 'price_pro_yearly',
      },
      team: {
        monthly: 'price_team_monthly',
        yearly: 'price_team_yearly',
      },
      enterprise: {
        monthly: 'price_enterprise_monthly',
        yearly: 'price_enterprise_yearly',
      },
    };

    const priceId = priceMap[plan]?.[billingCycle];
    if (!priceId) {
      throw new Error(`Invalid plan or billing cycle: ${plan}/${billingCycle}`);
    }

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${this.configService.get('FRONTEND_URL')}/dashboard/billing?success=true`,
      cancel_url: `${this.configService.get('FRONTEND_URL')}/dashboard/billing?canceled=true`,
      client_reference_id: organizationId,
      metadata: {
        organizationId,
        plan,
        billingCycle,
      },
    });

    return { sessionId: session.id, url: session.url };
  }

  async handleWebhook(payload: any, signature: string) {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    }

    const event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }

    return { received: true };
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const organizationId = session.metadata?.organizationId;
    if (!organizationId) return;

    const subscription = await this.stripe.subscriptions.retrieve(
      session.subscription as string,
    );

    // Check if subscription exists
    const existing = await this.prisma.subscription.findFirst({
      where: {
        organizationId,
        stripeSubscriptionId: subscription.id,
      },
    });

    if (existing) {
      await this.prisma.subscription.update({
        where: { id: existing.id },
        data: {
          status: subscription.status === 'active' ? 'active' : 'canceled',
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
      });
    } else {
      await this.prisma.subscription.create({
        data: {
          organizationId,
          plan: session.metadata?.plan || 'pro',
          billingCycle: session.metadata?.billingCycle || 'monthly',
          status: subscription.status === 'active' ? 'active' : 'canceled',
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer as string,
        },
      });
    }
      update: {
        status: subscription.status === 'active' ? 'active' : 'canceled',
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
      create: {
        organizationId,
        plan: session.metadata?.plan || 'pro',
        billingCycle: session.metadata?.billingCycle || 'monthly',
        status: subscription.status === 'active' ? 'active' : 'canceled',
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer as string,
      },
    });
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const existing = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (existing) {
      await this.prisma.subscription.update({
        where: { id: existing.id },
        data: {
          status: subscription.status === 'active' ? 'active' : 'canceled',
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
      });
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const existing = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (existing) {
      await this.prisma.subscription.update({
        where: { id: existing.id },
        data: {
          status: 'canceled',
        },
      });
    }
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice) {
    const subscriptionId = invoice.subscription as string;
    const subscription = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (subscription) {
      await this.prisma.invoice.create({
        data: {
          organizationId: subscription.organizationId,
          subscriptionId: subscription.id,
          amount: invoice.amount_paid / 100, // Convert from cents
          currency: invoice.currency,
          status: 'paid',
          stripeInvoiceId: invoice.id,
          paidAt: new Date(),
          dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
        },
      });
    }
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const subscriptionId = invoice.subscription as string;
    const subscription = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (subscription) {
      await this.prisma.invoice.create({
        data: {
          organizationId: subscription.organizationId,
          subscriptionId: subscription.id,
          amount: invoice.amount_due / 100,
          currency: invoice.currency,
          status: 'failed',
          stripeInvoiceId: invoice.id,
          dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
        },
      });

      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'past_due',
        },
      });
    }
  }

  async cancelSubscription(organizationId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { organizationId },
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      throw new NotFoundException('Subscription not found');
    }

    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: true,
      },
    });

    return { message: 'Subscription will be canceled at the end of the billing period' };
  }

  async getUsage(organizationId: string, startDate: Date, endDate: Date) {
    const usage = await this.prisma.usageLog.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const summary = usage.reduce(
      (acc, log) => {
        if (!acc[log.metricType]) {
          acc[log.metricType] = 0;
        }
        acc[log.metricType] += log.quantity;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      summary,
      logs: usage,
    };
  }
}

