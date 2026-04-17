import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  NavLink,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

const NAV_LINKS = [
  { to: "/",           label: "HOME" },
  { to: "/hazard-map", label: "HAZARD MAP" },
  { to: "/education",  label: "EDUCATION" },
];

function Navbar() {
  return (
    <nav
      className="sticky top-0 z-50 bg-base/95 border-b border-line backdrop-blur-md"
      aria-label="Main navigation"
    >
      <div className="max-w-[1200px] mx-auto px-8 flex items-center justify-between h-14">

        {/* Logo */}
        {/* Logo — aria-hidden so screen readers use the HOME nav link instead */}
        <a
          href="/"
          aria-hidden="true"
          tabIndex={-1}
          className="ff-display flex items-center gap-2 text-xl text-fg-1 no-underline hover:text-flame transition-colors duration-150"
        >
          🚒 <span>FIREOPS</span>
        </a>

        {/* Links */}
        <ul className="flex list-none m-0 p-0 gap-1" role="list">
          {NAV_LINKS.map(({ to, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  "ff-display block px-4 py-2 text-sm border transition-all duration-150 no-underline rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow " +
                  (isActive
                    ? "text-flame border-fire bg-fire/10"
                    : "text-fg-3 border-transparent hover:text-fg-1 hover:border-line-warm hover:bg-white/[0.03]")
                }
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 max-w-[1100px] mx-auto">
      <h1 className="ff-display text-5xl text-flame mb-4">{message}</h1>
      <p className="ff-body text-fg-2">{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto bg-surface-3 border border-line mt-4 text-fg-3 text-sm">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
