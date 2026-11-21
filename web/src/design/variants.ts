export interface Swatch { name: string; value: string; usage: string }
export interface FontSpec { role: string; family: string; spec: string; sample: string; css: string }
export interface Variant {
  id: "dossier" | "console" | "people" | "spotlight" | "matrix";
  num: number;
  name: string;
  tagline: string;
  idea: string;
  bestFor: string;
  principles: string[];
  colors: Swatch[];
  fonts: FontSpec[];
  shape: string;
  signature: string[];
  pros: string[];
  cons: string[];
}

export const AUDIENCE = [
  { who: "Staffing & resource managers", how: "Daily, on a laptop, many roles a week", need: "Speed, and certainty about who is actually free" },
  { who: "HR business partners", how: "Weekly, less technical", need: "Plain language and a reason they can repeat to others" },
  { who: "Project leads in decision meetings", how: "Reading shared or projected shortlists", need: "Trade-offs at a glance, evidence on demand" },
];

export const DIAGNOSIS = [
  "No hierarchy: name, fit, availability, badges and chips all speak at the same volume.",
  "Badge inflation: “Hidden match” on every row stops meaning anything.",
  "The requirements panel reads like a settings form and pushes the people below the fold.",
  "Evidence codes like S6 or P1 are developer language, not HR language.",
  "No identity: it looks like a generic admin template, not a product people trust.",
];

export const NON_NEGOTIABLES = [
  "Availability always sits in the same place and is shown with words, never colour alone.",
  "Must-haves covered (3 of 4) comes before the fit %: it is what people actually decide on.",
  "Every claim can be traced to the profile; AI-written text is always labelled.",
  "WCAG AA contrast; every status uses an icon and a word, not only a colour.",
  "Readable when screen-shared or projected: body text ≥ 15px, tabular numbers.",
];

