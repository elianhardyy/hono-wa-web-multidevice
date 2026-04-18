/** @jsxImportSource hono/jsx */
import type { FC } from "hono/jsx";

type LayoutProps = {
  title: string;
  children?: any;
};

type Action = {
  href: string;
  label: string;
  secondary?: boolean;
};

type CardProps = {
  icon?: string;
  title: string;
  badge?: string;
  descriptions?: string[];
  actions?: Action[];
  children?: any;
};

export const BackendLayout: FC<LayoutProps> = (props) => {
  return (
    <html
      lang="id"
      style='font-family: "Poppins", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;'
    >
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{props.title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.bunny.net/css?family=poppins:300,400,500,600,700,800"
          rel="stylesheet"
        />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          :root {
            --app-font: "Poppins", ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
          }
          html, body {
            font-family: var(--app-font) !important;
            font-weight: 400;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;
          }
          * { font-family: inherit; }
          body {
            background: #ece5dd;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 1rem;
          }
          button, input, select, textarea { font: inherit; }
          .card {
            background: #fff;
            border-radius: 1.25rem;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
            padding: 2rem;
            text-align: center;
            max-width: 560px;
            width: 100%;
          }
          .icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
          h1 { font-size: 1.35rem; font-weight: 700; letter-spacing: -0.02em; color: #111b21; margin-bottom: 0.5rem; }
          p { color: #667781; font-weight: 400; font-size: 0.95rem; line-height: 1.6; margin-top: 0.5rem; }
          .badge {
            display: inline-block;
            background: #25d366;
            color: #fff;
            font-size: 0.75rem;
            padding: 4px 12px;
            border-radius: 999px;
            margin: 0.5rem 0 1rem;
            font-weight: 600;
          }
          .actions { margin-top: 1rem; display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; }
          .btn {
            display: inline-block;
            padding: 0.6rem 1rem;
            background: #25d366;
            color: #fff;
            border-radius: 999px;
            text-decoration: none;
            font-size: 0.9rem;
            font-weight: 600;
          }
          .btn.secondary { background: #111b21; }
          .steps {
            text-align: left;
            font-size: 0.88rem;
            color: #2d3748;
            line-height: 1.8;
            margin: 1rem 0;
            padding-left: 1.1rem;
          }
          .code {
            margin-top: 1rem;
            text-align: left;
            background: #0f172a;
            color: #e2e8f0;
            border-radius: 0.75rem;
            padding: 0.9rem;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            font-size: 0.8rem;
            overflow-x: auto;
            white-space: pre-wrap;
          }
          .qr {
            border: 3px solid #25d366;
            border-radius: 1rem;
            padding: 1rem;
            display: inline-block;
            margin: 0.8rem 0;
          }
        `}</style>
      </head>
      <body style='font-family: "Poppins", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;'>
        {props.children}
      </body>
    </html>
  );
};

export const BackendCard: FC<CardProps> = (props) => (
  <div class="card">
    {props.icon ? <div class="icon">{props.icon}</div> : null}
    <h1>{props.title}</h1>
    {props.badge ? <div class="badge">{props.badge}</div> : null}
    {props.descriptions?.map((d) => <p>{d}</p>)}
    {props.children}
    {props.actions?.length ? (
      <div class="actions">
        {props.actions.map((action) => (
          <a class={`btn${action.secondary ? " secondary" : ""}`} href={action.href}>
            {action.label}
          </a>
        ))}
      </div>
    ) : null}
  </div>
);

export const Steps: FC<{ items: string[] }> = (props) => (
  <ol class="steps">
    {props.items.map((item) => (
      <li>{item}</li>
    ))}
  </ol>
);

export const CodeBlock: FC<{ text: string }> = (props) => (
  <pre class="code">{props.text}</pre>
);
