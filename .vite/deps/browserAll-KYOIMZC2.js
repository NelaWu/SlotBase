import {
  AccessibilitySystem,
  DOMPipe,
  EventSystem,
  FederatedContainer,
  accessibilityTarget
} from "./chunk-MKRKGLOC.js";
import "./chunk-MW7G3TMM.js";
import "./chunk-6NYBTDQ4.js";
import "./chunk-CZPAV3QY.js";
import {
  Container,
  extensions
} from "./chunk-G4HFVL32.js";
import "./chunk-EQCVQC35.js";

// node_modules/.pnpm/pixi.js@8.14.0/node_modules/pixi.js/lib/accessibility/init.mjs
extensions.add(AccessibilitySystem);
extensions.mixin(Container, accessibilityTarget);

// node_modules/.pnpm/pixi.js@8.14.0/node_modules/pixi.js/lib/events/init.mjs
extensions.add(EventSystem);
extensions.mixin(Container, FederatedContainer);

// node_modules/.pnpm/pixi.js@8.14.0/node_modules/pixi.js/lib/dom/init.mjs
extensions.add(DOMPipe);
//# sourceMappingURL=browserAll-KYOIMZC2.js.map