export const VARIANTS: Variant[] = [
  {
    id: "dossier", num: 1, name: "Dossier", tagline: "Editorial calm — reads like a well-written staffing brief",
    idea: "Treat every shortlist like a short consulting memo: serif headlines, generous white space, and a single cobalt accent. Evidence appears as footnotes, the way a careful report cites its sources.",
    bestFor: "Project leads and managers who must defend a staffing decision. It also echoes the case deck’s serif-and-blue look, so the jury will recognise it.",
    principles: ["Write, don’t decorate: one sentence of reasoning beats five badges", "Footnotes, not codes: every claim gets a numbered source", "One accent colour, used only for what you can act on"],
    colors: [
      { name: "paper", value: "#FAF8F4", usage: "Page background" },
      { name: "surface", value: "#FFFFFF", usage: "Cards, the side column" },
      { name: "ink", value: "#1B1B1F", usage: "Headlines and body text" },
      { name: "ink-2", value: "#5A5B61", usage: "Meta lines, captions" },
      { name: "rule", value: "#E6E0D5", usage: "Dividers, card borders" },
      { name: "cobalt", value: "#2346C9", usage: "Primary action, links, footnote numbers" },
      { name: "available", value: "#1D7A4B", usage: "Available now" },
      { name: "soon", value: "#9A5B12", usage: "Free within 3 months, risks" },
      { name: "marker", value: "#FFF1C2", usage: "Highlighter for hidden-talent notes" },
    ],
    fonts: [
      { role: "Display", family: "Newsreader", spec: "40/44 · 600", sample: "Who do you need?", css: "font-family:Newsreader;font-size:40px;line-height:44px;font-weight:600" },
      { role: "Title", family: "Newsreader", spec: "24/30 · 500", sample: "Jorge Salcedo Alonso", css: "font-family:Newsreader;font-size:24px;line-height:30px;font-weight:500" },
      { role: "Body", family: "IBM Plex Sans", spec: "15/24 · 400", sample: "Covers BigQuery and the insurance sector; pipelines are only partly shown.", css: "font-family:'IBM Plex Sans';font-size:15px;line-height:24px" },
      { role: "Label", family: "IBM Plex Sans", spec: "11/16 · 600 · caps", sample: "MUST HAVE", css: "font-family:'IBM Plex Sans';font-size:11px;line-height:16px;font-weight:600;letter-spacing:.08em" },
    ],
    shape: "6px radius · hairline rules instead of shadows · 8px grid",
    signature: ["Footnote citations¹ linking to a Sources list", "Highlighter note for talent found outside the usual team", "Two-column memo: brief on the left, people on the right"],
    pros: ["Instantly trustworthy, low noise", "Explanations become the hero", "Projects well, because the serif headlines carry the eye"],
    cons: ["Less dense: about 5 people per screen", "Serif type may feel “soft” to technical users"],
  },
  {
    id: "console", num: 2, name: "Console", tagline: "Operations grade — dense, fast, keyboard-first",
    idea: "A professional workbench for people who staff dozens of roles a week: a sortable table, a coverage strip per person, and an inspector panel on the right so you never lose your place.",
    bestFor: "Resource managers who live in the tool every day and care about speed over storytelling.",
    principles: ["Everything on one screen: list and detail side by side", "Numbers are data: monospaced, right-aligned, comparable", "Keyboard first: J/K to move, X to select, C to compare"],
    colors: [
      { name: "canvas", value: "#F4F5F7", usage: "App background" },
      { name: "panel", value: "#FFFFFF", usage: "Table, inspector" },
      { name: "rail", value: "#0F1218", usage: "Left navigation rail" },
      { name: "ink", value: "#0E1116", usage: "Primary text" },
      { name: "ink-2", value: "#5B6472", usage: "Secondary text, column headers" },
      { name: "line", value: "#E2E5EA", usage: "Table rules, borders" },
      { name: "indigo", value: "#3651D4", usage: "Selection, primary action, focus" },
      { name: "shown", value: "#1F8A3B", usage: "Requirement shown, available now" },
      { name: "partly", value: "#B45F06", usage: "Partly shown, free within 3 months" },
      { name: "missing", value: "#C92A2A", usage: "Not shown" },
    ],
    fonts: [
      { role: "Heading", family: "Inter", spec: "15/22 · 600", sample: "Data Engineer (GCP / BigQuery)", css: "font-family:Inter;font-size:15px;line-height:22px;font-weight:600" },
      { role: "Body", family: "Inter", spec: "13/20 · 400", sample: "Principal Analytics Engineer · Querétaro", css: "font-family:Inter;font-size:13px;line-height:20px" },
      { role: "Numbers", family: "JetBrains Mono", spec: "13/20 · 500", sample: "83   3/4   16y   34,003", css: "font-family:'JetBrains Mono';font-size:13px;line-height:20px;font-weight:500" },
      { role: "Column", family: "Inter", spec: "11/16 · 500 · caps", sample: "FIT   MUST-HAVES   AVAILABILITY", css: "font-family:Inter;font-size:11px;line-height:16px;font-weight:500;letter-spacing:.06em" },
    ],
    shape: "6px radius · 1px borders · 36px rows · split view",
    signature: ["Coverage strip: one square per must-have in every row", "Inspector panel instead of a pop-up", "Brief shown as editable query tokens in the top bar"],
    pros: ["Highest information density: 10+ people visible", "Fastest for repeat use", "Familiar to people used to Jira/Linear-style tools"],
    cons: ["Less welcoming for occasional HR users", "Weaker storytelling for the pitch"],
  },
  {
    id: "people", num: 3, name: "People", tagline: "Human and warm — people, not records",
    idea: "Put the person first: a face (initials), a name and one plain sentence on why they fit. Warm neutrals, rounded cards and friendly copy make it feel like a talent product, not a database.",
    bestFor: "HR business partners and talent teams, and anyone who uses the tool occasionally and needs to feel confident quickly.",
    principles: ["Talk like a colleague: “Why Jorge?”, not “Match rationale”", "Show what fits and what to check, side by side", "Warmth from colour and shape, never from emoji"],
    colors: [
      { name: "sand", value: "#F6F3EE", usage: "Page background" },
      { name: "card", value: "#FFFFFF", usage: "Person cards" },
      { name: "ink", value: "#1F2328", usage: "Primary text" },
      { name: "ink-2", value: "#626A73", usage: "Secondary text" },
      { name: "line", value: "#EAE4DA", usage: "Card borders" },
      { name: "teal", value: "#0E7C6B", usage: "Primary action, what fits" },
      { name: "teal-soft", value: "#E2F3EF", usage: "Fits background, selected" },
      { name: "clay", value: "#A4541A", usage: "What to check, free soon" },
      { name: "sun", value: "#F2B84B", usage: "“Found in another team” ribbon" },
    ],
    fonts: [
      { role: "Display", family: "Plus Jakarta Sans", spec: "32/40 · 700", sample: "8 people could do this", css: "font-family:'Plus Jakarta Sans';font-size:32px;line-height:40px;font-weight:700" },
      { role: "Name", family: "Plus Jakarta Sans", spec: "17/24 · 700", sample: "Jorge Salcedo Alonso", css: "font-family:'Plus Jakarta Sans';font-size:17px;line-height:24px;font-weight:700" },
      { role: "Body", family: "Plus Jakarta Sans", spec: "15/24 · 400", sample: "Knows BigQuery well and has worked for insurers before.", css: "font-family:'Plus Jakarta Sans';font-size:15px;line-height:24px" },
      { role: "Small", family: "Plus Jakarta Sans", spec: "13/18 · 500", sample: "Free in less than 3 months", css: "font-family:'Plus Jakarta Sans';font-size:13px;line-height:18px;font-weight:500" },
    ],
    shape: "18px cards · pill buttons · soft one-level shadow",
    signature: ["Initials avatars with a stable colour per person", "“Why Jorge?” sentence on every card", "Career timeline in the profile"],
    pros: ["Most approachable for HR", "Strong emotional hook in the pitch: real people, found", "Works well on tablet and phone"],
    cons: ["Cards hold fewer facts than a table", "Comparing more than 3 people needs a separate view"],
  },
  {
    id: "spotlight", num: 4, name: "Spotlight", tagline: "Decision mode — big numbers, one person at a time",
    idea: "A dark, high-contrast stage built for screens on the wall: the funnel tells the story in big numbers, then one candidate at a time takes the stage with their reasoning and evidence.",
    bestFor: "Executive reviews, client presentations and the 3-minute jury demo on a projector.",
    principles: ["Tell the story first: 190,000 → 8 people → why", "One focus per screen; the rest waits on the side", "Contrast you can read from the back of the room"],
    colors: [
      { name: "night", value: "#0A1022", usage: "Page background" },
      { name: "stage", value: "#111A33", usage: "Cards, the focused candidate" },
      { name: "stage-2", value: "#18233F", usage: "Raised elements, hover" },
      { name: "ink", value: "#F2F5FF", usage: "Primary text" },
      { name: "ink-2", value: "#A6B0CF", usage: "Secondary text" },
      { name: "line", value: "#25305A", usage: "Borders" },
      { name: "signal", value: "#6E98FF", usage: "Primary action, key numbers" },
      { name: "mint", value: "#41D89A", usage: "Shown, available now" },
      { name: "amber", value: "#FFB547", usage: "Partly shown, free soon" },
    ],
    fonts: [
      { role: "Numbers", family: "Space Grotesk", spec: "64/64 · 600", sample: "34,003", css: "font-family:'Space Grotesk';font-size:64px;line-height:64px;font-weight:600" },
      { role: "Title", family: "Space Grotesk", spec: "36/42 · 600", sample: "Jorge Salcedo Alonso", css: "font-family:'Space Grotesk';font-size:36px;line-height:42px;font-weight:600" },
      { role: "Body", family: "Inter", spec: "18/28 · 400", sample: "Covers BigQuery and insurance; pipelines only partly shown.", css: "font-family:Inter;font-size:18px;line-height:28px" },
      { role: "Label", family: "Inter", spec: "12/16 · 600 · caps", sample: "FOUND OUTSIDE THE USUAL TEAM", css: "font-family:Inter;font-size:12px;line-height:16px;font-weight:600;letter-spacing:.1em" },
    ],
    shape: "14px radius · no shadows on dark, depth by surface steps",
    signature: ["Story strip: the funnel in giant numerals", "Stage + queue: one candidate in focus, runners-up in a side list", "Fit ring with must-haves inside"],
    pros: ["Best pitch and demo impact", "Readable on any projector", "Very clear narrative"],
    cons: ["Too dramatic for daily HR work", "Dark UI tires some users over long sessions"],
  },
  {
    id: "matrix", num: 5, name: "Coverage Map", tagline: "Matrix-first — trade-offs are the interface",
    idea: "Requirements down the side, people across the top, evidence in the cells. Comparing is no longer a separate step: you see at a glance who covers what, and you click any cell for the proof.",
    bestFor: "Decision meetings and NTT’s “build a team” challenge, where the question is “which combination covers everything?”.",
    principles: ["The grid is the answer: rows are needs, columns are people", "Black for evidence, grey for partial, empty for missing", "One signal colour, orange, only for talent found outside the usual team"],
    colors: [
      { name: "white", value: "#FFFFFF", usage: "Page and cells" },
      { name: "ink", value: "#111111", usage: "Text, strong evidence dot" },
      { name: "ink-2", value: "#6B6B6B", usage: "Secondary text, partial dot" },
      { name: "grid", value: "#E6E6E6", usage: "Grid lines" },
      { name: "wash", value: "#F5F5F4", usage: "Must-have row band, headers" },
      { name: "signal", value: "#FF4F12", usage: "Hidden-talent marker (graphics only)" },
      { name: "signal-ink", value: "#C2380A", usage: "Hidden-talent text" },
      { name: "available", value: "#0F7A55", usage: "Available now" },
      { name: "soon", value: "#A35A00", usage: "Free within 3 months" },
    ],
    fonts: [
      { role: "Display", family: "Inter Tight", spec: "28/32 · 600", sample: "Who covers what", css: "font-family:'Inter Tight';font-size:28px;line-height:32px;font-weight:600" },
      { role: "Header", family: "Inter Tight", spec: "14/18 · 600", sample: "Jorge Salcedo", css: "font-family:'Inter Tight';font-size:14px;line-height:18px;font-weight:600" },
      { role: "Cell", family: "Inter Tight", spec: "12/16 · 400", sample: "BigQuery · 4/5 · 16 yrs", css: "font-family:'Inter Tight';font-size:12px;line-height:16px" },
      { role: "Numbers", family: "IBM Plex Mono", spec: "13/16 · 500", sample: "83  81  81  81  80", css: "font-family:'IBM Plex Mono';font-size:13px;line-height:16px;font-weight:500" },
    ],
    shape: "0 radius · strict 1px grid · Swiss alignment",
    signature: ["Requirements × people matrix as the main screen", "Orange corner tick for hidden-talent columns", "Team mode: roles × people with zero overlaps"],
    pros: ["Directly answers “compare candidates” and “build a team”", "Most distinctive among the teams", "Scales to multi-role teams naturally"],
    cons: ["Needs a moment to learn", "Long requirement lists need scrolling"],
  },
];
