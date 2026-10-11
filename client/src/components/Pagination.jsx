// Page controls under a table: "Showing 11-20 of 43", Previous / page numbers / Next, rows per page.

import { PAGE_SIZE_OPTIONS } from '../utils/constants.js';
import Icon from './Icon.jsx';

// Which page buttons to show, e.g. [1, '...', 4, 5, 6, '...', 12]
function pageNumbers(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }
  const pages = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) pages.push('start-gap');
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < total - 1) pages.push('end-gap');
  pages.push(total);
  return pages;
}

export default function Pagination({ pagination, onPageChange, onLimitChange }) {
  if (!pagination || pagination.totalItems === 0) return null;

  const { page, limit, totalItems, totalPages } = pagination;
  const first = (page - 1) * limit + 1;
  const last = Math.min(page * limit, totalItems);

  return (
    <nav className="pagination" aria-label="Voucher list pages">
      <p className="pagination-summary">
        Showing <strong>{first}</strong>-<strong>{last}</strong> of <strong>{totalItems}</strong>
      </p>

      <div className="pagination-controls">
        <button
          type="button"
          className="page-button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <Icon name="chevron-left" size={16} />
        </button>

        {pageNumbers(page, totalPages).map((item) =>
          typeof item === 'number' ? (
            <button
              key={item}
              type="button"
              className={item === page ? 'page-button page-button-active' : 'page-button'}
              onClick={() => onPageChange(item)}
              aria-label={`Page ${item}`}
              aria-current={item === page ? 'page' : undefined}
            >
              {item}
            </button>
          ) : (
            <span key={item} className="page-gap" aria-hidden="true">
              ...
            </span>
          )
        )}

        <button
          type="button"
          className="page-button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <Icon name="chevron-right" size={16} />
        </button>
      </div>

      <label className="pagination-size">
        Rows per page
        <select value={limit} onChange={(event) => onLimitChange(Number(event.target.value))}>
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
    </nav>
  );
}
