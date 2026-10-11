// A complete voucher list screen: header, filters, table, pagination, and the
// loading / error / empty states. The four list pages are thin wrappers around it:
//
//   <VoucherListView title="My Vouchers" fetchVouchers={listMyVouchers} showEmployee={false} ... />

import { useAuth } from '../hooks/useAuth.js';
import { useVoucherList } from '../hooks/useVoucherList.js';
import { ROLE_BASE_PATH } from '../utils/constants.js';
import { formatCurrency } from '../utils/formatters.js';
import { Alert, EmptyState, LoadingSpinner } from './Feedback.jsx';
import PageHeader from './PageHeader.jsx';
import Pagination from './Pagination.jsx';
import VoucherFilters from './VoucherFilters.jsx';
import VoucherTable from './VoucherTable.jsx';

export default function VoucherListView({
  title,
  subtitle,
  fetchVouchers, // one of the list functions from api/voucherApi.js
  showEmployee = true, // employees do not need a column with their own name
  showStatus = true, // hidden on lists that are already fixed to one status
  headerActions,
  notice,
  emptyTitle = 'No vouchers yet',
  emptyMessage,
  emptyAction,
}) {
  const { user } = useAuth();
  const list = useVoucherList(fetchVouchers);

  const detailsPath = (voucher) => `${ROLE_BASE_PATH[user.role]}/vouchers/${voucher.id}`;
  const hasFilters = list.activeFilterCount > 0;

  // The address asked for a page past the end of the list (for example ?page=99):
  // vouchers exist, but none of them is on this page.
  const pageOutOfRange =
    !list.loading && !list.error && list.vouchers.length === 0 && Boolean(list.pagination) && list.pagination.totalItems > 0;

  return (
    <>
      <PageHeader title={title} subtitle={subtitle}>
        {headerActions}
      </PageHeader>

      {notice}

      <VoucherFilters
        filters={list.filters}
        activeFilterCount={list.activeFilterCount}
        onApply={list.applyFilters}
        onClear={list.clearFilters}
        showEmployee={showEmployee}
        showStatus={showStatus}
        sortBy={list.sortBy}
        sortOrder={list.sortOrder}
        onSortChange={list.setSort}
      />

      <section className="card" aria-label="Vouchers">
        {list.pagination && !list.error && (
          <div className="list-summary">
            <span>
              <strong>{list.pagination.totalItems}</strong> voucher{list.pagination.totalItems === 1 ? '' : 's'}
              {hasFilters ? (list.pagination.totalItems === 1 ? ' matches the filters' : ' match the filters') : ''}
            </span>
            {list.summary && list.pagination.totalItems > 0 && (
              <span>
                Total amount: <strong>{formatCurrency(list.summary.totalAmount)}</strong>
              </span>
            )}
          </div>
        )}

        {list.error && (
          <Alert
            type="error"
            title="Could not load the vouchers"
            action={
              <button type="button" className="btn btn-secondary btn-small" onClick={list.reload}>
                Try again
              </button>
            }
          >
            {list.error}
          </Alert>
        )}

        {list.loading && <LoadingSpinner label="Loading vouchers..." />}

        {pageOutOfRange && (
          <EmptyState
            title={`Page ${list.pagination.page} does not exist`}
            message={`This list has ${list.pagination.totalPages} page${list.pagination.totalPages === 1 ? '' : 's'}.`}
            action={
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => list.changePage(list.pagination.totalPages)}
              >
                Go to page {list.pagination.totalPages}
              </button>
            }
          />
        )}

        {!list.loading && !list.error && list.vouchers.length === 0 && !pageOutOfRange && (
          <EmptyState
            title={hasFilters ? 'No vouchers match these filters' : emptyTitle}
            message={hasFilters ? 'Try changing or clearing the filters.' : emptyMessage}
            action={
              hasFilters ? (
                <button type="button" className="btn btn-secondary" onClick={list.clearFilters}>
                  Clear filters
                </button>
              ) : (
                emptyAction
              )
            }
          />
        )}

        {!list.loading && !list.error && list.vouchers.length > 0 && (
          <>
            <VoucherTable
              vouchers={list.vouchers}
              detailsPath={detailsPath}
              showEmployee={showEmployee}
              sortBy={list.sortBy}
              sortOrder={list.sortOrder}
              onSort={list.toggleSort}
            />
            <Pagination pagination={list.pagination} onPageChange={list.changePage} onLimitChange={list.changeLimit} />
          </>
        )}
      </section>
    </>
  );
}
