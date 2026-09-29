import { Dimensions, Platform } from 'react-native';

/**
 * No navegador do celular em pé, o app inteiro é girado 90° para continuar
 * em paisagem (o app só funciona deitado). O React Native lê as medidas da
 * tela já trocadas, então os layouts saem como num celular deitado.
 * A página secreta fica de fora (abre em pé normalmente).
 */

type Dims = { width: number; height: number; scale: number; fontScale: number };

const isTouchWeb =
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(pointer: coarse)').matches;

function rotated(): boolean {
  if (!isTouchWeb) return false;
  if (window.location.pathname === '/altaria-secreta') return false;
  return window.innerHeight > window.innerWidth;
}

const swap = <T extends Dims>(d: T): T => (rotated() ? { ...d, width: d.height, height: d.width } : d);

function applyCss() {
  const root = document.getElementById('root');
  if (!root) return;
  if (rotated()) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    Object.assign(root.style, {
      position: 'fixed',
      top: '0px',
      left: '0px',
      width: `${h}px`,
      height: `${w}px`,
      transformOrigin: 'top left',
      transform: `translateX(${w}px) rotate(90deg)`,
      overflow: 'hidden',
    });
  } else {
    Object.assign(root.style, { position: '', top: '', left: '', width: '', height: '', transformOrigin: '', transform: '', overflow: '' });
  }
}

if (isTouchWeb) {
  const D = Dimensions as unknown as {
    get: (k: 'window' | 'screen') => Dims;
    addEventListener: (type: 'change', fn: (e: { window: Dims; screen: Dims }) => void) => { remove: () => void } | void;
    removeEventListener?: (type: 'change', fn: unknown) => void;
  };
  const originalGet = D.get.bind(D);
  D.get = (k) => swap(originalGet(k));
  const originalAdd = D.addEventListener.bind(D);
  const wrapped = new Map<unknown, (e: { window: Dims; screen: Dims }) => void>();
  D.addEventListener = (type, fn) => {
    const w = (e: { window: Dims; screen: Dims }) => fn({ window: swap(e.window), screen: swap(e.screen) });
    wrapped.set(fn, w);
    return originalAdd(type, w);
  };
  if (D.removeEventListener) {
    const originalRemove = D.removeEventListener.bind(D);
    D.removeEventListener = (type, fn) => originalRemove(type, wrapped.get(fn) ?? fn);
  }
  const update = () => applyCss();
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', update);
  window.addEventListener('popstate', update);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', update);
  else update();
  // A troca de página do Expo Router não dispara eventos: confere de tempos em tempos.
  setInterval(update, 1000);
}

export {};
