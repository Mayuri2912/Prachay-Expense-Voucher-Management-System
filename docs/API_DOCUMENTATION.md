# REST API Documentation

Base URL (local development): `http://localhost:5000/api`

- [Conventions](#conventions)
- [Authentication](#authentication)
- [Vouchers - lists](#vouchers---lists)
- [Vouchers - details and signatures](#vouchers---details-and-signatures)
- [Vouchers - employee actions](#vouchers---employee-actions)
- [Vouchers - director actions](#vouchers---director-actions)
- [Dashboards](#dashboards)
- [Permission matrix](#permission-matrix)
- [Trying the API from PowerShell](#trying-the-api-from-powershell)

---

## Conventions

### Authentication header

Every endpoint except `GET /health` and `POST /auth/login` needs a token:

```
Authorization: Bearer <token>
```

### Response format

Success:

```json
{
  "success": true,
  "message": "Voucher saved as draft.",
  "data": { },
  "pagination": { }
}
```

`message` and `pagination` are only present where they make sense.

Error:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "amount": "Amount must be greater than zero.",
    "expenseDate": "Expense date is required."
  }
}
```

`errors` (one message per field) is only present for validation problems.

### Status codes

| Code | Meaning in this API |
|---|---|
| 200 | Success |
| 201 | Voucher created |
| 400 | Invalid input: a field, a query parameter, an id or an uploaded file |
| 401 | No token, an invalid token or an expired token |
| 403 | Logged in, but this role (or this employee) is not allowed |
| 404 | The voucher, signature or route does not exist |
| 409 | The action is not allowed in the voucher's current status (for example editing a submitted voucher, approving twice) |
| 413 | JSON body larger than 100 kB |
| 429 | Too many login attempts (20 per 15 minutes) |
| 500 | Unexpected server error. Details are logged on the server only. |

### Data formats

| Kind | Format | Example |
|---|---|---|
| Plain date | `YYYY-MM-DD` | `"2026-10-08"` |
| Moment in time | ISO 8601, UTC | `"2026-10-10T15:19:42.000Z"` |
| Money | String with 2 decimals (exact `DECIMAL`) | `"1250.75"` |
| Status | `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED` | |
| Role | `EMPLOYEE`, `DIRECTOR`, `ACCOUNTS` | |

### The voucher object

Returned by every voucher endpoint.

```json
{
  "id": 15,
  "voucherNumber": "EV-2026-00015",
  "voucherDate": "2026-10-10",
  "expenseDate": "2026-10-08",
  "department": "Sales",
  "expenseTitle": "Airport taxi for client pickup",
  "expenseCategory": "Travel",
  "expenseDescription": "Taxi from the office to the airport and back.",
  "amount": "1250.75",
  "status": "APPROVED",
  "employee": {
    "id": 3,
    "name": "Aarav Sharma",
    "employeeCode": "EMP-101",
    "email": "employee1@prachay.test"
  },
  "hasEmployeeSignature": true,
  "hasDirectorSignature": true,
  "submittedAt": "2026-10-10T15:19:42.000Z",
  "approvedAt": "2026-10-10T15:21:07.000Z",
  "rejectedAt": null,
  "rejectionReason": null,
  "reviewedBy": { "id": 1, "name": "Vikram Deshmukh" },
  "createdAt": "2026-10-10T15:18:30.000Z",
  "updatedAt": "2026-10-10T15:21:07.000Z"
}
```

File paths are never returned. `hasEmployeeSignature` / `hasDirectorSignature` say whether an image exists;
the image itself comes from the [signature endpoint](#get-vouchersidsignaturestype).

### Allowed values

**Departments:** Administration, Compliance, Finance, Human Resources, Information Technology, Marketing,
Operations, Research, Sales

**Expense categories:** Travel, Accommodation, Meals, Local Conveyance, Client Meeting, Office Supplies,
Software, Training, Internet and Phone, Miscellaneous

---

## Authentication

### GET /health

Public. Confirms that the API is running.

```json
{ "success": true, "data": { "status": "ok", "time": "2026-10-10T15:00:00.000Z" } }
```

### POST /auth/login

Public. Rate-limited to 20 attempts per 15 minutes per address.

Request body (JSON):

| Field | Type | Rules |
|---|---|---|
| `email` | string | Required, valid email |
| `password` | string | Required, at most 72 characters |

```json
{ "email": "employee1@prachay.test", "password": "<password>" }
```

Response `200`:

```json
{
  "success": true,
  "message": "Logged in successfully.",
  "data": {
    "token": "<jwt>",
    "expiresIn": "8h",
    "user": {
      "id": 3,
      "fullName": "Aarav Sharma",
      "email": "employee1@prachay.test",
      "role": "EMPLOYEE",
      "employeeCode": "EMP-101",
      "department": "Sales"
    }
  }
}
```

| Error | When |
|---|---|
| 400 | Email or password missing / malformed (`errors.email`, `errors.password`) |
| 401 | `Invalid email or password.` - the same message for an unknown email and a wrong password |
| 403 | The account has been disabled |
| 429 | Too many attempts |

### GET /auth/me

Any logged-in user. Returns the user the token belongs to. Used by the frontend after a page refresh.

```json
{ "success": true, "data": { "user": { "id": 3, "fullName": "Aarav Sharma", "email": "employee1@prachay.test", "role": "EMPLOYEE", "employeeCode": "EMP-101", "department": "Sales" } } }
```

---

## Vouchers - lists

Four endpoints share the same query parameters and the same response shape.

| Endpoint | Role | Returns |
|---|---|---|
| `GET /vouchers/my` | Employee | Only the caller's own vouchers |
| `GET /vouchers` | Director, Accounts | Every voucher in the organisation |
| `GET /vouchers/pending` | Director | Vouchers with status `PENDING_APPROVAL` |
| `GET /vouchers/approved` | Accounts, Director | Vouchers with status `APPROVED` (ready for reimbursement) |

### Query parameters (all optional)

| Parameter | Type | Meaning |
|---|---|---|
| `voucherNumber` | text, up to 30 chars | Search: voucher number **contains** this text |
| `employeeName` | text, up to 100 chars | Search: employee name **contains** this text (ignored on `/vouchers/my`) |
| `department` | one of the departments | Exact match |
| `category` | one of the categories | Exact match |
| `status` | a status | Exact match (ignored on `/pending` and `/approved`, where the status is fixed) |
| `dateFrom` | `YYYY-MM-DD` | Expense date on or after |
| `dateTo` | `YYYY-MM-DD` | Expense date on or before |
| `minAmount` | number, up to 2 decimals | Amount at least |
| `maxAmount` | number, up to 2 decimals | Amount at most |
| `sortBy` | see below | Default `createdAt` |
| `sortOrder` | `asc` or `desc` | Default `desc` |
| `page` | whole number ≥ 1 | Default `1` |
| `limit` | whole number 1-100 | Default `10` |

`sortBy` values: `voucherNumber`, `voucherDate`, `expenseDate`, `employeeName`, `department`, `category`,
`title`, `amount`, `status`, `createdAt`, `updatedAt`.

Filters are combined with AND. An invalid value returns `400` with a message per parameter, for example:

```json
{ "success": false, "message": "Validation failed", "errors": { "limit": "limit must be a whole number between 1 and 100." } }
```

### Example

```
GET /api/vouchers?department=Sales&status=APPROVED&minAmount=1000&sortBy=amount&sortOrder=desc&page=1&limit=10
```

Response `200`:

```json
{
  "success": true,
  "data": {
    "vouchers": [ { "id": 1, "voucherNumber": "EV-2026-00001", "...": "..." } ],
    "summary": { "totalAmount": "7210.50" }
  },
  "pagination": { "page": 1, "limit": 10, "totalItems": 2, "totalPages": 1 }
}
```

`summary.totalAmount` is the sum of **all** vouchers matching the filters, not only the current page.

| Error | When |
|---|---|
| 400 | An invalid query parameter |
| 401 | Not logged in |
| 403 | The role may not use this list (for example an employee calling `GET /vouchers`) |

---

## Vouchers - details and signatures

### GET /vouchers/:id

Owner (employee), Director, Accounts.

Response `200`:

```json
{
  "success": true,
  "data": {
    "voucher": { "id": 15, "voucherNumber": "EV-2026-00015", "...": "..." },
    "history": [
      {
        "id": 41,
        "action": "CREATED",
        "fromStatus": null,
        "toStatus": "DRAFT",
        "remarks": null,
        "createdAt": "2026-10-10T15:18:30.000Z",
        "performedBy": { "id": 3, "name": "Aarav Sharma", "role": "EMPLOYEE" }
      },
      {
        "id": 42,
        "action": "SUBMITTED",
        "fromStatus": "DRAFT",
        "toStatus": "PENDING_APPROVAL",
        "remarks": null,
        "createdAt": "2026-10-10T15:19:42.000Z",
        "performedBy": { "id": 3, "name": "Aarav Sharma", "role": "EMPLOYEE" }
      }
    ]
  }
}
```

History actions: `CREATED`, `UPDATED`, `SUBMITTED`, `APPROVED`, `REJECTED` (for a rejection, `remarks` holds the reason).

| Error | When |
|---|---|
| 400 | `:id` is not a positive whole number |
| 403 | An employee asking for a voucher that belongs to someone else |
| 404 | No voucher with this id |

### GET /vouchers/:id/signatures/:type

Owner (employee), Director, Accounts. `:type` is `employee` or `director`.

Returns the image itself (`Content-Type: image/png`, `image/jpeg` or `image/webp`) with
`Cache-Control: private, no-store`. The same permission check as `GET /vouchers/:id` is applied first -
signature files are not reachable any other way.

| Error | When |
|---|---|
| 400 | `:type` is not `employee` or `director`, or `:id` is invalid |
| 403 | An employee asking for another employee's voucher |
| 404 | The voucher does not exist, or it has no signature of this type |

---

## Vouchers - employee actions

### POST /vouchers

Employee. Creates a voucher. It **always** starts as `DRAFT`.

Body: `multipart/form-data` (or JSON when no file is sent).

| Field | Required | Rules |
|---|---|---|
| `department` | yes | One of the departments |
| `expenseTitle` | yes | 3-150 characters |
| `expenseCategory` | yes | One of the categories |
| `expenseDate` | yes | `YYYY-MM-DD`, not in the future, not after `voucherDate` |
| `amount` | yes | Greater than zero, at most 2 decimals, at most 10 digits before the decimal point |
| `voucherDate` | no | `YYYY-MM-DD`, not in the future. Defaults to today. |
| `expenseDescription` | no | Up to 1000 characters |
| `signature` | no | Image file: JPEG, PNG or WebP, up to 2 MB |

Anything else in the request (`status`, `voucherNumber`, `employeeId` …) is ignored. The voucher number is
generated by the server and the owner is always the logged-in employee.

Response `201`: `{ "success": true, "message": "Voucher saved as draft.", "data": { "voucher": { }, "history": [ ] } }`

| Error | When |
|---|---|
| 400 | A field is missing or invalid, or the file is not an acceptable image |
| 403 | The caller is not an employee |

### PUT /vouchers/:id

Employee, **own voucher, `DRAFT` only**. Same fields and rules as `POST /vouchers`.
Sending a new `signature` file replaces the saved one; sending none keeps it.

Response `200`: `{ "success": true, "message": "Draft voucher updated.", "data": { "voucher": { }, "history": [ ] } }`

| Error | When |
|---|---|
| 400 | Invalid input |
| 403 | Not an employee, or not the owner |
| 404 | No voucher with this id |
| 409 | The voucher is no longer a draft |

### DELETE /vouchers/:id

Employee, **own voucher, `DRAFT` only**. Deletes the voucher, its history and its signature file.

Response `200`: `{ "success": true, "message": "Draft voucher EV-2026-00016 deleted.", "data": { "id": 16, "voucherNumber": "EV-2026-00016" } }`

| Error | When |
|---|---|
| 403 | Not an employee, or not the owner |
| 404 | No voucher with this id |
| 409 | The voucher is no longer a draft |

### POST /vouchers/:id/submit

Employee, **own voucher, `DRAFT` only**. Moves the voucher to `PENDING_APPROVAL`.

Body: `multipart/form-data` with an optional `signature` file.
The employee's signature is **mandatory**: it must already be saved on the draft, or be sent with this request.

Response `200`: `{ "success": true, "message": "Voucher submitted for approval.", "data": { "voucher": { }, "history": [ ] } }`

| Error | When |
|---|---|
| 400 | No signature on the draft and none uploaded (`errors.signature`), or the file is not an acceptable image |
| 403 | Not an employee, or not the owner |
| 404 | No voucher with this id |
| 409 | The voucher has already been submitted |

---

## Vouchers - director actions

Only the approval columns are written by these endpoints. The expense details entered by the employee are
never part of the update, so they cannot be changed here - extra fields in the request are ignored.

### POST /vouchers/:id/approve

Director. `PENDING_APPROVAL` → `APPROVED`.

Body: `multipart/form-data` with a **required** `signature` file (JPEG, PNG or WebP, up to 2 MB).

Response `200`: `{ "success": true, "message": "Voucher approved.", "data": { "voucher": { }, "history": [ ] } }`

The voucher now has `status: "APPROVED"`, `approvedAt`, `reviewedBy` and `hasDirectorSignature: true`.

| Error | When |
|---|---|
| 400 | No signature file (`errors.signature`), or the file is not an acceptable image |
| 403 | The caller is not the Director |
| 404 | No voucher with this id |
| 409 | The voucher is a draft, or has already been approved or rejected |

### POST /vouchers/:id/reject

Director. `PENDING_APPROVAL` → `REJECTED`.

Body (JSON):

| Field | Required | Rules |
|---|---|---|
| `reason` | yes | 3-500 characters |

```json
{ "reason": "The receipt is missing. Please attach it and raise a new voucher." }
```

Response `200`: `{ "success": true, "message": "Voucher rejected.", "data": { "voucher": { }, "history": [ ] } }`

The voucher now has `status: "REJECTED"`, `rejectedAt`, `rejectionReason` and `reviewedBy`.

| Error | When |
|---|---|
| 400 | `reason` is missing, blank, too short or too long (`errors.reason`) |
| 403 | The caller is not the Director |
| 404 | No voucher with this id |
| 409 | The voucher is a draft, or has already been approved or rejected |

---

## Dashboards

All numbers are calculated from the database when the endpoint is called.

### GET /dashboard/employee

Employee. Statistics for the caller's own vouchers only.

```json
{
  "success": true,
  "data": {
    "totalVouchers": 5,
    "draftVouchers": 1,
    "pendingApproval": 1,
    "approvedVouchers": 2,
    "rejectedVouchers": 1,
    "totalAmountClaimed": "15390.50",
    "approvedAmount": "7210.50",
    "pendingAmount": "7200.00",
    "recentVouchers": [ { "id": 5, "voucherNumber": "EV-2026-00005", "...": "..." } ]
  }
}
```

`totalAmountClaimed` = pending + approved + rejected vouchers (drafts are not counted).
`recentVouchers` = the 5 most recently updated.

### GET /dashboard/director

Director.

```json
{
  "success": true,
  "data": {
    "pendingApprovalCount": 4,
    "totalPendingAmount": "24660.75",
    "approvedToday": 1,
    "rejectedToday": 1,
    "recentActivity": [
      {
        "id": 22,
        "action": "REJECTED",
        "remarks": "Home broadband is already covered by the monthly remote-work allowance.",
        "createdAt": "2026-10-10T14:55:00.000Z",
        "performedByName": "Vikram Deshmukh",
        "voucher": {
          "id": 9,
          "voucherNumber": "EV-2026-00009",
          "expenseTitle": "Home broadband bill",
          "amount": "1179.00",
          "status": "REJECTED",
          "employeeName": "Priya Nair"
        }
      }
    ],
    "oldestPendingVouchers": [ { "id": 13, "voucherNumber": "EV-2026-00013", "...": "..." } ]
  }
}
```

"Today" is the current day in the office time zone (`APP_TIMEZONE_OFFSET`).
`recentActivity` = the last 8 submissions and decisions. `oldestPendingVouchers` = the 5 waiting longest.

### GET /dashboard/accounts

Accounts.

```json
{
  "success": true,
  "data": {
    "totalVouchers": 14,
    "draftVouchers": 3,
    "pendingApproval": 4,
    "approvedVouchers": 5,
    "rejectedVouchers": 2,
    "totalApprovedAmount": "27289.50",
    "pendingAmount": "24660.75",
    "recentApprovedVouchers": [ { "id": 6, "voucherNumber": "EV-2026-00006", "...": "..." } ]
  }
}
```

`recentApprovedVouchers` = the 6 most recently approved.

Each dashboard returns `403` to the other two roles.

---

## Permission matrix

| Endpoint | Employee | Director | Accounts |
|---|:---:|:---:|:---:|
| `POST /auth/login`, `GET /auth/me` | ✔ | ✔ | ✔ |
| `GET /vouchers/my` | ✔ | ✘ | ✘ |
| `GET /vouchers` | ✘ | ✔ | ✔ |
| `GET /vouchers/pending` | ✘ | ✔ | ✘ |
| `GET /vouchers/approved` | ✘ | ✔ | ✔ |
| `GET /vouchers/:id` | own only | ✔ | ✔ |
| `GET /vouchers/:id/signatures/:type` | own only | ✔ | ✔ |
| `POST /vouchers` | ✔ | ✘ | ✘ |
| `PUT /vouchers/:id` | own draft | ✘ | ✘ |
| `DELETE /vouchers/:id` | own draft | ✘ | ✘ |
| `POST /vouchers/:id/submit` | own draft | ✘ | ✘ |
| `POST /vouchers/:id/approve` | ✘ | pending only | ✘ |
| `POST /vouchers/:id/reject` | ✘ | pending only | ✘ |
| `GET /dashboard/employee` | ✔ | ✘ | ✘ |
| `GET /dashboard/director` | ✘ | ✔ | ✘ |
| `GET /dashboard/accounts` | ✘ | ✘ | ✔ |

✘ = HTTP 403. All of this is enforced in `server/src/routes/*.js` (roles) and
`server/src/services/voucherService.js` (ownership and status).

---

## Trying the API from PowerShell

Start the backend first (`npm run server`). The password is the demo password from the README.

```powershell
# 1. Log in and keep the token
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:5000/api/auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"employee1@prachay.test","password":"<demo password>"}'
$headers = @{ Authorization = "Bearer $($login.data.token)" }

# 2. My vouchers, largest amount first
(Invoke-RestMethod -Uri "http://localhost:5000/api/vouchers/my?sortBy=amount&sortOrder=desc" -Headers $headers).data.vouchers |
  Select-Object voucherNumber, expenseTitle, amount, status

# 3. Create a draft
$body = @{
  department      = "Sales"
  expenseTitle    = "Parking charges"
  expenseCategory = "Local Conveyance"
  expenseDate     = (Get-Date).AddDays(-1).ToString("yyyy-MM-dd")
  amount          = "150"
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:5000/api/vouchers" -Headers $headers -ContentType "application/json" -Body $body

# 4. An employee is refused by the Director's list (HTTP 403)
Invoke-RestMethod -Uri "http://localhost:5000/api/vouchers/pending" -Headers $headers
```
