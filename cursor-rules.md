# README Structure Rules

This document defines the canonical README structure used across projects in this repository. It is written as instructions for an AI assistant (Claude, Cursor, or equivalent) to follow when creating or rewriting a README.

## Purpose

These rules exist to ensure every project README is:
- Immediately scannable (tables and bold terms, no walls of prose)
- Technically accurate without being a tutorial
- Consistent in section order and naming conventions
- Free of diagrams that require special renderers (no Mermaid)

---

## Section Order and Rules

Follow this section order exactly. Omit a section only if it genuinely does not apply to the project (e.g., no localization = no Localization section). Do not add sections not in this list without explicit instruction.

### 1. Title, Badges, and Tagline

```
# Project Name

<div align="center">
    <img src="https://img.shields.io/badge/Framework-Version-color?style=for-the-badge&logo=logo-slug" alt="Label" />
    ...
</div>

<p align="center">
    <i>One sentence describing what the project does and what makes it distinct.</i>
</p>
```

**Rules:**
- The title must match the brand name of the project, not a generic descriptor (e.g., use "Lumina", not "IOTA NFT Platform").
- The badges block goes immediately after the title. Use `shields.io` with `style=for-the-badge`.
- Include 6-10 badges covering the most recognizable technologies. Badge format: `Label-Version-HexColor?style=for-the-badge&logo=simple-icons-slug`.
- Use official brand colors when available. If a logo slug does not exist on simple-icons, omit the `logo` param and use a representative color.
- The tagline goes in a `<p align="center"><i>...</i></p>` block after the badges. One sentence, factual, no marketing copy.
- Do NOT use a `**Tech Stack**:` inline line — the badges serve that purpose.

### 3. Domain-Specific Concept Sections

Sections that explain the core model of the project: what types of things it has, how they are categorized, and what differentiates them.

