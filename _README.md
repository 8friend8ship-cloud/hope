
# Hope Purchase Platform v4.0 - Technical Brief

This document outlines the architecture and core logic of the Hope Purchase Platform v4.0. The application is a dynamic simulation tool designed to generate personalized, narrative-driven reports for users considering significant life changes such as immigration, career shifts, or major financial investments.

## 1. Core Features

The platform is built around a set of key features that work together to deliver a rich, interactive, and persistent user experience.

### Dynamic Scenario Generation
The system generates unique, personalized scenarios by merging user-specific inputs with a robust, template-based narrative structure. Instead of creating thousands of static report variations, the platform uses a handful of high-quality, master templates (including a highly flexible default template) that are dynamically populated at runtime.

- **Inputs**: The engine processes `country`, `age`, `job`, `starting point`, `goal`, and `duration`.
- **Outputs**: It produces a comprehensive `StoryResult` object containing a multi-stage simulation report, financial analysis, and a critical essay.

### Simulation Report
The primary output is a detailed report that visualizes the user's potential future. It includes:
- A multi-stage timeline detailing potential successes and failures.
- A financial comparison table (`before` vs. `after`).
- An AI-calculated probability of success.
- Actionable next steps for further research.

### "Dry Author" Essay & Monetization
Each report is paired with a critical essay that serves as a realistic, often cynical, counter-narrative to the user's plans. 
- **Content**: The essay is dynamically populated with user inputs to maintain relevance.
- **Engagement Gate**: The full essay body is hidden by default. Users must perform an action (simulated as watching a video ad) to unlock and read the full content, providing a clear point for future monetization or engagement hooks.

### PDF Export Functionality
Users can download a beautifully formatted PDF of their full simulation report for offline viewing or sharing. This is achieved by rendering the report component onto an HTML canvas and converting it to a PDF document on the client side.

### Persistent Template & Data Store
The application uses `localStorage` to provide a persistent experience. 
- **Data Saved**: All scenario templates and the database of random examples are stored in the user's browser.
- **Admin Panel**: A hidden admin dashboard allows for the creation, editing, and deletion of scenario templates in real-time. These changes are saved to `localStorage` and persist across browser sessions, enabling deep customization without requiring a backend.

## 2. System Architecture & Logic Flow

The application operates entirely on the client side, leveraging a combination of static data assets and dynamic generation logic.

### Data Layer (`constants.ts`)
- **`GLOBAL_100`**: A JavaScript object serving as a master dataset. It contains structured, country-specific information (currency, average salary, visa info, etc.) for approximately 100 country profiles.
- **`DEFAULT_TEMPLATES`**: An array of master `ScenarioTemplate` objects. This includes highly specific templates (e.g., "Singapore to Portugal") and a crucial, generalized `template_default` that serves as a fallback for any non-specific user query.

### State Management & Persistence (`App.tsx`)
- The root `App` component manages the application's global state using React's `useState` hook.
- On initial load, the `db` (random examples) and `templates` state are hydrated from `localStorage`. If no data exists in storage, it falls back to the static assets from `constants.ts`.
- A `useEffect` hook monitors changes to `db` and `templates` and automatically persists the updated state back to `localStorage`, ensuring any admin edits are saved.

### The `generateStory` Logic (`App.tsx`)
This is the core function of the application. The generation process follows these steps:
1.  **Input Reception**: Receives the parsed `UserInput` object.
2.  **Country Detection**: The `detectCountry` utility analyzes the user's 'goal' string to match it against the `GLOBAL_100` dataset, falling back to `'default'` if no match is found.
3.  **Template Selection**: A cascading logic is applied to find the best `ScenarioTemplate`:
    a. It first checks for highly specific keyword matches (e.g., "Portugal", "Bali", "Gangnam").
    b. If no specific match is found, it attempts to match based on general tags.
    c. If still no match is found, it **crucially selects the `template_default`** to ensure a relevant experience for any query.
4.  **Dynamic Injection**: An `inject` helper function iterates through the selected template's strings (titles, situations, essay text, etc.) and replaces placeholders like `{age}`, `{goal}`, and `{currency}` with the user's input and the relevant country data.
5.  **Result Compilation**: All dynamically populated data is assembled into a final `StoryResult` object, which is then passed to the rendering components.

### Rendering Layer (`components/`)
- **`InputForm.tsx`**: Captures and parses the user's free-form text input into a structured `UserInput` object.
- **`ResultSection.tsx`**: Receives the `StoryResult` object as a prop. It is responsible for rendering all parts of the report, including the timeline, tables, and the gated "Dry Author" essay. It also contains the logic for the ad-to-unlock feature.
- **`AdminDashboard.tsx`**: Provides a UI for live editing of the `templates` and `db.randomSamples` state, which is then saved via the persistence logic in `App.tsx`.
