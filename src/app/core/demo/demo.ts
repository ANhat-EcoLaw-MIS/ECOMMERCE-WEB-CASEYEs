import { Component, inject, signal, OnInit } from '@angular/core';
import {TestRepository} from '../supabase/supabase-repository';
import {Row} from '../supabase/supabase.types';


@Component({
  imports: [],
  selector: 'app-demo',
  styleUrl: './demo.scss',
  templateUrl: './demo.html',
})
export class Demo implements OnInit {
  private readonly repo=inject(TestRepository);
  readonly items=signal<Row<'test'>[]>([])
  readonly error=signal<string|null>(null)

  ngOnInit() {this.load().then(r => console.log(r));}

  async load(){
    const res= await this.repo.list();
    if (res.error) return this.error.set(res.error.message);
    this.error.set(null);
    this.items.set(res.data)
  }

  async add(title:string){
    if (!title.trim()) return;
    const res=await this.repo.create({title:title});
    if (res.error) return this.error.set(res.error.message);
    this.items.update(list =>[...list, res.data]);
  }
  // UPDATE
  async rename(item:Row<'test'>){
    const title=prompt("New title?", item.title);
    if (!title) return;
    const res = await this.repo.update(item.id, { title });
    if (res.error) return this.error.set(res.error.message);
    this.items.update(list => list.map(i => (i.id === item.id ? res.data : i)));
  }

  async remove(id: string) {
    const res = await this.repo.remove(id);
    if (res.error) return this.error.set(res.error.message);
    this.items.update(list => list.filter(i => i.id !== id));
  }
}
