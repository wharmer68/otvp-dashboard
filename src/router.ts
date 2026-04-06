export interface Route {
  pattern: RegExp;
  view: string;
  params?: Record<string, string>;
}

export type ViewRenderer = (params: Record<string, string>) => void | Promise<void>;

const routes: Route[] = [];
const renderers: Map<string, ViewRenderer> = new Map();
let currentView = '';

export function addRoute(path: string, viewName: string, renderer: ViewRenderer): void {
  const paramNames: string[] = [];
  const pattern = path.replace(/:(\w+)/g, (_, name) => {
    paramNames.push(name);
    return '([^/]+)';
  });
  routes.push({ pattern: new RegExp(`^${pattern}$`), view: viewName });
  renderers.set(viewName, renderer);
}

export function navigate(path: string): void {
  window.location.hash = path;
}

export function getCurrentView(): string {
  return currentView;
}

export function startRouter(): void {
  const handleRoute = () => {
    const hash = window.location.hash.slice(1) || '/';
    for (const route of routes) {
      const match = hash.match(route.pattern);
      if (match) {
        currentView = route.view;
        const params: Record<string, string> = {};
        const renderer = renderers.get(route.view);
        if (renderer) {
          match.slice(1).forEach((val, i) => {
            params[`p${i}`] = val;
          });
          try {
            const result = renderer(params);
            if (result instanceof Promise) {
              result.catch(err => console.error(`Route error [${route.view}]:`, err));
            }
          } catch (err) {
            console.error(`Route error [${route.view}]:`, err);
          }
        }
        updateNavHighlights(hash);
        return;
      }
    }
    // Default to dashboard
    navigate('/');
  };

  // Use both hashchange and click interception for reliable routing
  window.addEventListener('hashchange', handleRoute);

  // Intercept nav link clicks to ensure routing works even when
  // the hash doesn't change (e.g. clicking the same link twice)
  document.addEventListener('click', (e) => {
    const link = (e.target as HTMLElement).closest('a.nav-link');
    if (link) {
      const href = link.getAttribute('href');
      if (href?.startsWith('#')) {
        e.preventDefault();
        const path = href.slice(1);
        if (window.location.hash.slice(1) === path) {
          // Same hash — hashchange won't fire, so handle manually
          handleRoute();
        } else {
          window.location.hash = path;
        }
      }
    }
  });

  handleRoute();
}

function updateNavHighlights(hash: string): void {
  document.querySelectorAll('.nav-link').forEach(el => {
    const route = el.getAttribute('data-route') || '';
    el.classList.toggle('active', hash === route || (route !== '/' && hash.startsWith(route)));
  });
}
