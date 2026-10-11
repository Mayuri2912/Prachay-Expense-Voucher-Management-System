// The voucher table used on every list screen.
// On a phone each row turns into a small card (see .data-table in components.css).

import { Link } from 'react-router-dom';
import { formatCurrency, formatDate } from '../utils/formatters.js';
import Icon from './Icon.jsx';
import StatusBadge from './StatusBadge.jsx';

// A column header that sorts the list when clicked.
function SortableHeader({ column, label, sortBy, sortOrder, onSort, align }) {
  const active = sortBy === column;
  const ariaSort = active ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none';

  return (
    <th scope="col" aria-sort={ariaSort} className={align === 'right' ? 'cell-right' : undefined}>
      <button type="button" className={active ? 'sort-button sort-button-active' : 'sort-button'} onClick={() => onSort(column)}>
        {label}
        {active && <Icon name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} size={14} />}
      </button>
    </th>
  );
}

export default function VoucherTable({ vouchers, detailsPath, showEmployee = true, sortBy, sortOrder, onSort }) {
  // Dashboards show a short, fixed list - there the headers are plain text.
  const sortable = typeof onSort === 'function';

  const header = (column, label, align) =>
    sortable ? (
      <SortableHeader column={column} label={label} sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} align={align} />
    ) : (
      <th scope="col" className={align === 'right' ? 'cell-right' : undefined}>
        {label}
      </th>
    );

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {header('voucherNumber', 'Voucher No.')}
            {showEmployee && header('employeeName', 'Employee')}
            {header('title', 'Expense')}
            {header('department', 'Department')}
            {header('expenseDate', 'Expense Date')}
            {header('amount', 'Amount', 'right')}
            {header('status', 'Status')}
            <th scope="col" className="cell-right">
              <span className="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {vouchers.map((voucher) => (
            <tr key={voucher.id}>
              <td data-label="Voucher No.">
                <Link to={detailsPath(voucher)} className="table-link">
                  {voucher.voucherNumber}
                </Link>
              </td>
              {showEmployee && (
                <td data-label="Employee">
                  <span className="cell-main">{voucher.employee.name}</span>
                  {voucher.employee.employeeCode && <span className="cell-sub">{voucher.employee.employeeCode}</span>}
                </td>
              )}
              <td data-label="Expense">
                <span className="cell-main">{voucher.expenseTitle}</span>
                <span className="cell-sub">{voucher.expenseCategory}</span>
              </td>
              <td data-label="Department">{voucher.department}</td>
              <td data-label="Expense Date">{formatDate(voucher.expenseDate)}</td>
              <td data-label="Amount" className="cell-right cell-amount">
                {formatCurrency(voucher.amount)}
              </td>
              <td data-label="Status">
                <StatusBadge status={voucher.status} />
              </td>
              <td className="cell-right cell-actions">
                <Link to={detailsPath(voucher)} className="btn btn-secondary btn-small">
                  <Icon name="eye" size={15} />
                  View
                  <span className="visually-hidden"> voucher {voucher.voucherNumber}</span>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
