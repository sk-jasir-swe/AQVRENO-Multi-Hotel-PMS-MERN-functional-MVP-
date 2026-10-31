export function netPaymentExpression() {
  return {
    $subtract: [
      "$amount",
      {
        $ifNull: [
          "$refundAmount",
          { $cond: [{ $eq: ["$status", "refunded"] }, "$amount", 0] },
        ],
      },
    ],
  };
}

export function refundedPaymentExpression() {
  return {
    $ifNull: [
      "$refundAmount",
      { $cond: [{ $eq: ["$status", "refunded"] }, "$amount", 0] },
    ],
  };
}
