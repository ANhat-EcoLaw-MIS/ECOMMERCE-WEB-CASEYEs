import { productImage } from '../shop/catalog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartState } from '../../core/cart-state/cart-state';

@Component({selector:'app-cart',imports:[RouterLink],changeDetection:ChangeDetectionStrategy.OnPush,styleUrl:'./cart.scss',templateUrl:'./cart.html'})
export class Cart {
  protected readonly cart = inject(CartState);
  protected readonly productImage = productImage;
  protected readonly couponInput = signal('');
  protected readonly appliedCoupon = signal(false);
  protected readonly couponMessage = signal('');
  protected readonly checkoutMessage = signal('');
  protected readonly acceptedTerms = signal(false);
  protected readonly showTerms = signal(false);
  protected readonly discount = computed(() => this.appliedCoupon() ? Math.round(this.cart.subtotal() * .1) : 0);
  protected readonly total = computed(() => this.cart.subtotal()-this.discount()+this.cart.shipping());
  private readonly formatter = new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0});
  protected MathMin = Math.min;
  protected price(value:number):string{return this.formatter.format(value);}
  protected updateCoupon(e:Event):void{this.couponInput.set((e.target as HTMLInputElement).value);this.couponMessage.set('');}
  protected applyCoupon():void{
    if(this.couponInput().trim().toUpperCase()==='CASEYE10'){this.appliedCoupon.set(true);this.couponMessage.set('Đã áp dụng CASEYE10 — giảm 10%');}
    else {this.appliedCoupon.set(false);this.couponMessage.set('Mã chưa hợp lệ. Bạn có thể thử CASEYE10.');}
  }
  protected removeCoupon():void{this.appliedCoupon.set(false);this.couponInput.set('');this.couponMessage.set('');}
  protected checkout():void{
    if(this.cart.hasStockIssues()){this.checkoutMessage.set('Có sản phẩm vượt số lượng phôi demo. Hãy chỉnh lại số lượng trước.');return;}
    if(!this.acceptedTerms()){this.showTerms.set(true);this.checkoutMessage.set('Vui lòng đồng ý điều khoản sản phẩm cá nhân hóa.');return;}
    this.showTerms.set(true);
    this.checkoutMessage.set('Giỏ hàng đã sẵn sàng. Cần kết nối Authentication, Inventory và Payment để đặt hàng thực tế; chưa phát sinh thanh toán.');
  }

  protected onImageError(event: Event):void{const img=event.target as HTMLImageElement;if(!img||img.dataset['fallbackApplied']==='true')return;img.dataset['fallbackApplied']='true';img.src='/products/bloom-club.webp';}
}
