// One number on a dashboard, e.g. "Pending Approval  4".
// If `to` is given the whole card is a link to the matching list.

import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';

// tone: 'blue' | 'navy' | 'amber' | 'green' | 'red' | 'slate'
export default function StatCard({ label, value, hint, icon, tone = 'blue', to }) {
  const content = (
    <>
      <div className={`stat-icon stat-icon-${tone}`}>
        <Icon name={icon} size={22} />
      </div>
      <div className="stat-body">
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
        {hint && <p className="stat-hint">{hint}</p>}
      </div>
    </>
  );

  if (to) {
    return (
      <Link to={to} className="stat-card stat-card-link">
        {content}
      </Link>
    );
  }
  return <div className="stat-card">{content}</div>;
}
