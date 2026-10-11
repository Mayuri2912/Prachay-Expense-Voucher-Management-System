// Search and filter form shown above every voucher list.
//
// The user fills in the fields and presses "Apply filters" (or Enter). The values
// then go into the URL and the server returns the matching vouchers - nothing is
// filtered inside the browser.

import { useEffect, useState } from 'react';
import { DEPARTMENTS, EXPENSE_CATEGORIES, SORT_OPTIONS, STATUS_LABELS } from '../utils/constants.js';
import Icon from './Icon.jsx';

export default function VoucherFilters({
  filters, // the filters currently applied (from the URL)
  activeFilterCount,
  onApply,
  onClear,
  showEmployee = true,
  showStatus = true,
  sortBy,
  sortOrder,
  onSortChange,
}) {
  const [form, setForm] = useState(filters);
  const [expanded, setExpanded] = useState(false); // only matters on small screens
  const [error, setError] = useState('');

  // Keep the form in step with the URL (Back button, "Clear filters", links from the dashboard).
  const filtersKey = JSON.stringify(filters);
  useEffect(() => {
    setForm(JSON.parse(filtersKey));
    setError('');
  }, [filtersKey]);

  function setField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (form.dateFrom && form.dateTo && form.dateFrom > form.dateTo) {
      setError('The "from" date cannot be later than the "to" date.');
      return;
    }
    if (form.minAmount && form.maxAmount && Number(form.minAmount) > Number(form.maxAmount)) {
      setError('The minimum amount cannot be greater than the maximum amount.');
      return;
    }

    setError('');
    onApply({
      ...form,
      voucherNumber: form.voucherNumber.trim(),
      employeeName: showEmployee ? form.employeeName.trim() : '',
      status: showStatus ? form.status : '',
    });
  }

  // "Clear filters" must also work for values that were typed but never applied,
  // for example after the "minimum is greater than maximum" message.
  const formHasInput = Object.values(form).some((value) => value !== '');

  function handleClear() {
    setForm(Object.fromEntries(Object.keys(form).map((key) => [key, ''])));
    setError('');
    if (activeFilterCount > 0) onClear(); // also removes the applied filters from the URL
  }

  const sortOptions = showEmployee ? SORT_OPTIONS : SORT_OPTIONS.filter((option) => option.value !== 'employeeName');

  return (
    <section className="card filter-card" aria-label="Search and filter vouchers">
      <div className="filter-toolbar">
        {/* Large screens show a heading; small screens show a button that opens the form. */}
        <h2 className="filter-title">
          Search &amp; filters
          {activeFilterCount > 0 && <span className="count-pill">{activeFilterCount}</span>}
        </h2>
        <button
          type="button"
          className="btn btn-secondary filter-toggle"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-controls="voucher-filter-form"
        >
          <Icon name="filter" size={16} />
          Search &amp; filters
          {activeFilterCount > 0 && <span className="count-pill">{activeFilterCount}</span>}
        </button>

        <div className="sort-controls">
          <label htmlFor="sort-by">Sort by</label>
          <select id="sort-by" value={sortBy} onChange={(event) => onSortChange(event.target.value, sortOrder)}>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Sort direction"
            value={sortOrder}
            onChange={(event) => onSortChange(sortBy, event.target.value)}
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
      </div>

      <form
        id="voucher-filter-form"
        className={expanded ? 'filter-form filter-form-open' : 'filter-form'}
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="filter-grid">
          <div className="form-field">
            <label htmlFor="filter-voucher-number" className="form-label">
              Voucher number
            </label>
            <input
              id="filter-voucher-number"
              name="voucherNumber"
              type="search"
              placeholder="e.g. EV-2026-00012"
              value={form.voucherNumber}
              onChange={setField}
              maxLength={30}
            />
          </div>

          {showEmployee && (
            <div className="form-field">
              <label htmlFor="filter-employee" className="form-label">
                Employee name
              </label>
              <input
                id="filter-employee"
                name="employeeName"
                type="search"
                placeholder="e.g. Priya"
                value={form.employeeName}
                onChange={setField}
                maxLength={100}
              />
            </div>
          )}

          <div className="form-field">
            <label htmlFor="filter-department" className="form-label">
              Department
            </label>
            <select id="filter-department" name="department" value={form.department} onChange={setField}>
              <option value="">All departments</option>
              {DEPARTMENTS.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="filter-category" className="form-label">
              Expense category
            </label>
            <select id="filter-category" name="category" value={form.category} onChange={setField}>
              <option value="">All categories</option>
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {showStatus && (
            <div className="form-field">
              <label htmlFor="filter-status" className="form-label">
                Status
              </label>
              <select id="filter-status" name="status" value={form.status} onChange={setField}>
                <option value="">All statuses</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-field">
            <label htmlFor="filter-date-from" className="form-label">
              Expense date from
            </label>
            <input id="filter-date-from" name="dateFrom" type="date" value={form.dateFrom} onChange={setField} />
          </div>

          <div className="form-field">
            <label htmlFor="filter-date-to" className="form-label">
              Expense date to
            </label>
            <input id="filter-date-to" name="dateTo" type="date" value={form.dateTo} onChange={setField} />
          </div>

          {/* Amount range: the two fields share one cell of the grid. */}
          <div className="filter-pair">
            <div className="form-field">
              <label htmlFor="filter-min-amount" className="form-label">
                Min amount (₹)
              </label>
              <input
                id="filter-min-amount"
                name="minAmount"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
                value={form.minAmount}
                onChange={setField}
              />
            </div>

            <div className="form-field">
              <label htmlFor="filter-max-amount" className="form-label">
                Max amount (₹)
              </label>
              <input
                id="filter-max-amount"
                name="maxAmount"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="Any"
                value={form.maxAmount}
                onChange={setField}
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="filter-actions">
          <button type="submit" className="btn btn-primary">
            <Icon name="filter" size={16} />
            Apply filters
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleClear}
            disabled={activeFilterCount === 0 && !formHasInput}
          >
            Clear filters
          </button>
        </div>
      </form>
    </section>
  );
}
