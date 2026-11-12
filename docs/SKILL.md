---
name: angular-project-conventions
description: Coding conventions for the Angular 20 phone case ecommerce project (Angular + Tailwind + SCSS + Supabase). Covers the project directory and what each folder is for, the Angular 20 file and class naming style (no ".component" suffix), routing and lazy loading, and modern Angular syntax (signals, input(), output(), computed(), inject(), @if/@for). Use this skill whenever writing, editing, reviewing or placing ANY Angular code in this project, including components, pages, services, guards, pipes, directives, routes, models, forms, Supabase calls and ng generate commands, and whenever the user asks "where should this file go", "add a page", "add a route" or "create a component", even if they do not mention conventions. Read it before creating any file. For visual styling (colors, gradients, spacing, effects) also use the phonecase-brand-styling skill.
---

# Angular Project Conventions

Follow this file so that code written by different people and different AI assistants looks the same and lands in the right place. Most mistakes in this project come from four sources: old Angular habits (NgModules, `@Input()`, `*ngIf`), the old `.component.ts` naming, files created in the wrong folder, and lazy routes pointing at the wrong thing. This skill targets all four.

## 1. Stack

- **Angular 20**, standalone components only. There are no NgModules in this project.
- **TypeScript** in strict mode. Do not use `any`; use `unknown` or a proper type.
- **Tailwind CSS v4** (tokens in plain CSS with `@theme`) plus **SCSS** for effects only.
- **Supabase** for auth, database and storage.
- **Change detection:** every component is `OnPush`. State lives in signals.
- UI text shown to customers is Vietnamese. Code, identifiers and comments are English.

Check `package.json` for the exact versions before using version-specific syntax.

## 2. Project directory

```
phonecase-store/
├── public/                         Static files served as-is from the site root
│   ├── brand_signature/            Brand images
│   ├── favicon.ico
│   └── logo.png                    Served at /logo.png
├── src/
│   ├── app/
│   │   ├── core/                   App-wide singletons and the app shell pieces
│   │   │   ├── layout/             Header, footer (shell UI)
│   │   │   ├── not-found/          404 page
│   │   │   └── supabase/           The database CONNECTION only (one client). No queries here.
│   │   ├── features/               One folder per epic (see section 2.2)
│   │   ├── shared/                 Reusable, feature-agnostic building blocks
│   │   ├── app.ts                  Root component, class App (the shell)
│   │   ├── app.html
│   │   ├── app.scss
│   │   ├── app.spec.ts             Test for App
│   │   ├── app.config.ts           Providers (router, http, etc.)
│   │   └── app.routes.ts           Top-level routing map
│   ├── styles/                     Global styles (compiled by the Angular build)
│   │   ├── tokens.css              Tailwind @theme: brand colors, fonts, shadows, gradients
│   │   ├── _effects.scss           Shared effects: glass, glow, blobs, keyframes
│   │   └── _mixins.scss            Reusable SCSS helpers
│   ├── index.html                  The single HTML shell Angular loads
│   ├── main.ts                     Bootstraps App with appConfig
│   └── styles.scss                 Global stylesheet entry (imports the files above)
└── supabase/                       Migrations, seed data, edge functions (outside src)
```

### 2.1 What each folder means

| Folder | Purpose | Rule |
|---|---|---|
| `public/` | Static files that are copied as-is (logos, favicon, fonts, mockup images). A file at `public/images/a.webp` is served at `/images/a.webp`. | Do **not** use `src/assets/` (old convention). Do not write `public` in the URL. Anything the build must process goes in `src/`. |
| `src/app/core/` | Things that exist once for the whole app: the shell UI (header, footer), the Supabase client, auth/session state, cart state, global error handling, the 404 page. | May import from `shared/`. Never imports from `features/`. |
| `src/app/shared/` | Reusable pieces that know nothing about any feature: UI primitives (`ui/`), directives, pipes, cross-feature models, utilities. | Imports nothing from `core/` or `features/`. |
| `src/app/features/` | One folder per epic (landing, shop, design-studio, cart, account, support, ...). | May import from `core/` and `shared/`. **Never from another feature.** |
| `src/styles/` | Global brand system and reusable effects. | Tailwind tokens stay in plain `.css`. Use `.scss` only for effects, mixins and keyframes. |
| `supabase/` | Database migrations, seeds, edge functions. | Not part of the Angular build. |

### 2.2 Inside a feature

