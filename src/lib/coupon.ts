/**
 * Generates the customer's discount coupon code using the last 7 digits of their
 * contact number: SP50-XXXXXXX (e.g. +94716494884 -> SP50-6494884).
 */
export function generateCouponCode(phoneNumber: string): string {
  const digits = phoneNumber.replace(/\D/g, "");
  const lastSeven = digits.slice(-7);
  return `SP50-${lastSeven}`;
}
