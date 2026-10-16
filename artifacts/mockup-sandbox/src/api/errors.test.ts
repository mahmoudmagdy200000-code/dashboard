import test from 'node:test';
import assert from 'node:assert/strict';
import { isErrorBody, ApiError } from './errors.ts';

test('isErrorBody detects all three error envelopes and rejects non-errors', () => {
  // Shape 1: Legacy envelope
  assert.equal(isErrorBody({ error: { code: 'ERR', message: 'Fail' } }), true);

  // Shape 2: asab v1 envelope
  assert.equal(isErrorBody({ success: false, message: 'فشل', errors: {} }), true);
  assert.equal(isErrorBody({ errors: { field: ['error'] } }), true);

  // Shape 3: Bare message envelope
  assert.equal(isErrorBody({ message: 'REPORT_FINAL_APPROVED' }), true);
  assert.equal(isErrorBody({ message: 'Generic error' }), true);

  // Non-errors
  assert.equal(isErrorBody(null), false);
  assert.equal(isErrorBody(undefined), false);
  assert.equal(isErrorBody(123), false);
  assert.equal(isErrorBody('string'), false);
  assert.equal(isErrorBody({}), false);
  assert.equal(isErrorBody({ success: true, data: [] }), false);
});

test('HTTP 403 Forbidden normalization', () => {
  // 403 with bare code (Symfony / direct exception)
  const errBare403 = new ApiError(
    { message: 'ACCOUNTANT_UNAUTHORIZED_FOR_BRANCH' },
    403
  );
  assert.equal(errBare403.status, 403);
  assert.equal(errBare403.code, 'ACCOUNTANT_UNAUTHORIZED_FOR_BRANCH');
  assert.equal(errBare403.messageAr, 'المحاسب غير مخوّل لهذا الفرع');

  // 403 with legacy envelope
  const errLegacy403 = new ApiError(
    {
      error: {
        code: 'FORBIDDEN',
        message: 'Accountant not authorized',
        messageAr: 'غير مصرح للمحاسب',
      },
      requestId: 'req_403_abc',
    },
    403
  );
  assert.equal(errLegacy403.status, 403);
  assert.equal(errLegacy403.code, 'FORBIDDEN');
  assert.equal(errLegacy403.messageAr, 'غير مصرح للمحاسب');
  assert.equal(errLegacy403.requestId, 'req_403_abc');
});

test('HTTP 409 Conflict normalization', () => {
  // 409 with bare code: REPORT_FINAL_APPROVED
  const errFinalApproved = new ApiError(
    { message: 'REPORT_FINAL_APPROVED' },
    409
  );
  assert.equal(errFinalApproved.status, 409);
  assert.equal(errFinalApproved.code, 'REPORT_FINAL_APPROVED');
  assert.equal(errFinalApproved.messageAr, 'التقرير مغلق نهائيًا ولا يمكن تعديله');

  // 409 with bare code: DAY_REPORT_NOT_SUBMITTED
  const errNotSubmitted = new ApiError(
    { message: 'DAY_REPORT_NOT_SUBMITTED' },
    409
  );
  assert.equal(errNotSubmitted.status, 409);
  assert.equal(errNotSubmitted.code, 'DAY_REPORT_NOT_SUBMITTED');
  assert.equal(errNotSubmitted.messageAr, 'يجب إرسال تقرير اليوم أولًا');

  const liabilityPending = new ApiError({ message: 'BRANCH_LIABILITY_APPROVAL_PENDING' }, 409);
  assert.equal(liabilityPending.code, 'BRANCH_LIABILITY_APPROVAL_PENDING');
  assert.equal(liabilityPending.messageAr, 'توزيع مسؤولية العجز بانتظار الاعتماد قبل الاعتماد النهائي للوردية');

  // 409 with legacy envelope (e.g. BD-4 PKG6_DAY_REPORT_READ_ONLY)
  const errLegacy409 = new ApiError(
    {
      error: {
        code: 'PKG6_DAY_REPORT_READ_ONLY',
        message: 'PKG-6 shift daily report cannot be modified via legacy route.',
        messageAr: 'لا يمكن تعديل تقرير مبيعات يوم PKG-6 عبر المسار القديم',
      },
      requestId: 'req_409_pkg6',
    },
    409
  );
  assert.equal(errLegacy409.status, 409);
  assert.equal(errLegacy409.code, 'PKG6_DAY_REPORT_READ_ONLY');
  assert.equal(errLegacy409.messageAr, 'لا يمكن تعديل تقرير مبيعات يوم PKG-6 عبر المسار القديم');
  assert.equal(errLegacy409.requestId, 'req_409_pkg6');
});

test('HTTP 422 Validation Error normalization', () => {
  // 422 with asab v1 envelope
  const errV1_422 = new ApiError(
    {
      success: false,
      message: 'فشل التحقق من البيانات',
      errors: {
        code: 'VALIDATION_ERROR',
        shiftDate: ['حقل التاريخ مطلوب'],
      },
    },
    422
  );
  assert.equal(errV1_422.status, 422);
  assert.equal(errV1_422.code, 'VALIDATION_ERROR');
  assert.equal(errV1_422.message, 'فشل التحقق من البيانات');
  assert.equal(errV1_422.messageAr, 'فشل التحقق من البيانات');
  assert.deepEqual(errV1_422.details, {
    code: 'VALIDATION_ERROR',
    shiftDate: ['حقل التاريخ مطلوب'],
  });

  // 422 with legacy envelope
  const errLegacy422 = new ApiError(
    {
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Invalid input',
        messageAr: 'بيانات غير صالحة',
        details: { amount: ['Must be positive'] },
      },
    },
    422
  );
  assert.equal(errLegacy422.status, 422);
  assert.equal(errLegacy422.code, 'VALIDATION_FAILED');
  assert.equal(errLegacy422.messageAr, 'بيانات غير صالحة');
  assert.deepEqual(errLegacy422.details, { amount: ['Must be positive'] });
});

test('Normalization across all three response envelopes', () => {
  // Envelope 1: Legacy
  const legacy = new ApiError({
    error: {
      code: 'STALE_APPROVED_REPORT',
      message: 'Report was modified',
      messageAr: 'تغير التقرير بعد اعتماده؛ يلزم إعادة المراجعة',
    },
    requestId: 'req_env_1',
  }, 409);
  assert.equal(legacy.code, 'STALE_APPROVED_REPORT');
  assert.equal(legacy.messageAr, 'تغير التقرير بعد اعتماده؛ يلزم إعادة المراجعة');
  assert.equal(legacy.requestId, 'req_env_1');

  // Envelope 2: asab v1
  const asabV1 = new ApiError({
    success: false,
    message: 'خطأ عام في النظام',
    errors: { code: 'SYSTEM_ERROR' },
  }, 500);
  assert.equal(asabV1.code, 'SYSTEM_ERROR');
  assert.equal(asabV1.messageAr, 'خطأ عام في النظام');

  // Envelope 3a: Bare message with known code
  const bareKnown = new ApiError({
    message: 'PHYSICAL_RECOUNT_REQUIRED',
  }, 409);
  assert.equal(bareKnown.code, 'PHYSICAL_RECOUNT_REQUIRED');
  assert.equal(bareKnown.messageAr, 'يجب إجراء جرد نقدي فعلي قبل المتابعة');

  // Envelope 3b: Bare message with arbitrary text
  const bareText = new ApiError({
    message: 'Connection timed out',
  }, 504);
  assert.equal(bareText.code, 'UNKNOWN');
  assert.equal(bareText.message, 'Connection timed out');
  assert.equal(bareText.messageAr, 'Connection timed out');
});
