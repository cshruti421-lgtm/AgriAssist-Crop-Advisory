import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Router as WouterRouter } from 'wouter';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: 'hsl(158 42% 29%)',
    colorForeground: 'hsl(158 18% 15%)',
    colorMutedForeground: 'hsl(158 10% 42%)',
    colorDanger: 'hsl(3 59% 47%)',
    colorBackground: 'hsl(42 44% 98%)',
    colorInput: 'hsl(42 44% 98%)',
    colorInputForeground: 'hsl(158 18% 15%)',
    colorNeutral: 'hsl(91 14% 82%)',
    fontFamily: 'DM Sans, sans-serif',
    borderRadius: '0.75rem',
  },
};

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <ClerkProvider
      publishableKey={clerkKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
    >
      <WouterRouter base={basePath}>
        <App />
      </WouterRouter>
    </ClerkProvider>
  </ErrorBoundary>,
);
