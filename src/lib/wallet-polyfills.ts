import { Buffer as BufferPolyfill } from 'buffer';

type BrowserGlobals = typeof globalThis & { Buffer?: typeof BufferPolyfill };
const browserGlobals = globalThis as BrowserGlobals;

if (!browserGlobals.Buffer) {
  browserGlobals.Buffer = BufferPolyfill;
}
