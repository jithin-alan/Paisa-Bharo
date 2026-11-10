import { AffiliateDeal, AffiliatePostbackPayload } from './types';

// In-memory tracked clicks store: clickId -> { userId, network, merchantId, createdAt }
export interface TrackedClick {
  clickId: string;
  userId: string;
  network: 'Awin' | 'CJ' | 'Impact';
  merchantId: string;
  merchantName: string;
  timestamp: string;
}

const trackedClicks = new Map<string, TrackedClick>();
const processedConversionOrders = new Set<string>();

/**
 * Affiliate Deals & Cashback Adapter (Awin, CJ, Impact)
 * Generates tracked outbound links, tracks clicks, and records conversion postbacks.
 */
export class AffiliateDealsAdapter {
  private networkAffiliateIds = {
    Awin: 'dummy_awin_publisher_id_5541',
    CJ: 'dummy_cj_pub_id_9921',
    Impact: 'dummy_impact_media_id_3301',
  };

  /**
   * Generates a tracked outbound link with unique sub-track clickId for conversion reconciliation.
   */
  generateTrackedOutboundLink(
    deal: AffiliateDeal,
    userId: string
  ): { trackedUrl: string; clickId: string } {
    const clickId = `clk_${deal.network.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Store in-memory click record for postback reconciliation
    const record: TrackedClick = {
      clickId,
      userId,
      network: deal.network,
      merchantId: deal.id,
      merchantName: deal.merchantName,
      timestamp: new Date().toISOString(),
    };
    trackedClicks.set(clickId, record);

    let trackedUrl = deal.destinationUrl;

    if (deal.network === 'Awin') {
      // Standard Awin deep link format: awin1.com/cread.php?awinaffid=...&clickref=...&p=...
      const encodedDest = encodeURIComponent(deal.destinationUrl);
      trackedUrl = `https://www.awin1.com/cread.php?awinaffid=${this.networkAffiliateIds.Awin}&clickref=${clickId}&p=${encodedDest}`;
    } else if (deal.network === 'CJ') {
      // Standard CJ link tracking with s1 (sub-id) parameter
      trackedUrl = `${deal.destinationUrl}?sid=${clickId}&cjevent=${clickId}`;
    } else if (deal.network === 'Impact') {
      // Impact Radius subid parameter
      trackedUrl = `${deal.destinationUrl}?subId1=${clickId}&mediaPartnerId=${this.networkAffiliateIds.Impact}`;
    }

    return { trackedUrl, clickId };
  }

  /**
   * Retrieves active deals and cashback offers across Awin, CJ, and Impact.
   */
  async getDeals(category = 'All'): Promise<AffiliateDeal[]> {
    const allDeals: AffiliateDeal[] = [
      {
        id: 'deal_amz_01',
        merchantName: 'Amazon Global',
        network: 'Impact',
        category: 'Shopping',
        cashbackTag: 'Up to 8% Coins Cashback',
        estimatedDays: '30-45 Days',
        logo: '📦',
        description: 'Shop millions of products including electronics, fashion, home essentials & daily deals.',
        destinationUrl: 'https://www.amazon.com',
        popularCoupons: ['SAVE15 (App exclusive)', 'PRIMEBONUS'],
      },
      {
        id: 'deal_fk_02',
        merchantName: 'Flipkart Online Store',
        network: 'Awin',
        category: 'Shopping',
        cashbackTag: 'Up to 9.5% Coins Cashback',
        estimatedDays: '40 Days',
        logo: '🛍️',
        description: 'Big Billion Days discounts on mobiles, electronics, appliances, and fashion brands.',
        destinationUrl: 'https://www.flipkart.com',
        popularCoupons: ['SUPERCOIN100', 'ELECTRO500'],
      },
      {
        id: 'deal_myntra_03',
        merchantName: 'Myntra Fashion',
        network: 'Awin',
        category: 'Fashion',
        cashbackTag: 'Flat 7% Coins Cashback',
        estimatedDays: '35 Days',
        logo: '👗',
        description: 'Top international & Indian streetwear, luxury apparel, footwear, and accessories.',
        destinationUrl: 'https://www.myntra.com',
        popularCoupons: ['MYNTRA200', 'FASHIONFIRST'],
      },
      {
        id: 'deal_nike_04',
        merchantName: 'Nike Official Store',
        network: 'CJ',
        category: 'Fashion',
        cashbackTag: '6% Coins Cashback',
        estimatedDays: '45 Days',
        logo: '👟',
        description: 'Air Jordan, Air Max, Pegasus running sneakers, Dri-FIT athletic apparel and training gear.',
        destinationUrl: 'https://www.nike.com',
        popularCoupons: ['MEMBER20 (Free shipping)'],
      },
      {
        id: 'deal_booking_05',
        merchantName: 'Booking.com Stays & Hotels',
        network: 'CJ',
        category: 'Travel',
        cashbackTag: '4.5% Coins Cashback',
        estimatedDays: '60 Days after checkout',
        logo: '✈️',
        description: 'Book over 2 million hotels, resorts, villas, and flight tickets worldwide.',
        destinationUrl: 'https://www.booking.com',
        popularCoupons: ['GENIUS15 (Selected Stays)'],
      },
      {
        id: 'deal_swiggy_06',
        merchantName: 'Swiggy Food & Instamart',
        network: 'Impact',
        category: 'Food',
        cashbackTag: 'Flat 50 🪙 Per Order',
        estimatedDays: '7 Days',
        logo: '🍔',
        description: 'Order food delivery from top restaurants or get groceries in 10 minutes.',
        destinationUrl: 'https://www.swiggy.com',
        popularCoupons: ['SWIGGYIT (Flat 40% off)'],
      },
    ];

    if (category === 'All') return allDeals;
    return allDeals.filter(d => d.category === category);
  }

  /**
   * Processes S2S conversion postbacks from Awin, CJ, or Impact.
   */
  async processPostback(payload: AffiliatePostbackPayload): Promise<{
    success: boolean;
    coinsAwarded: number;
    status: string;
    message: string;
    orderId: string;
  }> {
    const orderKey = `${payload.network}_${payload.orderId}`;

    if (processedConversionOrders.has(orderKey)) {
      return {
        success: false,
        coinsAwarded: 0,
        status: 'duplicate',
        message: `Order ${payload.orderId} from ${payload.network} has already been recorded.`,
        orderId: payload.orderId,
      };
    }

    if (payload.status === 'declined') {
      return {
        success: false,
        coinsAwarded: 0,
        status: 'declined',
        message: `Conversion was cancelled or returned by customer. Order ${payload.orderId}.`,
        orderId: payload.orderId,
      };
    }

    // Award coins: default to coinsAwarded or commissionUsd * 800
    const coins = payload.coinsAwarded || Math.round((payload.commissionUsd || 1.5) * 800);
    processedConversionOrders.add(orderKey);

    return {
      success: true,
      coinsAwarded: coins,
      status: payload.status,
      message: `Affiliate conversion recorded for ${payload.merchantName} via ${payload.network}. +${coins} coins credited!`,
      orderId: payload.orderId,
    };
  }

  /**
   * Returns recent tracked clicks for debugging / tester tools.
   */
  getTrackedClicks(): TrackedClick[] {
    return Array.from(trackedClicks.values()).reverse();
  }
}

export const affiliateDealsAdapter = new AffiliateDealsAdapter();
