// End-to-end API tests. They run against a real MySQL test database:
//
//   npm test            (from the project root or from /server)
//
// The numbers in the test names ("[T5]") refer to the checklist in docs/TESTING.md.

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import jwt from 'jsonwebtoken';
import {
  PNG_BYTES,
  TEST_PASSWORD,
  USERS,
  api,
  buildForm,
  createDraft,
  createPending,
  dateDaysAgo,
  db,
  loginAs,
  startTestApp,
  stopTestApp,
  validVoucher,
} from './helpers.js';

let alice; // employee
let bob; // another employee
let dana; // director
let ajay; // accounts

before(async () => {
  await startTestApp();
  alice = await loginAs(USERS.alice);
  bob = await loginAs(USERS.bob);
  dana = await loginAs(USERS.dana);
  ajay = await loginAs(USERS.ajay);
});

after(async () => {
  await stopTestApp();
});

// Fetches every voucher visible to the Director (used to work out expected totals).
async function allVouchers() {
  const response = await api('GET', '/vouchers?limit=100&sortBy=createdAt&sortOrder=asc', { token: dana });
  assert.equal(response.status, 200);
  return response.body.data.vouchers;
}

const sumAmounts = (vouchers) => vouchers.reduce((total, voucher) => total + Number(voucher.amount), 0);

