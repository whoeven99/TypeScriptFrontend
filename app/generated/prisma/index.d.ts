
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model Session
 * 
 */
export type Session = $Result.DefaultSelection<Prisma.$SessionPayload>
/**
 * Model ShopTranslationSettings
 * 
 */
export type ShopTranslationSettings = $Result.DefaultSelection<Prisma.$ShopTranslationSettingsPayload>
/**
 * Model ShopTargetLocale
 * 
 */
export type ShopTargetLocale = $Result.DefaultSelection<Prisma.$ShopTargetLocalePayload>
/**
 * Model Glossary
 * 
 */
export type Glossary = $Result.DefaultSelection<Prisma.$GlossaryPayload>
/**
 * Model PageFlyTranslation
 * 
 */
export type PageFlyTranslation = $Result.DefaultSelection<Prisma.$PageFlyTranslationPayload>
/**
 * Model LiquidRule
 * 
 */
export type LiquidRule = $Result.DefaultSelection<Prisma.$LiquidRulePayload>

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Sessions
 * const sessions = await prisma.session.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Sessions
   * const sessions = await prisma.session.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.session`: Exposes CRUD operations for the **Session** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Sessions
    * const sessions = await prisma.session.findMany()
    * ```
    */
  get session(): Prisma.SessionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.shopTranslationSettings`: Exposes CRUD operations for the **ShopTranslationSettings** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ShopTranslationSettings
    * const shopTranslationSettings = await prisma.shopTranslationSettings.findMany()
    * ```
    */
  get shopTranslationSettings(): Prisma.ShopTranslationSettingsDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.shopTargetLocale`: Exposes CRUD operations for the **ShopTargetLocale** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ShopTargetLocales
    * const shopTargetLocales = await prisma.shopTargetLocale.findMany()
    * ```
    */
  get shopTargetLocale(): Prisma.ShopTargetLocaleDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.glossary`: Exposes CRUD operations for the **Glossary** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Glossaries
    * const glossaries = await prisma.glossary.findMany()
    * ```
    */
  get glossary(): Prisma.GlossaryDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.pageFlyTranslation`: Exposes CRUD operations for the **PageFlyTranslation** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more PageFlyTranslations
    * const pageFlyTranslations = await prisma.pageFlyTranslation.findMany()
    * ```
    */
  get pageFlyTranslation(): Prisma.PageFlyTranslationDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.liquidRule`: Exposes CRUD operations for the **LiquidRule** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more LiquidRules
    * const liquidRules = await prisma.liquidRule.findMany()
    * ```
    */
  get liquidRule(): Prisma.LiquidRuleDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.19.3
   * Query Engine version: c2990dca591cba766e3b7ef5d9e8a84796e47ab7
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    Session: 'Session',
    ShopTranslationSettings: 'ShopTranslationSettings',
    ShopTargetLocale: 'ShopTargetLocale',
    Glossary: 'Glossary',
    PageFlyTranslation: 'PageFlyTranslation',
    LiquidRule: 'LiquidRule'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "session" | "shopTranslationSettings" | "shopTargetLocale" | "glossary" | "pageFlyTranslation" | "liquidRule"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      Session: {
        payload: Prisma.$SessionPayload<ExtArgs>
        fields: Prisma.SessionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SessionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SessionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          findFirst: {
            args: Prisma.SessionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SessionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          findMany: {
            args: Prisma.SessionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>[]
          }
          create: {
            args: Prisma.SessionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          createMany: {
            args: Prisma.SessionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SessionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>[]
          }
          delete: {
            args: Prisma.SessionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          update: {
            args: Prisma.SessionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          deleteMany: {
            args: Prisma.SessionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SessionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.SessionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>[]
          }
          upsert: {
            args: Prisma.SessionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          aggregate: {
            args: Prisma.SessionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSession>
          }
          groupBy: {
            args: Prisma.SessionGroupByArgs<ExtArgs>
            result: $Utils.Optional<SessionGroupByOutputType>[]
          }
          count: {
            args: Prisma.SessionCountArgs<ExtArgs>
            result: $Utils.Optional<SessionCountAggregateOutputType> | number
          }
        }
      }
      ShopTranslationSettings: {
        payload: Prisma.$ShopTranslationSettingsPayload<ExtArgs>
        fields: Prisma.ShopTranslationSettingsFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ShopTranslationSettingsFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShopTranslationSettingsPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ShopTranslationSettingsFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShopTranslationSettingsPayload>
          }
          findFirst: {
            args: Prisma.ShopTranslationSettingsFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShopTranslationSettingsPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ShopTranslationSettingsFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShopTranslationSettingsPayload>
          }
          findMany: {
            args: Prisma.ShopTranslationSettingsFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShopTranslationSettingsPayload>[]
          }
          create: {
            args: Prisma.ShopTranslationSettingsCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShopTranslationSettingsPayload>
          }
          createMany: {
            args: Prisma.ShopTranslationSettingsCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ShopTranslationSettingsCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShopTranslationSettingsPayload>[]
          }
          delete: {
            args: Prisma.ShopTranslationSettingsDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShopTranslationSettingsPayload>
          }
          update: {
            args: Prisma.ShopTranslationSettingsUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShopTranslationSettingsPayload>
          }
          deleteMany: {
            args: Prisma.ShopTranslationSettingsDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ShopTranslationSettingsUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ShopTranslationSettingsUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShopTranslationSettingsPayload>[]
          }
          upsert: {
            args: Prisma.ShopTranslationSettingsUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShopTranslationSettingsPayload>
          }
          aggregate: {
            args: Prisma.ShopTranslationSettingsAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateShopTranslationSettings>
          }
          groupBy: {
            args: Prisma.ShopTranslationSettingsGroupByArgs<ExtArgs>
            result: $Utils.Optional<ShopTranslationSettingsGroupByOutputType>[]
          }
          count: {
            args: Prisma.ShopTranslationSettingsCountArgs<ExtArgs>
            result: $Utils.Optional<ShopTranslationSettingsCountAggregateOutputType> | number
          }
        }
      }
      ShopTargetLocale: {
        payload: Prisma.$ShopTargetLocalePayload<ExtArgs>
        fields: Prisma.ShopTargetLocaleFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ShopTargetLocaleFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShopTargetLocalePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ShopTargetLocaleFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShopTargetLocalePayload>
          }
          findFirst: {
            args: Prisma.ShopTargetLocaleFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShopTargetLocalePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ShopTargetLocaleFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShopTargetLocalePayload>
          }
          findMany: {
            args: Prisma.ShopTargetLocaleFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShopTargetLocalePayload>[]
          }
          create: {
            args: Prisma.ShopTargetLocaleCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShopTargetLocalePayload>
          }
          createMany: {
            args: Prisma.ShopTargetLocaleCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ShopTargetLocaleCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShopTargetLocalePayload>[]
          }
          delete: {
            args: Prisma.ShopTargetLocaleDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShopTargetLocalePayload>
          }
          update: {
            args: Prisma.ShopTargetLocaleUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShopTargetLocalePayload>
          }
          deleteMany: {
            args: Prisma.ShopTargetLocaleDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ShopTargetLocaleUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ShopTargetLocaleUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShopTargetLocalePayload>[]
          }
          upsert: {
            args: Prisma.ShopTargetLocaleUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShopTargetLocalePayload>
          }
          aggregate: {
            args: Prisma.ShopTargetLocaleAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateShopTargetLocale>
          }
          groupBy: {
            args: Prisma.ShopTargetLocaleGroupByArgs<ExtArgs>
            result: $Utils.Optional<ShopTargetLocaleGroupByOutputType>[]
          }
          count: {
            args: Prisma.ShopTargetLocaleCountArgs<ExtArgs>
            result: $Utils.Optional<ShopTargetLocaleCountAggregateOutputType> | number
          }
        }
      }
      Glossary: {
        payload: Prisma.$GlossaryPayload<ExtArgs>
        fields: Prisma.GlossaryFieldRefs
        operations: {
          findUnique: {
            args: Prisma.GlossaryFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GlossaryPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.GlossaryFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GlossaryPayload>
          }
          findFirst: {
            args: Prisma.GlossaryFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GlossaryPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.GlossaryFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GlossaryPayload>
          }
          findMany: {
            args: Prisma.GlossaryFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GlossaryPayload>[]
          }
          create: {
            args: Prisma.GlossaryCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GlossaryPayload>
          }
          createMany: {
            args: Prisma.GlossaryCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.GlossaryCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GlossaryPayload>[]
          }
          delete: {
            args: Prisma.GlossaryDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GlossaryPayload>
          }
          update: {
            args: Prisma.GlossaryUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GlossaryPayload>
          }
          deleteMany: {
            args: Prisma.GlossaryDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.GlossaryUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.GlossaryUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GlossaryPayload>[]
          }
          upsert: {
            args: Prisma.GlossaryUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GlossaryPayload>
          }
          aggregate: {
            args: Prisma.GlossaryAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateGlossary>
          }
          groupBy: {
            args: Prisma.GlossaryGroupByArgs<ExtArgs>
            result: $Utils.Optional<GlossaryGroupByOutputType>[]
          }
          count: {
            args: Prisma.GlossaryCountArgs<ExtArgs>
            result: $Utils.Optional<GlossaryCountAggregateOutputType> | number
          }
        }
      }
      PageFlyTranslation: {
        payload: Prisma.$PageFlyTranslationPayload<ExtArgs>
        fields: Prisma.PageFlyTranslationFieldRefs
        operations: {
          findUnique: {
            args: Prisma.PageFlyTranslationFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PageFlyTranslationPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.PageFlyTranslationFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PageFlyTranslationPayload>
          }
          findFirst: {
            args: Prisma.PageFlyTranslationFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PageFlyTranslationPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.PageFlyTranslationFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PageFlyTranslationPayload>
          }
          findMany: {
            args: Prisma.PageFlyTranslationFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PageFlyTranslationPayload>[]
          }
          create: {
            args: Prisma.PageFlyTranslationCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PageFlyTranslationPayload>
          }
          createMany: {
            args: Prisma.PageFlyTranslationCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.PageFlyTranslationCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PageFlyTranslationPayload>[]
          }
          delete: {
            args: Prisma.PageFlyTranslationDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PageFlyTranslationPayload>
          }
          update: {
            args: Prisma.PageFlyTranslationUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PageFlyTranslationPayload>
          }
          deleteMany: {
            args: Prisma.PageFlyTranslationDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.PageFlyTranslationUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.PageFlyTranslationUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PageFlyTranslationPayload>[]
          }
          upsert: {
            args: Prisma.PageFlyTranslationUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PageFlyTranslationPayload>
          }
          aggregate: {
            args: Prisma.PageFlyTranslationAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregatePageFlyTranslation>
          }
          groupBy: {
            args: Prisma.PageFlyTranslationGroupByArgs<ExtArgs>
            result: $Utils.Optional<PageFlyTranslationGroupByOutputType>[]
          }
          count: {
            args: Prisma.PageFlyTranslationCountArgs<ExtArgs>
            result: $Utils.Optional<PageFlyTranslationCountAggregateOutputType> | number
          }
        }
      }
      LiquidRule: {
        payload: Prisma.$LiquidRulePayload<ExtArgs>
        fields: Prisma.LiquidRuleFieldRefs
        operations: {
          findUnique: {
            args: Prisma.LiquidRuleFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LiquidRulePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.LiquidRuleFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LiquidRulePayload>
          }
          findFirst: {
            args: Prisma.LiquidRuleFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LiquidRulePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.LiquidRuleFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LiquidRulePayload>
          }
          findMany: {
            args: Prisma.LiquidRuleFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LiquidRulePayload>[]
          }
          create: {
            args: Prisma.LiquidRuleCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LiquidRulePayload>
          }
          createMany: {
            args: Prisma.LiquidRuleCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.LiquidRuleCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LiquidRulePayload>[]
          }
          delete: {
            args: Prisma.LiquidRuleDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LiquidRulePayload>
          }
          update: {
            args: Prisma.LiquidRuleUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LiquidRulePayload>
          }
          deleteMany: {
            args: Prisma.LiquidRuleDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.LiquidRuleUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.LiquidRuleUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LiquidRulePayload>[]
          }
          upsert: {
            args: Prisma.LiquidRuleUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LiquidRulePayload>
          }
          aggregate: {
            args: Prisma.LiquidRuleAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateLiquidRule>
          }
          groupBy: {
            args: Prisma.LiquidRuleGroupByArgs<ExtArgs>
            result: $Utils.Optional<LiquidRuleGroupByOutputType>[]
          }
          count: {
            args: Prisma.LiquidRuleCountArgs<ExtArgs>
            result: $Utils.Optional<LiquidRuleCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory | null
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    session?: SessionOmit
    shopTranslationSettings?: ShopTranslationSettingsOmit
    shopTargetLocale?: ShopTargetLocaleOmit
    glossary?: GlossaryOmit
    pageFlyTranslation?: PageFlyTranslationOmit
    liquidRule?: LiquidRuleOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */



  /**
   * Models
   */

  /**
   * Model Session
   */

  export type AggregateSession = {
    _count: SessionCountAggregateOutputType | null
    _avg: SessionAvgAggregateOutputType | null
    _sum: SessionSumAggregateOutputType | null
    _min: SessionMinAggregateOutputType | null
    _max: SessionMaxAggregateOutputType | null
  }

  export type SessionAvgAggregateOutputType = {
    userId: number | null
  }

  export type SessionSumAggregateOutputType = {
    userId: bigint | null
  }

  export type SessionMinAggregateOutputType = {
    id: string | null
    shop: string | null
    state: string | null
    isOnline: boolean | null
    scope: string | null
    expires: Date | null
    accessToken: string | null
    userId: bigint | null
    firstName: string | null
    lastName: string | null
    email: string | null
    accountOwner: boolean | null
    locale: string | null
    collaborator: boolean | null
    emailVerified: boolean | null
    refreshToken: string | null
    refreshTokenExpires: Date | null
  }

  export type SessionMaxAggregateOutputType = {
    id: string | null
    shop: string | null
    state: string | null
    isOnline: boolean | null
    scope: string | null
    expires: Date | null
    accessToken: string | null
    userId: bigint | null
    firstName: string | null
    lastName: string | null
    email: string | null
    accountOwner: boolean | null
    locale: string | null
    collaborator: boolean | null
    emailVerified: boolean | null
    refreshToken: string | null
    refreshTokenExpires: Date | null
  }

  export type SessionCountAggregateOutputType = {
    id: number
    shop: number
    state: number
    isOnline: number
    scope: number
    expires: number
    accessToken: number
    userId: number
    firstName: number
    lastName: number
    email: number
    accountOwner: number
    locale: number
    collaborator: number
    emailVerified: number
    refreshToken: number
    refreshTokenExpires: number
    _all: number
  }


  export type SessionAvgAggregateInputType = {
    userId?: true
  }

  export type SessionSumAggregateInputType = {
    userId?: true
  }

  export type SessionMinAggregateInputType = {
    id?: true
    shop?: true
    state?: true
    isOnline?: true
    scope?: true
    expires?: true
    accessToken?: true
    userId?: true
    firstName?: true
    lastName?: true
    email?: true
    accountOwner?: true
    locale?: true
    collaborator?: true
    emailVerified?: true
    refreshToken?: true
    refreshTokenExpires?: true
  }

  export type SessionMaxAggregateInputType = {
    id?: true
    shop?: true
    state?: true
    isOnline?: true
    scope?: true
    expires?: true
    accessToken?: true
    userId?: true
    firstName?: true
    lastName?: true
    email?: true
    accountOwner?: true
    locale?: true
    collaborator?: true
    emailVerified?: true
    refreshToken?: true
    refreshTokenExpires?: true
  }

  export type SessionCountAggregateInputType = {
    id?: true
    shop?: true
    state?: true
    isOnline?: true
    scope?: true
    expires?: true
    accessToken?: true
    userId?: true
    firstName?: true
    lastName?: true
    email?: true
    accountOwner?: true
    locale?: true
    collaborator?: true
    emailVerified?: true
    refreshToken?: true
    refreshTokenExpires?: true
    _all?: true
  }

  export type SessionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Session to aggregate.
     */
    where?: SessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sessions to fetch.
     */
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Sessions
    **/
    _count?: true | SessionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: SessionAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: SessionSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SessionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SessionMaxAggregateInputType
  }

  export type GetSessionAggregateType<T extends SessionAggregateArgs> = {
        [P in keyof T & keyof AggregateSession]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSession[P]>
      : GetScalarType<T[P], AggregateSession[P]>
  }




  export type SessionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SessionWhereInput
    orderBy?: SessionOrderByWithAggregationInput | SessionOrderByWithAggregationInput[]
    by: SessionScalarFieldEnum[] | SessionScalarFieldEnum
    having?: SessionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SessionCountAggregateInputType | true
    _avg?: SessionAvgAggregateInputType
    _sum?: SessionSumAggregateInputType
    _min?: SessionMinAggregateInputType
    _max?: SessionMaxAggregateInputType
  }

  export type SessionGroupByOutputType = {
    id: string
    shop: string
    state: string
    isOnline: boolean
    scope: string | null
    expires: Date | null
    accessToken: string
    userId: bigint | null
    firstName: string | null
    lastName: string | null
    email: string | null
    accountOwner: boolean
    locale: string | null
    collaborator: boolean | null
    emailVerified: boolean | null
    refreshToken: string | null
    refreshTokenExpires: Date | null
    _count: SessionCountAggregateOutputType | null
    _avg: SessionAvgAggregateOutputType | null
    _sum: SessionSumAggregateOutputType | null
    _min: SessionMinAggregateOutputType | null
    _max: SessionMaxAggregateOutputType | null
  }

  type GetSessionGroupByPayload<T extends SessionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SessionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SessionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SessionGroupByOutputType[P]>
            : GetScalarType<T[P], SessionGroupByOutputType[P]>
        }
      >
    >


  export type SessionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    shop?: boolean
    state?: boolean
    isOnline?: boolean
    scope?: boolean
    expires?: boolean
    accessToken?: boolean
    userId?: boolean
    firstName?: boolean
    lastName?: boolean
    email?: boolean
    accountOwner?: boolean
    locale?: boolean
    collaborator?: boolean
    emailVerified?: boolean
    refreshToken?: boolean
    refreshTokenExpires?: boolean
  }, ExtArgs["result"]["session"]>

  export type SessionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    shop?: boolean
    state?: boolean
    isOnline?: boolean
    scope?: boolean
    expires?: boolean
    accessToken?: boolean
    userId?: boolean
    firstName?: boolean
    lastName?: boolean
    email?: boolean
    accountOwner?: boolean
    locale?: boolean
    collaborator?: boolean
    emailVerified?: boolean
    refreshToken?: boolean
    refreshTokenExpires?: boolean
  }, ExtArgs["result"]["session"]>

  export type SessionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    shop?: boolean
    state?: boolean
    isOnline?: boolean
    scope?: boolean
    expires?: boolean
    accessToken?: boolean
    userId?: boolean
    firstName?: boolean
    lastName?: boolean
    email?: boolean
    accountOwner?: boolean
    locale?: boolean
    collaborator?: boolean
    emailVerified?: boolean
    refreshToken?: boolean
    refreshTokenExpires?: boolean
  }, ExtArgs["result"]["session"]>

  export type SessionSelectScalar = {
    id?: boolean
    shop?: boolean
    state?: boolean
    isOnline?: boolean
    scope?: boolean
    expires?: boolean
    accessToken?: boolean
    userId?: boolean
    firstName?: boolean
    lastName?: boolean
    email?: boolean
    accountOwner?: boolean
    locale?: boolean
    collaborator?: boolean
    emailVerified?: boolean
    refreshToken?: boolean
    refreshTokenExpires?: boolean
  }

  export type SessionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "shop" | "state" | "isOnline" | "scope" | "expires" | "accessToken" | "userId" | "firstName" | "lastName" | "email" | "accountOwner" | "locale" | "collaborator" | "emailVerified" | "refreshToken" | "refreshTokenExpires", ExtArgs["result"]["session"]>

  export type $SessionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Session"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      shop: string
      state: string
      isOnline: boolean
      scope: string | null
      expires: Date | null
      accessToken: string
      userId: bigint | null
      firstName: string | null
      lastName: string | null
      email: string | null
      accountOwner: boolean
      locale: string | null
      collaborator: boolean | null
      emailVerified: boolean | null
      refreshToken: string | null
      refreshTokenExpires: Date | null
    }, ExtArgs["result"]["session"]>
    composites: {}
  }

  type SessionGetPayload<S extends boolean | null | undefined | SessionDefaultArgs> = $Result.GetResult<Prisma.$SessionPayload, S>

  type SessionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<SessionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: SessionCountAggregateInputType | true
    }

  export interface SessionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Session'], meta: { name: 'Session' } }
    /**
     * Find zero or one Session that matches the filter.
     * @param {SessionFindUniqueArgs} args - Arguments to find a Session
     * @example
     * // Get one Session
     * const session = await prisma.session.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SessionFindUniqueArgs>(args: SelectSubset<T, SessionFindUniqueArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Session that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {SessionFindUniqueOrThrowArgs} args - Arguments to find a Session
     * @example
     * // Get one Session
     * const session = await prisma.session.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SessionFindUniqueOrThrowArgs>(args: SelectSubset<T, SessionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Session that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionFindFirstArgs} args - Arguments to find a Session
     * @example
     * // Get one Session
     * const session = await prisma.session.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SessionFindFirstArgs>(args?: SelectSubset<T, SessionFindFirstArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Session that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionFindFirstOrThrowArgs} args - Arguments to find a Session
     * @example
     * // Get one Session
     * const session = await prisma.session.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SessionFindFirstOrThrowArgs>(args?: SelectSubset<T, SessionFindFirstOrThrowArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Sessions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Sessions
     * const sessions = await prisma.session.findMany()
     * 
     * // Get first 10 Sessions
     * const sessions = await prisma.session.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const sessionWithIdOnly = await prisma.session.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SessionFindManyArgs>(args?: SelectSubset<T, SessionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Session.
     * @param {SessionCreateArgs} args - Arguments to create a Session.
     * @example
     * // Create one Session
     * const Session = await prisma.session.create({
     *   data: {
     *     // ... data to create a Session
     *   }
     * })
     * 
     */
    create<T extends SessionCreateArgs>(args: SelectSubset<T, SessionCreateArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Sessions.
     * @param {SessionCreateManyArgs} args - Arguments to create many Sessions.
     * @example
     * // Create many Sessions
     * const session = await prisma.session.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SessionCreateManyArgs>(args?: SelectSubset<T, SessionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Sessions and returns the data saved in the database.
     * @param {SessionCreateManyAndReturnArgs} args - Arguments to create many Sessions.
     * @example
     * // Create many Sessions
     * const session = await prisma.session.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Sessions and only return the `id`
     * const sessionWithIdOnly = await prisma.session.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SessionCreateManyAndReturnArgs>(args?: SelectSubset<T, SessionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Session.
     * @param {SessionDeleteArgs} args - Arguments to delete one Session.
     * @example
     * // Delete one Session
     * const Session = await prisma.session.delete({
     *   where: {
     *     // ... filter to delete one Session
     *   }
     * })
     * 
     */
    delete<T extends SessionDeleteArgs>(args: SelectSubset<T, SessionDeleteArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Session.
     * @param {SessionUpdateArgs} args - Arguments to update one Session.
     * @example
     * // Update one Session
     * const session = await prisma.session.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SessionUpdateArgs>(args: SelectSubset<T, SessionUpdateArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Sessions.
     * @param {SessionDeleteManyArgs} args - Arguments to filter Sessions to delete.
     * @example
     * // Delete a few Sessions
     * const { count } = await prisma.session.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SessionDeleteManyArgs>(args?: SelectSubset<T, SessionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Sessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Sessions
     * const session = await prisma.session.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SessionUpdateManyArgs>(args: SelectSubset<T, SessionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Sessions and returns the data updated in the database.
     * @param {SessionUpdateManyAndReturnArgs} args - Arguments to update many Sessions.
     * @example
     * // Update many Sessions
     * const session = await prisma.session.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Sessions and only return the `id`
     * const sessionWithIdOnly = await prisma.session.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends SessionUpdateManyAndReturnArgs>(args: SelectSubset<T, SessionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Session.
     * @param {SessionUpsertArgs} args - Arguments to update or create a Session.
     * @example
     * // Update or create a Session
     * const session = await prisma.session.upsert({
     *   create: {
     *     // ... data to create a Session
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Session we want to update
     *   }
     * })
     */
    upsert<T extends SessionUpsertArgs>(args: SelectSubset<T, SessionUpsertArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Sessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionCountArgs} args - Arguments to filter Sessions to count.
     * @example
     * // Count the number of Sessions
     * const count = await prisma.session.count({
     *   where: {
     *     // ... the filter for the Sessions we want to count
     *   }
     * })
    **/
    count<T extends SessionCountArgs>(
      args?: Subset<T, SessionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SessionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Session.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SessionAggregateArgs>(args: Subset<T, SessionAggregateArgs>): Prisma.PrismaPromise<GetSessionAggregateType<T>>

    /**
     * Group by Session.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SessionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SessionGroupByArgs['orderBy'] }
        : { orderBy?: SessionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SessionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSessionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Session model
   */
  readonly fields: SessionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Session.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SessionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Session model
   */
  interface SessionFieldRefs {
    readonly id: FieldRef<"Session", 'String'>
    readonly shop: FieldRef<"Session", 'String'>
    readonly state: FieldRef<"Session", 'String'>
    readonly isOnline: FieldRef<"Session", 'Boolean'>
    readonly scope: FieldRef<"Session", 'String'>
    readonly expires: FieldRef<"Session", 'DateTime'>
    readonly accessToken: FieldRef<"Session", 'String'>
    readonly userId: FieldRef<"Session", 'BigInt'>
    readonly firstName: FieldRef<"Session", 'String'>
    readonly lastName: FieldRef<"Session", 'String'>
    readonly email: FieldRef<"Session", 'String'>
    readonly accountOwner: FieldRef<"Session", 'Boolean'>
    readonly locale: FieldRef<"Session", 'String'>
    readonly collaborator: FieldRef<"Session", 'Boolean'>
    readonly emailVerified: FieldRef<"Session", 'Boolean'>
    readonly refreshToken: FieldRef<"Session", 'String'>
    readonly refreshTokenExpires: FieldRef<"Session", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Session findUnique
   */
  export type SessionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Filter, which Session to fetch.
     */
    where: SessionWhereUniqueInput
  }

  /**
   * Session findUniqueOrThrow
   */
  export type SessionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Filter, which Session to fetch.
     */
    where: SessionWhereUniqueInput
  }

  /**
   * Session findFirst
   */
  export type SessionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Filter, which Session to fetch.
     */
    where?: SessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sessions to fetch.
     */
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Sessions.
     */
    cursor?: SessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Sessions.
     */
    distinct?: SessionScalarFieldEnum | SessionScalarFieldEnum[]
  }

  /**
   * Session findFirstOrThrow
   */
  export type SessionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Filter, which Session to fetch.
     */
    where?: SessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sessions to fetch.
     */
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Sessions.
     */
    cursor?: SessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Sessions.
     */
    distinct?: SessionScalarFieldEnum | SessionScalarFieldEnum[]
  }

  /**
   * Session findMany
   */
  export type SessionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Filter, which Sessions to fetch.
     */
    where?: SessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sessions to fetch.
     */
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Sessions.
     */
    cursor?: SessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sessions.
     */
    skip?: number
    distinct?: SessionScalarFieldEnum | SessionScalarFieldEnum[]
  }

  /**
   * Session create
   */
  export type SessionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * The data needed to create a Session.
     */
    data: XOR<SessionCreateInput, SessionUncheckedCreateInput>
  }

  /**
   * Session createMany
   */
  export type SessionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Sessions.
     */
    data: SessionCreateManyInput | SessionCreateManyInput[]
  }

  /**
   * Session createManyAndReturn
   */
  export type SessionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * The data used to create many Sessions.
     */
    data: SessionCreateManyInput | SessionCreateManyInput[]
  }

  /**
   * Session update
   */
  export type SessionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * The data needed to update a Session.
     */
    data: XOR<SessionUpdateInput, SessionUncheckedUpdateInput>
    /**
     * Choose, which Session to update.
     */
    where: SessionWhereUniqueInput
  }

  /**
   * Session updateMany
   */
  export type SessionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Sessions.
     */
    data: XOR<SessionUpdateManyMutationInput, SessionUncheckedUpdateManyInput>
    /**
     * Filter which Sessions to update
     */
    where?: SessionWhereInput
    /**
     * Limit how many Sessions to update.
     */
    limit?: number
  }

  /**
   * Session updateManyAndReturn
   */
  export type SessionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * The data used to update Sessions.
     */
    data: XOR<SessionUpdateManyMutationInput, SessionUncheckedUpdateManyInput>
    /**
     * Filter which Sessions to update
     */
    where?: SessionWhereInput
    /**
     * Limit how many Sessions to update.
     */
    limit?: number
  }

  /**
   * Session upsert
   */
  export type SessionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * The filter to search for the Session to update in case it exists.
     */
    where: SessionWhereUniqueInput
    /**
     * In case the Session found by the `where` argument doesn't exist, create a new Session with this data.
     */
    create: XOR<SessionCreateInput, SessionUncheckedCreateInput>
    /**
     * In case the Session was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SessionUpdateInput, SessionUncheckedUpdateInput>
  }

  /**
   * Session delete
   */
  export type SessionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Filter which Session to delete.
     */
    where: SessionWhereUniqueInput
  }

  /**
   * Session deleteMany
   */
  export type SessionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Sessions to delete
     */
    where?: SessionWhereInput
    /**
     * Limit how many Sessions to delete.
     */
    limit?: number
  }

  /**
   * Session without action
   */
  export type SessionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
  }


  /**
   * Model ShopTranslationSettings
   */

  export type AggregateShopTranslationSettings = {
    _count: ShopTranslationSettingsCountAggregateOutputType | null
    _min: ShopTranslationSettingsMinAggregateOutputType | null
    _max: ShopTranslationSettingsMaxAggregateOutputType | null
  }

  export type ShopTranslationSettingsMinAggregateOutputType = {
    shop: string | null
    primaryLocale: string | null
    autoTranslate: boolean | null
    migratedToTsf: boolean | null
    migratedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ShopTranslationSettingsMaxAggregateOutputType = {
    shop: string | null
    primaryLocale: string | null
    autoTranslate: boolean | null
    migratedToTsf: boolean | null
    migratedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ShopTranslationSettingsCountAggregateOutputType = {
    shop: number
    primaryLocale: number
    targets: number
    autoTranslate: number
    migratedToTsf: number
    migratedAt: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type ShopTranslationSettingsMinAggregateInputType = {
    shop?: true
    primaryLocale?: true
    autoTranslate?: true
    migratedToTsf?: true
    migratedAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ShopTranslationSettingsMaxAggregateInputType = {
    shop?: true
    primaryLocale?: true
    autoTranslate?: true
    migratedToTsf?: true
    migratedAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ShopTranslationSettingsCountAggregateInputType = {
    shop?: true
    primaryLocale?: true
    targets?: true
    autoTranslate?: true
    migratedToTsf?: true
    migratedAt?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type ShopTranslationSettingsAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ShopTranslationSettings to aggregate.
     */
    where?: ShopTranslationSettingsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ShopTranslationSettings to fetch.
     */
    orderBy?: ShopTranslationSettingsOrderByWithRelationInput | ShopTranslationSettingsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ShopTranslationSettingsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ShopTranslationSettings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ShopTranslationSettings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ShopTranslationSettings
    **/
    _count?: true | ShopTranslationSettingsCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ShopTranslationSettingsMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ShopTranslationSettingsMaxAggregateInputType
  }

  export type GetShopTranslationSettingsAggregateType<T extends ShopTranslationSettingsAggregateArgs> = {
        [P in keyof T & keyof AggregateShopTranslationSettings]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateShopTranslationSettings[P]>
      : GetScalarType<T[P], AggregateShopTranslationSettings[P]>
  }




  export type ShopTranslationSettingsGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ShopTranslationSettingsWhereInput
    orderBy?: ShopTranslationSettingsOrderByWithAggregationInput | ShopTranslationSettingsOrderByWithAggregationInput[]
    by: ShopTranslationSettingsScalarFieldEnum[] | ShopTranslationSettingsScalarFieldEnum
    having?: ShopTranslationSettingsScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ShopTranslationSettingsCountAggregateInputType | true
    _min?: ShopTranslationSettingsMinAggregateInputType
    _max?: ShopTranslationSettingsMaxAggregateInputType
  }

  export type ShopTranslationSettingsGroupByOutputType = {
    shop: string
    primaryLocale: string
    targets: JsonValue
    autoTranslate: boolean
    migratedToTsf: boolean
    migratedAt: Date | null
    createdAt: Date
    updatedAt: Date
    _count: ShopTranslationSettingsCountAggregateOutputType | null
    _min: ShopTranslationSettingsMinAggregateOutputType | null
    _max: ShopTranslationSettingsMaxAggregateOutputType | null
  }

  type GetShopTranslationSettingsGroupByPayload<T extends ShopTranslationSettingsGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ShopTranslationSettingsGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ShopTranslationSettingsGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ShopTranslationSettingsGroupByOutputType[P]>
            : GetScalarType<T[P], ShopTranslationSettingsGroupByOutputType[P]>
        }
      >
    >


  export type ShopTranslationSettingsSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    shop?: boolean
    primaryLocale?: boolean
    targets?: boolean
    autoTranslate?: boolean
    migratedToTsf?: boolean
    migratedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["shopTranslationSettings"]>

  export type ShopTranslationSettingsSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    shop?: boolean
    primaryLocale?: boolean
    targets?: boolean
    autoTranslate?: boolean
    migratedToTsf?: boolean
    migratedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["shopTranslationSettings"]>

  export type ShopTranslationSettingsSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    shop?: boolean
    primaryLocale?: boolean
    targets?: boolean
    autoTranslate?: boolean
    migratedToTsf?: boolean
    migratedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["shopTranslationSettings"]>

  export type ShopTranslationSettingsSelectScalar = {
    shop?: boolean
    primaryLocale?: boolean
    targets?: boolean
    autoTranslate?: boolean
    migratedToTsf?: boolean
    migratedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type ShopTranslationSettingsOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"shop" | "primaryLocale" | "targets" | "autoTranslate" | "migratedToTsf" | "migratedAt" | "createdAt" | "updatedAt", ExtArgs["result"]["shopTranslationSettings"]>

  export type $ShopTranslationSettingsPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ShopTranslationSettings"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      shop: string
      primaryLocale: string
      targets: Prisma.JsonValue
      autoTranslate: boolean
      migratedToTsf: boolean
      migratedAt: Date | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["shopTranslationSettings"]>
    composites: {}
  }

  type ShopTranslationSettingsGetPayload<S extends boolean | null | undefined | ShopTranslationSettingsDefaultArgs> = $Result.GetResult<Prisma.$ShopTranslationSettingsPayload, S>

  type ShopTranslationSettingsCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ShopTranslationSettingsFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ShopTranslationSettingsCountAggregateInputType | true
    }

  export interface ShopTranslationSettingsDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ShopTranslationSettings'], meta: { name: 'ShopTranslationSettings' } }
    /**
     * Find zero or one ShopTranslationSettings that matches the filter.
     * @param {ShopTranslationSettingsFindUniqueArgs} args - Arguments to find a ShopTranslationSettings
     * @example
     * // Get one ShopTranslationSettings
     * const shopTranslationSettings = await prisma.shopTranslationSettings.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ShopTranslationSettingsFindUniqueArgs>(args: SelectSubset<T, ShopTranslationSettingsFindUniqueArgs<ExtArgs>>): Prisma__ShopTranslationSettingsClient<$Result.GetResult<Prisma.$ShopTranslationSettingsPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ShopTranslationSettings that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ShopTranslationSettingsFindUniqueOrThrowArgs} args - Arguments to find a ShopTranslationSettings
     * @example
     * // Get one ShopTranslationSettings
     * const shopTranslationSettings = await prisma.shopTranslationSettings.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ShopTranslationSettingsFindUniqueOrThrowArgs>(args: SelectSubset<T, ShopTranslationSettingsFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ShopTranslationSettingsClient<$Result.GetResult<Prisma.$ShopTranslationSettingsPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ShopTranslationSettings that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ShopTranslationSettingsFindFirstArgs} args - Arguments to find a ShopTranslationSettings
     * @example
     * // Get one ShopTranslationSettings
     * const shopTranslationSettings = await prisma.shopTranslationSettings.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ShopTranslationSettingsFindFirstArgs>(args?: SelectSubset<T, ShopTranslationSettingsFindFirstArgs<ExtArgs>>): Prisma__ShopTranslationSettingsClient<$Result.GetResult<Prisma.$ShopTranslationSettingsPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ShopTranslationSettings that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ShopTranslationSettingsFindFirstOrThrowArgs} args - Arguments to find a ShopTranslationSettings
     * @example
     * // Get one ShopTranslationSettings
     * const shopTranslationSettings = await prisma.shopTranslationSettings.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ShopTranslationSettingsFindFirstOrThrowArgs>(args?: SelectSubset<T, ShopTranslationSettingsFindFirstOrThrowArgs<ExtArgs>>): Prisma__ShopTranslationSettingsClient<$Result.GetResult<Prisma.$ShopTranslationSettingsPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ShopTranslationSettings that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ShopTranslationSettingsFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ShopTranslationSettings
     * const shopTranslationSettings = await prisma.shopTranslationSettings.findMany()
     * 
     * // Get first 10 ShopTranslationSettings
     * const shopTranslationSettings = await prisma.shopTranslationSettings.findMany({ take: 10 })
     * 
     * // Only select the `shop`
     * const shopTranslationSettingsWithShopOnly = await prisma.shopTranslationSettings.findMany({ select: { shop: true } })
     * 
     */
    findMany<T extends ShopTranslationSettingsFindManyArgs>(args?: SelectSubset<T, ShopTranslationSettingsFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ShopTranslationSettingsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ShopTranslationSettings.
     * @param {ShopTranslationSettingsCreateArgs} args - Arguments to create a ShopTranslationSettings.
     * @example
     * // Create one ShopTranslationSettings
     * const ShopTranslationSettings = await prisma.shopTranslationSettings.create({
     *   data: {
     *     // ... data to create a ShopTranslationSettings
     *   }
     * })
     * 
     */
    create<T extends ShopTranslationSettingsCreateArgs>(args: SelectSubset<T, ShopTranslationSettingsCreateArgs<ExtArgs>>): Prisma__ShopTranslationSettingsClient<$Result.GetResult<Prisma.$ShopTranslationSettingsPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ShopTranslationSettings.
     * @param {ShopTranslationSettingsCreateManyArgs} args - Arguments to create many ShopTranslationSettings.
     * @example
     * // Create many ShopTranslationSettings
     * const shopTranslationSettings = await prisma.shopTranslationSettings.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ShopTranslationSettingsCreateManyArgs>(args?: SelectSubset<T, ShopTranslationSettingsCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ShopTranslationSettings and returns the data saved in the database.
     * @param {ShopTranslationSettingsCreateManyAndReturnArgs} args - Arguments to create many ShopTranslationSettings.
     * @example
     * // Create many ShopTranslationSettings
     * const shopTranslationSettings = await prisma.shopTranslationSettings.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ShopTranslationSettings and only return the `shop`
     * const shopTranslationSettingsWithShopOnly = await prisma.shopTranslationSettings.createManyAndReturn({
     *   select: { shop: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ShopTranslationSettingsCreateManyAndReturnArgs>(args?: SelectSubset<T, ShopTranslationSettingsCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ShopTranslationSettingsPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a ShopTranslationSettings.
     * @param {ShopTranslationSettingsDeleteArgs} args - Arguments to delete one ShopTranslationSettings.
     * @example
     * // Delete one ShopTranslationSettings
     * const ShopTranslationSettings = await prisma.shopTranslationSettings.delete({
     *   where: {
     *     // ... filter to delete one ShopTranslationSettings
     *   }
     * })
     * 
     */
    delete<T extends ShopTranslationSettingsDeleteArgs>(args: SelectSubset<T, ShopTranslationSettingsDeleteArgs<ExtArgs>>): Prisma__ShopTranslationSettingsClient<$Result.GetResult<Prisma.$ShopTranslationSettingsPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ShopTranslationSettings.
     * @param {ShopTranslationSettingsUpdateArgs} args - Arguments to update one ShopTranslationSettings.
     * @example
     * // Update one ShopTranslationSettings
     * const shopTranslationSettings = await prisma.shopTranslationSettings.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ShopTranslationSettingsUpdateArgs>(args: SelectSubset<T, ShopTranslationSettingsUpdateArgs<ExtArgs>>): Prisma__ShopTranslationSettingsClient<$Result.GetResult<Prisma.$ShopTranslationSettingsPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ShopTranslationSettings.
     * @param {ShopTranslationSettingsDeleteManyArgs} args - Arguments to filter ShopTranslationSettings to delete.
     * @example
     * // Delete a few ShopTranslationSettings
     * const { count } = await prisma.shopTranslationSettings.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ShopTranslationSettingsDeleteManyArgs>(args?: SelectSubset<T, ShopTranslationSettingsDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ShopTranslationSettings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ShopTranslationSettingsUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ShopTranslationSettings
     * const shopTranslationSettings = await prisma.shopTranslationSettings.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ShopTranslationSettingsUpdateManyArgs>(args: SelectSubset<T, ShopTranslationSettingsUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ShopTranslationSettings and returns the data updated in the database.
     * @param {ShopTranslationSettingsUpdateManyAndReturnArgs} args - Arguments to update many ShopTranslationSettings.
     * @example
     * // Update many ShopTranslationSettings
     * const shopTranslationSettings = await prisma.shopTranslationSettings.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more ShopTranslationSettings and only return the `shop`
     * const shopTranslationSettingsWithShopOnly = await prisma.shopTranslationSettings.updateManyAndReturn({
     *   select: { shop: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ShopTranslationSettingsUpdateManyAndReturnArgs>(args: SelectSubset<T, ShopTranslationSettingsUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ShopTranslationSettingsPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one ShopTranslationSettings.
     * @param {ShopTranslationSettingsUpsertArgs} args - Arguments to update or create a ShopTranslationSettings.
     * @example
     * // Update or create a ShopTranslationSettings
     * const shopTranslationSettings = await prisma.shopTranslationSettings.upsert({
     *   create: {
     *     // ... data to create a ShopTranslationSettings
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ShopTranslationSettings we want to update
     *   }
     * })
     */
    upsert<T extends ShopTranslationSettingsUpsertArgs>(args: SelectSubset<T, ShopTranslationSettingsUpsertArgs<ExtArgs>>): Prisma__ShopTranslationSettingsClient<$Result.GetResult<Prisma.$ShopTranslationSettingsPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ShopTranslationSettings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ShopTranslationSettingsCountArgs} args - Arguments to filter ShopTranslationSettings to count.
     * @example
     * // Count the number of ShopTranslationSettings
     * const count = await prisma.shopTranslationSettings.count({
     *   where: {
     *     // ... the filter for the ShopTranslationSettings we want to count
     *   }
     * })
    **/
    count<T extends ShopTranslationSettingsCountArgs>(
      args?: Subset<T, ShopTranslationSettingsCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ShopTranslationSettingsCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ShopTranslationSettings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ShopTranslationSettingsAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ShopTranslationSettingsAggregateArgs>(args: Subset<T, ShopTranslationSettingsAggregateArgs>): Prisma.PrismaPromise<GetShopTranslationSettingsAggregateType<T>>

    /**
     * Group by ShopTranslationSettings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ShopTranslationSettingsGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ShopTranslationSettingsGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ShopTranslationSettingsGroupByArgs['orderBy'] }
        : { orderBy?: ShopTranslationSettingsGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ShopTranslationSettingsGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetShopTranslationSettingsGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ShopTranslationSettings model
   */
  readonly fields: ShopTranslationSettingsFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ShopTranslationSettings.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ShopTranslationSettingsClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ShopTranslationSettings model
   */
  interface ShopTranslationSettingsFieldRefs {
    readonly shop: FieldRef<"ShopTranslationSettings", 'String'>
    readonly primaryLocale: FieldRef<"ShopTranslationSettings", 'String'>
    readonly targets: FieldRef<"ShopTranslationSettings", 'Json'>
    readonly autoTranslate: FieldRef<"ShopTranslationSettings", 'Boolean'>
    readonly migratedToTsf: FieldRef<"ShopTranslationSettings", 'Boolean'>
    readonly migratedAt: FieldRef<"ShopTranslationSettings", 'DateTime'>
    readonly createdAt: FieldRef<"ShopTranslationSettings", 'DateTime'>
    readonly updatedAt: FieldRef<"ShopTranslationSettings", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ShopTranslationSettings findUnique
   */
  export type ShopTranslationSettingsFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ShopTranslationSettings
     */
    select?: ShopTranslationSettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ShopTranslationSettings
     */
    omit?: ShopTranslationSettingsOmit<ExtArgs> | null
    /**
     * Filter, which ShopTranslationSettings to fetch.
     */
    where: ShopTranslationSettingsWhereUniqueInput
  }

  /**
   * ShopTranslationSettings findUniqueOrThrow
   */
  export type ShopTranslationSettingsFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ShopTranslationSettings
     */
    select?: ShopTranslationSettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ShopTranslationSettings
     */
    omit?: ShopTranslationSettingsOmit<ExtArgs> | null
    /**
     * Filter, which ShopTranslationSettings to fetch.
     */
    where: ShopTranslationSettingsWhereUniqueInput
  }

  /**
   * ShopTranslationSettings findFirst
   */
  export type ShopTranslationSettingsFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ShopTranslationSettings
     */
    select?: ShopTranslationSettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ShopTranslationSettings
     */
    omit?: ShopTranslationSettingsOmit<ExtArgs> | null
    /**
     * Filter, which ShopTranslationSettings to fetch.
     */
    where?: ShopTranslationSettingsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ShopTranslationSettings to fetch.
     */
    orderBy?: ShopTranslationSettingsOrderByWithRelationInput | ShopTranslationSettingsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ShopTranslationSettings.
     */
    cursor?: ShopTranslationSettingsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ShopTranslationSettings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ShopTranslationSettings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ShopTranslationSettings.
     */
    distinct?: ShopTranslationSettingsScalarFieldEnum | ShopTranslationSettingsScalarFieldEnum[]
  }

  /**
   * ShopTranslationSettings findFirstOrThrow
   */
  export type ShopTranslationSettingsFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ShopTranslationSettings
     */
    select?: ShopTranslationSettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ShopTranslationSettings
     */
    omit?: ShopTranslationSettingsOmit<ExtArgs> | null
    /**
     * Filter, which ShopTranslationSettings to fetch.
     */
    where?: ShopTranslationSettingsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ShopTranslationSettings to fetch.
     */
    orderBy?: ShopTranslationSettingsOrderByWithRelationInput | ShopTranslationSettingsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ShopTranslationSettings.
     */
    cursor?: ShopTranslationSettingsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ShopTranslationSettings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ShopTranslationSettings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ShopTranslationSettings.
     */
    distinct?: ShopTranslationSettingsScalarFieldEnum | ShopTranslationSettingsScalarFieldEnum[]
  }

  /**
   * ShopTranslationSettings findMany
   */
  export type ShopTranslationSettingsFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ShopTranslationSettings
     */
    select?: ShopTranslationSettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ShopTranslationSettings
     */
    omit?: ShopTranslationSettingsOmit<ExtArgs> | null
    /**
     * Filter, which ShopTranslationSettings to fetch.
     */
    where?: ShopTranslationSettingsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ShopTranslationSettings to fetch.
     */
    orderBy?: ShopTranslationSettingsOrderByWithRelationInput | ShopTranslationSettingsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ShopTranslationSettings.
     */
    cursor?: ShopTranslationSettingsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ShopTranslationSettings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ShopTranslationSettings.
     */
    skip?: number
    distinct?: ShopTranslationSettingsScalarFieldEnum | ShopTranslationSettingsScalarFieldEnum[]
  }

  /**
   * ShopTranslationSettings create
   */
  export type ShopTranslationSettingsCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ShopTranslationSettings
     */
    select?: ShopTranslationSettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ShopTranslationSettings
     */
    omit?: ShopTranslationSettingsOmit<ExtArgs> | null
    /**
     * The data needed to create a ShopTranslationSettings.
     */
    data: XOR<ShopTranslationSettingsCreateInput, ShopTranslationSettingsUncheckedCreateInput>
  }

  /**
   * ShopTranslationSettings createMany
   */
  export type ShopTranslationSettingsCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ShopTranslationSettings.
     */
    data: ShopTranslationSettingsCreateManyInput | ShopTranslationSettingsCreateManyInput[]
  }

  /**
   * ShopTranslationSettings createManyAndReturn
   */
  export type ShopTranslationSettingsCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ShopTranslationSettings
     */
    select?: ShopTranslationSettingsSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ShopTranslationSettings
     */
    omit?: ShopTranslationSettingsOmit<ExtArgs> | null
    /**
     * The data used to create many ShopTranslationSettings.
     */
    data: ShopTranslationSettingsCreateManyInput | ShopTranslationSettingsCreateManyInput[]
  }

  /**
   * ShopTranslationSettings update
   */
  export type ShopTranslationSettingsUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ShopTranslationSettings
     */
    select?: ShopTranslationSettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ShopTranslationSettings
     */
    omit?: ShopTranslationSettingsOmit<ExtArgs> | null
    /**
     * The data needed to update a ShopTranslationSettings.
     */
    data: XOR<ShopTranslationSettingsUpdateInput, ShopTranslationSettingsUncheckedUpdateInput>
    /**
     * Choose, which ShopTranslationSettings to update.
     */
    where: ShopTranslationSettingsWhereUniqueInput
  }

  /**
   * ShopTranslationSettings updateMany
   */
  export type ShopTranslationSettingsUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ShopTranslationSettings.
     */
    data: XOR<ShopTranslationSettingsUpdateManyMutationInput, ShopTranslationSettingsUncheckedUpdateManyInput>
    /**
     * Filter which ShopTranslationSettings to update
     */
    where?: ShopTranslationSettingsWhereInput
    /**
     * Limit how many ShopTranslationSettings to update.
     */
    limit?: number
  }

  /**
   * ShopTranslationSettings updateManyAndReturn
   */
  export type ShopTranslationSettingsUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ShopTranslationSettings
     */
    select?: ShopTranslationSettingsSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ShopTranslationSettings
     */
    omit?: ShopTranslationSettingsOmit<ExtArgs> | null
    /**
     * The data used to update ShopTranslationSettings.
     */
    data: XOR<ShopTranslationSettingsUpdateManyMutationInput, ShopTranslationSettingsUncheckedUpdateManyInput>
    /**
     * Filter which ShopTranslationSettings to update
     */
    where?: ShopTranslationSettingsWhereInput
    /**
     * Limit how many ShopTranslationSettings to update.
     */
    limit?: number
  }

  /**
   * ShopTranslationSettings upsert
   */
  export type ShopTranslationSettingsUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ShopTranslationSettings
     */
    select?: ShopTranslationSettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ShopTranslationSettings
     */
    omit?: ShopTranslationSettingsOmit<ExtArgs> | null
    /**
     * The filter to search for the ShopTranslationSettings to update in case it exists.
     */
    where: ShopTranslationSettingsWhereUniqueInput
    /**
     * In case the ShopTranslationSettings found by the `where` argument doesn't exist, create a new ShopTranslationSettings with this data.
     */
    create: XOR<ShopTranslationSettingsCreateInput, ShopTranslationSettingsUncheckedCreateInput>
    /**
     * In case the ShopTranslationSettings was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ShopTranslationSettingsUpdateInput, ShopTranslationSettingsUncheckedUpdateInput>
  }

  /**
   * ShopTranslationSettings delete
   */
  export type ShopTranslationSettingsDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ShopTranslationSettings
     */
    select?: ShopTranslationSettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ShopTranslationSettings
     */
    omit?: ShopTranslationSettingsOmit<ExtArgs> | null
    /**
     * Filter which ShopTranslationSettings to delete.
     */
    where: ShopTranslationSettingsWhereUniqueInput
  }

  /**
   * ShopTranslationSettings deleteMany
   */
  export type ShopTranslationSettingsDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ShopTranslationSettings to delete
     */
    where?: ShopTranslationSettingsWhereInput
    /**
     * Limit how many ShopTranslationSettings to delete.
     */
    limit?: number
  }

  /**
   * ShopTranslationSettings without action
   */
  export type ShopTranslationSettingsDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ShopTranslationSettings
     */
    select?: ShopTranslationSettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ShopTranslationSettings
     */
    omit?: ShopTranslationSettingsOmit<ExtArgs> | null
  }


  /**
   * Model ShopTargetLocale
   */

  export type AggregateShopTargetLocale = {
    _count: ShopTargetLocaleCountAggregateOutputType | null
    _avg: ShopTargetLocaleAvgAggregateOutputType | null
    _sum: ShopTargetLocaleSumAggregateOutputType | null
    _min: ShopTargetLocaleMinAggregateOutputType | null
    _max: ShopTargetLocaleMaxAggregateOutputType | null
  }

  export type ShopTargetLocaleAvgAggregateOutputType = {
    id: number | null
    status: number | null
  }

  export type ShopTargetLocaleSumAggregateOutputType = {
    id: number | null
    status: number | null
  }

  export type ShopTargetLocaleMinAggregateOutputType = {
    id: number | null
    shop: string | null
    locale: string | null
    autoTranslate: boolean | null
    status: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ShopTargetLocaleMaxAggregateOutputType = {
    id: number | null
    shop: string | null
    locale: string | null
    autoTranslate: boolean | null
    status: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ShopTargetLocaleCountAggregateOutputType = {
    id: number
    shop: number
    locale: number
    autoTranslate: number
    status: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type ShopTargetLocaleAvgAggregateInputType = {
    id?: true
    status?: true
  }

  export type ShopTargetLocaleSumAggregateInputType = {
    id?: true
    status?: true
  }

  export type ShopTargetLocaleMinAggregateInputType = {
    id?: true
    shop?: true
    locale?: true
    autoTranslate?: true
    status?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ShopTargetLocaleMaxAggregateInputType = {
    id?: true
    shop?: true
    locale?: true
    autoTranslate?: true
    status?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ShopTargetLocaleCountAggregateInputType = {
    id?: true
    shop?: true
    locale?: true
    autoTranslate?: true
    status?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type ShopTargetLocaleAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ShopTargetLocale to aggregate.
     */
    where?: ShopTargetLocaleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ShopTargetLocales to fetch.
     */
    orderBy?: ShopTargetLocaleOrderByWithRelationInput | ShopTargetLocaleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ShopTargetLocaleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ShopTargetLocales from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ShopTargetLocales.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ShopTargetLocales
    **/
    _count?: true | ShopTargetLocaleCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ShopTargetLocaleAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ShopTargetLocaleSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ShopTargetLocaleMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ShopTargetLocaleMaxAggregateInputType
  }

  export type GetShopTargetLocaleAggregateType<T extends ShopTargetLocaleAggregateArgs> = {
        [P in keyof T & keyof AggregateShopTargetLocale]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateShopTargetLocale[P]>
      : GetScalarType<T[P], AggregateShopTargetLocale[P]>
  }




  export type ShopTargetLocaleGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ShopTargetLocaleWhereInput
    orderBy?: ShopTargetLocaleOrderByWithAggregationInput | ShopTargetLocaleOrderByWithAggregationInput[]
    by: ShopTargetLocaleScalarFieldEnum[] | ShopTargetLocaleScalarFieldEnum
    having?: ShopTargetLocaleScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ShopTargetLocaleCountAggregateInputType | true
    _avg?: ShopTargetLocaleAvgAggregateInputType
    _sum?: ShopTargetLocaleSumAggregateInputType
    _min?: ShopTargetLocaleMinAggregateInputType
    _max?: ShopTargetLocaleMaxAggregateInputType
  }

  export type ShopTargetLocaleGroupByOutputType = {
    id: number
    shop: string
    locale: string
    autoTranslate: boolean
    status: number
    createdAt: Date
    updatedAt: Date
    _count: ShopTargetLocaleCountAggregateOutputType | null
    _avg: ShopTargetLocaleAvgAggregateOutputType | null
    _sum: ShopTargetLocaleSumAggregateOutputType | null
    _min: ShopTargetLocaleMinAggregateOutputType | null
    _max: ShopTargetLocaleMaxAggregateOutputType | null
  }

  type GetShopTargetLocaleGroupByPayload<T extends ShopTargetLocaleGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ShopTargetLocaleGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ShopTargetLocaleGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ShopTargetLocaleGroupByOutputType[P]>
            : GetScalarType<T[P], ShopTargetLocaleGroupByOutputType[P]>
        }
      >
    >


  export type ShopTargetLocaleSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    shop?: boolean
    locale?: boolean
    autoTranslate?: boolean
    status?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["shopTargetLocale"]>

  export type ShopTargetLocaleSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    shop?: boolean
    locale?: boolean
    autoTranslate?: boolean
    status?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["shopTargetLocale"]>

  export type ShopTargetLocaleSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    shop?: boolean
    locale?: boolean
    autoTranslate?: boolean
    status?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["shopTargetLocale"]>

  export type ShopTargetLocaleSelectScalar = {
    id?: boolean
    shop?: boolean
    locale?: boolean
    autoTranslate?: boolean
    status?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type ShopTargetLocaleOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "shop" | "locale" | "autoTranslate" | "status" | "createdAt" | "updatedAt", ExtArgs["result"]["shopTargetLocale"]>

  export type $ShopTargetLocalePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ShopTargetLocale"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      shop: string
      locale: string
      autoTranslate: boolean
      status: number
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["shopTargetLocale"]>
    composites: {}
  }

  type ShopTargetLocaleGetPayload<S extends boolean | null | undefined | ShopTargetLocaleDefaultArgs> = $Result.GetResult<Prisma.$ShopTargetLocalePayload, S>

  type ShopTargetLocaleCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ShopTargetLocaleFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ShopTargetLocaleCountAggregateInputType | true
    }

  export interface ShopTargetLocaleDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ShopTargetLocale'], meta: { name: 'ShopTargetLocale' } }
    /**
     * Find zero or one ShopTargetLocale that matches the filter.
     * @param {ShopTargetLocaleFindUniqueArgs} args - Arguments to find a ShopTargetLocale
     * @example
     * // Get one ShopTargetLocale
     * const shopTargetLocale = await prisma.shopTargetLocale.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ShopTargetLocaleFindUniqueArgs>(args: SelectSubset<T, ShopTargetLocaleFindUniqueArgs<ExtArgs>>): Prisma__ShopTargetLocaleClient<$Result.GetResult<Prisma.$ShopTargetLocalePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ShopTargetLocale that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ShopTargetLocaleFindUniqueOrThrowArgs} args - Arguments to find a ShopTargetLocale
     * @example
     * // Get one ShopTargetLocale
     * const shopTargetLocale = await prisma.shopTargetLocale.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ShopTargetLocaleFindUniqueOrThrowArgs>(args: SelectSubset<T, ShopTargetLocaleFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ShopTargetLocaleClient<$Result.GetResult<Prisma.$ShopTargetLocalePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ShopTargetLocale that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ShopTargetLocaleFindFirstArgs} args - Arguments to find a ShopTargetLocale
     * @example
     * // Get one ShopTargetLocale
     * const shopTargetLocale = await prisma.shopTargetLocale.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ShopTargetLocaleFindFirstArgs>(args?: SelectSubset<T, ShopTargetLocaleFindFirstArgs<ExtArgs>>): Prisma__ShopTargetLocaleClient<$Result.GetResult<Prisma.$ShopTargetLocalePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ShopTargetLocale that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ShopTargetLocaleFindFirstOrThrowArgs} args - Arguments to find a ShopTargetLocale
     * @example
     * // Get one ShopTargetLocale
     * const shopTargetLocale = await prisma.shopTargetLocale.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ShopTargetLocaleFindFirstOrThrowArgs>(args?: SelectSubset<T, ShopTargetLocaleFindFirstOrThrowArgs<ExtArgs>>): Prisma__ShopTargetLocaleClient<$Result.GetResult<Prisma.$ShopTargetLocalePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ShopTargetLocales that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ShopTargetLocaleFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ShopTargetLocales
     * const shopTargetLocales = await prisma.shopTargetLocale.findMany()
     * 
     * // Get first 10 ShopTargetLocales
     * const shopTargetLocales = await prisma.shopTargetLocale.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const shopTargetLocaleWithIdOnly = await prisma.shopTargetLocale.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ShopTargetLocaleFindManyArgs>(args?: SelectSubset<T, ShopTargetLocaleFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ShopTargetLocalePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ShopTargetLocale.
     * @param {ShopTargetLocaleCreateArgs} args - Arguments to create a ShopTargetLocale.
     * @example
     * // Create one ShopTargetLocale
     * const ShopTargetLocale = await prisma.shopTargetLocale.create({
     *   data: {
     *     // ... data to create a ShopTargetLocale
     *   }
     * })
     * 
     */
    create<T extends ShopTargetLocaleCreateArgs>(args: SelectSubset<T, ShopTargetLocaleCreateArgs<ExtArgs>>): Prisma__ShopTargetLocaleClient<$Result.GetResult<Prisma.$ShopTargetLocalePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ShopTargetLocales.
     * @param {ShopTargetLocaleCreateManyArgs} args - Arguments to create many ShopTargetLocales.
     * @example
     * // Create many ShopTargetLocales
     * const shopTargetLocale = await prisma.shopTargetLocale.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ShopTargetLocaleCreateManyArgs>(args?: SelectSubset<T, ShopTargetLocaleCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ShopTargetLocales and returns the data saved in the database.
     * @param {ShopTargetLocaleCreateManyAndReturnArgs} args - Arguments to create many ShopTargetLocales.
     * @example
     * // Create many ShopTargetLocales
     * const shopTargetLocale = await prisma.shopTargetLocale.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ShopTargetLocales and only return the `id`
     * const shopTargetLocaleWithIdOnly = await prisma.shopTargetLocale.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ShopTargetLocaleCreateManyAndReturnArgs>(args?: SelectSubset<T, ShopTargetLocaleCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ShopTargetLocalePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a ShopTargetLocale.
     * @param {ShopTargetLocaleDeleteArgs} args - Arguments to delete one ShopTargetLocale.
     * @example
     * // Delete one ShopTargetLocale
     * const ShopTargetLocale = await prisma.shopTargetLocale.delete({
     *   where: {
     *     // ... filter to delete one ShopTargetLocale
     *   }
     * })
     * 
     */
    delete<T extends ShopTargetLocaleDeleteArgs>(args: SelectSubset<T, ShopTargetLocaleDeleteArgs<ExtArgs>>): Prisma__ShopTargetLocaleClient<$Result.GetResult<Prisma.$ShopTargetLocalePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ShopTargetLocale.
     * @param {ShopTargetLocaleUpdateArgs} args - Arguments to update one ShopTargetLocale.
     * @example
     * // Update one ShopTargetLocale
     * const shopTargetLocale = await prisma.shopTargetLocale.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ShopTargetLocaleUpdateArgs>(args: SelectSubset<T, ShopTargetLocaleUpdateArgs<ExtArgs>>): Prisma__ShopTargetLocaleClient<$Result.GetResult<Prisma.$ShopTargetLocalePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ShopTargetLocales.
     * @param {ShopTargetLocaleDeleteManyArgs} args - Arguments to filter ShopTargetLocales to delete.
     * @example
     * // Delete a few ShopTargetLocales
     * const { count } = await prisma.shopTargetLocale.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ShopTargetLocaleDeleteManyArgs>(args?: SelectSubset<T, ShopTargetLocaleDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ShopTargetLocales.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ShopTargetLocaleUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ShopTargetLocales
     * const shopTargetLocale = await prisma.shopTargetLocale.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ShopTargetLocaleUpdateManyArgs>(args: SelectSubset<T, ShopTargetLocaleUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ShopTargetLocales and returns the data updated in the database.
     * @param {ShopTargetLocaleUpdateManyAndReturnArgs} args - Arguments to update many ShopTargetLocales.
     * @example
     * // Update many ShopTargetLocales
     * const shopTargetLocale = await prisma.shopTargetLocale.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more ShopTargetLocales and only return the `id`
     * const shopTargetLocaleWithIdOnly = await prisma.shopTargetLocale.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ShopTargetLocaleUpdateManyAndReturnArgs>(args: SelectSubset<T, ShopTargetLocaleUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ShopTargetLocalePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one ShopTargetLocale.
     * @param {ShopTargetLocaleUpsertArgs} args - Arguments to update or create a ShopTargetLocale.
     * @example
     * // Update or create a ShopTargetLocale
     * const shopTargetLocale = await prisma.shopTargetLocale.upsert({
     *   create: {
     *     // ... data to create a ShopTargetLocale
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ShopTargetLocale we want to update
     *   }
     * })
     */
    upsert<T extends ShopTargetLocaleUpsertArgs>(args: SelectSubset<T, ShopTargetLocaleUpsertArgs<ExtArgs>>): Prisma__ShopTargetLocaleClient<$Result.GetResult<Prisma.$ShopTargetLocalePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ShopTargetLocales.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ShopTargetLocaleCountArgs} args - Arguments to filter ShopTargetLocales to count.
     * @example
     * // Count the number of ShopTargetLocales
     * const count = await prisma.shopTargetLocale.count({
     *   where: {
     *     // ... the filter for the ShopTargetLocales we want to count
     *   }
     * })
    **/
    count<T extends ShopTargetLocaleCountArgs>(
      args?: Subset<T, ShopTargetLocaleCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ShopTargetLocaleCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ShopTargetLocale.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ShopTargetLocaleAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ShopTargetLocaleAggregateArgs>(args: Subset<T, ShopTargetLocaleAggregateArgs>): Prisma.PrismaPromise<GetShopTargetLocaleAggregateType<T>>

    /**
     * Group by ShopTargetLocale.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ShopTargetLocaleGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ShopTargetLocaleGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ShopTargetLocaleGroupByArgs['orderBy'] }
        : { orderBy?: ShopTargetLocaleGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ShopTargetLocaleGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetShopTargetLocaleGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ShopTargetLocale model
   */
  readonly fields: ShopTargetLocaleFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ShopTargetLocale.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ShopTargetLocaleClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ShopTargetLocale model
   */
  interface ShopTargetLocaleFieldRefs {
    readonly id: FieldRef<"ShopTargetLocale", 'Int'>
    readonly shop: FieldRef<"ShopTargetLocale", 'String'>
    readonly locale: FieldRef<"ShopTargetLocale", 'String'>
    readonly autoTranslate: FieldRef<"ShopTargetLocale", 'Boolean'>
    readonly status: FieldRef<"ShopTargetLocale", 'Int'>
    readonly createdAt: FieldRef<"ShopTargetLocale", 'DateTime'>
    readonly updatedAt: FieldRef<"ShopTargetLocale", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ShopTargetLocale findUnique
   */
  export type ShopTargetLocaleFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ShopTargetLocale
     */
    select?: ShopTargetLocaleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ShopTargetLocale
     */
    omit?: ShopTargetLocaleOmit<ExtArgs> | null
    /**
     * Filter, which ShopTargetLocale to fetch.
     */
    where: ShopTargetLocaleWhereUniqueInput
  }

  /**
   * ShopTargetLocale findUniqueOrThrow
   */
  export type ShopTargetLocaleFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ShopTargetLocale
     */
    select?: ShopTargetLocaleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ShopTargetLocale
     */
    omit?: ShopTargetLocaleOmit<ExtArgs> | null
    /**
     * Filter, which ShopTargetLocale to fetch.
     */
    where: ShopTargetLocaleWhereUniqueInput
  }

  /**
   * ShopTargetLocale findFirst
   */
  export type ShopTargetLocaleFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ShopTargetLocale
     */
    select?: ShopTargetLocaleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ShopTargetLocale
     */
    omit?: ShopTargetLocaleOmit<ExtArgs> | null
    /**
     * Filter, which ShopTargetLocale to fetch.
     */
    where?: ShopTargetLocaleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ShopTargetLocales to fetch.
     */
    orderBy?: ShopTargetLocaleOrderByWithRelationInput | ShopTargetLocaleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ShopTargetLocales.
     */
    cursor?: ShopTargetLocaleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ShopTargetLocales from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ShopTargetLocales.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ShopTargetLocales.
     */
    distinct?: ShopTargetLocaleScalarFieldEnum | ShopTargetLocaleScalarFieldEnum[]
  }

  /**
   * ShopTargetLocale findFirstOrThrow
   */
  export type ShopTargetLocaleFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ShopTargetLocale
     */
    select?: ShopTargetLocaleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ShopTargetLocale
     */
    omit?: ShopTargetLocaleOmit<ExtArgs> | null
    /**
     * Filter, which ShopTargetLocale to fetch.
     */
    where?: ShopTargetLocaleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ShopTargetLocales to fetch.
     */
    orderBy?: ShopTargetLocaleOrderByWithRelationInput | ShopTargetLocaleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ShopTargetLocales.
     */
    cursor?: ShopTargetLocaleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ShopTargetLocales from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ShopTargetLocales.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ShopTargetLocales.
     */
    distinct?: ShopTargetLocaleScalarFieldEnum | ShopTargetLocaleScalarFieldEnum[]
  }

  /**
   * ShopTargetLocale findMany
   */
  export type ShopTargetLocaleFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ShopTargetLocale
     */
    select?: ShopTargetLocaleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ShopTargetLocale
     */
    omit?: ShopTargetLocaleOmit<ExtArgs> | null
    /**
     * Filter, which ShopTargetLocales to fetch.
     */
    where?: ShopTargetLocaleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ShopTargetLocales to fetch.
     */
    orderBy?: ShopTargetLocaleOrderByWithRelationInput | ShopTargetLocaleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ShopTargetLocales.
     */
    cursor?: ShopTargetLocaleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ShopTargetLocales from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ShopTargetLocales.
     */
    skip?: number
    distinct?: ShopTargetLocaleScalarFieldEnum | ShopTargetLocaleScalarFieldEnum[]
  }

  /**
   * ShopTargetLocale create
   */
  export type ShopTargetLocaleCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ShopTargetLocale
     */
    select?: ShopTargetLocaleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ShopTargetLocale
     */
    omit?: ShopTargetLocaleOmit<ExtArgs> | null
    /**
     * The data needed to create a ShopTargetLocale.
     */
    data: XOR<ShopTargetLocaleCreateInput, ShopTargetLocaleUncheckedCreateInput>
  }

  /**
   * ShopTargetLocale createMany
   */
  export type ShopTargetLocaleCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ShopTargetLocales.
     */
    data: ShopTargetLocaleCreateManyInput | ShopTargetLocaleCreateManyInput[]
  }

  /**
   * ShopTargetLocale createManyAndReturn
   */
  export type ShopTargetLocaleCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ShopTargetLocale
     */
    select?: ShopTargetLocaleSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ShopTargetLocale
     */
    omit?: ShopTargetLocaleOmit<ExtArgs> | null
    /**
     * The data used to create many ShopTargetLocales.
     */
    data: ShopTargetLocaleCreateManyInput | ShopTargetLocaleCreateManyInput[]
  }

  /**
   * ShopTargetLocale update
   */
  export type ShopTargetLocaleUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ShopTargetLocale
     */
    select?: ShopTargetLocaleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ShopTargetLocale
     */
    omit?: ShopTargetLocaleOmit<ExtArgs> | null
    /**
     * The data needed to update a ShopTargetLocale.
     */
    data: XOR<ShopTargetLocaleUpdateInput, ShopTargetLocaleUncheckedUpdateInput>
    /**
     * Choose, which ShopTargetLocale to update.
     */
    where: ShopTargetLocaleWhereUniqueInput
  }

  /**
   * ShopTargetLocale updateMany
   */
  export type ShopTargetLocaleUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ShopTargetLocales.
     */
    data: XOR<ShopTargetLocaleUpdateManyMutationInput, ShopTargetLocaleUncheckedUpdateManyInput>
    /**
     * Filter which ShopTargetLocales to update
     */
    where?: ShopTargetLocaleWhereInput
    /**
     * Limit how many ShopTargetLocales to update.
     */
    limit?: number
  }

  /**
   * ShopTargetLocale updateManyAndReturn
   */
  export type ShopTargetLocaleUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ShopTargetLocale
     */
    select?: ShopTargetLocaleSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ShopTargetLocale
     */
    omit?: ShopTargetLocaleOmit<ExtArgs> | null
    /**
     * The data used to update ShopTargetLocales.
     */
    data: XOR<ShopTargetLocaleUpdateManyMutationInput, ShopTargetLocaleUncheckedUpdateManyInput>
    /**
     * Filter which ShopTargetLocales to update
     */
    where?: ShopTargetLocaleWhereInput
    /**
     * Limit how many ShopTargetLocales to update.
     */
    limit?: number
  }

  /**
   * ShopTargetLocale upsert
   */
  export type ShopTargetLocaleUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ShopTargetLocale
     */
    select?: ShopTargetLocaleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ShopTargetLocale
     */
    omit?: ShopTargetLocaleOmit<ExtArgs> | null
    /**
     * The filter to search for the ShopTargetLocale to update in case it exists.
     */
    where: ShopTargetLocaleWhereUniqueInput
    /**
     * In case the ShopTargetLocale found by the `where` argument doesn't exist, create a new ShopTargetLocale with this data.
     */
    create: XOR<ShopTargetLocaleCreateInput, ShopTargetLocaleUncheckedCreateInput>
    /**
     * In case the ShopTargetLocale was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ShopTargetLocaleUpdateInput, ShopTargetLocaleUncheckedUpdateInput>
  }

  /**
   * ShopTargetLocale delete
   */
  export type ShopTargetLocaleDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ShopTargetLocale
     */
    select?: ShopTargetLocaleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ShopTargetLocale
     */
    omit?: ShopTargetLocaleOmit<ExtArgs> | null
    /**
     * Filter which ShopTargetLocale to delete.
     */
    where: ShopTargetLocaleWhereUniqueInput
  }

  /**
   * ShopTargetLocale deleteMany
   */
  export type ShopTargetLocaleDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ShopTargetLocales to delete
     */
    where?: ShopTargetLocaleWhereInput
    /**
     * Limit how many ShopTargetLocales to delete.
     */
    limit?: number
  }

  /**
   * ShopTargetLocale without action
   */
  export type ShopTargetLocaleDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ShopTargetLocale
     */
    select?: ShopTargetLocaleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ShopTargetLocale
     */
    omit?: ShopTargetLocaleOmit<ExtArgs> | null
  }


  /**
   * Model Glossary
   */

  export type AggregateGlossary = {
    _count: GlossaryCountAggregateOutputType | null
    _avg: GlossaryAvgAggregateOutputType | null
    _sum: GlossarySumAggregateOutputType | null
    _min: GlossaryMinAggregateOutputType | null
    _max: GlossaryMaxAggregateOutputType | null
  }

  export type GlossaryAvgAggregateOutputType = {
    id: number | null
    status: number | null
  }

  export type GlossarySumAggregateOutputType = {
    id: number | null
    status: number | null
  }

  export type GlossaryMinAggregateOutputType = {
    id: number | null
    shop: string | null
    sourceText: string | null
    targetText: string | null
    rangeCode: string | null
    caseSensitive: boolean | null
    status: number | null
    createdAt: Date | null
  }

  export type GlossaryMaxAggregateOutputType = {
    id: number | null
    shop: string | null
    sourceText: string | null
    targetText: string | null
    rangeCode: string | null
    caseSensitive: boolean | null
    status: number | null
    createdAt: Date | null
  }

  export type GlossaryCountAggregateOutputType = {
    id: number
    shop: number
    sourceText: number
    targetText: number
    rangeCode: number
    caseSensitive: number
    status: number
    createdAt: number
    _all: number
  }


  export type GlossaryAvgAggregateInputType = {
    id?: true
    status?: true
  }

  export type GlossarySumAggregateInputType = {
    id?: true
    status?: true
  }

  export type GlossaryMinAggregateInputType = {
    id?: true
    shop?: true
    sourceText?: true
    targetText?: true
    rangeCode?: true
    caseSensitive?: true
    status?: true
    createdAt?: true
  }

  export type GlossaryMaxAggregateInputType = {
    id?: true
    shop?: true
    sourceText?: true
    targetText?: true
    rangeCode?: true
    caseSensitive?: true
    status?: true
    createdAt?: true
  }

  export type GlossaryCountAggregateInputType = {
    id?: true
    shop?: true
    sourceText?: true
    targetText?: true
    rangeCode?: true
    caseSensitive?: true
    status?: true
    createdAt?: true
    _all?: true
  }

  export type GlossaryAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Glossary to aggregate.
     */
    where?: GlossaryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Glossaries to fetch.
     */
    orderBy?: GlossaryOrderByWithRelationInput | GlossaryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: GlossaryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Glossaries from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Glossaries.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Glossaries
    **/
    _count?: true | GlossaryCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: GlossaryAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: GlossarySumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: GlossaryMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: GlossaryMaxAggregateInputType
  }

  export type GetGlossaryAggregateType<T extends GlossaryAggregateArgs> = {
        [P in keyof T & keyof AggregateGlossary]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateGlossary[P]>
      : GetScalarType<T[P], AggregateGlossary[P]>
  }




  export type GlossaryGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: GlossaryWhereInput
    orderBy?: GlossaryOrderByWithAggregationInput | GlossaryOrderByWithAggregationInput[]
    by: GlossaryScalarFieldEnum[] | GlossaryScalarFieldEnum
    having?: GlossaryScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: GlossaryCountAggregateInputType | true
    _avg?: GlossaryAvgAggregateInputType
    _sum?: GlossarySumAggregateInputType
    _min?: GlossaryMinAggregateInputType
    _max?: GlossaryMaxAggregateInputType
  }

  export type GlossaryGroupByOutputType = {
    id: number
    shop: string
    sourceText: string
    targetText: string
    rangeCode: string | null
    caseSensitive: boolean
    status: number
    createdAt: Date
    _count: GlossaryCountAggregateOutputType | null
    _avg: GlossaryAvgAggregateOutputType | null
    _sum: GlossarySumAggregateOutputType | null
    _min: GlossaryMinAggregateOutputType | null
    _max: GlossaryMaxAggregateOutputType | null
  }

  type GetGlossaryGroupByPayload<T extends GlossaryGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<GlossaryGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof GlossaryGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], GlossaryGroupByOutputType[P]>
            : GetScalarType<T[P], GlossaryGroupByOutputType[P]>
        }
      >
    >


  export type GlossarySelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    shop?: boolean
    sourceText?: boolean
    targetText?: boolean
    rangeCode?: boolean
    caseSensitive?: boolean
    status?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["glossary"]>

  export type GlossarySelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    shop?: boolean
    sourceText?: boolean
    targetText?: boolean
    rangeCode?: boolean
    caseSensitive?: boolean
    status?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["glossary"]>

  export type GlossarySelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    shop?: boolean
    sourceText?: boolean
    targetText?: boolean
    rangeCode?: boolean
    caseSensitive?: boolean
    status?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["glossary"]>

  export type GlossarySelectScalar = {
    id?: boolean
    shop?: boolean
    sourceText?: boolean
    targetText?: boolean
    rangeCode?: boolean
    caseSensitive?: boolean
    status?: boolean
    createdAt?: boolean
  }

  export type GlossaryOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "shop" | "sourceText" | "targetText" | "rangeCode" | "caseSensitive" | "status" | "createdAt", ExtArgs["result"]["glossary"]>

  export type $GlossaryPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Glossary"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      shop: string
      sourceText: string
      targetText: string
      rangeCode: string | null
      caseSensitive: boolean
      status: number
      createdAt: Date
    }, ExtArgs["result"]["glossary"]>
    composites: {}
  }

  type GlossaryGetPayload<S extends boolean | null | undefined | GlossaryDefaultArgs> = $Result.GetResult<Prisma.$GlossaryPayload, S>

  type GlossaryCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<GlossaryFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: GlossaryCountAggregateInputType | true
    }

  export interface GlossaryDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Glossary'], meta: { name: 'Glossary' } }
    /**
     * Find zero or one Glossary that matches the filter.
     * @param {GlossaryFindUniqueArgs} args - Arguments to find a Glossary
     * @example
     * // Get one Glossary
     * const glossary = await prisma.glossary.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends GlossaryFindUniqueArgs>(args: SelectSubset<T, GlossaryFindUniqueArgs<ExtArgs>>): Prisma__GlossaryClient<$Result.GetResult<Prisma.$GlossaryPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Glossary that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {GlossaryFindUniqueOrThrowArgs} args - Arguments to find a Glossary
     * @example
     * // Get one Glossary
     * const glossary = await prisma.glossary.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends GlossaryFindUniqueOrThrowArgs>(args: SelectSubset<T, GlossaryFindUniqueOrThrowArgs<ExtArgs>>): Prisma__GlossaryClient<$Result.GetResult<Prisma.$GlossaryPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Glossary that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GlossaryFindFirstArgs} args - Arguments to find a Glossary
     * @example
     * // Get one Glossary
     * const glossary = await prisma.glossary.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends GlossaryFindFirstArgs>(args?: SelectSubset<T, GlossaryFindFirstArgs<ExtArgs>>): Prisma__GlossaryClient<$Result.GetResult<Prisma.$GlossaryPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Glossary that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GlossaryFindFirstOrThrowArgs} args - Arguments to find a Glossary
     * @example
     * // Get one Glossary
     * const glossary = await prisma.glossary.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends GlossaryFindFirstOrThrowArgs>(args?: SelectSubset<T, GlossaryFindFirstOrThrowArgs<ExtArgs>>): Prisma__GlossaryClient<$Result.GetResult<Prisma.$GlossaryPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Glossaries that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GlossaryFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Glossaries
     * const glossaries = await prisma.glossary.findMany()
     * 
     * // Get first 10 Glossaries
     * const glossaries = await prisma.glossary.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const glossaryWithIdOnly = await prisma.glossary.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends GlossaryFindManyArgs>(args?: SelectSubset<T, GlossaryFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GlossaryPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Glossary.
     * @param {GlossaryCreateArgs} args - Arguments to create a Glossary.
     * @example
     * // Create one Glossary
     * const Glossary = await prisma.glossary.create({
     *   data: {
     *     // ... data to create a Glossary
     *   }
     * })
     * 
     */
    create<T extends GlossaryCreateArgs>(args: SelectSubset<T, GlossaryCreateArgs<ExtArgs>>): Prisma__GlossaryClient<$Result.GetResult<Prisma.$GlossaryPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Glossaries.
     * @param {GlossaryCreateManyArgs} args - Arguments to create many Glossaries.
     * @example
     * // Create many Glossaries
     * const glossary = await prisma.glossary.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends GlossaryCreateManyArgs>(args?: SelectSubset<T, GlossaryCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Glossaries and returns the data saved in the database.
     * @param {GlossaryCreateManyAndReturnArgs} args - Arguments to create many Glossaries.
     * @example
     * // Create many Glossaries
     * const glossary = await prisma.glossary.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Glossaries and only return the `id`
     * const glossaryWithIdOnly = await prisma.glossary.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends GlossaryCreateManyAndReturnArgs>(args?: SelectSubset<T, GlossaryCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GlossaryPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Glossary.
     * @param {GlossaryDeleteArgs} args - Arguments to delete one Glossary.
     * @example
     * // Delete one Glossary
     * const Glossary = await prisma.glossary.delete({
     *   where: {
     *     // ... filter to delete one Glossary
     *   }
     * })
     * 
     */
    delete<T extends GlossaryDeleteArgs>(args: SelectSubset<T, GlossaryDeleteArgs<ExtArgs>>): Prisma__GlossaryClient<$Result.GetResult<Prisma.$GlossaryPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Glossary.
     * @param {GlossaryUpdateArgs} args - Arguments to update one Glossary.
     * @example
     * // Update one Glossary
     * const glossary = await prisma.glossary.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends GlossaryUpdateArgs>(args: SelectSubset<T, GlossaryUpdateArgs<ExtArgs>>): Prisma__GlossaryClient<$Result.GetResult<Prisma.$GlossaryPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Glossaries.
     * @param {GlossaryDeleteManyArgs} args - Arguments to filter Glossaries to delete.
     * @example
     * // Delete a few Glossaries
     * const { count } = await prisma.glossary.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends GlossaryDeleteManyArgs>(args?: SelectSubset<T, GlossaryDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Glossaries.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GlossaryUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Glossaries
     * const glossary = await prisma.glossary.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends GlossaryUpdateManyArgs>(args: SelectSubset<T, GlossaryUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Glossaries and returns the data updated in the database.
     * @param {GlossaryUpdateManyAndReturnArgs} args - Arguments to update many Glossaries.
     * @example
     * // Update many Glossaries
     * const glossary = await prisma.glossary.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Glossaries and only return the `id`
     * const glossaryWithIdOnly = await prisma.glossary.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends GlossaryUpdateManyAndReturnArgs>(args: SelectSubset<T, GlossaryUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GlossaryPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Glossary.
     * @param {GlossaryUpsertArgs} args - Arguments to update or create a Glossary.
     * @example
     * // Update or create a Glossary
     * const glossary = await prisma.glossary.upsert({
     *   create: {
     *     // ... data to create a Glossary
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Glossary we want to update
     *   }
     * })
     */
    upsert<T extends GlossaryUpsertArgs>(args: SelectSubset<T, GlossaryUpsertArgs<ExtArgs>>): Prisma__GlossaryClient<$Result.GetResult<Prisma.$GlossaryPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Glossaries.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GlossaryCountArgs} args - Arguments to filter Glossaries to count.
     * @example
     * // Count the number of Glossaries
     * const count = await prisma.glossary.count({
     *   where: {
     *     // ... the filter for the Glossaries we want to count
     *   }
     * })
    **/
    count<T extends GlossaryCountArgs>(
      args?: Subset<T, GlossaryCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], GlossaryCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Glossary.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GlossaryAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends GlossaryAggregateArgs>(args: Subset<T, GlossaryAggregateArgs>): Prisma.PrismaPromise<GetGlossaryAggregateType<T>>

    /**
     * Group by Glossary.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GlossaryGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends GlossaryGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: GlossaryGroupByArgs['orderBy'] }
        : { orderBy?: GlossaryGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, GlossaryGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetGlossaryGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Glossary model
   */
  readonly fields: GlossaryFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Glossary.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__GlossaryClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Glossary model
   */
  interface GlossaryFieldRefs {
    readonly id: FieldRef<"Glossary", 'Int'>
    readonly shop: FieldRef<"Glossary", 'String'>
    readonly sourceText: FieldRef<"Glossary", 'String'>
    readonly targetText: FieldRef<"Glossary", 'String'>
    readonly rangeCode: FieldRef<"Glossary", 'String'>
    readonly caseSensitive: FieldRef<"Glossary", 'Boolean'>
    readonly status: FieldRef<"Glossary", 'Int'>
    readonly createdAt: FieldRef<"Glossary", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Glossary findUnique
   */
  export type GlossaryFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Glossary
     */
    select?: GlossarySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Glossary
     */
    omit?: GlossaryOmit<ExtArgs> | null
    /**
     * Filter, which Glossary to fetch.
     */
    where: GlossaryWhereUniqueInput
  }

  /**
   * Glossary findUniqueOrThrow
   */
  export type GlossaryFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Glossary
     */
    select?: GlossarySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Glossary
     */
    omit?: GlossaryOmit<ExtArgs> | null
    /**
     * Filter, which Glossary to fetch.
     */
    where: GlossaryWhereUniqueInput
  }

  /**
   * Glossary findFirst
   */
  export type GlossaryFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Glossary
     */
    select?: GlossarySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Glossary
     */
    omit?: GlossaryOmit<ExtArgs> | null
    /**
     * Filter, which Glossary to fetch.
     */
    where?: GlossaryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Glossaries to fetch.
     */
    orderBy?: GlossaryOrderByWithRelationInput | GlossaryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Glossaries.
     */
    cursor?: GlossaryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Glossaries from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Glossaries.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Glossaries.
     */
    distinct?: GlossaryScalarFieldEnum | GlossaryScalarFieldEnum[]
  }

  /**
   * Glossary findFirstOrThrow
   */
  export type GlossaryFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Glossary
     */
    select?: GlossarySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Glossary
     */
    omit?: GlossaryOmit<ExtArgs> | null
    /**
     * Filter, which Glossary to fetch.
     */
    where?: GlossaryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Glossaries to fetch.
     */
    orderBy?: GlossaryOrderByWithRelationInput | GlossaryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Glossaries.
     */
    cursor?: GlossaryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Glossaries from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Glossaries.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Glossaries.
     */
    distinct?: GlossaryScalarFieldEnum | GlossaryScalarFieldEnum[]
  }

  /**
   * Glossary findMany
   */
  export type GlossaryFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Glossary
     */
    select?: GlossarySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Glossary
     */
    omit?: GlossaryOmit<ExtArgs> | null
    /**
     * Filter, which Glossaries to fetch.
     */
    where?: GlossaryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Glossaries to fetch.
     */
    orderBy?: GlossaryOrderByWithRelationInput | GlossaryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Glossaries.
     */
    cursor?: GlossaryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Glossaries from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Glossaries.
     */
    skip?: number
    distinct?: GlossaryScalarFieldEnum | GlossaryScalarFieldEnum[]
  }

  /**
   * Glossary create
   */
  export type GlossaryCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Glossary
     */
    select?: GlossarySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Glossary
     */
    omit?: GlossaryOmit<ExtArgs> | null
    /**
     * The data needed to create a Glossary.
     */
    data: XOR<GlossaryCreateInput, GlossaryUncheckedCreateInput>
  }

  /**
   * Glossary createMany
   */
  export type GlossaryCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Glossaries.
     */
    data: GlossaryCreateManyInput | GlossaryCreateManyInput[]
  }

  /**
   * Glossary createManyAndReturn
   */
  export type GlossaryCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Glossary
     */
    select?: GlossarySelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Glossary
     */
    omit?: GlossaryOmit<ExtArgs> | null
    /**
     * The data used to create many Glossaries.
     */
    data: GlossaryCreateManyInput | GlossaryCreateManyInput[]
  }

  /**
   * Glossary update
   */
  export type GlossaryUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Glossary
     */
    select?: GlossarySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Glossary
     */
    omit?: GlossaryOmit<ExtArgs> | null
    /**
     * The data needed to update a Glossary.
     */
    data: XOR<GlossaryUpdateInput, GlossaryUncheckedUpdateInput>
    /**
     * Choose, which Glossary to update.
     */
    where: GlossaryWhereUniqueInput
  }

  /**
   * Glossary updateMany
   */
  export type GlossaryUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Glossaries.
     */
    data: XOR<GlossaryUpdateManyMutationInput, GlossaryUncheckedUpdateManyInput>
    /**
     * Filter which Glossaries to update
     */
    where?: GlossaryWhereInput
    /**
     * Limit how many Glossaries to update.
     */
    limit?: number
  }

  /**
   * Glossary updateManyAndReturn
   */
  export type GlossaryUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Glossary
     */
    select?: GlossarySelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Glossary
     */
    omit?: GlossaryOmit<ExtArgs> | null
    /**
     * The data used to update Glossaries.
     */
    data: XOR<GlossaryUpdateManyMutationInput, GlossaryUncheckedUpdateManyInput>
    /**
     * Filter which Glossaries to update
     */
    where?: GlossaryWhereInput
    /**
     * Limit how many Glossaries to update.
     */
    limit?: number
  }

  /**
   * Glossary upsert
   */
  export type GlossaryUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Glossary
     */
    select?: GlossarySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Glossary
     */
    omit?: GlossaryOmit<ExtArgs> | null
    /**
     * The filter to search for the Glossary to update in case it exists.
     */
    where: GlossaryWhereUniqueInput
    /**
     * In case the Glossary found by the `where` argument doesn't exist, create a new Glossary with this data.
     */
    create: XOR<GlossaryCreateInput, GlossaryUncheckedCreateInput>
    /**
     * In case the Glossary was found with the provided `where` argument, update it with this data.
     */
    update: XOR<GlossaryUpdateInput, GlossaryUncheckedUpdateInput>
  }

  /**
   * Glossary delete
   */
  export type GlossaryDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Glossary
     */
    select?: GlossarySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Glossary
     */
    omit?: GlossaryOmit<ExtArgs> | null
    /**
     * Filter which Glossary to delete.
     */
    where: GlossaryWhereUniqueInput
  }

  /**
   * Glossary deleteMany
   */
  export type GlossaryDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Glossaries to delete
     */
    where?: GlossaryWhereInput
    /**
     * Limit how many Glossaries to delete.
     */
    limit?: number
  }

  /**
   * Glossary without action
   */
  export type GlossaryDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Glossary
     */
    select?: GlossarySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Glossary
     */
    omit?: GlossaryOmit<ExtArgs> | null
  }


  /**
   * Model PageFlyTranslation
   */

  export type AggregatePageFlyTranslation = {
    _count: PageFlyTranslationCountAggregateOutputType | null
    _avg: PageFlyTranslationAvgAggregateOutputType | null
    _sum: PageFlyTranslationSumAggregateOutputType | null
    _min: PageFlyTranslationMinAggregateOutputType | null
    _max: PageFlyTranslationMaxAggregateOutputType | null
  }

  export type PageFlyTranslationAvgAggregateOutputType = {
    id: number | null
  }

  export type PageFlyTranslationSumAggregateOutputType = {
    id: number | null
  }

  export type PageFlyTranslationMinAggregateOutputType = {
    id: number | null
    shop: string | null
    sourceText: string | null
    targetText: string | null
    languageCode: string | null
    isDeleted: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type PageFlyTranslationMaxAggregateOutputType = {
    id: number | null
    shop: string | null
    sourceText: string | null
    targetText: string | null
    languageCode: string | null
    isDeleted: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type PageFlyTranslationCountAggregateOutputType = {
    id: number
    shop: number
    sourceText: number
    targetText: number
    languageCode: number
    isDeleted: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type PageFlyTranslationAvgAggregateInputType = {
    id?: true
  }

  export type PageFlyTranslationSumAggregateInputType = {
    id?: true
  }

  export type PageFlyTranslationMinAggregateInputType = {
    id?: true
    shop?: true
    sourceText?: true
    targetText?: true
    languageCode?: true
    isDeleted?: true
    createdAt?: true
    updatedAt?: true
  }

  export type PageFlyTranslationMaxAggregateInputType = {
    id?: true
    shop?: true
    sourceText?: true
    targetText?: true
    languageCode?: true
    isDeleted?: true
    createdAt?: true
    updatedAt?: true
  }

  export type PageFlyTranslationCountAggregateInputType = {
    id?: true
    shop?: true
    sourceText?: true
    targetText?: true
    languageCode?: true
    isDeleted?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type PageFlyTranslationAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PageFlyTranslation to aggregate.
     */
    where?: PageFlyTranslationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PageFlyTranslations to fetch.
     */
    orderBy?: PageFlyTranslationOrderByWithRelationInput | PageFlyTranslationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: PageFlyTranslationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PageFlyTranslations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PageFlyTranslations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned PageFlyTranslations
    **/
    _count?: true | PageFlyTranslationCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: PageFlyTranslationAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: PageFlyTranslationSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: PageFlyTranslationMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: PageFlyTranslationMaxAggregateInputType
  }

  export type GetPageFlyTranslationAggregateType<T extends PageFlyTranslationAggregateArgs> = {
        [P in keyof T & keyof AggregatePageFlyTranslation]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregatePageFlyTranslation[P]>
      : GetScalarType<T[P], AggregatePageFlyTranslation[P]>
  }




  export type PageFlyTranslationGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PageFlyTranslationWhereInput
    orderBy?: PageFlyTranslationOrderByWithAggregationInput | PageFlyTranslationOrderByWithAggregationInput[]
    by: PageFlyTranslationScalarFieldEnum[] | PageFlyTranslationScalarFieldEnum
    having?: PageFlyTranslationScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: PageFlyTranslationCountAggregateInputType | true
    _avg?: PageFlyTranslationAvgAggregateInputType
    _sum?: PageFlyTranslationSumAggregateInputType
    _min?: PageFlyTranslationMinAggregateInputType
    _max?: PageFlyTranslationMaxAggregateInputType
  }

  export type PageFlyTranslationGroupByOutputType = {
    id: number
    shop: string
    sourceText: string
    targetText: string
    languageCode: string
    isDeleted: boolean
    createdAt: Date
    updatedAt: Date
    _count: PageFlyTranslationCountAggregateOutputType | null
    _avg: PageFlyTranslationAvgAggregateOutputType | null
    _sum: PageFlyTranslationSumAggregateOutputType | null
    _min: PageFlyTranslationMinAggregateOutputType | null
    _max: PageFlyTranslationMaxAggregateOutputType | null
  }

  type GetPageFlyTranslationGroupByPayload<T extends PageFlyTranslationGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<PageFlyTranslationGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof PageFlyTranslationGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], PageFlyTranslationGroupByOutputType[P]>
            : GetScalarType<T[P], PageFlyTranslationGroupByOutputType[P]>
        }
      >
    >


  export type PageFlyTranslationSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    shop?: boolean
    sourceText?: boolean
    targetText?: boolean
    languageCode?: boolean
    isDeleted?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["pageFlyTranslation"]>

  export type PageFlyTranslationSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    shop?: boolean
    sourceText?: boolean
    targetText?: boolean
    languageCode?: boolean
    isDeleted?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["pageFlyTranslation"]>

  export type PageFlyTranslationSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    shop?: boolean
    sourceText?: boolean
    targetText?: boolean
    languageCode?: boolean
    isDeleted?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["pageFlyTranslation"]>

  export type PageFlyTranslationSelectScalar = {
    id?: boolean
    shop?: boolean
    sourceText?: boolean
    targetText?: boolean
    languageCode?: boolean
    isDeleted?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type PageFlyTranslationOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "shop" | "sourceText" | "targetText" | "languageCode" | "isDeleted" | "createdAt" | "updatedAt", ExtArgs["result"]["pageFlyTranslation"]>

  export type $PageFlyTranslationPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "PageFlyTranslation"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      shop: string
      sourceText: string
      targetText: string
      languageCode: string
      isDeleted: boolean
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["pageFlyTranslation"]>
    composites: {}
  }

  type PageFlyTranslationGetPayload<S extends boolean | null | undefined | PageFlyTranslationDefaultArgs> = $Result.GetResult<Prisma.$PageFlyTranslationPayload, S>

  type PageFlyTranslationCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<PageFlyTranslationFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: PageFlyTranslationCountAggregateInputType | true
    }

  export interface PageFlyTranslationDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['PageFlyTranslation'], meta: { name: 'PageFlyTranslation' } }
    /**
     * Find zero or one PageFlyTranslation that matches the filter.
     * @param {PageFlyTranslationFindUniqueArgs} args - Arguments to find a PageFlyTranslation
     * @example
     * // Get one PageFlyTranslation
     * const pageFlyTranslation = await prisma.pageFlyTranslation.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends PageFlyTranslationFindUniqueArgs>(args: SelectSubset<T, PageFlyTranslationFindUniqueArgs<ExtArgs>>): Prisma__PageFlyTranslationClient<$Result.GetResult<Prisma.$PageFlyTranslationPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one PageFlyTranslation that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {PageFlyTranslationFindUniqueOrThrowArgs} args - Arguments to find a PageFlyTranslation
     * @example
     * // Get one PageFlyTranslation
     * const pageFlyTranslation = await prisma.pageFlyTranslation.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends PageFlyTranslationFindUniqueOrThrowArgs>(args: SelectSubset<T, PageFlyTranslationFindUniqueOrThrowArgs<ExtArgs>>): Prisma__PageFlyTranslationClient<$Result.GetResult<Prisma.$PageFlyTranslationPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first PageFlyTranslation that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PageFlyTranslationFindFirstArgs} args - Arguments to find a PageFlyTranslation
     * @example
     * // Get one PageFlyTranslation
     * const pageFlyTranslation = await prisma.pageFlyTranslation.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends PageFlyTranslationFindFirstArgs>(args?: SelectSubset<T, PageFlyTranslationFindFirstArgs<ExtArgs>>): Prisma__PageFlyTranslationClient<$Result.GetResult<Prisma.$PageFlyTranslationPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first PageFlyTranslation that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PageFlyTranslationFindFirstOrThrowArgs} args - Arguments to find a PageFlyTranslation
     * @example
     * // Get one PageFlyTranslation
     * const pageFlyTranslation = await prisma.pageFlyTranslation.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends PageFlyTranslationFindFirstOrThrowArgs>(args?: SelectSubset<T, PageFlyTranslationFindFirstOrThrowArgs<ExtArgs>>): Prisma__PageFlyTranslationClient<$Result.GetResult<Prisma.$PageFlyTranslationPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more PageFlyTranslations that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PageFlyTranslationFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all PageFlyTranslations
     * const pageFlyTranslations = await prisma.pageFlyTranslation.findMany()
     * 
     * // Get first 10 PageFlyTranslations
     * const pageFlyTranslations = await prisma.pageFlyTranslation.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const pageFlyTranslationWithIdOnly = await prisma.pageFlyTranslation.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends PageFlyTranslationFindManyArgs>(args?: SelectSubset<T, PageFlyTranslationFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PageFlyTranslationPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a PageFlyTranslation.
     * @param {PageFlyTranslationCreateArgs} args - Arguments to create a PageFlyTranslation.
     * @example
     * // Create one PageFlyTranslation
     * const PageFlyTranslation = await prisma.pageFlyTranslation.create({
     *   data: {
     *     // ... data to create a PageFlyTranslation
     *   }
     * })
     * 
     */
    create<T extends PageFlyTranslationCreateArgs>(args: SelectSubset<T, PageFlyTranslationCreateArgs<ExtArgs>>): Prisma__PageFlyTranslationClient<$Result.GetResult<Prisma.$PageFlyTranslationPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many PageFlyTranslations.
     * @param {PageFlyTranslationCreateManyArgs} args - Arguments to create many PageFlyTranslations.
     * @example
     * // Create many PageFlyTranslations
     * const pageFlyTranslation = await prisma.pageFlyTranslation.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends PageFlyTranslationCreateManyArgs>(args?: SelectSubset<T, PageFlyTranslationCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many PageFlyTranslations and returns the data saved in the database.
     * @param {PageFlyTranslationCreateManyAndReturnArgs} args - Arguments to create many PageFlyTranslations.
     * @example
     * // Create many PageFlyTranslations
     * const pageFlyTranslation = await prisma.pageFlyTranslation.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many PageFlyTranslations and only return the `id`
     * const pageFlyTranslationWithIdOnly = await prisma.pageFlyTranslation.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends PageFlyTranslationCreateManyAndReturnArgs>(args?: SelectSubset<T, PageFlyTranslationCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PageFlyTranslationPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a PageFlyTranslation.
     * @param {PageFlyTranslationDeleteArgs} args - Arguments to delete one PageFlyTranslation.
     * @example
     * // Delete one PageFlyTranslation
     * const PageFlyTranslation = await prisma.pageFlyTranslation.delete({
     *   where: {
     *     // ... filter to delete one PageFlyTranslation
     *   }
     * })
     * 
     */
    delete<T extends PageFlyTranslationDeleteArgs>(args: SelectSubset<T, PageFlyTranslationDeleteArgs<ExtArgs>>): Prisma__PageFlyTranslationClient<$Result.GetResult<Prisma.$PageFlyTranslationPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one PageFlyTranslation.
     * @param {PageFlyTranslationUpdateArgs} args - Arguments to update one PageFlyTranslation.
     * @example
     * // Update one PageFlyTranslation
     * const pageFlyTranslation = await prisma.pageFlyTranslation.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends PageFlyTranslationUpdateArgs>(args: SelectSubset<T, PageFlyTranslationUpdateArgs<ExtArgs>>): Prisma__PageFlyTranslationClient<$Result.GetResult<Prisma.$PageFlyTranslationPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more PageFlyTranslations.
     * @param {PageFlyTranslationDeleteManyArgs} args - Arguments to filter PageFlyTranslations to delete.
     * @example
     * // Delete a few PageFlyTranslations
     * const { count } = await prisma.pageFlyTranslation.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends PageFlyTranslationDeleteManyArgs>(args?: SelectSubset<T, PageFlyTranslationDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more PageFlyTranslations.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PageFlyTranslationUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many PageFlyTranslations
     * const pageFlyTranslation = await prisma.pageFlyTranslation.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends PageFlyTranslationUpdateManyArgs>(args: SelectSubset<T, PageFlyTranslationUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more PageFlyTranslations and returns the data updated in the database.
     * @param {PageFlyTranslationUpdateManyAndReturnArgs} args - Arguments to update many PageFlyTranslations.
     * @example
     * // Update many PageFlyTranslations
     * const pageFlyTranslation = await prisma.pageFlyTranslation.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more PageFlyTranslations and only return the `id`
     * const pageFlyTranslationWithIdOnly = await prisma.pageFlyTranslation.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends PageFlyTranslationUpdateManyAndReturnArgs>(args: SelectSubset<T, PageFlyTranslationUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PageFlyTranslationPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one PageFlyTranslation.
     * @param {PageFlyTranslationUpsertArgs} args - Arguments to update or create a PageFlyTranslation.
     * @example
     * // Update or create a PageFlyTranslation
     * const pageFlyTranslation = await prisma.pageFlyTranslation.upsert({
     *   create: {
     *     // ... data to create a PageFlyTranslation
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the PageFlyTranslation we want to update
     *   }
     * })
     */
    upsert<T extends PageFlyTranslationUpsertArgs>(args: SelectSubset<T, PageFlyTranslationUpsertArgs<ExtArgs>>): Prisma__PageFlyTranslationClient<$Result.GetResult<Prisma.$PageFlyTranslationPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of PageFlyTranslations.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PageFlyTranslationCountArgs} args - Arguments to filter PageFlyTranslations to count.
     * @example
     * // Count the number of PageFlyTranslations
     * const count = await prisma.pageFlyTranslation.count({
     *   where: {
     *     // ... the filter for the PageFlyTranslations we want to count
     *   }
     * })
    **/
    count<T extends PageFlyTranslationCountArgs>(
      args?: Subset<T, PageFlyTranslationCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], PageFlyTranslationCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a PageFlyTranslation.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PageFlyTranslationAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends PageFlyTranslationAggregateArgs>(args: Subset<T, PageFlyTranslationAggregateArgs>): Prisma.PrismaPromise<GetPageFlyTranslationAggregateType<T>>

    /**
     * Group by PageFlyTranslation.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PageFlyTranslationGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends PageFlyTranslationGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: PageFlyTranslationGroupByArgs['orderBy'] }
        : { orderBy?: PageFlyTranslationGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, PageFlyTranslationGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPageFlyTranslationGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the PageFlyTranslation model
   */
  readonly fields: PageFlyTranslationFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for PageFlyTranslation.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__PageFlyTranslationClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the PageFlyTranslation model
   */
  interface PageFlyTranslationFieldRefs {
    readonly id: FieldRef<"PageFlyTranslation", 'Int'>
    readonly shop: FieldRef<"PageFlyTranslation", 'String'>
    readonly sourceText: FieldRef<"PageFlyTranslation", 'String'>
    readonly targetText: FieldRef<"PageFlyTranslation", 'String'>
    readonly languageCode: FieldRef<"PageFlyTranslation", 'String'>
    readonly isDeleted: FieldRef<"PageFlyTranslation", 'Boolean'>
    readonly createdAt: FieldRef<"PageFlyTranslation", 'DateTime'>
    readonly updatedAt: FieldRef<"PageFlyTranslation", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * PageFlyTranslation findUnique
   */
  export type PageFlyTranslationFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PageFlyTranslation
     */
    select?: PageFlyTranslationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PageFlyTranslation
     */
    omit?: PageFlyTranslationOmit<ExtArgs> | null
    /**
     * Filter, which PageFlyTranslation to fetch.
     */
    where: PageFlyTranslationWhereUniqueInput
  }

  /**
   * PageFlyTranslation findUniqueOrThrow
   */
  export type PageFlyTranslationFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PageFlyTranslation
     */
    select?: PageFlyTranslationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PageFlyTranslation
     */
    omit?: PageFlyTranslationOmit<ExtArgs> | null
    /**
     * Filter, which PageFlyTranslation to fetch.
     */
    where: PageFlyTranslationWhereUniqueInput
  }

  /**
   * PageFlyTranslation findFirst
   */
  export type PageFlyTranslationFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PageFlyTranslation
     */
    select?: PageFlyTranslationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PageFlyTranslation
     */
    omit?: PageFlyTranslationOmit<ExtArgs> | null
    /**
     * Filter, which PageFlyTranslation to fetch.
     */
    where?: PageFlyTranslationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PageFlyTranslations to fetch.
     */
    orderBy?: PageFlyTranslationOrderByWithRelationInput | PageFlyTranslationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PageFlyTranslations.
     */
    cursor?: PageFlyTranslationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PageFlyTranslations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PageFlyTranslations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PageFlyTranslations.
     */
    distinct?: PageFlyTranslationScalarFieldEnum | PageFlyTranslationScalarFieldEnum[]
  }

  /**
   * PageFlyTranslation findFirstOrThrow
   */
  export type PageFlyTranslationFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PageFlyTranslation
     */
    select?: PageFlyTranslationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PageFlyTranslation
     */
    omit?: PageFlyTranslationOmit<ExtArgs> | null
    /**
     * Filter, which PageFlyTranslation to fetch.
     */
    where?: PageFlyTranslationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PageFlyTranslations to fetch.
     */
    orderBy?: PageFlyTranslationOrderByWithRelationInput | PageFlyTranslationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PageFlyTranslations.
     */
    cursor?: PageFlyTranslationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PageFlyTranslations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PageFlyTranslations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PageFlyTranslations.
     */
    distinct?: PageFlyTranslationScalarFieldEnum | PageFlyTranslationScalarFieldEnum[]
  }

  /**
   * PageFlyTranslation findMany
   */
  export type PageFlyTranslationFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PageFlyTranslation
     */
    select?: PageFlyTranslationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PageFlyTranslation
     */
    omit?: PageFlyTranslationOmit<ExtArgs> | null
    /**
     * Filter, which PageFlyTranslations to fetch.
     */
    where?: PageFlyTranslationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PageFlyTranslations to fetch.
     */
    orderBy?: PageFlyTranslationOrderByWithRelationInput | PageFlyTranslationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing PageFlyTranslations.
     */
    cursor?: PageFlyTranslationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PageFlyTranslations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PageFlyTranslations.
     */
    skip?: number
    distinct?: PageFlyTranslationScalarFieldEnum | PageFlyTranslationScalarFieldEnum[]
  }

  /**
   * PageFlyTranslation create
   */
  export type PageFlyTranslationCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PageFlyTranslation
     */
    select?: PageFlyTranslationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PageFlyTranslation
     */
    omit?: PageFlyTranslationOmit<ExtArgs> | null
    /**
     * The data needed to create a PageFlyTranslation.
     */
    data: XOR<PageFlyTranslationCreateInput, PageFlyTranslationUncheckedCreateInput>
  }

  /**
   * PageFlyTranslation createMany
   */
  export type PageFlyTranslationCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many PageFlyTranslations.
     */
    data: PageFlyTranslationCreateManyInput | PageFlyTranslationCreateManyInput[]
  }

  /**
   * PageFlyTranslation createManyAndReturn
   */
  export type PageFlyTranslationCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PageFlyTranslation
     */
    select?: PageFlyTranslationSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the PageFlyTranslation
     */
    omit?: PageFlyTranslationOmit<ExtArgs> | null
    /**
     * The data used to create many PageFlyTranslations.
     */
    data: PageFlyTranslationCreateManyInput | PageFlyTranslationCreateManyInput[]
  }

  /**
   * PageFlyTranslation update
   */
  export type PageFlyTranslationUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PageFlyTranslation
     */
    select?: PageFlyTranslationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PageFlyTranslation
     */
    omit?: PageFlyTranslationOmit<ExtArgs> | null
    /**
     * The data needed to update a PageFlyTranslation.
     */
    data: XOR<PageFlyTranslationUpdateInput, PageFlyTranslationUncheckedUpdateInput>
    /**
     * Choose, which PageFlyTranslation to update.
     */
    where: PageFlyTranslationWhereUniqueInput
  }

  /**
   * PageFlyTranslation updateMany
   */
  export type PageFlyTranslationUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update PageFlyTranslations.
     */
    data: XOR<PageFlyTranslationUpdateManyMutationInput, PageFlyTranslationUncheckedUpdateManyInput>
    /**
     * Filter which PageFlyTranslations to update
     */
    where?: PageFlyTranslationWhereInput
    /**
     * Limit how many PageFlyTranslations to update.
     */
    limit?: number
  }

  /**
   * PageFlyTranslation updateManyAndReturn
   */
  export type PageFlyTranslationUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PageFlyTranslation
     */
    select?: PageFlyTranslationSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the PageFlyTranslation
     */
    omit?: PageFlyTranslationOmit<ExtArgs> | null
    /**
     * The data used to update PageFlyTranslations.
     */
    data: XOR<PageFlyTranslationUpdateManyMutationInput, PageFlyTranslationUncheckedUpdateManyInput>
    /**
     * Filter which PageFlyTranslations to update
     */
    where?: PageFlyTranslationWhereInput
    /**
     * Limit how many PageFlyTranslations to update.
     */
    limit?: number
  }

  /**
   * PageFlyTranslation upsert
   */
  export type PageFlyTranslationUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PageFlyTranslation
     */
    select?: PageFlyTranslationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PageFlyTranslation
     */
    omit?: PageFlyTranslationOmit<ExtArgs> | null
    /**
     * The filter to search for the PageFlyTranslation to update in case it exists.
     */
    where: PageFlyTranslationWhereUniqueInput
    /**
     * In case the PageFlyTranslation found by the `where` argument doesn't exist, create a new PageFlyTranslation with this data.
     */
    create: XOR<PageFlyTranslationCreateInput, PageFlyTranslationUncheckedCreateInput>
    /**
     * In case the PageFlyTranslation was found with the provided `where` argument, update it with this data.
     */
    update: XOR<PageFlyTranslationUpdateInput, PageFlyTranslationUncheckedUpdateInput>
  }

  /**
   * PageFlyTranslation delete
   */
  export type PageFlyTranslationDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PageFlyTranslation
     */
    select?: PageFlyTranslationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PageFlyTranslation
     */
    omit?: PageFlyTranslationOmit<ExtArgs> | null
    /**
     * Filter which PageFlyTranslation to delete.
     */
    where: PageFlyTranslationWhereUniqueInput
  }

  /**
   * PageFlyTranslation deleteMany
   */
  export type PageFlyTranslationDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PageFlyTranslations to delete
     */
    where?: PageFlyTranslationWhereInput
    /**
     * Limit how many PageFlyTranslations to delete.
     */
    limit?: number
  }

  /**
   * PageFlyTranslation without action
   */
  export type PageFlyTranslationDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PageFlyTranslation
     */
    select?: PageFlyTranslationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PageFlyTranslation
     */
    omit?: PageFlyTranslationOmit<ExtArgs> | null
  }


  /**
   * Model LiquidRule
   */

  export type AggregateLiquidRule = {
    _count: LiquidRuleCountAggregateOutputType | null
    _min: LiquidRuleMinAggregateOutputType | null
    _max: LiquidRuleMaxAggregateOutputType | null
  }

  export type LiquidRuleMinAggregateOutputType = {
    id: string | null
    shop: string | null
    beforeTranslation: string | null
    afterTranslation: string | null
    languageCode: string | null
    replacementMethod: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type LiquidRuleMaxAggregateOutputType = {
    id: string | null
    shop: string | null
    beforeTranslation: string | null
    afterTranslation: string | null
    languageCode: string | null
    replacementMethod: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type LiquidRuleCountAggregateOutputType = {
    id: number
    shop: number
    beforeTranslation: number
    afterTranslation: number
    languageCode: number
    replacementMethod: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type LiquidRuleMinAggregateInputType = {
    id?: true
    shop?: true
    beforeTranslation?: true
    afterTranslation?: true
    languageCode?: true
    replacementMethod?: true
    createdAt?: true
    updatedAt?: true
  }

  export type LiquidRuleMaxAggregateInputType = {
    id?: true
    shop?: true
    beforeTranslation?: true
    afterTranslation?: true
    languageCode?: true
    replacementMethod?: true
    createdAt?: true
    updatedAt?: true
  }

  export type LiquidRuleCountAggregateInputType = {
    id?: true
    shop?: true
    beforeTranslation?: true
    afterTranslation?: true
    languageCode?: true
    replacementMethod?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type LiquidRuleAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which LiquidRule to aggregate.
     */
    where?: LiquidRuleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LiquidRules to fetch.
     */
    orderBy?: LiquidRuleOrderByWithRelationInput | LiquidRuleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: LiquidRuleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LiquidRules from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LiquidRules.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned LiquidRules
    **/
    _count?: true | LiquidRuleCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: LiquidRuleMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: LiquidRuleMaxAggregateInputType
  }

  export type GetLiquidRuleAggregateType<T extends LiquidRuleAggregateArgs> = {
        [P in keyof T & keyof AggregateLiquidRule]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateLiquidRule[P]>
      : GetScalarType<T[P], AggregateLiquidRule[P]>
  }




  export type LiquidRuleGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: LiquidRuleWhereInput
    orderBy?: LiquidRuleOrderByWithAggregationInput | LiquidRuleOrderByWithAggregationInput[]
    by: LiquidRuleScalarFieldEnum[] | LiquidRuleScalarFieldEnum
    having?: LiquidRuleScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: LiquidRuleCountAggregateInputType | true
    _min?: LiquidRuleMinAggregateInputType
    _max?: LiquidRuleMaxAggregateInputType
  }

  export type LiquidRuleGroupByOutputType = {
    id: string
    shop: string
    beforeTranslation: string
    afterTranslation: string
    languageCode: string | null
    replacementMethod: boolean
    createdAt: Date
    updatedAt: Date
    _count: LiquidRuleCountAggregateOutputType | null
    _min: LiquidRuleMinAggregateOutputType | null
    _max: LiquidRuleMaxAggregateOutputType | null
  }

  type GetLiquidRuleGroupByPayload<T extends LiquidRuleGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<LiquidRuleGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof LiquidRuleGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], LiquidRuleGroupByOutputType[P]>
            : GetScalarType<T[P], LiquidRuleGroupByOutputType[P]>
        }
      >
    >


  export type LiquidRuleSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    shop?: boolean
    beforeTranslation?: boolean
    afterTranslation?: boolean
    languageCode?: boolean
    replacementMethod?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["liquidRule"]>

  export type LiquidRuleSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    shop?: boolean
    beforeTranslation?: boolean
    afterTranslation?: boolean
    languageCode?: boolean
    replacementMethod?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["liquidRule"]>

  export type LiquidRuleSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    shop?: boolean
    beforeTranslation?: boolean
    afterTranslation?: boolean
    languageCode?: boolean
    replacementMethod?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["liquidRule"]>

  export type LiquidRuleSelectScalar = {
    id?: boolean
    shop?: boolean
    beforeTranslation?: boolean
    afterTranslation?: boolean
    languageCode?: boolean
    replacementMethod?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type LiquidRuleOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "shop" | "beforeTranslation" | "afterTranslation" | "languageCode" | "replacementMethod" | "createdAt" | "updatedAt", ExtArgs["result"]["liquidRule"]>

  export type $LiquidRulePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "LiquidRule"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      shop: string
      beforeTranslation: string
      afterTranslation: string
      languageCode: string | null
      replacementMethod: boolean
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["liquidRule"]>
    composites: {}
  }

  type LiquidRuleGetPayload<S extends boolean | null | undefined | LiquidRuleDefaultArgs> = $Result.GetResult<Prisma.$LiquidRulePayload, S>

  type LiquidRuleCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<LiquidRuleFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: LiquidRuleCountAggregateInputType | true
    }

  export interface LiquidRuleDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['LiquidRule'], meta: { name: 'LiquidRule' } }
    /**
     * Find zero or one LiquidRule that matches the filter.
     * @param {LiquidRuleFindUniqueArgs} args - Arguments to find a LiquidRule
     * @example
     * // Get one LiquidRule
     * const liquidRule = await prisma.liquidRule.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends LiquidRuleFindUniqueArgs>(args: SelectSubset<T, LiquidRuleFindUniqueArgs<ExtArgs>>): Prisma__LiquidRuleClient<$Result.GetResult<Prisma.$LiquidRulePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one LiquidRule that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {LiquidRuleFindUniqueOrThrowArgs} args - Arguments to find a LiquidRule
     * @example
     * // Get one LiquidRule
     * const liquidRule = await prisma.liquidRule.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends LiquidRuleFindUniqueOrThrowArgs>(args: SelectSubset<T, LiquidRuleFindUniqueOrThrowArgs<ExtArgs>>): Prisma__LiquidRuleClient<$Result.GetResult<Prisma.$LiquidRulePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first LiquidRule that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LiquidRuleFindFirstArgs} args - Arguments to find a LiquidRule
     * @example
     * // Get one LiquidRule
     * const liquidRule = await prisma.liquidRule.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends LiquidRuleFindFirstArgs>(args?: SelectSubset<T, LiquidRuleFindFirstArgs<ExtArgs>>): Prisma__LiquidRuleClient<$Result.GetResult<Prisma.$LiquidRulePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first LiquidRule that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LiquidRuleFindFirstOrThrowArgs} args - Arguments to find a LiquidRule
     * @example
     * // Get one LiquidRule
     * const liquidRule = await prisma.liquidRule.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends LiquidRuleFindFirstOrThrowArgs>(args?: SelectSubset<T, LiquidRuleFindFirstOrThrowArgs<ExtArgs>>): Prisma__LiquidRuleClient<$Result.GetResult<Prisma.$LiquidRulePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more LiquidRules that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LiquidRuleFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all LiquidRules
     * const liquidRules = await prisma.liquidRule.findMany()
     * 
     * // Get first 10 LiquidRules
     * const liquidRules = await prisma.liquidRule.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const liquidRuleWithIdOnly = await prisma.liquidRule.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends LiquidRuleFindManyArgs>(args?: SelectSubset<T, LiquidRuleFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LiquidRulePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a LiquidRule.
     * @param {LiquidRuleCreateArgs} args - Arguments to create a LiquidRule.
     * @example
     * // Create one LiquidRule
     * const LiquidRule = await prisma.liquidRule.create({
     *   data: {
     *     // ... data to create a LiquidRule
     *   }
     * })
     * 
     */
    create<T extends LiquidRuleCreateArgs>(args: SelectSubset<T, LiquidRuleCreateArgs<ExtArgs>>): Prisma__LiquidRuleClient<$Result.GetResult<Prisma.$LiquidRulePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many LiquidRules.
     * @param {LiquidRuleCreateManyArgs} args - Arguments to create many LiquidRules.
     * @example
     * // Create many LiquidRules
     * const liquidRule = await prisma.liquidRule.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends LiquidRuleCreateManyArgs>(args?: SelectSubset<T, LiquidRuleCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many LiquidRules and returns the data saved in the database.
     * @param {LiquidRuleCreateManyAndReturnArgs} args - Arguments to create many LiquidRules.
     * @example
     * // Create many LiquidRules
     * const liquidRule = await prisma.liquidRule.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many LiquidRules and only return the `id`
     * const liquidRuleWithIdOnly = await prisma.liquidRule.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends LiquidRuleCreateManyAndReturnArgs>(args?: SelectSubset<T, LiquidRuleCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LiquidRulePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a LiquidRule.
     * @param {LiquidRuleDeleteArgs} args - Arguments to delete one LiquidRule.
     * @example
     * // Delete one LiquidRule
     * const LiquidRule = await prisma.liquidRule.delete({
     *   where: {
     *     // ... filter to delete one LiquidRule
     *   }
     * })
     * 
     */
    delete<T extends LiquidRuleDeleteArgs>(args: SelectSubset<T, LiquidRuleDeleteArgs<ExtArgs>>): Prisma__LiquidRuleClient<$Result.GetResult<Prisma.$LiquidRulePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one LiquidRule.
     * @param {LiquidRuleUpdateArgs} args - Arguments to update one LiquidRule.
     * @example
     * // Update one LiquidRule
     * const liquidRule = await prisma.liquidRule.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends LiquidRuleUpdateArgs>(args: SelectSubset<T, LiquidRuleUpdateArgs<ExtArgs>>): Prisma__LiquidRuleClient<$Result.GetResult<Prisma.$LiquidRulePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more LiquidRules.
     * @param {LiquidRuleDeleteManyArgs} args - Arguments to filter LiquidRules to delete.
     * @example
     * // Delete a few LiquidRules
     * const { count } = await prisma.liquidRule.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends LiquidRuleDeleteManyArgs>(args?: SelectSubset<T, LiquidRuleDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more LiquidRules.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LiquidRuleUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many LiquidRules
     * const liquidRule = await prisma.liquidRule.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends LiquidRuleUpdateManyArgs>(args: SelectSubset<T, LiquidRuleUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more LiquidRules and returns the data updated in the database.
     * @param {LiquidRuleUpdateManyAndReturnArgs} args - Arguments to update many LiquidRules.
     * @example
     * // Update many LiquidRules
     * const liquidRule = await prisma.liquidRule.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more LiquidRules and only return the `id`
     * const liquidRuleWithIdOnly = await prisma.liquidRule.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends LiquidRuleUpdateManyAndReturnArgs>(args: SelectSubset<T, LiquidRuleUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LiquidRulePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one LiquidRule.
     * @param {LiquidRuleUpsertArgs} args - Arguments to update or create a LiquidRule.
     * @example
     * // Update or create a LiquidRule
     * const liquidRule = await prisma.liquidRule.upsert({
     *   create: {
     *     // ... data to create a LiquidRule
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the LiquidRule we want to update
     *   }
     * })
     */
    upsert<T extends LiquidRuleUpsertArgs>(args: SelectSubset<T, LiquidRuleUpsertArgs<ExtArgs>>): Prisma__LiquidRuleClient<$Result.GetResult<Prisma.$LiquidRulePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of LiquidRules.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LiquidRuleCountArgs} args - Arguments to filter LiquidRules to count.
     * @example
     * // Count the number of LiquidRules
     * const count = await prisma.liquidRule.count({
     *   where: {
     *     // ... the filter for the LiquidRules we want to count
     *   }
     * })
    **/
    count<T extends LiquidRuleCountArgs>(
      args?: Subset<T, LiquidRuleCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], LiquidRuleCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a LiquidRule.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LiquidRuleAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends LiquidRuleAggregateArgs>(args: Subset<T, LiquidRuleAggregateArgs>): Prisma.PrismaPromise<GetLiquidRuleAggregateType<T>>

    /**
     * Group by LiquidRule.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LiquidRuleGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends LiquidRuleGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: LiquidRuleGroupByArgs['orderBy'] }
        : { orderBy?: LiquidRuleGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, LiquidRuleGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetLiquidRuleGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the LiquidRule model
   */
  readonly fields: LiquidRuleFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for LiquidRule.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__LiquidRuleClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the LiquidRule model
   */
  interface LiquidRuleFieldRefs {
    readonly id: FieldRef<"LiquidRule", 'String'>
    readonly shop: FieldRef<"LiquidRule", 'String'>
    readonly beforeTranslation: FieldRef<"LiquidRule", 'String'>
    readonly afterTranslation: FieldRef<"LiquidRule", 'String'>
    readonly languageCode: FieldRef<"LiquidRule", 'String'>
    readonly replacementMethod: FieldRef<"LiquidRule", 'Boolean'>
    readonly createdAt: FieldRef<"LiquidRule", 'DateTime'>
    readonly updatedAt: FieldRef<"LiquidRule", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * LiquidRule findUnique
   */
  export type LiquidRuleFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LiquidRule
     */
    select?: LiquidRuleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the LiquidRule
     */
    omit?: LiquidRuleOmit<ExtArgs> | null
    /**
     * Filter, which LiquidRule to fetch.
     */
    where: LiquidRuleWhereUniqueInput
  }

  /**
   * LiquidRule findUniqueOrThrow
   */
  export type LiquidRuleFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LiquidRule
     */
    select?: LiquidRuleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the LiquidRule
     */
    omit?: LiquidRuleOmit<ExtArgs> | null
    /**
     * Filter, which LiquidRule to fetch.
     */
    where: LiquidRuleWhereUniqueInput
  }

  /**
   * LiquidRule findFirst
   */
  export type LiquidRuleFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LiquidRule
     */
    select?: LiquidRuleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the LiquidRule
     */
    omit?: LiquidRuleOmit<ExtArgs> | null
    /**
     * Filter, which LiquidRule to fetch.
     */
    where?: LiquidRuleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LiquidRules to fetch.
     */
    orderBy?: LiquidRuleOrderByWithRelationInput | LiquidRuleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for LiquidRules.
     */
    cursor?: LiquidRuleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LiquidRules from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LiquidRules.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of LiquidRules.
     */
    distinct?: LiquidRuleScalarFieldEnum | LiquidRuleScalarFieldEnum[]
  }

  /**
   * LiquidRule findFirstOrThrow
   */
  export type LiquidRuleFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LiquidRule
     */
    select?: LiquidRuleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the LiquidRule
     */
    omit?: LiquidRuleOmit<ExtArgs> | null
    /**
     * Filter, which LiquidRule to fetch.
     */
    where?: LiquidRuleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LiquidRules to fetch.
     */
    orderBy?: LiquidRuleOrderByWithRelationInput | LiquidRuleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for LiquidRules.
     */
    cursor?: LiquidRuleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LiquidRules from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LiquidRules.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of LiquidRules.
     */
    distinct?: LiquidRuleScalarFieldEnum | LiquidRuleScalarFieldEnum[]
  }

  /**
   * LiquidRule findMany
   */
  export type LiquidRuleFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LiquidRule
     */
    select?: LiquidRuleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the LiquidRule
     */
    omit?: LiquidRuleOmit<ExtArgs> | null
    /**
     * Filter, which LiquidRules to fetch.
     */
    where?: LiquidRuleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LiquidRules to fetch.
     */
    orderBy?: LiquidRuleOrderByWithRelationInput | LiquidRuleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing LiquidRules.
     */
    cursor?: LiquidRuleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LiquidRules from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LiquidRules.
     */
    skip?: number
    distinct?: LiquidRuleScalarFieldEnum | LiquidRuleScalarFieldEnum[]
  }

  /**
   * LiquidRule create
   */
  export type LiquidRuleCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LiquidRule
     */
    select?: LiquidRuleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the LiquidRule
     */
    omit?: LiquidRuleOmit<ExtArgs> | null
    /**
     * The data needed to create a LiquidRule.
     */
    data: XOR<LiquidRuleCreateInput, LiquidRuleUncheckedCreateInput>
  }

  /**
   * LiquidRule createMany
   */
  export type LiquidRuleCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many LiquidRules.
     */
    data: LiquidRuleCreateManyInput | LiquidRuleCreateManyInput[]
  }

  /**
   * LiquidRule createManyAndReturn
   */
  export type LiquidRuleCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LiquidRule
     */
    select?: LiquidRuleSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the LiquidRule
     */
    omit?: LiquidRuleOmit<ExtArgs> | null
    /**
     * The data used to create many LiquidRules.
     */
    data: LiquidRuleCreateManyInput | LiquidRuleCreateManyInput[]
  }

  /**
   * LiquidRule update
   */
  export type LiquidRuleUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LiquidRule
     */
    select?: LiquidRuleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the LiquidRule
     */
    omit?: LiquidRuleOmit<ExtArgs> | null
    /**
     * The data needed to update a LiquidRule.
     */
    data: XOR<LiquidRuleUpdateInput, LiquidRuleUncheckedUpdateInput>
    /**
     * Choose, which LiquidRule to update.
     */
    where: LiquidRuleWhereUniqueInput
  }

  /**
   * LiquidRule updateMany
   */
  export type LiquidRuleUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update LiquidRules.
     */
    data: XOR<LiquidRuleUpdateManyMutationInput, LiquidRuleUncheckedUpdateManyInput>
    /**
     * Filter which LiquidRules to update
     */
    where?: LiquidRuleWhereInput
    /**
     * Limit how many LiquidRules to update.
     */
    limit?: number
  }

  /**
   * LiquidRule updateManyAndReturn
   */
  export type LiquidRuleUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LiquidRule
     */
    select?: LiquidRuleSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the LiquidRule
     */
    omit?: LiquidRuleOmit<ExtArgs> | null
    /**
     * The data used to update LiquidRules.
     */
    data: XOR<LiquidRuleUpdateManyMutationInput, LiquidRuleUncheckedUpdateManyInput>
    /**
     * Filter which LiquidRules to update
     */
    where?: LiquidRuleWhereInput
    /**
     * Limit how many LiquidRules to update.
     */
    limit?: number
  }

  /**
   * LiquidRule upsert
   */
  export type LiquidRuleUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LiquidRule
     */
    select?: LiquidRuleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the LiquidRule
     */
    omit?: LiquidRuleOmit<ExtArgs> | null
    /**
     * The filter to search for the LiquidRule to update in case it exists.
     */
    where: LiquidRuleWhereUniqueInput
    /**
     * In case the LiquidRule found by the `where` argument doesn't exist, create a new LiquidRule with this data.
     */
    create: XOR<LiquidRuleCreateInput, LiquidRuleUncheckedCreateInput>
    /**
     * In case the LiquidRule was found with the provided `where` argument, update it with this data.
     */
    update: XOR<LiquidRuleUpdateInput, LiquidRuleUncheckedUpdateInput>
  }

  /**
   * LiquidRule delete
   */
  export type LiquidRuleDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LiquidRule
     */
    select?: LiquidRuleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the LiquidRule
     */
    omit?: LiquidRuleOmit<ExtArgs> | null
    /**
     * Filter which LiquidRule to delete.
     */
    where: LiquidRuleWhereUniqueInput
  }

  /**
   * LiquidRule deleteMany
   */
  export type LiquidRuleDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which LiquidRules to delete
     */
    where?: LiquidRuleWhereInput
    /**
     * Limit how many LiquidRules to delete.
     */
    limit?: number
  }

  /**
   * LiquidRule without action
   */
  export type LiquidRuleDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LiquidRule
     */
    select?: LiquidRuleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the LiquidRule
     */
    omit?: LiquidRuleOmit<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const SessionScalarFieldEnum: {
    id: 'id',
    shop: 'shop',
    state: 'state',
    isOnline: 'isOnline',
    scope: 'scope',
    expires: 'expires',
    accessToken: 'accessToken',
    userId: 'userId',
    firstName: 'firstName',
    lastName: 'lastName',
    email: 'email',
    accountOwner: 'accountOwner',
    locale: 'locale',
    collaborator: 'collaborator',
    emailVerified: 'emailVerified',
    refreshToken: 'refreshToken',
    refreshTokenExpires: 'refreshTokenExpires'
  };

  export type SessionScalarFieldEnum = (typeof SessionScalarFieldEnum)[keyof typeof SessionScalarFieldEnum]


  export const ShopTranslationSettingsScalarFieldEnum: {
    shop: 'shop',
    primaryLocale: 'primaryLocale',
    targets: 'targets',
    autoTranslate: 'autoTranslate',
    migratedToTsf: 'migratedToTsf',
    migratedAt: 'migratedAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type ShopTranslationSettingsScalarFieldEnum = (typeof ShopTranslationSettingsScalarFieldEnum)[keyof typeof ShopTranslationSettingsScalarFieldEnum]


  export const ShopTargetLocaleScalarFieldEnum: {
    id: 'id',
    shop: 'shop',
    locale: 'locale',
    autoTranslate: 'autoTranslate',
    status: 'status',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type ShopTargetLocaleScalarFieldEnum = (typeof ShopTargetLocaleScalarFieldEnum)[keyof typeof ShopTargetLocaleScalarFieldEnum]


  export const GlossaryScalarFieldEnum: {
    id: 'id',
    shop: 'shop',
    sourceText: 'sourceText',
    targetText: 'targetText',
    rangeCode: 'rangeCode',
    caseSensitive: 'caseSensitive',
    status: 'status',
    createdAt: 'createdAt'
  };

  export type GlossaryScalarFieldEnum = (typeof GlossaryScalarFieldEnum)[keyof typeof GlossaryScalarFieldEnum]


  export const PageFlyTranslationScalarFieldEnum: {
    id: 'id',
    shop: 'shop',
    sourceText: 'sourceText',
    targetText: 'targetText',
    languageCode: 'languageCode',
    isDeleted: 'isDeleted',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type PageFlyTranslationScalarFieldEnum = (typeof PageFlyTranslationScalarFieldEnum)[keyof typeof PageFlyTranslationScalarFieldEnum]


  export const LiquidRuleScalarFieldEnum: {
    id: 'id',
    shop: 'shop',
    beforeTranslation: 'beforeTranslation',
    afterTranslation: 'afterTranslation',
    languageCode: 'languageCode',
    replacementMethod: 'replacementMethod',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type LiquidRuleScalarFieldEnum = (typeof LiquidRuleScalarFieldEnum)[keyof typeof LiquidRuleScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const JsonNullValueInput: {
    JsonNull: typeof JsonNull
  };

  export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'BigInt'
   */
  export type BigIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'BigInt'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'QueryMode'
   */
  export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    
  /**
   * Deep Input Types
   */


  export type SessionWhereInput = {
    AND?: SessionWhereInput | SessionWhereInput[]
    OR?: SessionWhereInput[]
    NOT?: SessionWhereInput | SessionWhereInput[]
    id?: StringFilter<"Session"> | string
    shop?: StringFilter<"Session"> | string
    state?: StringFilter<"Session"> | string
    isOnline?: BoolFilter<"Session"> | boolean
    scope?: StringNullableFilter<"Session"> | string | null
    expires?: DateTimeNullableFilter<"Session"> | Date | string | null
    accessToken?: StringFilter<"Session"> | string
    userId?: BigIntNullableFilter<"Session"> | bigint | number | null
    firstName?: StringNullableFilter<"Session"> | string | null
    lastName?: StringNullableFilter<"Session"> | string | null
    email?: StringNullableFilter<"Session"> | string | null
    accountOwner?: BoolFilter<"Session"> | boolean
    locale?: StringNullableFilter<"Session"> | string | null
    collaborator?: BoolNullableFilter<"Session"> | boolean | null
    emailVerified?: BoolNullableFilter<"Session"> | boolean | null
    refreshToken?: StringNullableFilter<"Session"> | string | null
    refreshTokenExpires?: DateTimeNullableFilter<"Session"> | Date | string | null
  }

  export type SessionOrderByWithRelationInput = {
    id?: SortOrder
    shop?: SortOrder
    state?: SortOrder
    isOnline?: SortOrder
    scope?: SortOrderInput | SortOrder
    expires?: SortOrderInput | SortOrder
    accessToken?: SortOrder
    userId?: SortOrderInput | SortOrder
    firstName?: SortOrderInput | SortOrder
    lastName?: SortOrderInput | SortOrder
    email?: SortOrderInput | SortOrder
    accountOwner?: SortOrder
    locale?: SortOrderInput | SortOrder
    collaborator?: SortOrderInput | SortOrder
    emailVerified?: SortOrderInput | SortOrder
    refreshToken?: SortOrderInput | SortOrder
    refreshTokenExpires?: SortOrderInput | SortOrder
  }

  export type SessionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: SessionWhereInput | SessionWhereInput[]
    OR?: SessionWhereInput[]
    NOT?: SessionWhereInput | SessionWhereInput[]
    shop?: StringFilter<"Session"> | string
    state?: StringFilter<"Session"> | string
    isOnline?: BoolFilter<"Session"> | boolean
    scope?: StringNullableFilter<"Session"> | string | null
    expires?: DateTimeNullableFilter<"Session"> | Date | string | null
    accessToken?: StringFilter<"Session"> | string
    userId?: BigIntNullableFilter<"Session"> | bigint | number | null
    firstName?: StringNullableFilter<"Session"> | string | null
    lastName?: StringNullableFilter<"Session"> | string | null
    email?: StringNullableFilter<"Session"> | string | null
    accountOwner?: BoolFilter<"Session"> | boolean
    locale?: StringNullableFilter<"Session"> | string | null
    collaborator?: BoolNullableFilter<"Session"> | boolean | null
    emailVerified?: BoolNullableFilter<"Session"> | boolean | null
    refreshToken?: StringNullableFilter<"Session"> | string | null
    refreshTokenExpires?: DateTimeNullableFilter<"Session"> | Date | string | null
  }, "id">

  export type SessionOrderByWithAggregationInput = {
    id?: SortOrder
    shop?: SortOrder
    state?: SortOrder
    isOnline?: SortOrder
    scope?: SortOrderInput | SortOrder
    expires?: SortOrderInput | SortOrder
    accessToken?: SortOrder
    userId?: SortOrderInput | SortOrder
    firstName?: SortOrderInput | SortOrder
    lastName?: SortOrderInput | SortOrder
    email?: SortOrderInput | SortOrder
    accountOwner?: SortOrder
    locale?: SortOrderInput | SortOrder
    collaborator?: SortOrderInput | SortOrder
    emailVerified?: SortOrderInput | SortOrder
    refreshToken?: SortOrderInput | SortOrder
    refreshTokenExpires?: SortOrderInput | SortOrder
    _count?: SessionCountOrderByAggregateInput
    _avg?: SessionAvgOrderByAggregateInput
    _max?: SessionMaxOrderByAggregateInput
    _min?: SessionMinOrderByAggregateInput
    _sum?: SessionSumOrderByAggregateInput
  }

  export type SessionScalarWhereWithAggregatesInput = {
    AND?: SessionScalarWhereWithAggregatesInput | SessionScalarWhereWithAggregatesInput[]
    OR?: SessionScalarWhereWithAggregatesInput[]
    NOT?: SessionScalarWhereWithAggregatesInput | SessionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Session"> | string
    shop?: StringWithAggregatesFilter<"Session"> | string
    state?: StringWithAggregatesFilter<"Session"> | string
    isOnline?: BoolWithAggregatesFilter<"Session"> | boolean
    scope?: StringNullableWithAggregatesFilter<"Session"> | string | null
    expires?: DateTimeNullableWithAggregatesFilter<"Session"> | Date | string | null
    accessToken?: StringWithAggregatesFilter<"Session"> | string
    userId?: BigIntNullableWithAggregatesFilter<"Session"> | bigint | number | null
    firstName?: StringNullableWithAggregatesFilter<"Session"> | string | null
    lastName?: StringNullableWithAggregatesFilter<"Session"> | string | null
    email?: StringNullableWithAggregatesFilter<"Session"> | string | null
    accountOwner?: BoolWithAggregatesFilter<"Session"> | boolean
    locale?: StringNullableWithAggregatesFilter<"Session"> | string | null
    collaborator?: BoolNullableWithAggregatesFilter<"Session"> | boolean | null
    emailVerified?: BoolNullableWithAggregatesFilter<"Session"> | boolean | null
    refreshToken?: StringNullableWithAggregatesFilter<"Session"> | string | null
    refreshTokenExpires?: DateTimeNullableWithAggregatesFilter<"Session"> | Date | string | null
  }

  export type ShopTranslationSettingsWhereInput = {
    AND?: ShopTranslationSettingsWhereInput | ShopTranslationSettingsWhereInput[]
    OR?: ShopTranslationSettingsWhereInput[]
    NOT?: ShopTranslationSettingsWhereInput | ShopTranslationSettingsWhereInput[]
    shop?: StringFilter<"ShopTranslationSettings"> | string
    primaryLocale?: StringFilter<"ShopTranslationSettings"> | string
    targets?: JsonFilter<"ShopTranslationSettings">
    autoTranslate?: BoolFilter<"ShopTranslationSettings"> | boolean
    migratedToTsf?: BoolFilter<"ShopTranslationSettings"> | boolean
    migratedAt?: DateTimeNullableFilter<"ShopTranslationSettings"> | Date | string | null
    createdAt?: DateTimeFilter<"ShopTranslationSettings"> | Date | string
    updatedAt?: DateTimeFilter<"ShopTranslationSettings"> | Date | string
  }

  export type ShopTranslationSettingsOrderByWithRelationInput = {
    shop?: SortOrder
    primaryLocale?: SortOrder
    targets?: SortOrder
    autoTranslate?: SortOrder
    migratedToTsf?: SortOrder
    migratedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ShopTranslationSettingsWhereUniqueInput = Prisma.AtLeast<{
    shop?: string
    AND?: ShopTranslationSettingsWhereInput | ShopTranslationSettingsWhereInput[]
    OR?: ShopTranslationSettingsWhereInput[]
    NOT?: ShopTranslationSettingsWhereInput | ShopTranslationSettingsWhereInput[]
    primaryLocale?: StringFilter<"ShopTranslationSettings"> | string
    targets?: JsonFilter<"ShopTranslationSettings">
    autoTranslate?: BoolFilter<"ShopTranslationSettings"> | boolean
    migratedToTsf?: BoolFilter<"ShopTranslationSettings"> | boolean
    migratedAt?: DateTimeNullableFilter<"ShopTranslationSettings"> | Date | string | null
    createdAt?: DateTimeFilter<"ShopTranslationSettings"> | Date | string
    updatedAt?: DateTimeFilter<"ShopTranslationSettings"> | Date | string
  }, "shop">

  export type ShopTranslationSettingsOrderByWithAggregationInput = {
    shop?: SortOrder
    primaryLocale?: SortOrder
    targets?: SortOrder
    autoTranslate?: SortOrder
    migratedToTsf?: SortOrder
    migratedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: ShopTranslationSettingsCountOrderByAggregateInput
    _max?: ShopTranslationSettingsMaxOrderByAggregateInput
    _min?: ShopTranslationSettingsMinOrderByAggregateInput
  }

  export type ShopTranslationSettingsScalarWhereWithAggregatesInput = {
    AND?: ShopTranslationSettingsScalarWhereWithAggregatesInput | ShopTranslationSettingsScalarWhereWithAggregatesInput[]
    OR?: ShopTranslationSettingsScalarWhereWithAggregatesInput[]
    NOT?: ShopTranslationSettingsScalarWhereWithAggregatesInput | ShopTranslationSettingsScalarWhereWithAggregatesInput[]
    shop?: StringWithAggregatesFilter<"ShopTranslationSettings"> | string
    primaryLocale?: StringWithAggregatesFilter<"ShopTranslationSettings"> | string
    targets?: JsonWithAggregatesFilter<"ShopTranslationSettings">
    autoTranslate?: BoolWithAggregatesFilter<"ShopTranslationSettings"> | boolean
    migratedToTsf?: BoolWithAggregatesFilter<"ShopTranslationSettings"> | boolean
    migratedAt?: DateTimeNullableWithAggregatesFilter<"ShopTranslationSettings"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"ShopTranslationSettings"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"ShopTranslationSettings"> | Date | string
  }

  export type ShopTargetLocaleWhereInput = {
    AND?: ShopTargetLocaleWhereInput | ShopTargetLocaleWhereInput[]
    OR?: ShopTargetLocaleWhereInput[]
    NOT?: ShopTargetLocaleWhereInput | ShopTargetLocaleWhereInput[]
    id?: IntFilter<"ShopTargetLocale"> | number
    shop?: StringFilter<"ShopTargetLocale"> | string
    locale?: StringFilter<"ShopTargetLocale"> | string
    autoTranslate?: BoolFilter<"ShopTargetLocale"> | boolean
    status?: IntFilter<"ShopTargetLocale"> | number
    createdAt?: DateTimeFilter<"ShopTargetLocale"> | Date | string
    updatedAt?: DateTimeFilter<"ShopTargetLocale"> | Date | string
  }

  export type ShopTargetLocaleOrderByWithRelationInput = {
    id?: SortOrder
    shop?: SortOrder
    locale?: SortOrder
    autoTranslate?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ShopTargetLocaleWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    shop_locale?: ShopTargetLocaleShopLocaleCompoundUniqueInput
    AND?: ShopTargetLocaleWhereInput | ShopTargetLocaleWhereInput[]
    OR?: ShopTargetLocaleWhereInput[]
    NOT?: ShopTargetLocaleWhereInput | ShopTargetLocaleWhereInput[]
    shop?: StringFilter<"ShopTargetLocale"> | string
    locale?: StringFilter<"ShopTargetLocale"> | string
    autoTranslate?: BoolFilter<"ShopTargetLocale"> | boolean
    status?: IntFilter<"ShopTargetLocale"> | number
    createdAt?: DateTimeFilter<"ShopTargetLocale"> | Date | string
    updatedAt?: DateTimeFilter<"ShopTargetLocale"> | Date | string
  }, "id" | "shop_locale">

  export type ShopTargetLocaleOrderByWithAggregationInput = {
    id?: SortOrder
    shop?: SortOrder
    locale?: SortOrder
    autoTranslate?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: ShopTargetLocaleCountOrderByAggregateInput
    _avg?: ShopTargetLocaleAvgOrderByAggregateInput
    _max?: ShopTargetLocaleMaxOrderByAggregateInput
    _min?: ShopTargetLocaleMinOrderByAggregateInput
    _sum?: ShopTargetLocaleSumOrderByAggregateInput
  }

  export type ShopTargetLocaleScalarWhereWithAggregatesInput = {
    AND?: ShopTargetLocaleScalarWhereWithAggregatesInput | ShopTargetLocaleScalarWhereWithAggregatesInput[]
    OR?: ShopTargetLocaleScalarWhereWithAggregatesInput[]
    NOT?: ShopTargetLocaleScalarWhereWithAggregatesInput | ShopTargetLocaleScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"ShopTargetLocale"> | number
    shop?: StringWithAggregatesFilter<"ShopTargetLocale"> | string
    locale?: StringWithAggregatesFilter<"ShopTargetLocale"> | string
    autoTranslate?: BoolWithAggregatesFilter<"ShopTargetLocale"> | boolean
    status?: IntWithAggregatesFilter<"ShopTargetLocale"> | number
    createdAt?: DateTimeWithAggregatesFilter<"ShopTargetLocale"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"ShopTargetLocale"> | Date | string
  }

  export type GlossaryWhereInput = {
    AND?: GlossaryWhereInput | GlossaryWhereInput[]
    OR?: GlossaryWhereInput[]
    NOT?: GlossaryWhereInput | GlossaryWhereInput[]
    id?: IntFilter<"Glossary"> | number
    shop?: StringFilter<"Glossary"> | string
    sourceText?: StringFilter<"Glossary"> | string
    targetText?: StringFilter<"Glossary"> | string
    rangeCode?: StringNullableFilter<"Glossary"> | string | null
    caseSensitive?: BoolFilter<"Glossary"> | boolean
    status?: IntFilter<"Glossary"> | number
    createdAt?: DateTimeFilter<"Glossary"> | Date | string
  }

  export type GlossaryOrderByWithRelationInput = {
    id?: SortOrder
    shop?: SortOrder
    sourceText?: SortOrder
    targetText?: SortOrder
    rangeCode?: SortOrderInput | SortOrder
    caseSensitive?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
  }

  export type GlossaryWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: GlossaryWhereInput | GlossaryWhereInput[]
    OR?: GlossaryWhereInput[]
    NOT?: GlossaryWhereInput | GlossaryWhereInput[]
    shop?: StringFilter<"Glossary"> | string
    sourceText?: StringFilter<"Glossary"> | string
    targetText?: StringFilter<"Glossary"> | string
    rangeCode?: StringNullableFilter<"Glossary"> | string | null
    caseSensitive?: BoolFilter<"Glossary"> | boolean
    status?: IntFilter<"Glossary"> | number
    createdAt?: DateTimeFilter<"Glossary"> | Date | string
  }, "id">

  export type GlossaryOrderByWithAggregationInput = {
    id?: SortOrder
    shop?: SortOrder
    sourceText?: SortOrder
    targetText?: SortOrder
    rangeCode?: SortOrderInput | SortOrder
    caseSensitive?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    _count?: GlossaryCountOrderByAggregateInput
    _avg?: GlossaryAvgOrderByAggregateInput
    _max?: GlossaryMaxOrderByAggregateInput
    _min?: GlossaryMinOrderByAggregateInput
    _sum?: GlossarySumOrderByAggregateInput
  }

  export type GlossaryScalarWhereWithAggregatesInput = {
    AND?: GlossaryScalarWhereWithAggregatesInput | GlossaryScalarWhereWithAggregatesInput[]
    OR?: GlossaryScalarWhereWithAggregatesInput[]
    NOT?: GlossaryScalarWhereWithAggregatesInput | GlossaryScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Glossary"> | number
    shop?: StringWithAggregatesFilter<"Glossary"> | string
    sourceText?: StringWithAggregatesFilter<"Glossary"> | string
    targetText?: StringWithAggregatesFilter<"Glossary"> | string
    rangeCode?: StringNullableWithAggregatesFilter<"Glossary"> | string | null
    caseSensitive?: BoolWithAggregatesFilter<"Glossary"> | boolean
    status?: IntWithAggregatesFilter<"Glossary"> | number
    createdAt?: DateTimeWithAggregatesFilter<"Glossary"> | Date | string
  }

  export type PageFlyTranslationWhereInput = {
    AND?: PageFlyTranslationWhereInput | PageFlyTranslationWhereInput[]
    OR?: PageFlyTranslationWhereInput[]
    NOT?: PageFlyTranslationWhereInput | PageFlyTranslationWhereInput[]
    id?: IntFilter<"PageFlyTranslation"> | number
    shop?: StringFilter<"PageFlyTranslation"> | string
    sourceText?: StringFilter<"PageFlyTranslation"> | string
    targetText?: StringFilter<"PageFlyTranslation"> | string
    languageCode?: StringFilter<"PageFlyTranslation"> | string
    isDeleted?: BoolFilter<"PageFlyTranslation"> | boolean
    createdAt?: DateTimeFilter<"PageFlyTranslation"> | Date | string
    updatedAt?: DateTimeFilter<"PageFlyTranslation"> | Date | string
  }

  export type PageFlyTranslationOrderByWithRelationInput = {
    id?: SortOrder
    shop?: SortOrder
    sourceText?: SortOrder
    targetText?: SortOrder
    languageCode?: SortOrder
    isDeleted?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type PageFlyTranslationWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: PageFlyTranslationWhereInput | PageFlyTranslationWhereInput[]
    OR?: PageFlyTranslationWhereInput[]
    NOT?: PageFlyTranslationWhereInput | PageFlyTranslationWhereInput[]
    shop?: StringFilter<"PageFlyTranslation"> | string
    sourceText?: StringFilter<"PageFlyTranslation"> | string
    targetText?: StringFilter<"PageFlyTranslation"> | string
    languageCode?: StringFilter<"PageFlyTranslation"> | string
    isDeleted?: BoolFilter<"PageFlyTranslation"> | boolean
    createdAt?: DateTimeFilter<"PageFlyTranslation"> | Date | string
    updatedAt?: DateTimeFilter<"PageFlyTranslation"> | Date | string
  }, "id">

  export type PageFlyTranslationOrderByWithAggregationInput = {
    id?: SortOrder
    shop?: SortOrder
    sourceText?: SortOrder
    targetText?: SortOrder
    languageCode?: SortOrder
    isDeleted?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: PageFlyTranslationCountOrderByAggregateInput
    _avg?: PageFlyTranslationAvgOrderByAggregateInput
    _max?: PageFlyTranslationMaxOrderByAggregateInput
    _min?: PageFlyTranslationMinOrderByAggregateInput
    _sum?: PageFlyTranslationSumOrderByAggregateInput
  }

  export type PageFlyTranslationScalarWhereWithAggregatesInput = {
    AND?: PageFlyTranslationScalarWhereWithAggregatesInput | PageFlyTranslationScalarWhereWithAggregatesInput[]
    OR?: PageFlyTranslationScalarWhereWithAggregatesInput[]
    NOT?: PageFlyTranslationScalarWhereWithAggregatesInput | PageFlyTranslationScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"PageFlyTranslation"> | number
    shop?: StringWithAggregatesFilter<"PageFlyTranslation"> | string
    sourceText?: StringWithAggregatesFilter<"PageFlyTranslation"> | string
    targetText?: StringWithAggregatesFilter<"PageFlyTranslation"> | string
    languageCode?: StringWithAggregatesFilter<"PageFlyTranslation"> | string
    isDeleted?: BoolWithAggregatesFilter<"PageFlyTranslation"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"PageFlyTranslation"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"PageFlyTranslation"> | Date | string
  }

  export type LiquidRuleWhereInput = {
    AND?: LiquidRuleWhereInput | LiquidRuleWhereInput[]
    OR?: LiquidRuleWhereInput[]
    NOT?: LiquidRuleWhereInput | LiquidRuleWhereInput[]
    id?: StringFilter<"LiquidRule"> | string
    shop?: StringFilter<"LiquidRule"> | string
    beforeTranslation?: StringFilter<"LiquidRule"> | string
    afterTranslation?: StringFilter<"LiquidRule"> | string
    languageCode?: StringNullableFilter<"LiquidRule"> | string | null
    replacementMethod?: BoolFilter<"LiquidRule"> | boolean
    createdAt?: DateTimeFilter<"LiquidRule"> | Date | string
    updatedAt?: DateTimeFilter<"LiquidRule"> | Date | string
  }

  export type LiquidRuleOrderByWithRelationInput = {
    id?: SortOrder
    shop?: SortOrder
    beforeTranslation?: SortOrder
    afterTranslation?: SortOrder
    languageCode?: SortOrderInput | SortOrder
    replacementMethod?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type LiquidRuleWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: LiquidRuleWhereInput | LiquidRuleWhereInput[]
    OR?: LiquidRuleWhereInput[]
    NOT?: LiquidRuleWhereInput | LiquidRuleWhereInput[]
    shop?: StringFilter<"LiquidRule"> | string
    beforeTranslation?: StringFilter<"LiquidRule"> | string
    afterTranslation?: StringFilter<"LiquidRule"> | string
    languageCode?: StringNullableFilter<"LiquidRule"> | string | null
    replacementMethod?: BoolFilter<"LiquidRule"> | boolean
    createdAt?: DateTimeFilter<"LiquidRule"> | Date | string
    updatedAt?: DateTimeFilter<"LiquidRule"> | Date | string
  }, "id">

  export type LiquidRuleOrderByWithAggregationInput = {
    id?: SortOrder
    shop?: SortOrder
    beforeTranslation?: SortOrder
    afterTranslation?: SortOrder
    languageCode?: SortOrderInput | SortOrder
    replacementMethod?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: LiquidRuleCountOrderByAggregateInput
    _max?: LiquidRuleMaxOrderByAggregateInput
    _min?: LiquidRuleMinOrderByAggregateInput
  }

  export type LiquidRuleScalarWhereWithAggregatesInput = {
    AND?: LiquidRuleScalarWhereWithAggregatesInput | LiquidRuleScalarWhereWithAggregatesInput[]
    OR?: LiquidRuleScalarWhereWithAggregatesInput[]
    NOT?: LiquidRuleScalarWhereWithAggregatesInput | LiquidRuleScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"LiquidRule"> | string
    shop?: StringWithAggregatesFilter<"LiquidRule"> | string
    beforeTranslation?: StringWithAggregatesFilter<"LiquidRule"> | string
    afterTranslation?: StringWithAggregatesFilter<"LiquidRule"> | string
    languageCode?: StringNullableWithAggregatesFilter<"LiquidRule"> | string | null
    replacementMethod?: BoolWithAggregatesFilter<"LiquidRule"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"LiquidRule"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"LiquidRule"> | Date | string
  }

  export type SessionCreateInput = {
    id: string
    shop: string
    state: string
    isOnline?: boolean
    scope?: string | null
    expires?: Date | string | null
    accessToken: string
    userId?: bigint | number | null
    firstName?: string | null
    lastName?: string | null
    email?: string | null
    accountOwner?: boolean
    locale?: string | null
    collaborator?: boolean | null
    emailVerified?: boolean | null
    refreshToken?: string | null
    refreshTokenExpires?: Date | string | null
  }

  export type SessionUncheckedCreateInput = {
    id: string
    shop: string
    state: string
    isOnline?: boolean
    scope?: string | null
    expires?: Date | string | null
    accessToken: string
    userId?: bigint | number | null
    firstName?: string | null
    lastName?: string | null
    email?: string | null
    accountOwner?: boolean
    locale?: string | null
    collaborator?: boolean | null
    emailVerified?: boolean | null
    refreshToken?: string | null
    refreshTokenExpires?: Date | string | null
  }

  export type SessionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    shop?: StringFieldUpdateOperationsInput | string
    state?: StringFieldUpdateOperationsInput | string
    isOnline?: BoolFieldUpdateOperationsInput | boolean
    scope?: NullableStringFieldUpdateOperationsInput | string | null
    expires?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    accessToken?: StringFieldUpdateOperationsInput | string
    userId?: NullableBigIntFieldUpdateOperationsInput | bigint | number | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    accountOwner?: BoolFieldUpdateOperationsInput | boolean
    locale?: NullableStringFieldUpdateOperationsInput | string | null
    collaborator?: NullableBoolFieldUpdateOperationsInput | boolean | null
    emailVerified?: NullableBoolFieldUpdateOperationsInput | boolean | null
    refreshToken?: NullableStringFieldUpdateOperationsInput | string | null
    refreshTokenExpires?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type SessionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    shop?: StringFieldUpdateOperationsInput | string
    state?: StringFieldUpdateOperationsInput | string
    isOnline?: BoolFieldUpdateOperationsInput | boolean
    scope?: NullableStringFieldUpdateOperationsInput | string | null
    expires?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    accessToken?: StringFieldUpdateOperationsInput | string
    userId?: NullableBigIntFieldUpdateOperationsInput | bigint | number | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    accountOwner?: BoolFieldUpdateOperationsInput | boolean
    locale?: NullableStringFieldUpdateOperationsInput | string | null
    collaborator?: NullableBoolFieldUpdateOperationsInput | boolean | null
    emailVerified?: NullableBoolFieldUpdateOperationsInput | boolean | null
    refreshToken?: NullableStringFieldUpdateOperationsInput | string | null
    refreshTokenExpires?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type SessionCreateManyInput = {
    id: string
    shop: string
    state: string
    isOnline?: boolean
    scope?: string | null
    expires?: Date | string | null
    accessToken: string
    userId?: bigint | number | null
    firstName?: string | null
    lastName?: string | null
    email?: string | null
    accountOwner?: boolean
    locale?: string | null
    collaborator?: boolean | null
    emailVerified?: boolean | null
    refreshToken?: string | null
    refreshTokenExpires?: Date | string | null
  }

  export type SessionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    shop?: StringFieldUpdateOperationsInput | string
    state?: StringFieldUpdateOperationsInput | string
    isOnline?: BoolFieldUpdateOperationsInput | boolean
    scope?: NullableStringFieldUpdateOperationsInput | string | null
    expires?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    accessToken?: StringFieldUpdateOperationsInput | string
    userId?: NullableBigIntFieldUpdateOperationsInput | bigint | number | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    accountOwner?: BoolFieldUpdateOperationsInput | boolean
    locale?: NullableStringFieldUpdateOperationsInput | string | null
    collaborator?: NullableBoolFieldUpdateOperationsInput | boolean | null
    emailVerified?: NullableBoolFieldUpdateOperationsInput | boolean | null
    refreshToken?: NullableStringFieldUpdateOperationsInput | string | null
    refreshTokenExpires?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type SessionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    shop?: StringFieldUpdateOperationsInput | string
    state?: StringFieldUpdateOperationsInput | string
    isOnline?: BoolFieldUpdateOperationsInput | boolean
    scope?: NullableStringFieldUpdateOperationsInput | string | null
    expires?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    accessToken?: StringFieldUpdateOperationsInput | string
    userId?: NullableBigIntFieldUpdateOperationsInput | bigint | number | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    accountOwner?: BoolFieldUpdateOperationsInput | boolean
    locale?: NullableStringFieldUpdateOperationsInput | string | null
    collaborator?: NullableBoolFieldUpdateOperationsInput | boolean | null
    emailVerified?: NullableBoolFieldUpdateOperationsInput | boolean | null
    refreshToken?: NullableStringFieldUpdateOperationsInput | string | null
    refreshTokenExpires?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type ShopTranslationSettingsCreateInput = {
    shop: string
    primaryLocale: string
    targets: JsonNullValueInput | InputJsonValue
    autoTranslate?: boolean
    migratedToTsf?: boolean
    migratedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ShopTranslationSettingsUncheckedCreateInput = {
    shop: string
    primaryLocale: string
    targets: JsonNullValueInput | InputJsonValue
    autoTranslate?: boolean
    migratedToTsf?: boolean
    migratedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ShopTranslationSettingsUpdateInput = {
    shop?: StringFieldUpdateOperationsInput | string
    primaryLocale?: StringFieldUpdateOperationsInput | string
    targets?: JsonNullValueInput | InputJsonValue
    autoTranslate?: BoolFieldUpdateOperationsInput | boolean
    migratedToTsf?: BoolFieldUpdateOperationsInput | boolean
    migratedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ShopTranslationSettingsUncheckedUpdateInput = {
    shop?: StringFieldUpdateOperationsInput | string
    primaryLocale?: StringFieldUpdateOperationsInput | string
    targets?: JsonNullValueInput | InputJsonValue
    autoTranslate?: BoolFieldUpdateOperationsInput | boolean
    migratedToTsf?: BoolFieldUpdateOperationsInput | boolean
    migratedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ShopTranslationSettingsCreateManyInput = {
    shop: string
    primaryLocale: string
    targets: JsonNullValueInput | InputJsonValue
    autoTranslate?: boolean
    migratedToTsf?: boolean
    migratedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ShopTranslationSettingsUpdateManyMutationInput = {
    shop?: StringFieldUpdateOperationsInput | string
    primaryLocale?: StringFieldUpdateOperationsInput | string
    targets?: JsonNullValueInput | InputJsonValue
    autoTranslate?: BoolFieldUpdateOperationsInput | boolean
    migratedToTsf?: BoolFieldUpdateOperationsInput | boolean
    migratedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ShopTranslationSettingsUncheckedUpdateManyInput = {
    shop?: StringFieldUpdateOperationsInput | string
    primaryLocale?: StringFieldUpdateOperationsInput | string
    targets?: JsonNullValueInput | InputJsonValue
    autoTranslate?: BoolFieldUpdateOperationsInput | boolean
    migratedToTsf?: BoolFieldUpdateOperationsInput | boolean
    migratedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ShopTargetLocaleCreateInput = {
    shop: string
    locale: string
    autoTranslate?: boolean
    status?: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ShopTargetLocaleUncheckedCreateInput = {
    id?: number
    shop: string
    locale: string
    autoTranslate?: boolean
    status?: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ShopTargetLocaleUpdateInput = {
    shop?: StringFieldUpdateOperationsInput | string
    locale?: StringFieldUpdateOperationsInput | string
    autoTranslate?: BoolFieldUpdateOperationsInput | boolean
    status?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ShopTargetLocaleUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    shop?: StringFieldUpdateOperationsInput | string
    locale?: StringFieldUpdateOperationsInput | string
    autoTranslate?: BoolFieldUpdateOperationsInput | boolean
    status?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ShopTargetLocaleCreateManyInput = {
    id?: number
    shop: string
    locale: string
    autoTranslate?: boolean
    status?: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ShopTargetLocaleUpdateManyMutationInput = {
    shop?: StringFieldUpdateOperationsInput | string
    locale?: StringFieldUpdateOperationsInput | string
    autoTranslate?: BoolFieldUpdateOperationsInput | boolean
    status?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ShopTargetLocaleUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    shop?: StringFieldUpdateOperationsInput | string
    locale?: StringFieldUpdateOperationsInput | string
    autoTranslate?: BoolFieldUpdateOperationsInput | boolean
    status?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GlossaryCreateInput = {
    shop: string
    sourceText: string
    targetText: string
    rangeCode?: string | null
    caseSensitive?: boolean
    status?: number
    createdAt?: Date | string
  }

  export type GlossaryUncheckedCreateInput = {
    id?: number
    shop: string
    sourceText: string
    targetText: string
    rangeCode?: string | null
    caseSensitive?: boolean
    status?: number
    createdAt?: Date | string
  }

  export type GlossaryUpdateInput = {
    shop?: StringFieldUpdateOperationsInput | string
    sourceText?: StringFieldUpdateOperationsInput | string
    targetText?: StringFieldUpdateOperationsInput | string
    rangeCode?: NullableStringFieldUpdateOperationsInput | string | null
    caseSensitive?: BoolFieldUpdateOperationsInput | boolean
    status?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GlossaryUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    shop?: StringFieldUpdateOperationsInput | string
    sourceText?: StringFieldUpdateOperationsInput | string
    targetText?: StringFieldUpdateOperationsInput | string
    rangeCode?: NullableStringFieldUpdateOperationsInput | string | null
    caseSensitive?: BoolFieldUpdateOperationsInput | boolean
    status?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GlossaryCreateManyInput = {
    id?: number
    shop: string
    sourceText: string
    targetText: string
    rangeCode?: string | null
    caseSensitive?: boolean
    status?: number
    createdAt?: Date | string
  }

  export type GlossaryUpdateManyMutationInput = {
    shop?: StringFieldUpdateOperationsInput | string
    sourceText?: StringFieldUpdateOperationsInput | string
    targetText?: StringFieldUpdateOperationsInput | string
    rangeCode?: NullableStringFieldUpdateOperationsInput | string | null
    caseSensitive?: BoolFieldUpdateOperationsInput | boolean
    status?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GlossaryUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    shop?: StringFieldUpdateOperationsInput | string
    sourceText?: StringFieldUpdateOperationsInput | string
    targetText?: StringFieldUpdateOperationsInput | string
    rangeCode?: NullableStringFieldUpdateOperationsInput | string | null
    caseSensitive?: BoolFieldUpdateOperationsInput | boolean
    status?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PageFlyTranslationCreateInput = {
    id: number
    shop: string
    sourceText: string
    targetText: string
    languageCode: string
    isDeleted?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type PageFlyTranslationUncheckedCreateInput = {
    id: number
    shop: string
    sourceText: string
    targetText: string
    languageCode: string
    isDeleted?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type PageFlyTranslationUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    shop?: StringFieldUpdateOperationsInput | string
    sourceText?: StringFieldUpdateOperationsInput | string
    targetText?: StringFieldUpdateOperationsInput | string
    languageCode?: StringFieldUpdateOperationsInput | string
    isDeleted?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PageFlyTranslationUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    shop?: StringFieldUpdateOperationsInput | string
    sourceText?: StringFieldUpdateOperationsInput | string
    targetText?: StringFieldUpdateOperationsInput | string
    languageCode?: StringFieldUpdateOperationsInput | string
    isDeleted?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PageFlyTranslationCreateManyInput = {
    id: number
    shop: string
    sourceText: string
    targetText: string
    languageCode: string
    isDeleted?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type PageFlyTranslationUpdateManyMutationInput = {
    id?: IntFieldUpdateOperationsInput | number
    shop?: StringFieldUpdateOperationsInput | string
    sourceText?: StringFieldUpdateOperationsInput | string
    targetText?: StringFieldUpdateOperationsInput | string
    languageCode?: StringFieldUpdateOperationsInput | string
    isDeleted?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PageFlyTranslationUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    shop?: StringFieldUpdateOperationsInput | string
    sourceText?: StringFieldUpdateOperationsInput | string
    targetText?: StringFieldUpdateOperationsInput | string
    languageCode?: StringFieldUpdateOperationsInput | string
    isDeleted?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LiquidRuleCreateInput = {
    id?: string
    shop: string
    beforeTranslation: string
    afterTranslation: string
    languageCode?: string | null
    replacementMethod?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type LiquidRuleUncheckedCreateInput = {
    id?: string
    shop: string
    beforeTranslation: string
    afterTranslation: string
    languageCode?: string | null
    replacementMethod?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type LiquidRuleUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    shop?: StringFieldUpdateOperationsInput | string
    beforeTranslation?: StringFieldUpdateOperationsInput | string
    afterTranslation?: StringFieldUpdateOperationsInput | string
    languageCode?: NullableStringFieldUpdateOperationsInput | string | null
    replacementMethod?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LiquidRuleUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    shop?: StringFieldUpdateOperationsInput | string
    beforeTranslation?: StringFieldUpdateOperationsInput | string
    afterTranslation?: StringFieldUpdateOperationsInput | string
    languageCode?: NullableStringFieldUpdateOperationsInput | string | null
    replacementMethod?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LiquidRuleCreateManyInput = {
    id?: string
    shop: string
    beforeTranslation: string
    afterTranslation: string
    languageCode?: string | null
    replacementMethod?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type LiquidRuleUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    shop?: StringFieldUpdateOperationsInput | string
    beforeTranslation?: StringFieldUpdateOperationsInput | string
    afterTranslation?: StringFieldUpdateOperationsInput | string
    languageCode?: NullableStringFieldUpdateOperationsInput | string | null
    replacementMethod?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LiquidRuleUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    shop?: StringFieldUpdateOperationsInput | string
    beforeTranslation?: StringFieldUpdateOperationsInput | string
    afterTranslation?: StringFieldUpdateOperationsInput | string
    languageCode?: NullableStringFieldUpdateOperationsInput | string | null
    replacementMethod?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type BigIntNullableFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel> | null
    in?: bigint[] | number[] | null
    notIn?: bigint[] | number[] | null
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntNullableFilter<$PrismaModel> | bigint | number | null
  }

  export type BoolNullableFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableFilter<$PrismaModel> | boolean | null
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type SessionCountOrderByAggregateInput = {
    id?: SortOrder
    shop?: SortOrder
    state?: SortOrder
    isOnline?: SortOrder
    scope?: SortOrder
    expires?: SortOrder
    accessToken?: SortOrder
    userId?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    email?: SortOrder
    accountOwner?: SortOrder
    locale?: SortOrder
    collaborator?: SortOrder
    emailVerified?: SortOrder
    refreshToken?: SortOrder
    refreshTokenExpires?: SortOrder
  }

  export type SessionAvgOrderByAggregateInput = {
    userId?: SortOrder
  }

  export type SessionMaxOrderByAggregateInput = {
    id?: SortOrder
    shop?: SortOrder
    state?: SortOrder
    isOnline?: SortOrder
    scope?: SortOrder
    expires?: SortOrder
    accessToken?: SortOrder
    userId?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    email?: SortOrder
    accountOwner?: SortOrder
    locale?: SortOrder
    collaborator?: SortOrder
    emailVerified?: SortOrder
    refreshToken?: SortOrder
    refreshTokenExpires?: SortOrder
  }

  export type SessionMinOrderByAggregateInput = {
    id?: SortOrder
    shop?: SortOrder
    state?: SortOrder
    isOnline?: SortOrder
    scope?: SortOrder
    expires?: SortOrder
    accessToken?: SortOrder
    userId?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    email?: SortOrder
    accountOwner?: SortOrder
    locale?: SortOrder
    collaborator?: SortOrder
    emailVerified?: SortOrder
    refreshToken?: SortOrder
    refreshTokenExpires?: SortOrder
  }

  export type SessionSumOrderByAggregateInput = {
    userId?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type BigIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel> | null
    in?: bigint[] | number[] | null
    notIn?: bigint[] | number[] | null
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntNullableWithAggregatesFilter<$PrismaModel> | bigint | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedBigIntNullableFilter<$PrismaModel>
    _min?: NestedBigIntNullableFilter<$PrismaModel>
    _max?: NestedBigIntNullableFilter<$PrismaModel>
  }

  export type BoolNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableWithAggregatesFilter<$PrismaModel> | boolean | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedBoolNullableFilter<$PrismaModel>
    _max?: NestedBoolNullableFilter<$PrismaModel>
  }
  export type JsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonFilterBase<$PrismaModel>>, 'path'>>

  export type JsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type ShopTranslationSettingsCountOrderByAggregateInput = {
    shop?: SortOrder
    primaryLocale?: SortOrder
    targets?: SortOrder
    autoTranslate?: SortOrder
    migratedToTsf?: SortOrder
    migratedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ShopTranslationSettingsMaxOrderByAggregateInput = {
    shop?: SortOrder
    primaryLocale?: SortOrder
    autoTranslate?: SortOrder
    migratedToTsf?: SortOrder
    migratedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ShopTranslationSettingsMinOrderByAggregateInput = {
    shop?: SortOrder
    primaryLocale?: SortOrder
    autoTranslate?: SortOrder
    migratedToTsf?: SortOrder
    migratedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }
  export type JsonWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedJsonFilter<$PrismaModel>
    _max?: NestedJsonFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type ShopTargetLocaleShopLocaleCompoundUniqueInput = {
    shop: string
    locale: string
  }

  export type ShopTargetLocaleCountOrderByAggregateInput = {
    id?: SortOrder
    shop?: SortOrder
    locale?: SortOrder
    autoTranslate?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ShopTargetLocaleAvgOrderByAggregateInput = {
    id?: SortOrder
    status?: SortOrder
  }

  export type ShopTargetLocaleMaxOrderByAggregateInput = {
    id?: SortOrder
    shop?: SortOrder
    locale?: SortOrder
    autoTranslate?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ShopTargetLocaleMinOrderByAggregateInput = {
    id?: SortOrder
    shop?: SortOrder
    locale?: SortOrder
    autoTranslate?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ShopTargetLocaleSumOrderByAggregateInput = {
    id?: SortOrder
    status?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type GlossaryCountOrderByAggregateInput = {
    id?: SortOrder
    shop?: SortOrder
    sourceText?: SortOrder
    targetText?: SortOrder
    rangeCode?: SortOrder
    caseSensitive?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
  }

  export type GlossaryAvgOrderByAggregateInput = {
    id?: SortOrder
    status?: SortOrder
  }

  export type GlossaryMaxOrderByAggregateInput = {
    id?: SortOrder
    shop?: SortOrder
    sourceText?: SortOrder
    targetText?: SortOrder
    rangeCode?: SortOrder
    caseSensitive?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
  }

  export type GlossaryMinOrderByAggregateInput = {
    id?: SortOrder
    shop?: SortOrder
    sourceText?: SortOrder
    targetText?: SortOrder
    rangeCode?: SortOrder
    caseSensitive?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
  }

  export type GlossarySumOrderByAggregateInput = {
    id?: SortOrder
    status?: SortOrder
  }

  export type PageFlyTranslationCountOrderByAggregateInput = {
    id?: SortOrder
    shop?: SortOrder
    sourceText?: SortOrder
    targetText?: SortOrder
    languageCode?: SortOrder
    isDeleted?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type PageFlyTranslationAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type PageFlyTranslationMaxOrderByAggregateInput = {
    id?: SortOrder
    shop?: SortOrder
    sourceText?: SortOrder
    targetText?: SortOrder
    languageCode?: SortOrder
    isDeleted?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type PageFlyTranslationMinOrderByAggregateInput = {
    id?: SortOrder
    shop?: SortOrder
    sourceText?: SortOrder
    targetText?: SortOrder
    languageCode?: SortOrder
    isDeleted?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type PageFlyTranslationSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type LiquidRuleCountOrderByAggregateInput = {
    id?: SortOrder
    shop?: SortOrder
    beforeTranslation?: SortOrder
    afterTranslation?: SortOrder
    languageCode?: SortOrder
    replacementMethod?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type LiquidRuleMaxOrderByAggregateInput = {
    id?: SortOrder
    shop?: SortOrder
    beforeTranslation?: SortOrder
    afterTranslation?: SortOrder
    languageCode?: SortOrder
    replacementMethod?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type LiquidRuleMinOrderByAggregateInput = {
    id?: SortOrder
    shop?: SortOrder
    beforeTranslation?: SortOrder
    afterTranslation?: SortOrder
    languageCode?: SortOrder
    replacementMethod?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type NullableBigIntFieldUpdateOperationsInput = {
    set?: bigint | number | null
    increment?: bigint | number
    decrement?: bigint | number
    multiply?: bigint | number
    divide?: bigint | number
  }

  export type NullableBoolFieldUpdateOperationsInput = {
    set?: boolean | null
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedBigIntNullableFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel> | null
    in?: bigint[] | number[] | null
    notIn?: bigint[] | number[] | null
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntNullableFilter<$PrismaModel> | bigint | number | null
  }

  export type NestedBoolNullableFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableFilter<$PrismaModel> | boolean | null
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedBigIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel> | null
    in?: bigint[] | number[] | null
    notIn?: bigint[] | number[] | null
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntNullableWithAggregatesFilter<$PrismaModel> | bigint | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedBigIntNullableFilter<$PrismaModel>
    _min?: NestedBigIntNullableFilter<$PrismaModel>
    _max?: NestedBigIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedBoolNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableWithAggregatesFilter<$PrismaModel> | boolean | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedBoolNullableFilter<$PrismaModel>
    _max?: NestedBoolNullableFilter<$PrismaModel>
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }
  export type NestedJsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}