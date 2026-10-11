# Testing

Two layers of testing are used:

1. **Automated API tests** - 69 tests that call the real API over HTTP against a real MySQL database.
2. **Manual checklist** - the user interface, walked through in a browser for each role.

---

## 1. Automated API tests

### How to run

```powershell
cd D:\PrachayExpenseVoucherSystem
npm test
```

Requirements: MySQL is running and `.env` contains working database credentials.

### What happens

- `server/tests/helpers.js` creates a **separate database** called `<DB_NAME>_test`
  (for example `prachay_expense_vouchers_test`), builds the tables from `database/schema.sql`
  and adds five test users (2 employees, 1 director, 1 accounts user, 1 disabled account).
- The Express app is started on a free port and every test sends real HTTP requests to it.
- Uploaded files go to a temporary folder.
- At the end the test database and the temporary folder are deleted.

**Your real database and uploads are never touched.** The helper refuses to run unless the database name ends
with `_test`.

### Last recorded result

| | |
|---|---|
| Date | 10 October 2026 |
| Environment | Windows 11, Node.js 22.19, MySQL 8.0.34 |
| Result | **69 passed, 0 failed, 0 skipped** (about 2.5 seconds) |

### Required test cases and where they are covered

The codes in square brackets appear in the test names in `server/tests/api.test.js`.

| Code | Requirement | Tests |
|---|---|---|
| T1 | Valid login works | Logs in with a valid email and password; returns the current user for a valid token |
| T2 | Invalid login is rejected | Wrong password; unknown email (same message); missing or malformed fields; disabled account |
| T3 | An employee can create a draft voucher | Creates a draft with a generated number; ignores status / number / owner sent by the client |
| T4 | An employee can edit and delete their own draft | Edits own draft; validates edits; deletes own draft |
| T5 | An employee cannot view another employee's voucher | Cannot view, edit, delete or submit it; cannot fetch its signature; "my vouchers" is always scoped; cannot use the organisation-wide lists |
| T6 | An employee cannot edit a submitted voucher | Edit / delete / re-submit of pending, approved and rejected vouchers all return 409 |
| T7 | Cannot submit without an employee signature | Submit without a signature returns 400; fake, wrong-type and oversized files are rejected |
| T8 | A Director can see pending vouchers | Pending list contains only pending vouchers |
| T9 | A Director cannot approve without a signature | No body, JSON only, empty form, wrong field name, fake image - all 400 |
| T10 | A Director cannot reject without a reason | Missing, empty and blank reasons - all 400 |
| T11 | A Director cannot edit the employee's details | PUT / DELETE / POST return 403; extra fields in the approve request are ignored |
| T12 | Accounts can view all vouchers | List, details, employee signature and director signature |
| T13 | Accounts cannot create, edit, delete, approve or reject | Each returns 403 and the voucher is unchanged |
| T14 | Voucher numbers are unique | 12 vouchers created at the same moment get 12 different numbers; the UNIQUE key rejects a duplicate |
| T15 | Dashboard calculations are correct | Employee, Director and Accounts dashboards are compared with values computed from the voucher lists; "today" ignores older decisions |
| T16 | Search and filtering work | Voucher number, employee name, department, category, status, date range, amount range, combinations, sorting, pagination, totals |
| T17 | Invalid amounts and missing fields are rejected | Missing fields; amounts `0`, `-25`, `abc`, `10.999`, too large, empty; invalid dates, departments and categories |
| T18 | Unauthorised API calls are blocked | Every protected endpoint without a token; made-up, tampered, wrongly signed and expired tokens; a token that lies about the role; cross-role dashboards |

### Additional automated checks

- Passwords are stored as bcrypt hashes.
- A draft's signature is saved and served back to its owner, byte for byte.
- A draft that already has a signature can be submitted without a new upload.
- An employee cannot approve or reject, not even their own voucher.
- A voucher cannot be approved or rejected twice; a draft cannot be approved or rejected.
- **Two approvals sent at the same moment: exactly one succeeds**, and only one history row is written.
- The rejection reason is visible to the employee.
- The "approved" list cannot be switched to another status through the query string.
- Invalid query parameters (`status=DONE`, `limit=1000`, `sortBy=password_hash`, …) return 400.
- SQL-injection text and `%` in a search box are treated as plain text.
- File paths are never returned by the API, and uploads cannot be opened as static files.
- Invalid ids (`abc`, `0`, `-1`, `1.5`, …) return 400; unknown ids return 404.
- Unknown routes and broken JSON return clean JSON errors without internal details.

---

## 2. Manual checklist (user interface)

Start the backend and the frontend, open <http://localhost:5173>, and log in with the demo accounts from the README.
Tick each box as you go. Run `npm run db:reset` first if you want to start from the original demo data.

### Login and navigation

- [ ] The login page appears at <http://localhost:5173> when not logged in.
- [ ] A wrong password shows "Invalid email or password."
- [ ] Empty fields show "Email is required." / "Password is required."
- [ ] Each role lands on its own dashboard after logging in.
- [ ] The sidebar only shows the pages of the current role.
- [ ] Refreshing the page (F5) keeps you logged in.
- [ ] "Log out" returns to the login page; the Back button does not bring the dashboard back.
- [ ] "My Profile" shows the name, email, role, employee ID and department.

### Employee (`employee1@prachay.test`)

