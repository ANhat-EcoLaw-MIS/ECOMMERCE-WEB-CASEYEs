export type FakeResult = {
  data: unknown;
  error: { message: string; code?: string } | null;
};

export type FakeCall = {
  table: string;
  method: string;
  args?: unknown[];
  payload?: unknown;
};

export class FakeSupabaseQueryBuilder {
  public result: FakeResult = { data: null, error: null };

  constructor(
    private readonly client: FakeSupabaseClient,
    public readonly table: string,
  ) {}

  select(columns = '*') {
    this.push('select', [columns]);
    return this;
  }

  insert(values: unknown) {
    this.push('insert', undefined, values);
    return this;
  }

  update(values: unknown) {
    this.push('update', undefined, values);
    return this;
  }

  delete() {
    this.push('delete');
    return this;
  }

  eq(field: string, value: unknown) {
    this.push('eq', [field, value]);
    return this;
  }

  maybeSingle() {
    this.push('maybeSingle');
    return this;
  }

  single() {
    this.push('single');
    return this;
  }

  private push(method: string, args?: unknown[], payload?: unknown) {
    this.client.calls.push({
      table: this.table,
      method,
      args,
      payload,
    });
  }

  then<TResult1 = FakeResult, TResult2 = never>(
    onfulfilled?: ((value: FakeResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }
}

export class FakeSupabaseClient {
  public readonly calls: FakeCall[] = [];
  private readonly results = new Map<string, FakeResult>();

  setTableResult(table: string, result: FakeResult) {
    this.results.set(table, result);
  }

  from(table: string) {
    const builder = new FakeSupabaseQueryBuilder(this, table);
    builder.result = this.results.get(table) ?? { data: null, error: null };
    return builder;
  }
}
