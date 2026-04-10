# WuXing Mech Extension

## Analytics

The extension now supports dual-write analytics:

- Local stats remain available in storage for debugging.
- Remote delivery is optional and can be enabled by setting an analytics endpoint.
- Failed remote sends are queued locally and retried on later events.

You can configure the remote collector from the extension console:

```js
await chrome.storage.local.set({
  wuxing_analytics_config: {
    enabled: true,
    site: 'wuxing-extension',
    endpoint: 'https://your-collector.example.com/events'
  }
})
```

After configuring the endpoint, open the popup once and grant the requested domain access when prompted. The extension uses optional host permissions so analytics delivery can be enabled without shipping fixed collector domains in the manifest.

The collector receives JSON events with:

- `name`
- `site`
- `installId`
- `sessionId`
- `timestamp`
- `day`
- `properties`

Current funnel events include:

- `popup_open`
- `first_open`
- `return_visit`
- `onboarding_view`
- `birth_submit`
- `fortune_generated`
- `detail_expand`
- `detail_collapse`
- `product_refresh`
- `product_click`
- `share_save`
- `share_copy`
- `locale_switch`

## Share Config

The share card reads a configurable landing URL and short link from storage:

```js
await chrome.storage.local.set({
  wuxing_share_config: {
    shareUrl: 'https://your-landing-page.example.com/wuxing',
    shortUrl: 'https://wx.example/s/daily'
  }
})
```

If unset, the extension falls back to the project repository URL for both.

## Launch Checklist

Before public launch, verify all of the following:

1. Set `wuxing_share_config.shareUrl` and `wuxing_share_config.shortUrl` to your real landing page and short link.
2. Set `wuxing_analytics_config.endpoint`, open the popup, and grant analytics domain access.
3. Confirm collector events arrive for:
   - `popup_open`
   - `first_open`
   - `fortune_generated`
   - `share_save`
   - `share_copy`
   - `product_click`
4. Save a share card and scan its QR code to ensure it opens the intended landing page.
5. Trigger the daily notification once and confirm it opens the extension correctly.
6. Replace this README's remaining template content with product-facing installation and usage docs.

## Legacy Template Notes

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