- [ ] The dashboard shows six cards; the numbers match "My Vouchers".
- [ ] **New Voucher**: pressing "Submit for approval" on an empty form highlights the required fields and the signature.
- [ ] An amount of `0` or `-5` is rejected; a future expense date is rejected.
- [ ] "Save as draft" creates the voucher with a number like `EV-2026-00015` and status **Draft**.
- [ ] The draft shows **Edit**, **Delete** and **Submit for approval**.
- [ ] **Edit**: the form is pre-filled; saving shows the new values and adds "Draft edited" to the history.
- [ ] **Submit for approval** without a signature is blocked; choosing a text file as the signature is rejected.
- [ ] With a signature image the voucher is submitted and the **confirmation screen** appears.
- [ ] The submitted voucher is **Pending Approval**, shows the signature and has no Edit / Delete buttons.
- [ ] The voucher page shows a **Workflow progress** strip (Draft → Submitted → Pending Approval → Approved or Rejected): a draft highlights "Draft"; after submitting, "Submitted" is ticked with its date and "Pending Approval" is highlighted; after a decision the last step reads "Approved" or "Rejected".
- [ ] Opening `/employee/vouchers/<id>/edit` for a submitted voucher says it can no longer be edited.
- [ ] **Delete** on another draft asks for confirmation and removes it from the list.
- [ ] A rejected voucher (`EV-…-00004`) shows the Director's reason in a red box.
- [ ] **My Vouchers**: filters, sorting (click a column header) and paging work; "Clear filters" resets them.
- [ ] "Clear filters" also empties values that were typed but not applied (for example after entering a minimum amount greater than the maximum).
- [ ] Opening a list with a page number past the end, e.g. `/employee/vouchers?page=99`, says the page does not exist and offers a button to the last page.
- [ ] Opening another employee's voucher, e.g. `/employee/vouchers/7`, shows "You do not have access to this voucher".
- [ ] Opening `/director/pending` or `/accounts/vouchers` shows "Access denied".

### Director (`director@prachay.test`)

- [ ] The dashboard shows pending count, approved today, rejected today, total pending amount and recent activity.
- [ ] **Pending Approvals** lists only vouchers that are Pending Approval.
- [ ] A pending voucher shows **Approve** and **Reject**; no field of the voucher can be edited.
- [ ] **Approve** without a signature is blocked ("Upload your signature to approve the voucher.").
- [ ] **Approve** with a signature: status becomes **Approved**, both signatures are visible, the buttons disappear.
- [ ] **Reject** without a reason is blocked ("A rejection reason is required.").
- [ ] **Reject** with a reason: status becomes **Rejected** and the reason is shown.
- [ ] The dashboard numbers change after each decision.
- [ ] **All Vouchers**: search by voucher number and employee name; filter by department, category, status, date range and amount range; sort; change page.
- [ ] A draft or an already decided voucher shows no Approve / Reject buttons.

### Accounts Team (`accounts@prachay.test`)

- [ ] The dashboard shows total, pending approval, approved, rejected, total approved amount and recently approved vouchers.
- [ ] The note on the dashboard explains that only approved vouchers are ready for reimbursement.
- [ ] **Ready for Reimbursement** lists only Approved vouchers.
- [ ] **All Vouchers** lists every voucher; search, filters, sorting and paging work.
- [ ] An approved voucher shows the employee's **and** the Director's signature.
- [ ] No voucher shows Edit, Delete, Submit, Approve or Reject - only "Print / Save as PDF".
- [ ] **Print / Save as PDF** opens the print dialog with only the voucher (no sidebar, no buttons).

### Layout and feedback

- [ ] Desktop (wider than 1024 px): the sidebar is always visible.
- [ ] Tablet / phone: the menu button opens the sidebar; tables turn into cards; filters fold behind a button; nothing scrolls sideways.
- [ ] Tablet / phone, keyboard: opening the menu moves the focus into it, Tab walks through its links, and Escape closes it and returns the focus to the menu button.
- [ ] A spinner appears while data loads; a green or red notification appears after each action.
- [ ] Stopping the backend and reloading a page shows "Cannot reach the server" with a "Try again" button.
- [ ] An unknown address such as `/abc` shows "Page not found".
- [ ] All forms can be completed with the keyboard only (Tab, Enter, Escape closes dialogs).

### What was walked through during development

On 10 October 2026 the following were exercised in a Chromium-based browser against the running API and a
MySQL 8.0.34 database, and behaved as described above:

- Login: wrong password, then each of the three roles; session kept across page reloads; an invalid token
  returns to the login page with "Your session has expired".
- Employee: dashboard figures; form validation; create a draft; submit blocked without a signature; submit with a
  signature; confirmation screen; read-only view afterwards; edit a draft (saved signature shown); delete a draft;
  filters, sorting and paging on "My Vouchers".
- Direct addresses as an employee: another role's pages, another employee's voucher, the edit page of a
  submitted voucher, an unknown address.
- Director: dashboard figures; pending list; approve blocked without a signature; approve with a signature;
  reject blocked without a reason; reject with a reason.
- Accounts: dashboard figures; approved voucher with both signatures; pending voucher marked as not ready;
  "Ready for Reimbursement"; combined filters on "All Vouchers".
- Layout at 1366 px and at 375 px (phone): menu button, card-style table, folded filters, no sideways scrolling.

**Not verified:** printing to a real printer or PDF file (the print styles were only previewed on screen),
browsers other than Chromium, and screen-reader behaviour.
