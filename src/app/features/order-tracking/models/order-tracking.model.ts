import type { PaymentMethod, ShippingQuote, ShippingTier } from '../../../shared/models/order-handoff.model';

export type { PaymentMethod, ShippingQuote, ShippingTier };
/**
 * Order Management domain model (BRD/SRD v8, Class Diagram 7.1).
 * The mock store keeps one aggregate per order; the SQL migration in
 * docs/order-management-migration.sql normalises the same shapes into tables.
 */

// ---------------------------------------------------------------- enums

/** Shared status codes with Payment (FR-P-43) and Design Studio (FR-DES-27, 28). */
export const ORDER_STATUSES = [
  'Pending_Confirmation',
  'Pending_Review',
  'Action_Required',
  'In_Production',
  'Ready_for_Pickup',
  'In_Transit',
  'Delivered',
  'Completed',
  'Delivery_Failed',
  'Return_Requested',
  'Cancelled',
  'Refunded',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type ActorType = 'Customer' | 'Operator' | 'Admin' | 'System' | 'Carrier' | 'CustomerService';

export type PaymentStatus = 'Unpaid' | 'Paid';



export type CancelRequestStatus = 'Pending' | 'Accepted' | 'Rejected' | 'Withdrawn';

export type CancelReason = 'High_Shipping_Fee' | 'Changed_Mind' | 'Wrong_Phone_Model' | 'Wrong_Address' | 'Other';
/** Why the order was cancelled, used to decide the Shopping cancelCount event. */
export type CancelCause =
  | 'Customer_In_Window' // COD change of mind: does not count
  | 'Customer_Request_Accepted' // prepaid cancel request accepted by CSKH: does not count
  | 'Design_Rejected' // customer fault
  | 'Design_Fix_Expired' // customer fault
  | 'Delivery_Failed_Customer' // customer fault
  | 'Delivery_Failed_Carrier_Or_Shop'
  | 'Warehouse_Hold_Expired';

export type FailureCause =
  | 'Customer_Unreachable'
  | 'Wrong_Address_By_Customer'
  | 'Customer_Refused'
  | 'Damaged_In_Transit'
  | 'Lost_In_Transit'
  | 'Wrong_Packing_By_Shop'
  | 'Wrong_Shipping_Info_By_Shop';
export type FaultParty = 'Customer' | 'Carrier' | 'Shop';

export type IssueType =
  | 'Print_Defect'
  | 'Wrong_Design_Or_Model'
  | 'Transit_Damage'
  | 'Not_Received'
  | 'Dispute_Failure_Cause';
/** CSKH & Khiếu nại has exactly three compensations plus rejection (no "exchange"). */
export type Resolution = 'Reprint' | 'Voucher' | 'Refund' | 'Rejected';

export type ModerationDecision = 'Approved' | 'Rejected';

export type RefundStatus =
  | 'Pending_Approval'
  | 'Processing'
  | 'Refunded'
  | 'Rejected'
  | 'Refund_Pending_Retry'
  | 'Refund_Pending_Manual';
/** Refunds are bank transfers only (feedback 14/11: no 100% voucher option). */
export type RefundMethod = 'Bank';
/** Table 3.4 situations. S3c never creates a request; it is kept for logging. */
export type RefundSituation = 'S1' | 'S2' | 'S3a' | 'S3b' | 'S3c' | 'S4';

export type ShipmentEventType = 'In_Transit' | 'Delivered' | 'Delivery_Failed' | 'Warehouse_Received';
export type VoucherKind = 'Late_Delivery' | 'Express_Surcharge' | 'Store_Credit' | 'Complaint_Compensation';
export type TargetService = 'Shopping' | 'Loyalty' | 'Notification' | 'CustomerService' | 'Payment';

// ---------------------------------------------------------------- entities

export interface DesignSnapshot {
  readonly id: string;
  readonly previewUrl?: string;
  /** Text printed on the CSS mockup when no image is available. */
  readonly caption?: string;
  /** true when the customer uploaded their own image (FR-DES-27 -> requires_moderation). */
  readonly hasUploadedImage: boolean;
  readonly contentPolicyAcceptedAt?: string;
  /** Number of times the customer re-submitted this design after a rejection. */
  readonly version: number;
}

export interface OrderItem {
  readonly id: string;
  readonly productName: string;
  readonly phoneModel: string;
  readonly baseSku: string;
  readonly isCustom: boolean;
  readonly quantity: number;
  readonly unitPrice: number;
  /** Product photo for in-stock items (from Mua sắm). */
  readonly imageUrl?: string;
  readonly design?: DesignSnapshot;
}

export interface OrderStatusLog {
  readonly id: string;
  readonly from: OrderStatus | null;
  readonly to: OrderStatus;
  readonly actorType: ActorType;
  readonly actorId: string;
  readonly reason: string;
  readonly createdAt: string;
}

export interface ModerationReview {
  readonly id: string;
  readonly round: number;
  readonly decision: ModerationDecision;
  readonly violationGroup?: string;
  readonly reason?: string;
  readonly reviewerId: string;
  readonly createdAt: string;
}

/** Prepaid orders cannot be cancelled directly; CSKH decides (FR-OT-19). */
export interface CancelRequest {
  readonly id: string;
  readonly reason: CancelReason;
  readonly note?: string;
  readonly status: CancelRequestStatus;
  readonly slaDueAt: string;
  readonly createdAt: string;
  readonly decidedAt?: string;
  readonly decidedBy?: string;
  readonly decisionReason?: string;
}

export interface CancellationRecord {
  readonly reason?: CancelReason;
  readonly note?: string;
  readonly cause: CancelCause;
  readonly customerFault: boolean;
  readonly createdAt: string;
}

export interface Review {
  readonly stars: number;
  /** Structured topics tapped by the customer (P1-15), comparable across designs and models. */
  readonly tags: readonly string[];
  readonly photoNames: readonly string[];
  readonly comment: string;
  readonly createdAt: string;
}

export interface DeliveryAttempt {
  readonly attemptNo: number;
  readonly startedAt: string;
  readonly result?: 'Delivered' | 'Failed';
  readonly failureCause?: FailureCause;
  readonly endedAt?: string;
}

export interface Shipment {
  readonly carrier: string;
  readonly trackingCode: string;
  readonly attempts: readonly DeliveryAttempt[];
}

export interface WarehouseHold {
  readonly receivedAt: string;
  readonly expiresAt: string;
  readonly disputed: boolean;
  readonly frozenAt?: string;
}

export interface DestructionRecord {
  readonly createdAt: string;
  readonly note: string;
}

export interface RefundRequest {
  readonly id: string;
  readonly situation: RefundSituation;
  readonly amount: number;
  readonly deductedFee: number;
  readonly status: RefundStatus;
  readonly refundMethod?: RefundMethod;
  readonly refundBank?: string;
  readonly refundAccountNo?: string;
  readonly refundAccountHolder?: string;
  readonly approvedBy?: string;
  readonly bankRef?: string;
  readonly transferAttempts: number;
  readonly rejectReason?: string;
  readonly reminderSentAt?: string;
  /** Still no account after the deadline: handed to CSKH to contact the customer. */
  readonly escalatedAt?: string;
  readonly createdAt: string;
  readonly resolvedAt?: string;
}

export interface ComplaintTicketRef {
  readonly ticketCode: string;
  readonly issueType: IssueType;
  readonly description: string;
  readonly evidenceNames: readonly string[];
  readonly open: boolean;
  readonly resolution?: Resolution;
  readonly resolutionNote?: string;
  readonly createdAt: string;
  readonly resolvedAt?: string;
}

export interface Voucher {
  readonly code: string;
  readonly kind: VoucherKind;
  readonly value: number;
  readonly expiresAt: string;
  readonly createdAt: string;
}

export interface Order {
  readonly id: string;
  readonly orderCode: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly customerEmail: string;
  /** Name on the paying account; refund account holder must match it (FR-OT-13). */
  readonly payerName: string;
  readonly shippingAddress: string;

  readonly status: OrderStatus;
  readonly previousStatus?: OrderStatus;

  readonly paymentMethod: PaymentMethod;
  readonly paymentStatus: PaymentStatus;
  readonly paymentTxnRef?: string;
  readonly goodsTotal: number;
  /** Voucher / points discount applied at checkout (Thanh toán). */
  readonly discount?: number;
  /** Snapshot of Thanh toán's quote (fee, Standard fee, Hỏa tốc surcharge, transit days). */
  readonly shipping: ShippingQuote;
  readonly shippingTier: ShippingTier;

  readonly hasCustomItem: boolean;
  /** Info for the Operator only; every custom design is reviewed (v8). */
  readonly hasUploadedImage: boolean;

  readonly earliestEDD: string;
  readonly latestEDD: string;
  readonly batchDate: string;

  readonly policyVersion: string;
  readonly policyAcceptedAt: string;

  readonly createdAt: string;
  readonly updatedAt: string;
  /** COD only: end of the hidden change-of-mind window (createdAt + 30 min). */
  readonly confirmDueAt?: string;
  /** Set when the order is confirmed (prepaid stock at once, custom when the design is approved). */
  readonly confirmedAt?: string;
  readonly reviewQueuedAt?: string;
  readonly rejectedAt?: string;
  readonly designFixReminderAt?: string;
  readonly designResubmitCount: number;
  readonly deliveredAt?: string;
  readonly autoCompleteAt?: string;
  readonly frozenAt?: string;
  readonly autoCompleteFrozenOnce: boolean;
  readonly reviewInvitePending: boolean;
  readonly redeliveryUsed: boolean;
  readonly redeliveryFeePaid?: number;
  readonly qcReprintCount: number;
  readonly failureCause?: FailureCause;
  /** Set when CSKH & Khiếu nại rules the customer was right about a failed delivery (FR-OT-EX-03). */
  readonly faultOverride?: FaultParty;
  readonly lateVoucherIssued: boolean;

  readonly items: readonly OrderItem[];
  readonly logs: readonly OrderStatusLog[];
  readonly moderationReviews: readonly ModerationReview[];
  readonly cancelRequests: readonly CancelRequest[];
  readonly cancellation?: CancellationRecord;
  readonly review?: Review;
  readonly shipment?: Shipment;
  readonly warehouseHold?: WarehouseHold;
  readonly destruction?: DestructionRecord;
  readonly refunds: readonly RefundRequest[];
  readonly tickets: readonly ComplaintTicketRef[];
  readonly vouchers: readonly Voucher[];
}

// ---------------------------------------------------------------- side tables

export interface PolicyConsent {
  readonly orderId: string;
  readonly userId: string;
  readonly policyVersion: string;
  readonly acceptedAt: string;
}

export interface WebhookEvent {
  readonly eventId: string;
  readonly orderId: string;
  readonly type: ShipmentEventType;
  readonly payload: string;
  readonly result: 'Applied' | 'Duplicate' | 'Rejected';
  readonly message: string;
  readonly receivedAt: string;
}

export interface RetryQueueItem {
  readonly eventId: string;
  readonly target: TargetService;
  readonly type: string;
  readonly payload: string;
  readonly attempts: number;
  readonly lastError: string;
  readonly createdAt: string;
}

export interface InboxMessage {
  readonly id: string;
  readonly eventId: string;
  readonly channel: 'Email' | 'InApp';
  readonly customerId: string;
  readonly title: string;
  readonly body: string;
  readonly link: string;
  readonly createdAt: string;
}

/** Event delivered to another module (Shopping, Loyalty, ...); kept for the demo log. */
export interface OutboundEvent {
  readonly eventId: string;
  readonly target: TargetService;
  readonly type: string;
  readonly payload: string;
  readonly deliveredAt: string;
}
