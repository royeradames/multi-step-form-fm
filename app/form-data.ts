import { z } from "zod";

export const plans = [
  { id: "arcade", name: "Arcade", monthly: 9, yearly: 90, icon: "/images/icon-arcade.svg" },
  { id: "advanced", name: "Advanced", monthly: 12, yearly: 120, icon: "/images/icon-advanced.svg" },
  { id: "pro", name: "Pro", monthly: 15, yearly: 150, icon: "/images/icon-pro.svg" },
] satisfies { id: "arcade" | "advanced" | "pro"; name: string; monthly: number; yearly: number; icon: string }[];

export const addOns = [
  { id: "onlineService", name: "Online service", description: "Access to multiplayer games", monthly: 1, yearly: 10 },
  { id: "largerStorage", name: "Larger storage", description: "Extra 1TB of cloud save", monthly: 2, yearly: 20 },
  { id: "customizableProfile", name: "Customizable Profile", description: "Custom theme on your profile", monthly: 2, yearly: 20 },
] satisfies { id: "onlineService" | "largerStorage" | "customizableProfile"; name: string; description: string; monthly: number; yearly: number }[];

export const steps = {
  1: { label: "Your info", title: "Personal info", description: "Please provide your name, email address, and phone number." },
  2: { label: "Select plan", title: "Select your plan", description: "You have the option of monthly or yearly billing." },
  3: { label: "Add-ons", title: "Pick add-ons", description: "Add-ons help enhance your gaming experience." },
  4: { label: "Summary", title: "Finishing up", description: "Double-check everything looks OK before confirming." },
};

export type Step = keyof typeof steps;
export type Screen = Step | "thank-you";
export const stepNumbers: Step[] = [1, 2, 3, 4];

const draftSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  plan: z.enum(["arcade", "advanced", "pro"]).nullable(),
  billing: z.enum(["monthly", "yearly"]),
  onlineService: z.boolean(),
  largerStorage: z.boolean(),
  customizableProfile: z.boolean(),
});
export type Draft = z.infer<typeof draftSchema>;
export type Billing = Draft["billing"];

export const defaultValues: Draft = {
  name: "", email: "", phone: "", plan: null, billing: "monthly",
  onlineService: true, largerStorage: true, customizableProfile: false,
};

const required = z.string().refine((value) => value.trim().length > 0, "This field is required");
const email = z.string().superRefine((value, context) => {
  if (!value.trim()) context.addIssue({ code: "custom", message: "This field is required" });
  else if (!z.email().safeParse(value.trim()).success) context.addIssue({ code: "custom", message: "Enter a valid email address" });
});

export function schemaForStep(step: Screen) {
  if (step === 1) return draftSchema.extend({ name: required, email, phone: required });
  if (step === 2) return draftSchema.extend({ plan: draftSchema.shape.plan.refine((value) => value !== null, "Please select a plan") });
  return draftSchema;
}

export function price(amount: number, billing: Billing, extra = false) {
  return `${extra ? "+" : ""}$${amount}/${billing === "monthly" ? "mo" : "yr"}`;
}

export const thankYouText = "Thanks for confirming your subscription! We hope you have fun using our platform. If you ever need support, please feel free to email us at support@loremgaming.com.";
