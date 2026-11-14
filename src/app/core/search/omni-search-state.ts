import { Injectable, signal } from '@angular/core';
import { PRODUCTS } from '../../features/shop/catalog';

/** Local visual similarity preview. Does not call Google Lens or an AI model. */
@Injectable({ providedIn: 'root' })
export class OmniSearchState {
  readonly query = signal('');
  readonly imagePreview = signal<string | null>(null);
  readonly imageColor = signal('');
  readonly imageSearchActive = signal(false);
  readonly colorMatches = signal<string[]>([]);
  readonly message = signal('');
  readonly busy = signal(false);

  search(text: string): void { this.query.set(text); }
  clearImage(): void { this.imagePreview.set(null); this.imageColor.set(''); this.colorMatches.set([]); this.imageSearchActive.set(false); this.message.set(''); }
  async searchByImage(file?: File): Promise<boolean> {
    if (!file) return false;
    if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 5_000_000) {
      this.message.set('Chỉ nhận JPG, PNG hoặc WebP không quá 5 MB.'); return false;
    }
    this.busy.set(true);
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 64;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Canvas unavailable');
      context.drawImage(bitmap,0,0,64,64);bitmap.close();
      const pixels=context.getImageData(0,0,64,64).data;
      let r=0,g=0,b=0,n=0;
      for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]<80)continue;r+=pixels[i];g+=pixels[i+1];b+=pixels[i+2];n++;}
      if(!n)throw new Error('Transparent image');
      r/=n;g/=n;b/=n;
      const palette: Record<string,[number,number,number]> = {
        'lilac-dream':[192,159,239], 'midnight-eyes':[43,31,71], 'bloom-club':[240,218,247],
        'purple-orbit':[164,128,230], 'little-love':[244,232,249], 'noir-muse':[45,39,53],
        'cloud-nine':[198,177,236], 'mono-heart':[232,227,238]
      };
      const score=(id:string):number=>{const c=palette[id]??[200,180,220];return (c[0]-r)**2*.299+(c[1]-g)**2*.587+(c[2]-b)**2*.114;};
      this.colorMatches.set([...PRODUCTS].sort((productA,productB)=>score(productA.id)-score(productB.id)).map(item=>item.id));
      this.imageColor.set(`rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`);
      this.imagePreview.set(canvas.toDataURL('image/png'));
      this.imageSearchActive.set(true);this.query.set('');
      this.message.set('Đã xếp hạng theo màu gần giống. Bản demo này chưa phải Google Lens hoặc tìm kiếm AI bằng ngữ nghĩa.');
      return true;
    }catch {this.message.set('Không thể đọc ảnh. Vui lòng thử ảnh khác.');return false;}
    finally{this.busy.set(false);}
  }
}
