import { MultiStepForm } from "./multi-step-form";
import { challengeUrl } from "./site";

// Capture native submits before React loads, without navigating or serializing the draft.
const earlySubmit = `document.addEventListener('submit',function(event){var form=event.target;if(form instanceof HTMLFormElement&&form.id==='subscription-form'&&form.dataset.hydrated!=='true'){event.preventDefault();event.stopImmediatePropagation();form.dataset.pendingSubmit='true';}},true);`;

export default function Home() {
  return (
    <div className="page-shell">
      <script dangerouslySetInnerHTML={{ __html: earlySubmit }} />
      <MultiStepForm />
      <footer className="site-footer">
        <p>Practice demo. Your details stay on this page and reset when you reload. Nothing is sent.</p>
        <p>Challenge by <a href={challengeUrl}>Frontend Mentor</a>. Built by <a href="https://royeradames.com">Royer Adames</a>.</p>
      </footer>
    </div>
  );
}
