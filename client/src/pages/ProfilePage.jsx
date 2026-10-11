// "My Profile": the account details of the logged-in user (read-only).

import PageHeader from '../components/PageHeader.jsx';
import Icon from '../components/Icon.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { ROLE_LABELS, ROLES } from '../utils/constants.js';
import { initialsOf } from '../utils/formatters.js';

const ROLE_SUMMARY = {
  [ROLES.EMPLOYEE]: [
    'Create expense vouchers and save them as drafts',
    'Edit or delete your own drafts',
    'Submit vouchers for approval with your signature',
    'Track the status of your own vouchers and read rejection reasons',
  ],
  [ROLES.DIRECTOR]: [
    'View every voucher in the organisation',
    'Approve pending vouchers with your signature',
    'Reject pending vouchers with a reason',
    'Search, filter and sort all vouchers',
  ],
  [ROLES.ACCOUNTS]: [
    'View every voucher in the organisation',
    'See which vouchers are approved and ready for reimbursement',
    'View employee and Director signatures',
    'Search, filter, sort and print vouchers',
  ],
};

export default function ProfilePage() {
  const { user, logout } = useAuth();

  return (
    <>
      <PageHeader title="My Profile" subtitle="Your account details and what your role can do." />

      <div className="profile-layout">
        <section className="card profile-card">
          <span className="avatar avatar-large" aria-hidden="true">
            {initialsOf(user.fullName)}
          </span>
          <h2>{user.fullName}</h2>
          <p className="muted">{ROLE_LABELS[user.role]}</p>

          <dl className="detail-list">
            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Employee ID</dt>
              <dd>{user.employeeCode || '-'}</dd>
            </div>
            <div>
              <dt>Department</dt>
              <dd>{user.department || '-'}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{ROLE_LABELS[user.role]}</dd>
            </div>
          </dl>

          <button type="button" className="btn btn-secondary btn-block" onClick={logout}>
            <Icon name="logout" size={16} />
            Log out
          </button>
        </section>

        <section className="card">
          <h2 className="card-title">What you can do</h2>
          <ul className="check-list">
            {ROLE_SUMMARY[user.role].map((line) => (
              <li key={line}>
                <Icon name="check" size={16} />
                {line}
              </li>
            ))}
          </ul>
          <p className="card-hint">
            Account details are managed by the administrator. Contact them if anything here is incorrect.
          </p>
        </section>
      </div>
    </>
  );
}