```
features/shop/
├── shop.routes.ts            Routes of this feature (exports SHOP_ROUTES)
├── shop.ts / .html / .scss   The feature's entry page, class Shop
├── product-detail/           Another routed page: product-detail.ts / .html / .scss
├── components/               UI used only inside this feature
│   └── product-card/
├── services/                 Data access and state for this feature
├── models/                   Interfaces and types for this feature
└── sections/                 (landing only) page sections such as hero/, how-it-works/
```

Create subfolders only when you need them. A small feature can be just `<name>.routes.ts` and `<name>.ts`.

### 2.3 Where does this go?

| I am creating... | Put it in |
|---|---|
| A routed page of a feature | `features/<feature>/<page>/` |
| A widget used by one feature only | `features/<feature>/components/<name>/` |
| A widget used by two or more features (button, card, badge) | `shared/ui/<name>/` |
| State needed by several features **or** by the shell (auth session, cart count, current user) | `core/` as a service (for example `core/cart-state/`) |
| State used inside one feature | `features/<feature>/services/` |
| A Supabase call | A service. Never inside a component. |
| An interface used by several features | `shared/models/` |
| A pure helper function | `shared/utils/` |
| A guard or interceptor | `core/auth/` (or the feature if it is feature-only) |
| A logo or image | `public/` |

Important consequence of the dependency rule: the header lives in `core/`, so the cart count it displays must come from a service in `core/` or `shared/`, not from `features/cart/`.

## 3. Naming conventions (Angular 20 style)

There is **no** `.component.ts`, `.page.ts` or `.component` suffix. The file is named after the thing, and the class is the same name in PascalCase with no suffix. This is exactly what `ng generate` produces in Angular 20, so use the CLI output as the reference.

```
ng generate component features/shop/components/product-card
```
creates:
```
product-card/
├── product-card.ts        export class ProductCard
├── product-card.html
├── product-card.scss
└── product-card.spec.ts      optional (see section 8)
```

| Thing | Command | File | Class / export |
|---|---|---|---|
| Component or page | `ng g c hero` | `hero.ts` | `Hero` |
| Service | `ng g s cart-state` | `cart-state.ts` | `CartState` |
| Directive | `ng g d reveal` | `reveal.ts` | `Reveal` (selector `[appReveal]`) |
| Pipe | `ng g pipe price` | `price-pipe.ts` | `PricePipe` |
| Guard | `ng g guard auth` | `auth-guard.ts` | `authGuard` (function) |
| Interceptor | `ng g interceptor auth` | `auth-interceptor.ts` | `authInterceptor` (function) |
| Resolver | `ng g resolver product` | `product-resolver.ts` | `productResolver` (function) |
| Routes file | written by hand | `shop.routes.ts` | `SHOP_ROUTES` (`Routes`) |
| Model | written by hand | `product.model.ts` | `Product` (interface) |
| Constants / config | written by hand | `nav-items.ts` | `NAV_ITEMS` |

Rules:

- **Always use kebab-case** for file and folder names: `product-detail.ts`, never `ProductDetail.ts` or `productDetail.ts`.
- **One folder per component**, named like the component, containing its `.ts`, `.html` and `.scss` (plus a `.spec.ts` if you write a test).
- **Selector:** prefix `app-` and kebab-case: `app-product-card`. Directive selectors use camelCase with the `app` prefix: `[appReveal]`.
- **Name clashes:** a feature page `Cart` and a service `Cart` would collide. When the natural name is already used by a component, name the service by its role: `cart-state`, `product-api`, `auth-session`.
- **Templates and styles:** use a separate `.html` file by default (`templateUrl`). Inline `template` only when it is under about 15 lines. Use `styleUrl` (singular), and only create the `.scss` file when the component needs custom effects; Tailwind classes cover the rest.
- If you cannot run the CLI, create the same files by hand with the same names and structure.
- Tests are optional, so you may generate with `--skip-tests` (for example `ng g c hero --skip-tests`).
- `ng generate` does not add `OnPush`. Add `changeDetection: ChangeDetectionStrategy.OnPush` to every component you create (or set it as the default in the `@schematics/angular:component` section of `angular.json`).

## 4. Modern Angular syntax

Write all new code with signals and the new control flow. Do not use the legacy forms in the right column.

