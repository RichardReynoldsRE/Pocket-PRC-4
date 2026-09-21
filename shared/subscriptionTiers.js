export const TIERS = {
  solo: {
    id: 'solo',
    name: 'Solo',
    monthlyPrice: 1000, // cents
    annualPrice: 10000,
    includedSeats: 1,
    maxSeats: 1,
    seatPriceMonthly: 0,
    seatPriceAnnual: 0,
    features: [
      'Unlimited checklists',
      'File attachments',
      'Lead routing',
      'Rate request forms',
    ],
  },
  team: {
    id: 'team',
    name: 'Team',
    monthlyPrice: 2500,
    annualPrice: 25000,
    includedSeats: 3,
    maxSeats: 10,
    seatPriceMonthly: 500,
    seatPriceAnnual: 5000,
    features: [
      'Everything in Solo',
      '3 seats included',
      'Up to 10 seats',
      'Team management',
      'Custom branding',
      'Activity log',
    ],
  },
  large_team: {
    id: 'large_team',
    name: 'Large Team',
    monthlyPrice: 5000,
    annualPrice: 50000,
    includedSeats: 10,
    maxSeats: 99,
    seatPriceMonthly: 300,
    seatPriceAnnual: 3000,
    features: [
      'Everything in Team',
      '10 seats included',
      'Up to 99 seats',
      'Priority support',
      'Vendor management',
    ],
  },
};

export const TIER_IDS = Object.keys(TIERS);

export function getTier(id) {
  return TIERS[id] || null;
}

export function calculateMonthlyCost(tierId, seatCount) {
  const tier = getTier(tierId);
  if (!tier) return null;

  const extraSeats = Math.max(0, seatCount - tier.includedSeats);
  return tier.monthlyPrice + extraSeats * tier.seatPriceMonthly;
}

export function calculateAnnualCost(tierId, seatCount) {
  const tier = getTier(tierId);
  if (!tier) return null;

  const extraSeats = Math.max(0, seatCount - tier.includedSeats);
  return tier.annualPrice + extraSeats * tier.seatPriceAnnual;
}
