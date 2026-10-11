// Shared logic for every voucher list screen (My Vouchers, All Vouchers,
// Pending Approvals, Ready for Reimbursement).
//
// The filters, the sort order and the page number are stored in the URL, e.g.
//   /director/vouchers?status=APPROVED&sortBy=amount&sortOrder=desc&page=2
// so a refresh or the browser's Back button keeps them. Every change to the URL
// triggers a new request - the SERVER does the searching, sorting and paging.

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getErrorMessage } from '../api/axiosClient.js';
import { DEFAULT_PAGE_SIZE } from '../utils/constants.js';

export const FILTER_KEYS = [
  'voucherNumber',
  'employeeName',
  'department',
  'category',
  'status',
  'dateFrom',
  'dateTo',
  'minAmount',
  'maxAmount',
];

export function useVoucherList(fetchVouchers) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [vouchers, setVouchers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadCount, setReloadCount] = useState(0);

  const queryString = searchParams.toString();

  useEffect(() => {
    let cancelled = false; // ignore the answer if the user has already moved on
    setLoading(true);
    setError('');

    const params = Object.fromEntries(new URLSearchParams(queryString));
    if (!params.limit) params.limit = DEFAULT_PAGE_SIZE;

    fetchVouchers(params)
      .then((result) => {
        if (cancelled) return;
        setVouchers(result.vouchers);
        setPagination(result.pagination);
        setSummary(result.summary);
      })
      .catch((requestError) => {
        if (cancelled) return;
        setVouchers([]);
        setPagination(null);
        setSummary(null);
        setError(getErrorMessage(requestError, 'Could not load the vouchers.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchVouchers, queryString, reloadCount]);

  // Changes some URL parameters and leaves the others alone. Empty values are removed.
  const updateParams = useCallback(
    (changes) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(changes).forEach(([key, value]) => {
        if (value === '' || value === null || value === undefined) {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      });
      setSearchParams(next);
    },
    [searchParams, setSearchParams]
  );

  // The filters currently in the URL, as a plain object (missing ones are '').
  const filters = Object.fromEntries(FILTER_KEYS.map((key) => [key, searchParams.get(key) || '']));
  const activeFilterCount = FILTER_KEYS.filter((key) => searchParams.get(key)).length;

  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';

  return {
    vouchers,
    pagination,
    summary,
    loading,
    error,
    filters,
    activeFilterCount,
    sortBy,
    sortOrder,
    limit: Number(searchParams.get('limit')) || DEFAULT_PAGE_SIZE,

    // New filters always start again from page 1.
    applyFilters: (newFilters) => updateParams({ ...newFilters, page: '' }),
    clearFilters: () => updateParams({ ...Object.fromEntries(FILTER_KEYS.map((key) => [key, ''])), page: '' }),

    // Clicking the same column again flips the direction.
    toggleSort: (column) =>
      updateParams({
        sortBy: column,
        sortOrder: sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc',
        page: '',
      }),
    setSort: (column, order) => updateParams({ sortBy: column, sortOrder: order, page: '' }),

    changePage: (page) => updateParams({ page: page > 1 ? page : '' }),
    changeLimit: (limit) => updateParams({ limit, page: '' }),
    reload: () => setReloadCount((count) => count + 1),
  };
}
