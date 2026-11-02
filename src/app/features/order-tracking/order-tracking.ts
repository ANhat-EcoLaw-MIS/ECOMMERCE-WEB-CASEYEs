import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CancellationReason, ComplaintType, Order, OrderStatus } from './models/order-tracking.model';
import { OrderTrackingService } from './services/order-tracking.service';

@Component({
  selector: 'app-order-tracking',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './order-tracking.html',
  styleUrl: './order-tracking.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderTracking {
  protected readonly trackingService = inject(OrderTrackingService);

  // View state: 'list' (Shopee-style "Đơn Mua Của Tôi") hoặc 'detail' (Chi tiết tiến độ đơn hàng)
  readonly activeView = signal<'list' | 'detail'>('list');

  // Sidebar active nav tab
  readonly activeSidebarNav = signal<'profile' | 'orders' | 'addresses' | 'loyalty' | 'notifications'>('orders');

  // Shopee status tabs filter
  readonly selectedStatusTab = signal<string>('all');
  readonly listSearchQuery = signal<string>('');

  // Search input on hero / header
  readonly searchInput = signal<string>('#CASEYE-8892');

  // All orders from service
  readonly allOrders = this.trackingService.orders;
  readonly currentOrder = this.trackingService.selectedOrder;

  // Countdown timer for 30 minutes cancellation window (FR-OT-05)
  readonly cancelTimerMinutes = signal<string>('18:42');

  // Modal open states
  readonly isCancelModalOpen = signal<boolean>(false);
  readonly isReviewModalOpen = signal<boolean>(false);
  readonly isIssueModalOpen = signal<boolean>(false);
  readonly isSimulatorOpen = signal<boolean>(false);

  // Modal form bindings
  selectedCancelReason: CancellationReason = 'Changed_Mind';
  cancelNoteText = '';

  selectedRatingStars = signal<number>(5);
  reviewCommentText = '';

  selectedIssueType: ComplaintType = 'Print_Defect';
  issueDescText = '';

  // Tab badge counts
  readonly tabCounts = computed(() => {
    const list = this.allOrders();
    return {
      all: list.length,
      Pending_Confirmation: list.filter((o) => o.status === 'Pending_Confirmation').length,
      In_Production: list.filter((o) => o.status === 'In_Production').length,
      Ready_for_Pickup: list.filter((o) => o.status === 'Ready_for_Pickup').length,
      In_Transit: list.filter((o) => o.status === 'In_Transit').length,
      Delivered: list.filter((o) => o.status === 'Delivered' || o.status === 'Completed').length,
      Delivery_Failed: list.filter((o) => o.status === 'Delivery_Failed' || o.status === 'Warehouse_Received').length,
      Cancelled: list.filter((o) => o.status === 'Cancelled').length,
    };
  });

  // Filtered orders in list view
  readonly filteredOrders = computed(() => {
    const tab = this.selectedStatusTab();
    const query = this.listSearchQuery().trim().toLowerCase();
    let result = this.allOrders();

    if (tab !== 'all') {
      if (tab === 'Delivered') {
        result = result.filter((o) => o.status === 'Delivered' || o.status === 'Completed');
      } else if (tab === 'Delivery_Failed') {
        result = result.filter((o) => o.status === 'Delivery_Failed' || o.status === 'Warehouse_Received');
      } else {
        result = result.filter((o) => o.status === tab);
      }
    }

    if (query) {
      result = result.filter((o) => {
        const matchCode = o.orderCode.toLowerCase().includes(query);
        const matchItem = o.items.some(
          (item) =>
            item.productName.toLowerCase().includes(query) ||
            item.phoneModel.toLowerCase().includes(query)
        );
        return matchCode || matchItem;
      });
    }

    return result;
  });

  // Adaptive Timeline calculations (FR-OT-01 & FR-OT-02)
  readonly timelineSteps = computed(() => {
    const order = this.currentOrder();
    if (!order) return [];

    const status = order.status;

    // Các bước chuẩn: 5 mốc khi có Custom Item, 4 mốc khi chỉ có phụ kiện sẵn
    const steps = [
      {
        key: 'confirmed',
        label: 'Đã xác nhận',
        desc: 'Đơn hàng hợp lệ, đã tiếp nhận',
        time: '28/10 14:20',
        icon: 'check-circle',
        isCurrent: status === 'Pending_Confirmation',
        isCompleted: status !== 'Pending_Confirmation' && status !== 'Cancelled',
      },
      {
        key: 'printing',
        label: 'Đang in ấn UV',
        desc: 'Xưởng in nổi 3 lớp & kiểm định QC',
        time: '28/10 15:10',
        icon: 'printer',
        hidden: !order.hasCustomItem, // Ẩn khi chỉ có hàng sẵn (4 mốc)
        isCurrent: status === 'In_Production',
        isCompleted: ['Ready_for_Pickup', 'In_Transit', 'Delivered', 'Completed'].includes(status),
      },
      {
        key: 'packaging',
        label: 'Đóng gói kiện',
        desc: order.holdPackagingForCustom
          ? 'Đóng gói đồng bộ: Ốp Custom & Phụ kiện'
          : 'Kiểm định QC & Đóng gói chống sốc',
        time: 'Dự kiến 29/10',
        icon: 'package',
        isCurrent: status === 'Ready_for_Pickup',
        isCompleted: ['In_Transit', 'Delivered', 'Completed'].includes(status),
      },
      {
        key: 'shipping',
        label: 'Đang vận chuyển',
        desc: 'Đơn vị GHN Express',
        time: `${order.eddStart} - ${order.eddEnd}`,
        icon: 'truck',
        isCurrent: status === 'In_Transit',
        isCompleted: ['Delivered', 'Completed'].includes(status),
      },
      {
        key: 'completed',
        label: 'Hoàn tất giao nhận',
        desc: 'Nhận hàng & Tích điểm Loyalty',
        time: order.status === 'Completed' ? 'Đã hoàn tất' : 'Chờ khách xác nhận',
        icon: 'award',
        isCurrent: status === 'Delivered',
        isCompleted: status === 'Completed',
      },
    ];

    return steps.filter((s) => !s.hidden);
  });

  readonly timelineProgressPercent = computed(() => {
    const order = this.currentOrder();
    if (!order) return 0;
    const status = order.status;

    if (order.hasCustomItem) {
      // 5 mốc
      if (status === 'Pending_Confirmation') return 10;
      if (status === 'In_Production') return 30;
      if (status === 'Ready_for_Pickup') return 55;
      if (status === 'In_Transit') return 75;
      if (status === 'Delivered') return 90;
      if (status === 'Completed') return 100;
    } else {
      // 4 mốc
      if (status === 'Pending_Confirmation') return 12;
      if (status === 'Ready_for_Pickup') return 40;
      if (status === 'In_Transit') return 70;
      if (status === 'Delivered') return 90;
      if (status === 'Completed') return 100;
    }
    return 0;
  });

  // Switch Views
  viewOrderDetail(orderId: string): void {
    this.trackingService.selectOrder(orderId);
    this.activeView.set('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  backToList(): void {
    this.activeView.set('list');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  setStatusTab(tab: string): void {
    this.selectedStatusTab.set(tab);
  }

  // Quick lookup search
  onSearch(): void {
    const query = this.searchInput().trim();
    if (!query) return;

    const success = this.trackingService.searchOrder(query);
    if (success) {
      this.activeView.set('detail');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      alert(`Không tìm thấy đơn hàng "${query}". Vui lòng thử lại với mã đơn #CASEYE-8892.`);
    }
  }

  loadScenario(id: string): void {
    this.trackingService.selectOrder(id);
    const ord = this.currentOrder();
    if (ord) {
      this.searchInput.set(ord.orderCode);
    }
    this.activeView.set('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleSimulator(): void {
    this.isSimulatorOpen.update((v) => !v);
  }

  // Modals Actions
  openCancelModal(): void {
    this.isCancelModalOpen.set(true);
  }
  closeCancelModal(): void {
    this.isCancelModalOpen.set(false);
  }
  confirmCancelOrder(): void {
    const order = this.currentOrder();
    if (!order) return;
    const result = this.trackingService.cancelOrder(order.id, this.selectedCancelReason, this.cancelNoteText);
    alert(result.message);
    this.closeCancelModal();
  }

  openReviewModal(): void {
    this.isReviewModalOpen.set(true);
  }
  closeReviewModal(): void {
    this.isReviewModalOpen.set(false);
  }
  setRating(stars: number): void {
    this.selectedRatingStars.set(stars);
  }
  submitReview(): void {
    const order = this.currentOrder();
    if (!order) return;
    this.trackingService.submitReview(order.id, this.selectedRatingStars(), this.reviewCommentText);
    alert('Cảm ơn bạn đã đánh giá! 50 Điểm thưởng Loyalty đã được cộng vào tài khoản của bạn.');
    this.closeReviewModal();
  }

  openIssueModal(): void {
    this.isIssueModalOpen.set(true);
  }
  closeIssueModal(): void {
    this.isIssueModalOpen.set(false);
  }
  submitIssue(): void {
    const order = this.currentOrder();
    if (!order) return;
    this.trackingService.submitIssue(order.id, this.selectedIssueType, this.issueDescText, [
      'https://placeholder.com/evidence1.jpg',
    ]);
    alert('Yêu cầu khiếu nại đã được ghi nhận và gửi sang phòng CSKH! Mã Ticket #TK-8892.');
    this.closeIssueModal();
  }

  onConfirmReceived(): void {
    const order = this.currentOrder();
    if (!order) return;
    this.trackingService.confirmDelivery(order.id);
    this.openReviewModal();
  }

  onRequestRedelivery(): void {
    const order = this.currentOrder();
    if (!order) return;
    this.trackingService.requestRedelivery(order.id);
    alert('Yêu cầu giao lại thành công! Đơn hàng được cập nhật về trạng thái Đang vận chuyển (In_Transit).');
  }

  // Simulators for demo
  mock3pl(event: 'In_Transit' | 'Delivered' | 'Delivery_Failed' | 'Warehouse_Received'): void {
    const order = this.currentOrder();
    if (!order) return;
    this.trackingService.mockWebhook(order.id, event);
    alert(`🔔 [3PL Webhook Simulator]: Đã kích hoạt sự kiện ${event} cho đơn ${order.orderCode}!`);
  }

  mockQcDefect(): void {
    const order = this.currentOrder();
    if (!order) return;
    this.trackingService.markQcDefect(order.id);
    alert(`🛠️ [Admin QC Simulator]: Đã đánh dấu in lại lỗi QC cho đơn ${order.orderCode}. Tự động gia hạn +2 ngày vào EDD!`);
  }
}