**Rules:**
- Section names are descriptive noun phrases (e.g., "NFT Collections", "Game Modes", "Subscription Plans").
- Use a **table** whenever comparing two or more entities across the same set of attributes.
- Table columns = attributes; rows = entities.
- Avoid numbered subsections (### 1. Name, ### 2. Name) for comparative content — use a table instead.
- Brief prose before the table is allowed to introduce the concept (2-4 sentences max).
- Multiple sections of this type are allowed, one per major domain concept.

**When to use a table vs. a bullet list:**
- Table: comparing N items across M shared attributes (N >= 2, M >= 2)
- Bullet list: listing capabilities, steps, or items that do not share a common attribute schema
- Never use a bullet list where a table would be more compact and equally readable

### 4. Feature-Specific Sections

One section per major feature or subsystem (e.g., "NFT Generator", "Minting Model", "API Endpoints").

**Rules:**
- Lead with 2-4 sentences of prose explaining the design decision or purpose, then use a table or bullets for detail.
- Describe what the system does, not how to reproduce it. No step-by-step tutorials or implementation deep-dives.
- Technical specifics (function names, file paths, variable names) are allowed and encouraged as reference material.
- Sequence diagrams (Mermaid or otherwise) are prohibited. Replace with prose and a component/step table.

### 5. System Architecture

```
## System Architecture

| Component | Role |
|---|---|
| **Component Name** | What it does in one sentence |
```

**Rules:**
- Always a two-column table: Component and Role.
- Bold the component name in the left column.
- Cover every major architectural layer: frontend, backend/API, database or storage, auth, blockchain/external services, notable internal engines.
- Role descriptions are one sentence maximum.

### 6. Technology Stack

```
## Technology Stack

- **Category**: Library/Framework version, other tools in same category
```

**Rules:**
- Bullet list with bolded category labels.
- Categories to include (only relevant ones): Frontend, Backend/API, Blockchain, Authentication, Storage, State Management, Forms, Testing, Deployment.
- Include version numbers for primary frameworks/runtimes.
- More detailed than the inline Tech Stack summary at the top.

### 7. Key Features

```
## Key Features

1. **Feature name** — one sentence describing the user-facing value or technical distinction
```

**Rules:**
- Always a numbered list.
- 5-10 items maximum.
- Each item: bold feature name, em dash, one sentence of value-focused description.
- Order from most differentiated/impressive to most expected.
- Do not repeat items from other sections verbatim — this is a highlights reel.

### 8. Testing Strategy

**Rules:**
- 2-5 sentences describing what is tested and how.
- Include: unit/integration test framework if present, test fixtures, how blockchain/external contracts are verified.
- If no formal test suite exists, describe the manual or exploratory strategy. Do not skip this section.

### 9. Localization (conditional)

Include only if the project has multi-language support. 2-4 sentences on the approach.

### 10. Project Setup

**Rules:**
- Start with dependency installation.
- Include an env vars code block (language: `env`) with all required variables and placeholder values.
- Use inline `# comments` in the env block to group variables by category; do not explain each in prose.
- Include the dev server start command.
- Add extra steps (e.g., smart contract deployment) after the main steps.
- End the README with a one-line "Built for X" footer after a horizontal rule (`---`).

---

## Formatting Conventions

- **Bold key terms** on first use in a section — technology names, feature names, component names.
- Use `backtick` formatting for: file paths, function names, variable names, CLI commands, package names.
- Section headers are title-cased noun phrases. Do not use verb phrases ("How to Mint" -> "Minting Model").
- No emoji in headings or prose.
- No horizontal rules between sections except the final footer rule.
- Tables: always include a header row, use `---` separators, keep cell content to one sentence or short phrase.

---

## What to Avoid

- **Mermaid diagrams** — replace with prose and tables
- **Step-by-step deep dives** — README is a reference, not a tutorial
- **Generic project titles** — always use the brand name
- **Verbose prose without structure** — any section with more than 4 sentences of prose and no table/list is too long
- **Duplicate information** — Key Features should not repeat exact wording from other sections
- **Marketing language** — "powerful", "cutting-edge", "seamless" are filler; describe capabilities factually
- **Skipping Testing Strategy** — every project has a testing approach; document it

---

## Blank Template

Copy and fill in this template when creating a new README from scratch.

```markdown
# Project Name

<div align="center">
    <img src="https://img.shields.io/badge/Framework-Version-color?style=for-the-badge&logo=logo-slug" alt="Framework" />
    <img src="https://img.shields.io/badge/Runtime-Version-color?style=for-the-badge&logo=logo-slug" alt="Runtime" />
    <img src="https://img.shields.io/badge/Database-Name-color?style=for-the-badge&logo=logo-slug" alt="Database" />
    <img src="https://img.shields.io/badge/Auth-Method-color?style=for-the-badge" alt="Auth" />
    <img src="https://img.shields.io/badge/Deployment-Platform-black?style=for-the-badge&logo=logo-slug" alt="Deployment" />
</div>

<p align="center">
    <i>One-sentence description of what the project does and what makes it distinct.</i>
</p>

## [Core Domain Concept — e.g., "Game Modes" or "NFT Collections"]

Brief intro to the domain concept (2-3 sentences).

| Entity | Attribute 1 | Attribute 2 | Attribute 3 |
|---|---|---|---|
| **Name** | value | value | value |
| **Name** | value | value | value |

## [Feature Section 1 — e.g., "Generator" or "Matching System"]

Brief explanation of the feature and its design rationale (2-4 sentences).

| Column A | Column B |
|---|---|
| item | description |

## [Feature Section 2 — e.g., "Minting Model" or "Ranking System"]

Brief explanation. Include notable technical specifics (function names, file paths).

| Column A | Column B |
|---|---|
| item | description |

## System Architecture

| Component | Role |
|---|---|
| **Component** | What it does |
| **Component** | What it does |

## Technology Stack

- **Frontend**: Framework vX, library, library
- **Backend**: Language/runtime, framework
- **Database / Storage**: Tool or service
- **Authentication**: Method or library
- **Deployment**: Platform

## Key Features

1. **Feature name** — value proposition in one sentence
2. **Feature name** — value proposition in one sentence
3. **Feature name** — value proposition in one sentence

## Testing Strategy

Describe how the project is tested (2-4 sentences).

## Project Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local`:

   ```env
   # Category
   VAR_NAME=placeholder_value
   VAR_NAME=placeholder_value
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Visit `http://localhost:3000`

---

Built for [Platform / Ecosystem].
```
