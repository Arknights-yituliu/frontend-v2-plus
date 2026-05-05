# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

This is the frontend for "明日方舟一图流" (Arknights Yituliu), a comprehensive resource site for the mobile game Arknights. The site provides material efficiency calculations, stage recommendations, gacha calculators, operator surveys, and various game data tools.

Website: https://ark.yituliu.cn

## Development Commands

### Starting Development
```bash
npm run dev
```
Starts Vite dev server on port 4000 (configured in package.json)

### Building
```bash
npm run build
```
Builds for production using Vite. The build outputs two HTML entry points:
- `index.html` - Main application
- `docs.html` - Documentation page

### Preview Production Build
```bash
npm run preview
```

### Running Local Server
```bash
npm run server
```
Runs the Express server defined in `server.js`

## Commit Message Format

Follow the format defined in `GitHub提交格式.md`:

```
提交类型(提交涉及的模块): 提交内容
```

Example:
```
fix(攒抽计算器): 每月黄票兑换月份错误
```

Common commit types:
- `feat` - New feature
- `fix` - Bug fix
- `update` - Small updates (text changes, JSON data updates)
- `css` - Style updates
- `optimized` - Code optimization
- `refactor` - Code refactoring
- `docs` - Documentation changes

## Architecture

### Tech Stack
- **Vue 3.3.4** - Core framework using Composition API
- **Vite 5.4.6** - Build tool and dev server
- **Vue Router 4.3.0** - Client-side routing
- **Element Plus 2.9.0** - Primary UI component library (with Chinese locale)
- **Vuetify 3.7.5** - Secondary UI library (Material Design)
- **Naive UI 2.41.0** - Additional UI components
- **Axios 1.7.4** - HTTP client with interceptors
- **Dexie 4.0.10** - IndexedDB wrapper for client-side storage

### Directory Structure

```
src/
├── api/                  # API abstractions with unified request/response interceptors
│   ├── request.js        # Axios instance with auth headers (Authorization, uid)
│   ├── BASE_URL.js       # Backend domain configuration
│   └── *.js              # Module-specific API functions
├── assets/
│   └── css/              # Organized by feature (layout, sprite, material, tool, survey)
├── components/           # Reusable Vue components
├── pages/                # Route-level components organized by module
│   ├── about/            # Site information
│   ├── material/         # Material efficiency pages
│   ├── tools/            # Utility tools (gacha calc, schedule generator, etc.)
│   ├── survey/           # Operator survey pages
│   ├── account/          # User account management
│   ├── information/      # Game data (logistics, sandbox, integrated strategies)
│   └── dev/              # Development/testing pages
├── static/json/          # Static game data
│   ├── material/         # Material info, synthesis paths
│   ├── operator/         # Operator information
│   └── tools/            # Tool-specific data (e.g., gacha schedule)
├── utils/                # Utility functions
├── router/
│   ├── index.js          # Router setup with navigation guards
│   └── routes.js         # Route definitions with module grouping
├── plugins/              # Plugin configurations (Vuetify)
├── main.js               # App entry point
└── App.vue               # Root component with theme management and navigation
```

### Key Patterns

#### Routing System
Routes are defined in `src/router/routes.js` with a structured format:
- Each route has `module` field for grouping (material, tools, survey, information, about, dev)
- Routes are organized into `LinkedTable` by module for navigation menu
- `display: true` routes appear in navigation
- Router guard in `index.js` handles special `/docs` path redirection
- Page titles automatically set via `meta.title`

#### API Layer
All HTTP requests go through `src/api/request.js`:
- Axios interceptor adds `Authorization` and `uid` headers from localStorage
- Response interceptor checks `code !== 200` and shows error messages
- Base URL configured in `BASE_URL.js` (currently: https://backend.yituliu.cn/)
- Each API module exports functions that use the configured service instance

#### Theme Management
Dual theme system (light/dark) implemented in `App.vue`:
- Uses Vuetify's theme system + Naive UI's darkTheme
- Theme preference stored in localStorage
- HTML element class updated to apply global theme styles
- Both component libraries respect theme changes

#### Static Data
Game data stored in `src/static/json/` as JSON files:
- Material synthesis paths and drop rates
- Operator information and stats
- Tool-specific data (e.g., gacha event schedules)
- Data loaded dynamically in components as needed

#### Build-time Variables
Custom Vite plugin `buildTimePlugin()` in `vite.config.js` injects build timestamp as `import.meta.env.BUILD_TIME`

## Important Notes

### Multi-entry Build
The build produces two separate HTML files. When working with routes, be aware that `/docs` paths redirect to `docs.html` (handled in router beforeEach guard).

### Path Aliases
`@` alias is configured to point to `src/` directory in vite.config.js

### Component Import Strategy
Routes use a mix of:
- Eager imports for critical paths (home, auth, main features)
- Lazy imports with `() => import()` for less frequently accessed pages

### User Authentication
User info utilities in `src/utils/user/userInfo.js` provide:
- `getUid()` - Get user ID
- `getUserTokenV2()` - Get auth token
- Both used in request interceptor headers

### Sprite Images
The project uses CSS sprite sheets for game assets:
- Avatar sprites: `sprite_avatar.css`
- Icon sprites: `sprite_icon.css`
- Item sprites: `sprite_item.css`
- Skill sprites: `sprite_skill.css`

Custom components like `OperatorAvatar`, `EquipIcon`, `SkillIcon` use these sprites.

## Automated Scripts

The `scripts/` directory contains automation scripts:
- `term-auto-update.js` - Automated term/data updates (check contents for specific functionality)

## Testing and Development

Development and test pages are accessible under `/dev` routes but hidden from navigation (`display: false`). These include experimental features and video production tools.
