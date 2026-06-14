import "react";

// Declaración mínima de los custom elements de A-Frame que usa /capsula.
// React 19 / Next 15 resuelven JSX.IntrinsicElements vía `React.JSX`,
// así que augmentamos ahí (no el namespace global JSX).
type AframeEl = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLElement>,
  HTMLElement
> & { [attr: string]: unknown };

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "a-scene": AframeEl;
      "a-sky": AframeEl;
      "a-text": AframeEl;
      "a-camera": AframeEl;
      "a-entity": AframeEl;
      "a-assets": AframeEl;
    }
  }
}
