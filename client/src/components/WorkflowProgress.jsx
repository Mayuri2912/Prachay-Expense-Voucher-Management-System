// Shows where a voucher stands in the workflow from the assignment:
//
//   Draft -> Submitted -> Pending Approval -> Approved or Rejected
//
// "Submitted" is not a separate status in the database. Submitting a voucher moves it
// straight to PENDING_APPROVAL, and the moment of submission is stored in submittedAt.
// This strip makes that step visible. It only uses fields the API already returns.

import { STATUS } from '../utils/constants.js';
import { formatDateTime } from '../utils/formatters.js';
import Icon from './Icon.jsx';

const STATE_TEXT = {
  done: 'completed',
  current: 'current step',
  upcoming: 'not reached yet',
  rejected: 'rejected',
};

// Works out the four steps for one voucher.
// state: 'done' | 'current' | 'upcoming' | 'rejected'
function buildSteps(voucher) {
  const submitted = voucher.status !== STATUS.DRAFT;
  const decided = voucher.status === STATUS.APPROVED || voucher.status === STATUS.REJECTED;

  let lastStep = { label: 'Approved or Rejected', state: 'upcoming', note: "The Director's decision" };
  if (voucher.status === STATUS.APPROVED) {
    lastStep = {
      label: 'Approved',
      state: 'done',
      note: `${formatDateTime(voucher.approvedAt)} · visible to Accounts for reimbursement`,
    };
  } else if (voucher.status === STATUS.REJECTED) {
    lastStep = {
      label: 'Rejected',
      state: 'rejected',
      note: `${formatDateTime(voucher.rejectedAt)} · the employee can see the reason`,
    };
  }

  return [
    {
      label: 'Draft',
      state: submitted ? 'done' : 'current',
      note: submitted ? `Created ${formatDateTime(voucher.createdAt)}` : 'Can still be edited or deleted',
    },
    {
      label: 'Submitted',
      state: submitted ? 'done' : 'upcoming',
      note: submitted ? formatDateTime(voucher.submittedAt) : 'Needs the employee signature',
    },
    {
      label: 'Pending Approval',
      state: decided ? 'done' : submitted ? 'current' : 'upcoming',
      note: decided ? 'Reviewed by the Director' : submitted ? 'Waiting for the Director' : 'Reviewed by the Director',
    },
    lastStep,
  ];
}

export default function WorkflowProgress({ voucher }) {
  const steps = buildSteps(voucher);

  return (
    <section className="card no-print" aria-label="Workflow progress">
      <h2 className="card-title">Workflow progress</h2>
      <ol className="workflow-steps">
        {steps.map((step, index) => (
          <li
            key={step.label}
            className={`workflow-step workflow-step-${step.state}`}
            aria-current={step.state === 'current' ? 'step' : undefined}
          >
            <span className="workflow-marker" aria-hidden="true">
              {step.state === 'done' && <Icon name="check" size={14} />}
              {step.state === 'rejected' && <Icon name="x" size={14} />}
              {(step.state === 'current' || step.state === 'upcoming') && index + 1}
            </span>
            <span className="workflow-text">
              <span className="workflow-label">
                {step.label}
                <span className="visually-hidden"> ({STATE_TEXT[step.state]})</span>
              </span>
              <span className="workflow-note">{step.note}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
