import { productImage } from '../../features/shop/catalog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartState } from './cart-state';
import { CartDrawerState } from './cart-drawer-state';
import { PhoneCaseMock } from '../../shared/ui/phone-case-mock/phone-case-mock';
@Component({
 selector: 'app-cart-drawer', standalone: true,
 imports: [RouterLink],
 templateUrl: './cart-drawer.html', styleUrl: './cart-drawer.scss',
 changeDetection: ChangeDetectionStrategy.OnPush,
 host: { '(document:keydown.escape)': 'drawer.close()' }
})
export class CartDrawer {
 protected readonly cart = inject(CartState);
 protected readonly drawer = inject(CartDrawerState);
 protected readonly productImage = productImage;
 protected readonly money = (value:number) => new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(value);

 protected onImageError(event: Event): void { const img = event.target as HTMLImageElement; if (!img || img.dataset['fallbackApplied'] === 'true') return; img.dataset['fallbackApplied'] = 'true'; img.src = '/products/bloom-club.webp'; }
}
