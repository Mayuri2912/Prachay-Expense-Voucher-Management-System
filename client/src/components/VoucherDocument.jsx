// The voucher laid out like the paper form it replaces: every detail plus both signatures.
// This is also the part of the page that is printed (see styles/print.css).

import { APP_NAME, COMPANY_NAME, STATUS } from '../utils/constants.js';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters.js';
import SignatureImage from './SignatureImage.jsx';
import StatusBadge from './StatusBadge.jsx';

function Detail({ label, children, wide = false }) {
  return (
    <div className={wide ? 'detail-wide' : undefined}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export default function VoucherDocument({ voucher }) {
  return (
    <article className="card voucher-document">
      <header className="voucher-document-header">
        <div>
          <p className="voucher-company">{COMPANY_NAME}</p>
          <h2>Expense Voucher</h2>
          <p className="muted print-only">{APP_NAME}</p>
        </div>
        <div className="voucher-number-block">
          <span className="voucher-number-label">Voucher No.</span>
          <span className="voucher-number">{voucher.voucherNumber}</span>
          <StatusBadge status={voucher.status} />
        </div>
      </header>

      <section>
        <h3 className="section-title">Basic information</h3>
        <dl className="detail-grid">
          <Detail label="Voucher date">{formatDate(voucher.voucherDate)}</Detail>
          <Detail label="Expense date">{formatDate(voucher.expenseDate)}</Detail>
          <Detail label="Department">{voucher.department}</Detail>
          <Detail label="Expense category">{voucher.expenseCategory}</Detail>
          <Detail label="Expense title" wide>
            {voucher.expenseTitle}
          </Detail>
          <Detail label="Amount">
            <span className="amount-large">{formatCurrency(voucher.amount)}</span>
          </Detail>
          <Detail label="Expense description" wide>
            <span className="preserve-lines">{voucher.expenseDescription || 'No description provided.'}</span>
          </Detail>
        </dl>
      </section>

      <section>
        <h3 className="section-title">Employee information</h3>
        <dl className="detail-grid">
          <Detail label="Employee name">{voucher.employee.name}</Detail>
          <Detail label="Employee ID">{voucher.employee.employeeCode || '-'}</Detail>
          <Detail label="Email">{voucher.employee.email}</Detail>
        </dl>
      </section>

      <section>
        <h3 className="section-title">Approval information</h3>
        <dl className="detail-grid">
          <Detail label="Current status">
            <StatusBadge status={voucher.status} />
          </Detail>
          <Detail label="Submitted on">{formatDateTime(voucher.submittedAt)}</Detail>
          <Detail label="Approval date">{formatDateTime(voucher.approvedAt)}</Detail>
          {voucher.reviewedBy && (
            <Detail label={voucher.status === STATUS.REJECTED ? 'Rejected by' : 'Approved by'}>
              {voucher.reviewedBy.name}
            </Detail>
          )}
          {voucher.status === STATUS.REJECTED && (
            <>
              <Detail label="Rejected on">{formatDateTime(voucher.rejectedAt)}</Detail>
              <Detail label="Rejection reason" wide>
                <span className="preserve-lines">{voucher.rejectionReason}</span>
              </Detail>
            </>
          )}
        </dl>
      </section>

      <section>
        <h3 className="section-title">Signatures</h3>
        <div className="signature-grid">
          <div className="signature-block">
            {voucher.hasEmployeeSignature ? (
              <SignatureImage
                voucherId={voucher.id}
                type="employee"
                alt={`Signature of employee ${voucher.employee.name}`}
              />
            ) : (
              <div className="signature-box signature-placeholder">Not signed yet</div>
            )}
            <p className="signature-name">{voucher.employee.name}</p>
            <p className="signature-role">Employee signature</p>
          </div>

          <div className="signature-block">
            {voucher.hasDirectorSignature ? (
              <SignatureImage
                voucherId={voucher.id}
                type="director"
                alt={`Signature of director ${voucher.reviewedBy?.name || ''}`}
              />
            ) : (
              <div className="signature-box signature-placeholder">
                {voucher.status === STATUS.REJECTED ? 'Not approved' : 'Awaiting approval'}
              </div>
            )}
            <p className="signature-name">{voucher.hasDirectorSignature ? voucher.reviewedBy?.name : '-'}</p>
            <p className="signature-role">Director signature</p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="section-title">Audit information</h3>
        <dl className="detail-grid">
          <Detail label="Created date">{formatDateTime(voucher.createdAt)}</Detail>
          <Detail label="Last updated date">{formatDateTime(voucher.updatedAt)}</Detail>
        </dl>
      </section>
    </article>
  );
}
