/** Minimal Octane JSX typings for tsc until octane ships `octane/jsx-runtime` types. */
declare module "octane/jsx-runtime" {
  export const jsx: (...args: any[]) => any;
  export const jsxs: (...args: any[]) => any;
  export const Fragment: any;

  export namespace Octane {
    namespace JSX {
      interface IntrinsicElements {
        [elemName: string]: any;
      }
      type Element = any;
      type ElementClass = any;
    }
  }
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
  type Element = any;
  type ElementClass = any;
}
