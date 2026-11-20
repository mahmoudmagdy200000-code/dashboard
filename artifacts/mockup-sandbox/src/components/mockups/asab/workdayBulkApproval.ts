export type WorkdayApprovalReview = {
  id: string;
  publicId?: string;
  workflowKind?: string;
  branchName?: string;
  workdayReview?: {
    confirmation?: string;
    questions?: { shiftLabel: string; reply: string | null }[];
  };
};

export function prepareWorkdayBulkApproval(reports: readonly WorkdayApprovalReview[]) {
  const workdayConfirmations: Record<string, string> = {};
  const openQuestions: string[] = [];
  for (const report of reports) {
    const review = report.workdayReview;
    if (report.workflowKind !== "sal_day" || !report.publicId || !review?.confirmation ||
      !/^[a-f0-9]{64}$/i.test(review.confirmation)) {
      throw new Error("تعذر الحصول على تأكيد حديث لتقرير اليوم. حدّث الصفحة ثم أعد المحاولة.");
    }
    // The API contract indexes confirmations by public_id, while operationIds
    // may contain internal UUIDs that the controller resolves separately.
    workdayConfirmations[report.publicId] = review.confirmation;
    for (const question of review.questions ?? []) {
      if (question.reply === null) openQuestions.push(
        `${report.publicId}${report.branchName ? `، ${report.branchName}` : ""}: ${question.shiftLabel}`,
      );
    }
  }
  return { workdayConfirmations, openQuestions };
}