| Do | Don't |
|---|---|
| `readonly name = input<string>()`, `input.required<string>()` | `@Input()` |
| `readonly changed = output<string>()` | `@Output()` + `EventEmitter` |
| `readonly value = model(0)` for two-way binding | `@Input()` + `@Output()` pairs |
| `signal()` for state, `computed()` for derived values | Plain mutable fields, getters that recompute |
| `inject(Service)` | Constructor parameter injection |
| `viewChild()`, `viewChildren()`, `contentChild()` | `@ViewChild`, `@ViewChildren` |
| `host: { '(window:keydown)': 'onKey($event)', '[class.open]': 'open()' }` | `@HostListener`, `@HostBinding` |
| `@if`, `@else`, `@for (x of xs; track x.id)`, `@switch`, `@defer` | `*ngIf`, `*ngFor`, `*ngSwitch` |
| `[class.active]="isActive()"`, `[class]`, `[style.width.px]` | `NgClass`, `NgStyle` |
| `@let total = price() * qty();` for template-local values | Repeating the same expression |
| Standalone component with `imports: [...]` | NgModules |
| `toSignal(obs$)` to read an Observable in a template | Subscribing manually in components |
| `NgOptimizedImage` (`ngSrc`) for content images | Bare `<img>` without size or priority handling |

### Reference example

```ts
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-product-card',
  templateUrl: './product-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCard {
  // inputs and outputs
  readonly name = input.required<string>();
  readonly price = input.required<number>();
  readonly rating = input(0);
  readonly favorited = output<boolean>();

  // local state
  protected readonly liked = signal(false);

  // derived state
  protected readonly priceLabel = computed(() => `${this.price().toLocaleString('vi-VN')}đ`);
  protected readonly hasRating = computed(() => this.rating() > 0);

  protected toggleLike(): void {
    this.liked.update((v) => !v);
    this.favorited.emit(this.liked());
  }
}
```

```html
<article class="rounded-card border border-line bg-surface-alt p-4 shadow-soft">
  <h3 class="font-display font-bold">{{ name() }}</h3>
  @if (hasRating()) {
    <p class="text-sm text-ink-soft">{{ rating() }} / 5</p>
  }
  <p class="font-bold text-brand-800">{{ priceLabel() }}</p>
  <button type="button" (click)="toggleLike()" [attr.aria-pressed]="liked()">Yêu thích</button>
</article>
```

### Component rules

- Members used only by the template are `protected`; the public API of a component is its inputs and outputs.
- Mark inputs and injected services `readonly`.
- Always give `@for` a `track` expression (a stable id, not the index unless the list is static).
- Call signals with parentheses in templates: `{{ count() }}`.
- Do not mutate input values. Derive with `computed()` or copy into a `signal()`.
- Use `effect()` rarely, only for side effects (logging, syncing to storage). Never use it to derive state; that is what `computed()` is for.
- Services that hold state keep the writable signal private and expose a read-only view:

```ts
@Injectable({ providedIn: 'root' })
export class CartState {
  private readonly _items = signal<CartItem[]>([]);
  readonly items = this._items.asReadonly();
  readonly count = computed(() => this._items().reduce((n, i) => n + i.qty, 0));

  add(item: CartItem): void {
    this._items.update((items) => [...items, item]);
  }
}
```

- Forms use **typed Reactive Forms** (`FormBuilder` with `nonNullable`), not template-driven `ngModel`.
- Handle loading and error states explicitly for anything fetched from Supabase.

## 5. Routing

### 5.1 The routing map

Each top-level URL is a module. Every module except the landing page is **lazy-loaded** and owns its own `<module>.routes.ts`, so teammates add child routes in their module and rarely touch `app.routes.ts`.

```
/                → Landing          (loadComponent)
/design-studio   → Design Studio    (loadChildren → DESIGN_STUDIO_ROUTES)
/shop            → Shop             (loadChildren → SHOP_ROUTES)
/support         → Customer service (loadChildren → SUPPORT_ROUTES)
/cart            → Cart             (loadChildren → CART_ROUTES; checkout later at /cart/checkout)
/account         → Account          (loadChildren → ACCOUNT_ROUTES; profile, orders)
**               → NotFound         (loadComponent, always last)
```

### 5.2 `loadComponent` vs `loadChildren` (the most common mistake)

- `loadComponent` loads **one component**: the import resolves to a file such as `./shop` and you return the class (`m.Shop`).
- `loadChildren` loads **a list of routes**: the import resolves to `*.routes.ts` and you return the `Routes` array (`m.SHOP_ROUTES`).

Mixing them up causes the runtime error `NgModule '_X' is not a subtype of 'NgModuleType'` when the user clicks the link. If you see it, a `loadChildren` is returning a component class.

