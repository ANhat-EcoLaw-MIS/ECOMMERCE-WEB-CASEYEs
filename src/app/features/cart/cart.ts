import { productImage, resolveProductImage } from '../shop/catalog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CartState, type CartItem } from '../../core/cart-state/cart-state';
import { NotificationManager } from '../../shared/ui/notification/notification.manager';

@Component({selector:'app-cart',imports:[RouterLink],changeDetection:ChangeDetectionStrategy.OnPush,styleUrl:'./cart.scss',templateUrl:'./cart.html'})
export class Cart {
  protected readonly cart = inject(CartState);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationManager);
  protected readonly productImage = productImage;
  protected readonly resolveImage = (url: string) => resolveProductImage(url) ?? url;
  protected readonly couponInput = signal('');
  protected readonly appliedCoupon = signal(false);
  protected readonly couponMessage = signal('');
  protected readonly checkoutMessage = signal('');
  protected readonly acceptedTerms = signal(false);
  protected readonly showTerms = signal(false);
  protected readonly discount = computed(() => this.appliedCoupon() ? Math.round(this.cart.selectedSubtotal() * .1) : 0);
  // Shipping is decided by Thanh toán (Checkout), not by the cart. Only ticked lines are paid for.
  protected readonly total = computed(() => this.cart.selectedSubtotal()-this.discount());
  private readonly formatter = new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0});
  protected MathMin = Math.min;
  protected price(value:number):string{return this.formatter.format(value);}
  protected updateCoupon(e:Event):void{this.couponInput.set((e.target as HTMLInputElement).value);this.couponMessage.set('');}
  protected applyCoupon():void{
    if(this.couponInput().trim().toUpperCase()==='CASEYE10'){this.appliedCoupon.set(true);this.couponMessage.set('Đã áp dụng CASEYE10 — giảm 10%');}
    else {this.appliedCoupon.set(false);this.couponMessage.set('Mã chưa hợp lệ. Bạn có thể thử CASEYE10.');}
  }
  /** Removes a line, with an "Hoàn tác" (undo) action in the notification. */
  protected removeItem(item: CartItem): void {
    const index = this.cart.items().findIndex((i) => i.id === item.id);
    this.cart.remove(item.id);
    this.notifications.show({
      variant: 'functional',
      title: 'Đã xóa khỏi giỏ hàng',
      message: `${item.name} · ${item.model}`,
      actionLabel: 'Hoàn tác',
      duration: 6000,
      onAction: () => this.cart.restore(item, index),
    });
  }

  /** "−" at quantity 1 removes the line instead of doing nothing. */
  protected decrease(item: CartItem): void {
    if (item.quantity <= 1) this.removeItem(item);
    else this.cart.decrease(item.id);
  }
  protected removeCoupon():void{this.appliedCoupon.set(false);this.couponInput.set('');this.couponMessage.set('');}
  protected checkout():void{
    if(!this.cart.someSelected()){this.checkoutMessage.set('Hãy chọn ít nhất một sản phẩm để thanh toán.');return;}
    if(this.cart.selectedHaveStockIssues()){this.checkoutMessage.set('Có sản phẩm vượt số lượng phôi demo. Hãy chỉnh lại số lượng trước.');return;}
    if(!this.acceptedTerms()){this.showTerms.set(true);this.checkoutMessage.set('Vui lòng đồng ý điều khoản sản phẩm cá nhân hóa.');return;}
    // Integration: Thanh toán reads the SELECTED lines of this cart (CartState.selectedItems) and creates the order.
    void this.router.navigate(['/checkout']);
  }

  protected onImageError(event: Event):void{const img=event.target as HTMLImageElement;if(!img||img.dataset['fallbackApplied']==='true')return;img.dataset['fallbackApplied']='true';img.src='/products/Bg_Case/01_lavender_haze.png';}
}
