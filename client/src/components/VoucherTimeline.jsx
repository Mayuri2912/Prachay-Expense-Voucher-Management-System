// The voucher's audit trail: who did what, and when.

import { HISTORY_LABELS, ROLE_LABELS } from '../utils/constants.js';
import { formatDateTime } from '../utils/formatters.js';
import Icon from './Icon.jsx';

const ACTION_STYLE = {
  CREATED: { icon: 'file-plus', tone: 'slate' },
  UPDATED: { icon: 'edit', tone: 'slate' },
  SUBMITTED: { icon: 'send', tone: 'amber' },
  APPROVED: { icon: 'check', tone: 'green' },
  REJECTED: { icon: 'x', tone: 'red' },
};

export default function VoucherTimeline({ history }) {
  return (
    <section className="card no-print">
      <h2 className="card-title">Voucher history</h2>
      <ol className="timeline">
        {history.map((entry) => {
          const style = ACTION_STYLE[entry.action] || ACTION_STYLE.CREATED;
          return (
            <li key={entry.id} className="timeline-item">
              <span className={`timeline-marker timeline-${style.tone}`}>
                <Icon name={style.icon} size={14} />
              </span>
              <div>
                <p className="timeline-title">{HISTORY_LABELS[entry.action] || entry.action}</p>
                <p className="timeline-meta">
                  {entry.performedBy.name} ({ROLE_LABELS[entry.performedBy.role]}) · {formatDateTime(entry.createdAt)}
                </p>
                {entry.remarks && <p className="timeline-remarks">“{entry.remarks}”</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
