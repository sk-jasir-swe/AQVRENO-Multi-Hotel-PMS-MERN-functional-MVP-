// Razorpay order creation/webhook signature verification must be completed with live merchant credentials before production.
export function assertRazorpayConfigured() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)
    throw new Error("Razorpay is not configured");
}
