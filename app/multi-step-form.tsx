"use client";
/* eslint-disable @next/next/no-img-element -- next/image added client JavaScript here without optimizing anything (SVGs, data URLs or unoptimized files). */

import { useForm } from "@tanstack/react-form";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { addOns, defaultValues, plans, price, schemaForStep, stepNumbers, steps, thankYouText, type Screen } from "./form-data";

const infoFields = [
  { name: "name", label: "Name", placeholder: "e.g. Stephen King", type: "text", autoComplete: "name" },
  { name: "email", label: "Email Address", placeholder: "e.g. stephenking@lorem.com", type: "email", autoComplete: "email" },
  { name: "phone", label: "Phone Number", placeholder: "e.g. +1 234 567 890", type: "tel", autoComplete: "tel" },
] satisfies { name: "name" | "email" | "phone"; label: string; placeholder: string; type: string; autoComplete: string }[];

export function MultiStepForm() {
  const [screen, setScreen] = useState<Screen>(1);
  const [attempted, setAttempted] = useState(false);
  const formElement = useRef<HTMLFormElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const planHeading = useRef<HTMLHeadingElement>(null);
  const submitting = useRef(false);
  const previousScreen = useRef<Screen>(1);
  const activeStep = screen === "thank-you" ? 4 : screen;
  const schema = schemaForStep(screen);

  function goTo(next: Screen): void {
    // Errors belong to the displayed step; clearing metadata leaves the draft intact.
    form.setErrorMap({ onSubmit: { fields: {} }, onChange: { fields: {} } });
    setAttempted(false);
    setScreen(next);
  }

  const form = useForm({
    defaultValues,
    validators: { onSubmit: schema, onChange: attempted ? schema : undefined },
    onSubmit: () => {
      if (screen === 1) goTo(2);
      else if (screen === 2) goTo(3);
      else if (screen === 3) goTo(4);
      else if (screen === 4) goTo("thank-you");
    },
  });

  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (submitting.current || screen === "thank-you") return;
    submitting.current = true;
    try {
      await form.handleSubmit();
      if (!form.state.isValid) {
        setAttempted(true);
        requestAnimationFrame(() => {
          formElement.current?.querySelector<HTMLElement>('.step-body:not([hidden]) input[aria-invalid="true"]')?.focus();
        });
      }
    } finally {
      submitting.current = false;
    }
  }

  useEffect(() => {
    const element = formElement.current;
    if (!element) return;
    // Native typing before hydration belongs to the draft too.
    for (const field of infoFields) {
      const input = element.querySelector<HTMLInputElement>(`#${field.name}`);
      if (input && input.value !== form.state.values[field.name]) form.setFieldValue(field.name, input.value);
    }
    element.dataset.hydrated = "true";
    if (element.dataset.pendingSubmit === "true") {
      delete element.dataset.pendingSubmit;
      element.requestSubmit();
    }
  }, [form]);

  useEffect(() => {
    if (previousScreen.current === screen) return;
    previousScreen.current = screen;
    (screen === 2 ? planHeading.current : heading.current)?.focus();
  }, [screen]);

  return (
    <main className="form-stage">
      <div className="form-card">
        <aside className="step-sidebar" aria-label="Form progress">
          <ol className="step-list">
            {stepNumbers.map((number) => (
              <li key={number} aria-current={activeStep === number ? "step" : undefined}>
                <span className="step-number">{number}</span>
                <span className="step-label"><span>Step {number}</span><strong>{steps[number].label}</strong></span>
              </li>
            ))}
          </ol>
        </aside>
        <form id="subscription-form" ref={formElement} className="subscription-form" noValidate data-hydrated="false" suppressHydrationWarning onSubmit={(event) => { void submit(event); }}>
          <div className={`step-panel${screen === "thank-you" ? " thank-you" : ""}`}>
            {screen === "thank-you" ? (
              <>
                <img className="thank-you-icon" src="/images/icon-thank-you.svg" width={80} height={80} alt="" loading="lazy" decoding="async" />
                <h1 ref={heading} tabIndex={-1}>Thank you!</h1>
                <p>{thankYouText}</p>
              </>
            ) : screen !== 2 ? (
              <header className="step-heading">
                <h1 ref={heading} tabIndex={-1}>{steps[screen].title}</h1>
                <p>{steps[screen].description}</p>
              </header>
            ) : null}
            <div className="step-body info-fields" hidden={screen !== 1}>
              {infoFields.map((input) => (
                <form.Field key={input.name} name={input.name}>
                  {(field) => {
                    const error = field.state.meta.errors.map((issue) => issue?.message).filter(Boolean).join(" ");
                    return (
                      <div className="info-field">
                        <div className="field-label-row">
                          <label htmlFor={input.name}>{input.label}</label>
                          {error && <span className="field-error" id={`${input.name}-error`}>{error}</span>}
                        </div>
                        <input id={input.name} name={input.name} type={input.type} autoComplete={input.autoComplete} placeholder={input.placeholder}
                          value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} onBlur={field.handleBlur}
                          aria-invalid={Boolean(error)} aria-describedby={error ? `${input.name}-error` : undefined} />
                      </div>
                    );
                  }}
                </form.Field>
              ))}
            </div>
            <div className="step-body plan-step" hidden={screen !== 2}>
              <form.Subscribe selector={(state) => state.values.billing}>
                {(billing) => (
                  <form.Field name="plan">
                    {(field) => {
                      const error = field.state.meta.errors.map((issue) => issue?.message).filter(Boolean).join(" ");
                      // Plan validation runs on submit/change. TanStack's blur validation clears
                      // the submit error and moves the billing switch before a click completes.
                      return (
                        <fieldset className="plan-fieldset">
                          <legend><h1 ref={planHeading} tabIndex={-1}>{steps[2].title}</h1></legend>
                          <p className="plan-description">{steps[2].description}</p>
                          {error && <p className="field-error plan-error" id="plan-error">{error}</p>}
                          <div className="plan-options" role="radiogroup" aria-label="Select your plan" aria-describedby={error ? "plan-error" : undefined}>
                            {plans.map((plan) => (
                              <label className="plan-card" key={plan.id}>
                                <input className="card-radio" type="radio" name="plan" value={plan.id} checked={field.state.value === plan.id}
                                  onChange={() => field.handleChange(plan.id)} aria-invalid={Boolean(error)} aria-describedby={error ? "plan-error" : undefined}
                                  aria-labelledby={`${plan.id}-name`} />
                                <img className="plan-icon" src={plan.icon} width={40} height={40} alt="" loading="lazy" decoding="async" />
                                <span className="plan-copy"><strong id={`${plan.id}-name`}>{plan.name}</strong><span>{price(plan[billing], billing)}</span>{billing === "yearly" && <span className="free-months">2 months free</span>}</span>
                              </label>
                            ))}
                          </div>
                        </fieldset>
                      );
                    }}
                  </form.Field>
                )}
              </form.Subscribe>
              <form.Field name="billing">
                {(field) => (
                  <div className="billing-control">
                    <span className={field.state.value === "monthly" ? "active-billing" : undefined} id="monthly-label">Monthly</span>
                    <button type="button" className="billing-switch" role="switch" aria-checked={field.state.value === "yearly"} aria-labelledby="monthly-label yearly-label"
                      onClick={() => field.handleChange(field.state.value === "monthly" ? "yearly" : "monthly")}><span /></button>
                    <span className={field.state.value === "yearly" ? "active-billing" : undefined} id="yearly-label">Yearly</span>
                  </div>
                )}
              </form.Field>
            </div>
            <div className="step-body" hidden={screen !== 3}>
              <fieldset className="add-on-fieldset">
                <legend className="sr-only">Pick add-ons</legend>
                <form.Subscribe selector={(state) => state.values.billing}>
                  {(billing) => (
                    <div className="add-on-options">
                      {addOns.map((addOn) => (
                        <form.Field key={addOn.id} name={addOn.id}>
                          {(field) => (
                            <label className="add-on-card">
                              <input type="checkbox" name={addOn.id} checked={field.state.value} onChange={(event) => field.handleChange(event.target.checked)}
                                onBlur={field.handleBlur} aria-labelledby={`${addOn.id}-name`} aria-describedby={`${addOn.id}-description`} />
                              <span className="add-on-copy"><strong id={`${addOn.id}-name`}>{addOn.name}</strong><span id={`${addOn.id}-description`}>{addOn.description}</span></span>
                              <span className="add-on-price">{price(addOn[billing], billing, true)}</span>
                            </label>
                          )}
                        </form.Field>
                      ))}
                    </div>
                  )}
                </form.Subscribe>
              </fieldset>
            </div>
            <div className="step-body" hidden={screen !== 4}>
              <form.Subscribe selector={(state) => state.values}>
                {(draft) => {
                  const plan = plans.find((option) => option.id === draft.plan);
                  if (!plan) return null;
                  const selectedAddOns = addOns.filter((addOn) => draft[addOn.id]);
                  const total = plan[draft.billing] + selectedAddOns.reduce((sum, addOn) => sum + addOn[draft.billing], 0);
                  return (
                    <>
                      <div className="summary-box">
                        <div className="summary-plan">
                          <div><strong>{plan.name} ({draft.billing === "monthly" ? "Monthly" : "Yearly"})</strong><button type="button" className="change-button" onClick={() => goTo(2)}>Change</button></div>
                          <strong>{price(plan[draft.billing], draft.billing)}</strong>
                        </div>
                        {selectedAddOns.length > 0 && <ul className="summary-add-ons">{selectedAddOns.map((addOn) => <li key={addOn.id}><span>{addOn.name}</span><span>{price(addOn[draft.billing], draft.billing, true)}</span></li>)}</ul>}
                      </div>
                      <div className="summary-total"><span>Total (per {draft.billing === "monthly" ? "month" : "year"})</span><strong>{price(total, draft.billing, draft.billing === "monthly")}</strong></div>
                    </>
                  );
                }}
              </form.Subscribe>
            </div>
          </div>
          {screen !== "thank-you" && (
            <div className="form-actions">
              {screen !== 1 && <button type="button" className="back-button" onClick={() => {
                if (screen === 2) goTo(1);
                else if (screen === 3) goTo(2);
                else goTo(3);
              }}>Go Back</button>}
              <button type="submit" className={`primary-button${screen === 4 ? " confirm-button" : ""}`}>{screen === 4 ? "Confirm" : "Next Step"}</button>
            </div>
          )}
          <p className="sr-only step-announcement" role="status" aria-live="polite" aria-atomic="true">{screen === "thank-you" ? "Thank you!" : `Step ${screen} of 4: ${steps[screen].title}`}</p>
        </form>
      </div>
    </main>
  );
}
