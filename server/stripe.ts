import Stripe from "stripe";

// Initialize Stripe with the secret key from environment variables
// Ensure STRIPE_SECRET_KEY is set in your production environment
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_mock", {
  apiVersion: "2023-10-16" as any, // Bypass TS strict check for Stripe versions
});
