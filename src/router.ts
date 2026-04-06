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
        // Update nav highlights
        document.querySelectorAll('.nav-link').forEach(el => {
          const href = el.getAttribute('data-route') || '';
          el.classList.toggle('active', hash === href || (href !== '/' && hash.startsWith(href)));
        });
        return;
      }
    }
    // Default to dashboard
    navigate('/');
  };

  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