```ts
// app.routes.ts: correct
{
  path: 'shop',
  loadChildren: () => import('./features/shop/shop.routes').then((m) => m.SHOP_ROUTES),
},

// shop.routes.ts: correct
export const SHOP_ROUTES: Routes = [
  {
    path: '',
    title: 'Cửa hàng | CaseCraft',
    loadComponent: () => import('./shop').then((m) => m.Shop),
  },
  {
    path: ':productId',
    title: 'Chi tiết sản phẩm | CaseCraft',
    loadComponent: () => import('./product-detail/product-detail').then((m) => m.ProductDetail),
  },
];
```

### 5.3 Routing rules

- Use `loadComponent` / `loadChildren`. Never import a page class eagerly into a routes file.
- Every route has a `title`.
- Route params arrive as **inputs** because `withComponentInputBinding()` is enabled: `readonly productId = input.required<string>();`. Do not inject `ActivatedRoute` for this.
- Guards, interceptors and resolvers are **functions** (`CanActivateFn`), not classes.
- Navigate with `routerLink` in templates and `inject(Router)` in code. Use `routerLinkActive` with `ariaCurrentWhenActive="page"` for active nav links.
- The wildcard `**` route is always last.
- The design studio is a canvas editor and may later need a full-screen layout without the header. Do this with a separate layout route, not by hacking the header.

### 5.4 Adding a new module

1. Create `features/<name>/` and generate the page: `ng g c features/<name>`.
2. Create `<name>.routes.ts` exporting `<NAME>_ROUTES` with a `loadComponent` route for the page.
3. Add one `loadChildren` entry to `app.routes.ts` (above `**`).
4. If it needs a navigation link, add it to the header's `nav-items.ts`.
5. Check that it does not import from any other feature.

## 6. Supabase

Supabase code is split into two layers. Keep them separate.

**1. Connection: `core/supabase/`.** This folder only creates the connection. It builds the one Supabase client, reads the keys from environment configuration and makes the client available through `inject()`. It contains **no queries** and no feature logic.

```ts
// core/supabase/supabase.ts
@Injectable({ providedIn: 'root' })
export class Supabase {
  readonly client = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
}
```

**2. Data access layer: services inside each feature.** The code that actually reads and writes data lives in services such as `features/shop/services/product-api.ts`. They use `inject(Supabase).client`, run the queries, convert the rows into typed models and expose signals (data, loading, error). Data shared by several features or by the shell (auth session, cart) lives in a service in `core/` instead.

Rules:

- There is exactly **one** client. Never call `createClient` anywhere else.
- Keys come from environment configuration, never hard-coded. Only the public anon key is used in the browser.
- Components never talk to Supabase directly. They use a data access service.
- Database changes go through migrations in `supabase/`, not manual edits.

## 7. Styling

Follow the **phonecase-brand-styling** skill for everything visual. In short:

- Tailwind utilities in the `.html` for layout, spacing, typography and color. Use the brand tokens (`bg-brand-800`, `text-ink`, `rounded-card`, `shadow-soft`, `font-display`), never raw hex values.
- A component's `.scss` is only for effects Tailwind cannot express (gradients, blobs, keyframes). Shared effects go in `src/styles/_effects.scss`.
- Every animation respects `prefers-reduced-motion`.

## 8. Tests

Tests are **optional** for now. Do not block a task on writing them, and do not add specs the user did not ask for.

- If a `.spec.ts` already exists (for example `app.spec.ts`) and your change breaks it, fix the spec so it passes or tell the user. Do not delete specs to make a build pass.
- Skip generating new specs with `--skip-tests`, unless the user asks for tests.

## 9. Self-check before you finish

1. Is every new file in the right folder, and does it follow the dependency direction in section 2.1 (no feature-to-feature imports)?
2. Are the file names kebab-case with **no** `.component` suffix, and is the class name simply the PascalCase name?
3. Is the component standalone and `OnPush`, with `input()`, `output()`, `computed()`, `inject()` and `@if` / `@for` (with `track`)?
4. Does each lazy route use the right function (`loadComponent` returns a component, `loadChildren` returns routes), and does every route have a `title`?
5. Are Supabase calls inside a service, with loading and error states handled?
6. Are brand tokens used instead of raw hex values, and is non-essential motion disabled for reduced-motion users?
7. Does `ng build` still pass, and did I avoid breaking any spec that already exists?
