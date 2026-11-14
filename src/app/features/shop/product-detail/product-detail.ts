import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { CartState } from '../../../core/cart-state/cart-state';
import { CartDrawerState } from '../../../core/cart-state/cart-drawer-state';
import { injectRequireLogin } from '../../../core/auth/require-login';
import { Case3d } from '../../../shared/ui/case-3d/case-3d';
import { MODELS, PRODUCTS, ACCESSORIES, productImage, type CatalogAccessory } from '../catalog';

@Component({ selector:'app-product-detail',standalone:true, imports:[RouterLink, Case3d], templateUrl:'./product-detail.html', styleUrl:'./product-detail.scss', changeDetection:ChangeDetectionStrategy.OnPush })
export class ProductDetail {
  protected readonly route=inject(ActivatedRoute);
  private readonly cart=inject(CartState);
  private readonly drawer=inject(CartDrawerState);
  private readonly requireLogin = injectRequireLogin();
  protected readonly productImage = productImage;
  protected readonly models=MODELS;
  protected readonly accessories=ACCESSORIES;
  protected readonly routeParams=toSignal(this.route.paramMap,{initialValue:this.route.snapshot.paramMap});
  protected readonly product=computed(()=>PRODUCTS.find(p=>p.id===this.routeParams().get('id')));
  protected readonly related=computed(()=>{
    const current=this.product();
    if(!current)return [];
    return [...PRODUCTS].filter(p=>p.id!==current.id).sort((a,b)=>Number(b.collection===current.collection)-Number(a.collection===current.collection)).slice(0,4);
  });
  protected readonly model=signal(MODELS[0]);
  protected readonly view=signal<'3d'|'2d'>('2d');
  protected readonly galleryIndex=signal(0);
  protected readonly infoTab=signal<'description'|'specs'|'reviews'>('description');
  protected readonly galleryPhotos=computed(()=>{const p=this.product();return p ? [productImage(p.id),`/products/${p.id}-detail.webp`,`/products/${p.id}-finish.webp`] : [];});
  protected readonly accentColors=['#493077','#d5c6ee','#f5e9fb','#221d32'];
  protected readonly color=signal('#493077');
  protected readonly materials=['TPU chống sốc','PC cứng','Silicone mềm'];
  protected readonly material=signal('TPU chống sốc');
  protected readonly quantity=signal(1);
  protected readonly notice=signal('');
  protected readonly money=(amount:number)=>new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(amount);
  constructor(){const m=this.route.snapshot.queryParamMap.get('model');if(m && MODELS.includes(m))this.model.set(m);}
  protected setGallery(i:number):void{this.galleryIndex.set(Math.max(0,Math.min(this.galleryPhotos().length-1,i)));}
  protected nextGallery():void{this.setGallery((this.galleryIndex()+1)%this.galleryPhotos().length);}
  protected prevGallery():void{this.setGallery((this.galleryIndex()+this.galleryPhotos().length-1)%this.galleryPhotos().length);}
  protected updateModel(e:Event):void{this.model.set((e.target as HTMLSelectElement).value);}
  protected increase():void{this.quantity.update(v=>Math.min(20,v+1));}
  protected decrease():void{this.quantity.update(v=>Math.max(1,v-1));}
  protected resetView():void{this.view.set('2d');this.galleryIndex.set(0);this.quantity.set(1);if(typeof window !== 'undefined') window.scrollTo({top:0,behavior:'smooth'});}
  protected addAccessory(item:CatalogAccessory):void{
    if (!this.requireLogin(`/shop/${this.product()?.id || 'bloom-club'}`)) return;
    this.cart.add({id:item.id,name:item.name,model:'Phụ kiện',finish:'Phụ kiện CasEYE’s (demo)',tone:'lilac',caption:'',unitPrice:item.price,quantity:1,stock:item.stock,custom:true,snapshot:item.image});
    this.notice.set('Đã thêm phụ kiện vào giỏ');
    this.drawer.show(true);
  }
  protected add():void{
    const p=this.product();if(!p || p.stock<1)return;
    if(!this.requireLogin(`/shop/${p.id}?model=${encodeURIComponent(this.model())}`))return;
    this.cart.add({id:p.id+':'+this.model()+':'+this.material(),name:p.name,model:this.model(),finish:this.material()+' · '+p.material,tone:p.tone,caption:p.caption,unitPrice:p.price,quantity:this.quantity(),stock:p.stock,custom:false});
    this.notice.set('Đã thêm vào giỏ hàng');this.drawer.show(true);
  }

  protected onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (!img || img.dataset['fallbackApplied'] === 'true') return;
    img.dataset['fallbackApplied'] = 'true';
    img.src = '/products/bloom-club.webp';
  }
}