// ---------------------------------------------------------------------------
describe('Authentication', () => {
  it('[T1] logs in with a valid email and password', async () => {
    const response = await api('POST', '/auth/login', {
      json: { email: USERS.alice.email, password: TEST_PASSWORD },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.ok(response.body.data.token);
    assert.equal(response.body.data.user.email, USERS.alice.email);
    assert.equal(response.body.data.user.role, 'EMPLOYEE');
    assert.equal(JSON.stringify(response.body).includes('password'), false, 'no password data may be returned');
  });

  it('[T2] rejects a wrong password', async () => {
    const response = await api('POST', '/auth/login', {
      json: { email: USERS.alice.email, password: 'wrong-password' },
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.message, 'Invalid email or password.');
  });

  it('[T2] rejects an unknown email with the same message', async () => {
    const response = await api('POST', '/auth/login', {
      json: { email: 'nobody@test.local', password: TEST_PASSWORD },
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, 'Invalid email or password.');
  });

  it('[T2] rejects a login with missing or malformed fields', async () => {
    const empty = await api('POST', '/auth/login', { json: {} });
    assert.equal(empty.status, 400);
    assert.ok(empty.body.errors.email);
    assert.ok(empty.body.errors.password);

    const badEmail = await api('POST', '/auth/login', { json: { email: 'not-an-email', password: 'x' } });
    assert.equal(badEmail.status, 400);
    assert.ok(badEmail.body.errors.email);
  });

  it('[T2] rejects a disabled account', async () => {
    const response = await api('POST', '/auth/login', {
      json: { email: USERS.ivan.email, password: TEST_PASSWORD },
    });
    assert.equal(response.status, 403);
  });

  it('stores passwords as bcrypt hashes, never as plain text', async () => {
    const [rows] = await db().query('SELECT password_hash FROM users');
    for (const row of rows) {
      assert.match(row.password_hash, /^\$2[aby]\$\d{2}\$.{53}$/);
      assert.notEqual(row.password_hash, TEST_PASSWORD);
    }
  });

  it('returns the current user for a valid token', async () => {
    const response = await api('GET', '/auth/me', { token: dana });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.user.role, 'DIRECTOR');
    assert.equal(response.body.data.user.fullName, USERS.dana.name);
  });
});

// ---------------------------------------------------------------------------
describe('Unauthorised API calls', () => {
  const protectedEndpoints = [
    ['GET', '/auth/me'],
    ['GET', '/vouchers'],
    ['GET', '/vouchers/my'],
    ['GET', '/vouchers/pending'],
    ['GET', '/vouchers/approved'],
    ['GET', '/vouchers/1'],
    ['GET', '/vouchers/1/signatures/employee'],
    ['POST', '/vouchers'],
    ['PUT', '/vouchers/1'],
    ['DELETE', '/vouchers/1'],
    ['POST', '/vouchers/1/submit'],
    ['POST', '/vouchers/1/approve'],
    ['POST', '/vouchers/1/reject'],
    ['GET', '/dashboard/employee'],
    ['GET', '/dashboard/director'],
    ['GET', '/dashboard/accounts'],
  ];

  it('[T18] blocks every protected endpoint when no token is sent', async () => {
    for (const [method, urlPath] of protectedEndpoints) {
      const response = await api(method, urlPath);
      assert.equal(response.status, 401, `${method} ${urlPath} should need a login`);
      assert.equal(response.body.success, false);
    }
  });

  it('[T18] blocks made-up, tampered and wrongly signed tokens', async () => {
    const garbage = await api('GET', '/vouchers/my', { token: 'not-a-real-token' });
    assert.equal(garbage.status, 401);

    const tampered = await api('GET', '/vouchers/my', { token: `${alice.slice(0, -3)}abc` });
    assert.equal(tampered.status, 401);

    // A token that claims to be the Director but is signed with a different secret.
    const forged = jwt.sign({ role: 'DIRECTOR' }, 'some-other-secret-some-other-secret-1234', {
      subject: String(USERS.dana.id),
    });
    const forgedResponse = await api('GET', '/vouchers', { token: forged });
    assert.equal(forgedResponse.status, 401);
  });

  it('[T18] blocks an expired token', async () => {
    const expired = jwt.sign({ role: 'EMPLOYEE' }, process.env.JWT_SECRET, {
      subject: String(USERS.alice.id),
      expiresIn: -10,
    });
    const response = await api('GET', '/vouchers/my', { token: expired });
    assert.equal(response.status, 401);
  });

  it('[T18] takes the role from the database, not from the token', async () => {
    // Correctly signed, but the payload lies about the role.
    const lying = jwt.sign({ role: 'DIRECTOR' }, process.env.JWT_SECRET, { subject: String(USERS.alice.id) });
    const response = await api('GET', '/vouchers', { token: lying });
    assert.equal(response.status, 403);
  });

  it('[T18] keeps each role out of the other roles\' dashboards', async () => {
    assert.equal((await api('GET', '/dashboard/director', { token: alice })).status, 403);
    assert.equal((await api('GET', '/dashboard/accounts', { token: alice })).status, 403);
    assert.equal((await api('GET', '/dashboard/employee', { token: dana })).status, 403);
    assert.equal((await api('GET', '/dashboard/accounts', { token: dana })).status, 403);
    assert.equal((await api('GET', '/dashboard/employee', { token: ajay })).status, 403);
    assert.equal((await api('GET', '/dashboard/director', { token: ajay })).status, 403);
  });
});

// ---------------------------------------------------------------------------
describe('Employee: drafts', () => {
  it('[T3] creates a voucher as a draft with a generated voucher number', async () => {
    const response = await api('POST', '/vouchers', { token: alice, json: validVoucher() });

    assert.equal(response.status, 201);
    const { voucher, history } = response.body.data;
    assert.equal(voucher.status, 'DRAFT');
    assert.match(voucher.voucherNumber, /^EV-\d{4}-\d{5}$/);
    assert.equal(voucher.employee.id, USERS.alice.id);
    assert.equal(voucher.employee.name, USERS.alice.name);
    assert.equal(voucher.amount, '1500.50');
    assert.equal(voucher.expenseDate, dateDaysAgo(2));
    assert.equal(voucher.hasEmployeeSignature, false);
    assert.equal(history[0].action, 'CREATED');
  });

  it('[T3] ignores status, voucher number and owner sent by the client', async () => {
    const response = await api('POST', '/vouchers', {
      token: alice,
      json: validVoucher({
        status: 'APPROVED',
        voucherNumber: 'HACKED-1',
        employeeId: USERS.bob.id,
        employee_id: USERS.bob.id,
        approvedAt: '2020-01-01',
      }),
    });

    assert.equal(response.status, 201);
    const { voucher } = response.body.data;
    assert.equal(voucher.status, 'DRAFT');
    assert.notEqual(voucher.voucherNumber, 'HACKED-1');
    assert.equal(voucher.employee.id, USERS.alice.id);
    assert.equal(voucher.approvedAt, null);
  });

  it('[T17] rejects missing required fields', async () => {
    const response = await api('POST', '/vouchers', { token: alice, json: {} });

    assert.equal(response.status, 400);
    assert.equal(response.body.message, 'Validation failed');
    for (const field of ['department', 'expenseTitle', 'expenseCategory', 'expenseDate', 'amount']) {
      assert.ok(response.body.errors[field], `expected an error for ${field}`);
    }
  });

  it('[T17] rejects invalid amounts', async () => {
    for (const amount of ['0', '-25', 'abc', '10.999', '99999999999', '']) {
      const response = await api('POST', '/vouchers', { token: alice, json: validVoucher({ amount }) });
      assert.equal(response.status, 400, `amount "${amount}" should be rejected`);
      assert.ok(response.body.errors.amount);
    }
  });

  it('[T17] rejects invalid dates, departments and categories', async () => {
    const future = await api('POST', '/vouchers', { token: alice, json: validVoucher({ expenseDate: '2999-01-01' }) });
    assert.equal(future.status, 400);
    assert.ok(future.body.errors.expenseDate);

    const impossible = await api('POST', '/vouchers', { token: alice, json: validVoucher({ expenseDate: '2026-02-31' }) });
    assert.equal(impossible.status, 400);

    const afterVoucher = await api('POST', '/vouchers', {
      token: alice,
      json: validVoucher({ expenseDate: dateDaysAgo(1), voucherDate: dateDaysAgo(5) }),
    });
    assert.equal(afterVoucher.status, 400);
    assert.ok(afterVoucher.body.errors.expenseDate);

    const department = await api('POST', '/vouchers', { token: alice, json: validVoucher({ department: 'Wizards' }) });
    assert.equal(department.status, 400);
    assert.ok(department.body.errors.department);

    const category = await api('POST', '/vouchers', { token: alice, json: validVoucher({ expenseCategory: 'Bribes' }) });
    assert.equal(category.status, 400);
    assert.ok(category.body.errors.expenseCategory);
  });

  it('[T4] edits its own draft', async () => {
    const draft = await createDraft(alice);
    const response = await api('PUT', `/vouchers/${draft.id}`, {
      token: alice,
      json: validVoucher({ expenseTitle: 'Updated title', amount: '2750', department: 'Marketing' }),
    });

    assert.equal(response.status, 200);
    const { voucher, history } = response.body.data;
    assert.equal(voucher.expenseTitle, 'Updated title');
    assert.equal(voucher.amount, '2750.00');
    assert.equal(voucher.department, 'Marketing');
    assert.equal(voucher.status, 'DRAFT');
    assert.equal(voucher.voucherNumber, draft.voucherNumber, 'the voucher number never changes');
    assert.deepEqual(history.map((entry) => entry.action), ['CREATED', 'UPDATED']);
  });

  it('[T4] validates edits the same way as new vouchers', async () => {
    const draft = await createDraft(alice);
    const response = await api('PUT', `/vouchers/${draft.id}`, { token: alice, json: validVoucher({ amount: '-1' }) });
    assert.equal(response.status, 400);
    assert.ok(response.body.errors.amount);
  });

  it('[T4] deletes its own draft', async () => {
    const draft = await createDraft(alice, {}, { withSignature: true });

    const deleted = await api('DELETE', `/vouchers/${draft.id}`, { token: alice });
    assert.equal(deleted.status, 200);

    const gone = await api('GET', `/vouchers/${draft.id}`, { token: alice });
    assert.equal(gone.status, 404);
  });

  it('saves a signature uploaded with the draft and serves it back to the owner', async () => {
    const draft = await createDraft(alice, {}, { withSignature: true });
    assert.equal(draft.hasEmployeeSignature, true);

    const image = await api('GET', `/vouchers/${draft.id}/signatures/employee`, { token: alice });
    assert.equal(image.status, 200);
    assert.equal(image.headers.get('content-type'), 'image/png');
    assert.deepEqual(image.body, PNG_BYTES);
  });
});

// ---------------------------------------------------------------------------
describe('Employee: privacy between employees', () => {
  let aliceDraft;

  before(async () => {
    aliceDraft = await createDraft(alice, { expenseTitle: 'Alice private voucher' }, { withSignature: true });
  });

  it('[T5] cannot view another employee\'s voucher', async () => {
    const response = await api('GET', `/vouchers/${aliceDraft.id}`, { token: bob });
    assert.equal(response.status, 403);
    assert.equal(JSON.stringify(response.body).includes('Alice private voucher'), false);
  });

  it('[T5] cannot view another employee\'s signature image', async () => {
    const response = await api('GET', `/vouchers/${aliceDraft.id}/signatures/employee`, { token: bob });
    assert.equal(response.status, 403);
  });

  it('[T5] cannot edit, delete or submit another employee\'s voucher', async () => {
    const edit = await api('PUT', `/vouchers/${aliceDraft.id}`, { token: bob, json: validVoucher() });
    assert.equal(edit.status, 403);

    const remove = await api('DELETE', `/vouchers/${aliceDraft.id}`, { token: bob });
    assert.equal(remove.status, 403);

    const submit = await api('POST', `/vouchers/${aliceDraft.id}/submit`, { token: bob, form: buildForm() });
    assert.equal(submit.status, 403);

    const stillThere = await api('GET', `/vouchers/${aliceDraft.id}`, { token: alice });
    assert.equal(stillThere.status, 200);
    assert.equal(stillThere.body.data.voucher.status, 'DRAFT');
    assert.equal(stillThere.body.data.voucher.expenseTitle, 'Alice private voucher');
  });

  it('[T5] "my vouchers" only ever lists the caller\'s own vouchers', async () => {
    await createDraft(bob, { expenseTitle: 'Bob voucher' });

    const mine = await api('GET', '/vouchers/my?limit=100', { token: bob });
    assert.equal(mine.status, 200);
    assert.ok(mine.body.data.vouchers.length >= 1);
    for (const voucher of mine.body.data.vouchers) {
      assert.equal(voucher.employee.id, USERS.bob.id);
    }

    // Asking for somebody else by name changes nothing.
    const sneaky = await api('GET', '/vouchers/my?limit=100&employeeName=Alice', { token: bob });
    assert.equal(sneaky.status, 200);
    for (const voucher of sneaky.body.data.vouchers) {
      assert.equal(voucher.employee.id, USERS.bob.id);
    }
  });

  it('[T5] cannot use the organisation-wide lists', async () => {
    assert.equal((await api('GET', '/vouchers', { token: alice })).status, 403);
    assert.equal((await api('GET', '/vouchers/pending', { token: alice })).status, 403);
    assert.equal((await api('GET', '/vouchers/approved', { token: alice })).status, 403);
  });
});

// ---------------------------------------------------------------------------
describe('Employee: submitting', () => {
  it('[T7] cannot submit without an employee signature', async () => {
    const draft = await createDraft(alice);
    const response = await api('POST', `/vouchers/${draft.id}/submit`, { token: alice });

    assert.equal(response.status, 400);
    assert.ok(response.body.errors.signature);

    const unchanged = await api('GET', `/vouchers/${draft.id}`, { token: alice });
    assert.equal(unchanged.body.data.voucher.status, 'DRAFT');
  });

  it('[T7] rejects files that are not real images', async () => {
    const draft = await createDraft(alice);

    // A text file that only pretends to be a PNG.
    const fake = await api('POST', `/vouchers/${draft.id}/submit`, {
      token: alice,
      form: buildForm({}, { bytes: Buffer.from('this is definitely not an image'), type: 'image/png', name: 'fake.png' }),
    });
    assert.equal(fake.status, 400);
    assert.ok(fake.body.errors.signature);

    // A file type that is not allowed at all.
    const pdf = await api('POST', `/vouchers/${draft.id}/submit`, {
      token: alice,
      form: buildForm({}, { bytes: Buffer.from('%PDF-1.4 fake'), type: 'application/pdf', name: 'sign.pdf' }),
    });
    assert.equal(pdf.status, 400);
    assert.ok(pdf.body.errors.signature);

    // Larger than the 2 MB limit.
    const huge = Buffer.concat([PNG_BYTES, Buffer.alloc(2 * 1024 * 1024 + 10)]);
    const tooBig = await api('POST', `/vouchers/${draft.id}/submit`, {
      token: alice,
      form: buildForm({}, { bytes: huge, type: 'image/png', name: 'huge.png' }),
    });
    assert.equal(tooBig.status, 400);
    assert.ok(tooBig.body.errors.signature);

    const unchanged = await api('GET', `/vouchers/${draft.id}`, { token: alice });
    assert.equal(unchanged.body.data.voucher.status, 'DRAFT');
    assert.equal(unchanged.body.data.voucher.hasEmployeeSignature, false);
  });

  it('submits a draft once a signature is supplied', async () => {
    const draft = await createDraft(alice);
    const response = await api('POST', `/vouchers/${draft.id}/submit`, { token: alice, form: buildForm() });

    assert.equal(response.status, 200);
    const { voucher, history } = response.body.data;
    assert.equal(voucher.status, 'PENDING_APPROVAL');
    assert.equal(voucher.hasEmployeeSignature, true);
    assert.ok(voucher.submittedAt);
    assert.deepEqual(history.map((entry) => entry.action), ['CREATED', 'SUBMITTED']);
  });

  it('submits a draft that already has a saved signature without a new upload', async () => {
    const draft = await createDraft(alice, {}, { withSignature: true });
    const response = await api('POST', `/vouchers/${draft.id}/submit`, { token: alice });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.voucher.status, 'PENDING_APPROVAL');
  });

  it('[T6] cannot edit, delete or re-submit a submitted voucher', async () => {
    const pending = await createPending(alice);

    const edit = await api('PUT', `/vouchers/${pending.id}`, { token: alice, json: validVoucher({ amount: '9' }) });
    assert.equal(edit.status, 409);

    const remove = await api('DELETE', `/vouchers/${pending.id}`, { token: alice });
    assert.equal(remove.status, 409);

    const again = await api('POST', `/vouchers/${pending.id}/submit`, { token: alice, form: buildForm() });
    assert.equal(again.status, 409);

    const unchanged = await api('GET', `/vouchers/${pending.id}`, { token: alice });
    assert.equal(unchanged.body.data.voucher.amount, '1500.50');
    assert.equal(unchanged.body.data.voucher.status, 'PENDING_APPROVAL');
  });

  it('cannot approve or reject (not even its own voucher)', async () => {
    const pending = await createPending(alice);

    const approve = await api('POST', `/vouchers/${pending.id}/approve`, { token: alice, form: buildForm() });
    assert.equal(approve.status, 403);

    const reject = await api('POST', `/vouchers/${pending.id}/reject`, { token: alice, json: { reason: 'No' } });
    assert.equal(reject.status, 403);
  });
});

// ---------------------------------------------------------------------------
describe('Director', () => {
  it('[T8] sees the vouchers that are pending approval', async () => {
    const pending = await createPending(alice, { expenseTitle: 'Needs a decision' });
    await createDraft(alice, { expenseTitle: 'Still a draft' });

    const response = await api('GET', '/vouchers/pending?limit=100', { token: dana });
    assert.equal(response.status, 200);

    const { vouchers } = response.body.data;
    assert.ok(vouchers.some((voucher) => voucher.id === pending.id));
    for (const voucher of vouchers) {
      assert.equal(voucher.status, 'PENDING_APPROVAL');
    }
  });

  it('views every voucher and its details', async () => {
    const draft = await createDraft(bob);

    const list = await api('GET', '/vouchers?limit=100', { token: dana });
    assert.equal(list.status, 200);
    const owners = new Set(list.body.data.vouchers.map((voucher) => voucher.employee.id));
    assert.ok(owners.has(USERS.alice.id) && owners.has(USERS.bob.id));

    const details = await api('GET', `/vouchers/${draft.id}`, { token: dana });
    assert.equal(details.status, 200);
  });

  it('[T9] cannot approve without a director signature', async () => {
    const pending = await createPending(alice);

    const noBody = await api('POST', `/vouchers/${pending.id}/approve`, { token: dana });
    assert.equal(noBody.status, 400);
    assert.ok(noBody.body.errors.signature);

    const jsonOnly = await api('POST', `/vouchers/${pending.id}/approve`, { token: dana, json: { approve: true } });
    assert.equal(jsonOnly.status, 400);

    // A multipart form that contains no file at all.
    const emptyForm = await api('POST', `/vouchers/${pending.id}/approve`, { token: dana, form: new FormData() });
    assert.equal(emptyForm.status, 400);

    // The image sent under the wrong field name.
    const wrongField = await api('POST', `/vouchers/${pending.id}/approve`, {
      token: dana,
      form: buildForm({}, { bytes: PNG_BYTES, type: 'image/png', name: 's.png', field: 'photo' }),
    });
    assert.equal(wrongField.status, 400);

    const fakeImage = await api('POST', `/vouchers/${pending.id}/approve`, {
      token: dana,
      form: buildForm({}, { bytes: Buffer.from('not an image at all'), type: 'image/png', name: 's.png' }),
    });
    assert.equal(fakeImage.status, 400);

    const unchanged = await api('GET', `/vouchers/${pending.id}`, { token: dana });
    assert.equal(unchanged.body.data.voucher.status, 'PENDING_APPROVAL');
  });

  it('[T10] cannot reject without a reason', async () => {
    const pending = await createPending(alice);

    for (const body of [{}, { reason: '' }, { reason: '    ' }]) {
      const response = await api('POST', `/vouchers/${pending.id}/reject`, { token: dana, json: body });
      assert.equal(response.status, 400);
      assert.ok(response.body.errors.reason);
    }

    const unchanged = await api('GET', `/vouchers/${pending.id}`, { token: dana });
    assert.equal(unchanged.body.data.voucher.status, 'PENDING_APPROVAL');
  });

  it('approves a pending voucher with a signature', async () => {
    const pending = await createPending(alice);
    const response = await api('POST', `/vouchers/${pending.id}/approve`, { token: dana, form: buildForm() });

    assert.equal(response.status, 200);
    const { voucher, history } = response.body.data;
    assert.equal(voucher.status, 'APPROVED');
    assert.equal(voucher.hasDirectorSignature, true);
    assert.ok(voucher.approvedAt);
    assert.equal(voucher.reviewedBy.id, USERS.dana.id);
    assert.deepEqual(history.map((entry) => entry.action), ['CREATED', 'SUBMITTED', 'APPROVED']);
  });

  it('[T11] cannot change the employee\'s expense details', async () => {
    const pending = await createPending(alice, { amount: '1234.56', expenseTitle: 'Original title' });

    // There is no "edit" permission for the Director at all ...
    const edit = await api('PUT', `/vouchers/${pending.id}`, {
      token: dana,
      json: validVoucher({ amount: '1', expenseTitle: 'Changed by director' }),
    });
    assert.equal(edit.status, 403);
    assert.equal((await api('DELETE', `/vouchers/${pending.id}`, { token: dana })).status, 403);
    assert.equal((await api('POST', '/vouchers', { token: dana, json: validVoucher() })).status, 403);

    // ... and extra fields smuggled into the approve request are ignored.
    const approve = await api('POST', `/vouchers/${pending.id}/approve`, {
      token: dana,
      form: buildForm({ amount: '1', expenseTitle: 'Changed by director', department: 'Finance' }),
    });
    assert.equal(approve.status, 200);

    const { voucher } = approve.body.data;
    assert.equal(voucher.amount, '1234.56');
    assert.equal(voucher.expenseTitle, 'Original title');
    assert.equal(voucher.department, 'Sales');
    assert.equal(voucher.employee.id, USERS.alice.id);
  });

  it('rejects a pending voucher with a reason the employee can read', async () => {
    const pending = await createPending(alice);
    const reason = 'The receipt is missing. Please attach it and raise a new voucher.';

    const response = await api('POST', `/vouchers/${pending.id}/reject`, { token: dana, json: { reason } });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.voucher.status, 'REJECTED');
    assert.equal(response.body.data.voucher.rejectionReason, reason);
    assert.ok(response.body.data.voucher.rejectedAt);

    const employeeView = await api('GET', `/vouchers/${pending.id}`, { token: alice });
    assert.equal(employeeView.status, 200);
    assert.equal(employeeView.body.data.voucher.rejectionReason, reason);
  });

  it('cannot approve or reject a voucher twice', async () => {
    const approved = await createPending(alice);
    assert.equal((await api('POST', `/vouchers/${approved.id}/approve`, { token: dana, form: buildForm() })).status, 200);

    const approveAgain = await api('POST', `/vouchers/${approved.id}/approve`, { token: dana, form: buildForm() });
    assert.equal(approveAgain.status, 409);
    const rejectApproved = await api('POST', `/vouchers/${approved.id}/reject`, { token: dana, json: { reason: 'Changed my mind' } });
    assert.equal(rejectApproved.status, 409);

    const rejected = await createPending(alice);
    assert.equal((await api('POST', `/vouchers/${rejected.id}/reject`, { token: dana, json: { reason: 'Not valid' } })).status, 200);
    assert.equal((await api('POST', `/vouchers/${rejected.id}/approve`, { token: dana, form: buildForm() })).status, 409);
    assert.equal((await api('POST', `/vouchers/${rejected.id}/reject`, { token: dana, json: { reason: 'Again' } })).status, 409);
  });

  it('lets only one of two simultaneous approvals succeed', async () => {
    const pending = await createPending(alice);

    const results = await Promise.all([
      api('POST', `/vouchers/${pending.id}/approve`, { token: dana, form: buildForm() }),
      api('POST', `/vouchers/${pending.id}/approve`, { token: dana, form: buildForm() }),
    ]);
    const statuses = results.map((result) => result.status).sort();
    assert.deepEqual(statuses, [200, 409]);

    const [rows] = await db().query(
      "SELECT COUNT(*) AS count FROM voucher_history WHERE voucher_id = ? AND action = 'APPROVED'",
      [pending.id]
    );
    assert.equal(rows[0].count, 1);
  });

  it('cannot approve or reject a draft that was never submitted', async () => {
    const draft = await createDraft(alice, {}, { withSignature: true });

    assert.equal((await api('POST', `/vouchers/${draft.id}/approve`, { token: dana, form: buildForm() })).status, 409);
    assert.equal((await api('POST', `/vouchers/${draft.id}/reject`, { token: dana, json: { reason: 'Too early' } })).status, 409);
  });

  it('[T6] leaves approved and rejected vouchers read-only for the employee', async () => {
    const approved = await createPending(alice);
    await api('POST', `/vouchers/${approved.id}/approve`, { token: dana, form: buildForm() });
    const rejected = await createPending(alice);
    await api('POST', `/vouchers/${rejected.id}/reject`, { token: dana, json: { reason: 'Duplicate claim' } });

    for (const voucher of [approved, rejected]) {
      assert.equal((await api('PUT', `/vouchers/${voucher.id}`, { token: alice, json: validVoucher() })).status, 409);
      assert.equal((await api('DELETE', `/vouchers/${voucher.id}`, { token: alice })).status, 409);
      assert.equal((await api('POST', `/vouchers/${voucher.id}/submit`, { token: alice, form: buildForm() })).status, 409);
    }
  });
});

// ---------------------------------------------------------------------------
describe('Accounts team', () => {
  let approved;
  let pending;

  before(async () => {
    approved = await createPending(bob, { amount: '800' });
    await api('POST', `/vouchers/${approved.id}/approve`, { token: dana, form: buildForm() });
    pending = await createPending(bob, { amount: '900' });
  });

  it('[T12] views all vouchers, their details and both signatures', async () => {
    const list = await api('GET', '/vouchers?limit=100', { token: ajay });
    assert.equal(list.status, 200);
    const owners = new Set(list.body.data.vouchers.map((voucher) => voucher.employee.id));
    assert.ok(owners.has(USERS.alice.id) && owners.has(USERS.bob.id));

    const details = await api('GET', `/vouchers/${approved.id}`, { token: ajay });
    assert.equal(details.status, 200);
    assert.equal(details.body.data.voucher.status, 'APPROVED');

    const employeeSignature = await api('GET', `/vouchers/${approved.id}/signatures/employee`, { token: ajay });
    assert.equal(employeeSignature.status, 200);
    assert.equal(employeeSignature.headers.get('content-type'), 'image/png');

    const directorSignature = await api('GET', `/vouchers/${approved.id}/signatures/director`, { token: ajay });
    assert.equal(directorSignature.status, 200);
    assert.equal(directorSignature.headers.get('content-type'), 'image/png');
  });

  it('lists only approved vouchers as ready for reimbursement', async () => {
    const response = await api('GET', '/vouchers/approved?limit=100', { token: ajay });
    assert.equal(response.status, 200);

    const { vouchers } = response.body.data;
    assert.ok(vouchers.some((voucher) => voucher.id === approved.id));
    assert.equal(vouchers.some((voucher) => voucher.id === pending.id), false);
    for (const voucher of vouchers) {
      assert.equal(voucher.status, 'APPROVED');
    }

    // The status cannot be overridden through the query string.
    const overridden = await api('GET', '/vouchers/approved?limit=100&status=PENDING_APPROVAL', { token: ajay });
    for (const voucher of overridden.body.data.vouchers) {
      assert.equal(voucher.status, 'APPROVED');
    }
  });

  it('[T13] cannot create, edit, delete, submit, approve or reject', async () => {
    assert.equal((await api('POST', '/vouchers', { token: ajay, json: validVoucher() })).status, 403);
    assert.equal((await api('PUT', `/vouchers/${pending.id}`, { token: ajay, json: validVoucher() })).status, 403);
    assert.equal((await api('DELETE', `/vouchers/${pending.id}`, { token: ajay })).status, 403);
    assert.equal((await api('POST', `/vouchers/${pending.id}/submit`, { token: ajay, form: buildForm() })).status, 403);
    assert.equal((await api('POST', `/vouchers/${pending.id}/approve`, { token: ajay, form: buildForm() })).status, 403);
    assert.equal((await api('POST', `/vouchers/${pending.id}/reject`, { token: ajay, json: { reason: 'No' } })).status, 403);
    assert.equal((await api('GET', '/vouchers/pending', { token: ajay })).status, 403);

    const unchanged = await api('GET', `/vouchers/${pending.id}`, { token: ajay });
    assert.equal(unchanged.body.data.voucher.status, 'PENDING_APPROVAL');
    assert.equal(unchanged.body.data.voucher.amount, '900.00');
  });
});

// ---------------------------------------------------------------------------
describe('Voucher numbers', () => {
  it('[T14] are unique, even when many vouchers are created at the same moment', async () => {
    const created = await Promise.all(
      Array.from({ length: 12 }, (_, index) => createDraft(index % 2 === 0 ? alice : bob))
    );
    const numbers = created.map((voucher) => voucher.voucherNumber);

    assert.equal(new Set(numbers).size, numbers.length, 'the 12 new numbers must all be different');

    const everything = await allVouchers();
    const allNumbers = everything.map((voucher) => voucher.voucherNumber);
    assert.equal(new Set(allNumbers).size, allNumbers.length, 'no number is repeated anywhere');
    for (const number of allNumbers) {
      assert.match(number, /^EV-\d{4}-\d{5}$/);
    }
  });

  it('[T14] are protected by a UNIQUE constraint in the database', async () => {
    const [rows] = await db().query('SELECT id, voucher_number FROM vouchers ORDER BY id LIMIT 2');
    await assert.rejects(
      db().query('UPDATE vouchers SET voucher_number = ? WHERE id = ?', [rows[0].voucher_number, rows[1].id]),
      { code: 'ER_DUP_ENTRY' }
    );
  });
});

// ---------------------------------------------------------------------------
describe('Search, filter, sort and pagination', () => {
  let special;

  before(async () => {
    // One voucher with values no other test uses, so each filter can find exactly it.
    special = await createPending(bob, {
      department: 'Research',
      expenseCategory: 'Software',
      expenseTitle: 'Market data terminal',
      amount: '76543.21',
      expenseDate: dateDaysAgo(40),
      voucherDate: dateDaysAgo(39),
    });
  });

  const idsOf = (response) => response.body.data.vouchers.map((voucher) => voucher.id);

  it('[T16] filters by voucher number', async () => {
    const response = await api('GET', `/vouchers?voucherNumber=${special.voucherNumber}`, { token: dana });
    assert.equal(response.status, 200);
    assert.deepEqual(idsOf(response), [special.id]);

    // A partial number works as a search.
    const partial = await api('GET', `/vouchers?voucherNumber=${special.voucherNumber.slice(-5)}`, { token: dana });
    assert.ok(idsOf(partial).includes(special.id));
  });

  it('[T16] filters by employee name', async () => {
    const response = await api('GET', '/vouchers?employeeName=bob&limit=100', { token: ajay });
    assert.equal(response.status, 200);
    assert.ok(response.body.data.vouchers.length > 0);
    for (const voucher of response.body.data.vouchers) {
      assert.equal(voucher.employee.id, USERS.bob.id);
    }
  });

  it('[T16] filters by department, category and status', async () => {
    const department = await api('GET', '/vouchers?department=Research', { token: dana });
    assert.deepEqual(idsOf(department), [special.id]);

    const category = await api('GET', '/vouchers?category=Software', { token: dana });
    assert.deepEqual(idsOf(category), [special.id]);

    const status = await api('GET', '/vouchers?status=REJECTED&limit=100', { token: dana });
    assert.ok(status.body.data.vouchers.length > 0);
    for (const voucher of status.body.data.vouchers) {
      assert.equal(voucher.status, 'REJECTED');
    }
  });

  it('[T16] filters by expense date range', async () => {
    const response = await api('GET', `/vouchers?dateFrom=${dateDaysAgo(45)}&dateTo=${dateDaysAgo(35)}`, { token: dana });
    assert.deepEqual(idsOf(response), [special.id]);

    const none = await api('GET', `/vouchers?dateFrom=${dateDaysAgo(400)}&dateTo=${dateDaysAgo(300)}`, { token: dana });
    assert.deepEqual(idsOf(none), []);
    assert.equal(none.body.pagination.totalItems, 0);
  });

  it('[T16] filters by amount range', async () => {
    const response = await api('GET', '/vouchers?minAmount=70000&maxAmount=80000', { token: dana });
    assert.deepEqual(idsOf(response), [special.id]);

    const small = await api('GET', '/vouchers?maxAmount=1000&limit=100', { token: dana });
    for (const voucher of small.body.data.vouchers) {
      assert.ok(Number(voucher.amount) <= 1000);
    }
  });

  it('[T16] combines several filters', async () => {
    const response = await api(
      'GET',
      '/vouchers?employeeName=Bob&department=Research&status=PENDING_APPROVAL&minAmount=1',
      { token: dana }
    );
    assert.deepEqual(idsOf(response), [special.id]);

    const mismatch = await api('GET', '/vouchers?employeeName=Alice&department=Research', { token: dana });
    assert.deepEqual(idsOf(mismatch), []);
  });

  it('[T16] sorts by amount in both directions', async () => {
    const ascending = await api('GET', '/vouchers?sortBy=amount&sortOrder=asc&limit=100', { token: dana });
    const up = ascending.body.data.vouchers.map((voucher) => Number(voucher.amount));
    assert.deepEqual(up, [...up].sort((a, b) => a - b));

    const descending = await api('GET', '/vouchers?sortBy=amount&sortOrder=desc&limit=100', { token: dana });
    const down = descending.body.data.vouchers.map((voucher) => Number(voucher.amount));
    assert.deepEqual(down, [...down].sort((a, b) => b - a));
    assert.equal(descending.body.data.vouchers[0].id, special.id);
  });

  it('[T16] paginates without repeating or skipping vouchers', async () => {
    const everything = await allVouchers();

    const firstPage = await api('GET', '/vouchers?limit=5&page=1&sortBy=createdAt&sortOrder=asc', { token: dana });
    const secondPage = await api('GET', '/vouchers?limit=5&page=2&sortBy=createdAt&sortOrder=asc', { token: dana });

    assert.equal(firstPage.body.pagination.totalItems, everything.length);
    assert.equal(firstPage.body.pagination.totalPages, Math.ceil(everything.length / 5));
    assert.equal(firstPage.body.pagination.page, 1);
    assert.equal(firstPage.body.pagination.limit, 5);
    assert.deepEqual([...idsOf(firstPage), ...idsOf(secondPage)], everything.slice(0, 10).map((voucher) => voucher.id));

    const beyond = await api('GET', '/vouchers?limit=5&page=9999', { token: dana });
    assert.equal(beyond.status, 200);
    assert.deepEqual(idsOf(beyond), []);
  });

  it('[T16] reports the total amount of the matching vouchers', async () => {
    const response = await api('GET', '/vouchers?status=APPROVED&limit=100', { token: ajay });
    const expected = sumAmounts(response.body.data.vouchers);
    assert.equal(Number(response.body.data.summary.totalAmount).toFixed(2), expected.toFixed(2));
  });

  it('[T16] employees can filter their own list', async () => {
    const response = await api('GET', '/vouchers/my?department=Research&category=Software', { token: bob });
    assert.deepEqual(idsOf(response), [special.id]);

    const notMine = await api('GET', '/vouchers/my?department=Research', { token: alice });
    assert.deepEqual(idsOf(notMine), []);
  });

  it('rejects invalid query parameters with a 400 error', async () => {
    const badQueries = [
      'status=DONE',
      'department=Nowhere',
      'category=Nothing',
      'sortBy=password_hash',
      'sortOrder=sideways',
      'page=0',
      'page=abc',
      'limit=0',
      'limit=1000',
      'dateFrom=01-02-2026',
      'dateFrom=2026-05-10&dateTo=2026-05-01',
      'minAmount=-5',
      'minAmount=500&maxAmount=100',
      'status=DRAFT&status=APPROVED',
    ];
    for (const query of badQueries) {
      const response = await api('GET', `/vouchers?${query}`, { token: dana });
      assert.equal(response.status, 400, `?${query} should be rejected`);
      assert.equal(response.body.success, false);
      assert.ok(response.body.errors);
    }
  });

  it('treats SQL injection attempts as plain text', async () => {
    const attack = encodeURIComponent("' OR '1'='1'; DROP TABLE vouchers; -- ");
    const response = await api('GET', `/vouchers?employeeName=${attack}`, { token: dana });
    assert.equal(response.status, 200);
    assert.deepEqual(idsOf(response), []);

    const wildcard = await api('GET', `/vouchers?employeeName=${encodeURIComponent('%')}`, { token: dana });
    assert.deepEqual(idsOf(wildcard), [], '"%" is searched literally, not as a wildcard');

    const stillWorks = await api('GET', '/vouchers?limit=1', { token: dana });
    assert.equal(stillWorks.status, 200);
    assert.ok(stillWorks.body.pagination.totalItems > 0);
  });
});

// ---------------------------------------------------------------------------
describe('Dashboards', () => {
  it('[T15] employee dashboard matches the employee\'s own vouchers', async () => {
    const mine = (await api('GET', '/vouchers/my?limit=100', { token: alice })).body.data.vouchers;
    const count = (status) => mine.filter((voucher) => voucher.status === status).length;
    const submitted = mine.filter((voucher) => voucher.status !== 'DRAFT');

    const response = await api('GET', '/dashboard/employee', { token: alice });
    assert.equal(response.status, 200);
    const stats = response.body.data;

    assert.equal(stats.totalVouchers, mine.length);
    assert.equal(stats.draftVouchers, count('DRAFT'));
    assert.equal(stats.pendingApproval, count('PENDING_APPROVAL'));
    assert.equal(stats.approvedVouchers, count('APPROVED'));
    assert.equal(stats.rejectedVouchers, count('REJECTED'));
    assert.equal(Number(stats.totalAmountClaimed).toFixed(2), sumAmounts(submitted).toFixed(2));
    assert.equal(
      stats.draftVouchers + stats.pendingApproval + stats.approvedVouchers + stats.rejectedVouchers,
      stats.totalVouchers
    );
    for (const voucher of stats.recentVouchers) {
      assert.equal(voucher.employee.id, USERS.alice.id);
    }
  });

  it('[T15] employee dashboards differ per employee', async () => {
    const aliceStats = (await api('GET', '/dashboard/employee', { token: alice })).body.data;
    const bobStats = (await api('GET', '/dashboard/employee', { token: bob })).body.data;
    const everything = await allVouchers();

    assert.equal(aliceStats.totalVouchers + bobStats.totalVouchers, everything.length);
  });

  it('[T15] director dashboard matches the database', async () => {
    const before = (await api('GET', '/dashboard/director', { token: dana })).body.data;
    const everything = await allVouchers();
    const pending = everything.filter((voucher) => voucher.status === 'PENDING_APPROVAL');

    assert.equal(before.pendingApprovalCount, pending.length);
    assert.equal(Number(before.totalPendingAmount).toFixed(2), sumAmounts(pending).toFixed(2));
    // Every decision in this test run was made today.
    assert.equal(before.approvedToday, everything.filter((voucher) => voucher.status === 'APPROVED').length);
    assert.equal(before.rejectedToday, everything.filter((voucher) => voucher.status === 'REJECTED').length);
    assert.ok(before.recentActivity.length > 0);
    assert.ok(before.recentActivity.length <= 8);

    // One more approval and one more rejection must move the numbers by exactly one.
    const toApprove = await createPending(alice, { amount: '100' });
    const toReject = await createPending(alice, { amount: '200' });
    await api('POST', `/vouchers/${toApprove.id}/approve`, { token: dana, form: buildForm() });
    await api('POST', `/vouchers/${toReject.id}/reject`, { token: dana, json: { reason: 'Not claimable' } });

    const after = (await api('GET', '/dashboard/director', { token: dana })).body.data;
    assert.equal(after.approvedToday, before.approvedToday + 1);
    assert.equal(after.rejectedToday, before.rejectedToday + 1);
    assert.equal(after.pendingApprovalCount, before.pendingApprovalCount);
    assert.equal(after.recentActivity[0].action, 'REJECTED');
    assert.equal(after.recentActivity[0].voucher.id, toReject.id);
  });

  it('[T15] "today" on the director dashboard ignores older decisions', async () => {
    const before = (await api('GET', '/dashboard/director', { token: dana })).body.data;

    // Move one approval three days into the past, directly in the database.
    const [rows] = await db().query("SELECT id FROM vouchers WHERE status = 'APPROVED' ORDER BY id LIMIT 1");
    await db().query('UPDATE vouchers SET approved_at = NOW() - INTERVAL 3 DAY WHERE id = ?', [rows[0].id]);

    const after = (await api('GET', '/dashboard/director', { token: dana })).body.data;
    assert.equal(after.approvedToday, before.approvedToday - 1);
  });

  it('[T15] accounts dashboard matches the database', async () => {
    const everything = await allVouchers();
    const count = (status) => everything.filter((voucher) => voucher.status === status).length;
    const approved = everything.filter((voucher) => voucher.status === 'APPROVED');

    const response = await api('GET', '/dashboard/accounts', { token: ajay });
    assert.equal(response.status, 200);
    const stats = response.body.data;

    assert.equal(stats.totalVouchers, everything.length);
    assert.equal(stats.pendingApproval, count('PENDING_APPROVAL'));
    assert.equal(stats.approvedVouchers, count('APPROVED'));
    assert.equal(stats.rejectedVouchers, count('REJECTED'));
    assert.equal(stats.draftVouchers, count('DRAFT'));
    assert.equal(Number(stats.totalApprovedAmount).toFixed(2), sumAmounts(approved).toFixed(2));
    assert.ok(stats.recentApprovedVouchers.length > 0);
    for (const voucher of stats.recentApprovedVouchers) {
      assert.equal(voucher.status, 'APPROVED');
    }
  });
});

// ---------------------------------------------------------------------------
describe('Signatures and general error handling', () => {
  it('never exposes file paths or serves uploads as public files', async () => {
    const pending = await createPending(alice);
    const details = await api('GET', `/vouchers/${pending.id}`, { token: alice });

    const text = JSON.stringify(details.body);
    assert.equal(text.includes('signatures/'), false);
    assert.equal(text.includes('signature_path'), false);

    const [rows] = await db().query('SELECT employee_signature_path FROM vouchers WHERE id = ?', [pending.id]);
    assert.match(rows[0].employee_signature_path, /^signatures\/employee-\d+-[0-9a-f]{16}\.png$/);

    // The stored path cannot be opened as a URL; only the protected endpoint returns the image.
    const direct = await api('GET', `/${rows[0].employee_signature_path}`);
    assert.equal(direct.status, 404);
    const uploads = await api('GET', `/uploads/${rows[0].employee_signature_path}`);
    assert.equal(uploads.status, 404);
  });

  it('validates the signature type and reports missing signatures', async () => {
    const pending = await createPending(alice);

    const badType = await api('GET', `/vouchers/${pending.id}/signatures/..%2F..%2F.env`, { token: alice });
    assert.equal(badType.status, 400);

    const noDirectorSignatureYet = await api('GET', `/vouchers/${pending.id}/signatures/director`, { token: alice });
    assert.equal(noDirectorSignatureYet.status, 404);
  });

  it('validates voucher ids', async () => {
    for (const id of ['abc', '0', '-1', '1.5', '1e3', '12345678901']) {
      const response = await api('GET', `/vouchers/${id}`, { token: dana });
      assert.equal(response.status, 400, `id "${id}" should be rejected`);
    }

    const missing = await api('GET', '/vouchers/999999', { token: dana });
    assert.equal(missing.status, 404);
  });

  it('answers unknown routes and broken JSON with clean JSON errors', async () => {
    const unknown = await api('GET', '/does-not-exist', { token: dana });
    assert.equal(unknown.status, 404);
    assert.equal(unknown.body.success, false);

    const broken = await api('POST', '/auth/login', {
      rawBody: '{"email": "oops"',
      headers: { 'Content-Type': 'application/json' },
    });
    assert.equal(broken.status, 400);
    assert.equal(broken.body.success, false);
    assert.equal(JSON.stringify(broken.body).includes('SyntaxError'), false, 'no internal error details');
  });
});
