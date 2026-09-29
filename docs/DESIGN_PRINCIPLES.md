# Design principles

How Tsela's four surfaces (marketing, rider, operations, developer portal) are meant to look and feel, and the checklist we hold them to. The checklist comes from published research on why interfaces read as machine-made; the sources are at the end. Run it against every screen before merging UI.

## Direction

**Product first, like the [Android Developers](https://developer.android.com/studio) site.** The real product is the hero, not a decoration around it. Structure comes from a neutral white and near-black canvas, one blue for actions and links, one green for Tsela itself, thin borders instead of shadows, outlined pill buttons, tabs, plain tables, and real screenshots in bordered frames. The rider app follows Material conventions (navigation rail on desktop, bottom bar with a pill indicator on phones) because most riders are likely on Android; the operations app and portal follow the same system in a denser register.

**Tsela's own voice comes from three things**, not from effects: real Gaborone content (place names, real routes, honest verification state), procedurally-generated ink drawings used sparingly with green as the spot colour, and plain, specific copy. The drawings are honestly described as generated (a seeded, deterministic program, not a person and not an image model) — never claimed as literally hand-drawn.

**Every page picks its own layout.** The Android Developers site never reuses one hero template: [the Studio page](https://developer.android.com/studio) is a dark band with a real screenshot, [the multidevice page](https://developer.android.com/multidevice) is a white hero that opens into a tinted band below it, [the UI design overview](https://developer.android.com/design/ui) is centred with one text link over a large tinted panel, and [the widgets page](https://developer.android.com/design/ui/widget) is a split hero with real screenshots bleeding to the frame edge and two buttons, one filled and one outlined. A content page's hero is chosen for what that page is about, not copied from the last one: a product page can take a tinted band, an about page can be plain text with no illustration at all, and a reference page can lead with a real code sample instead of art. Reusing the same kicker-plus-headline-plus-icon block on every inner page is itself a tell.

## The checklist

Each item is a pattern that signals "generated", and what we do instead.

### Type
- [ ] **No unchosen default font.** Titles use one deliberate display face; body copy uses the system font (no download, native on every phone). Never Inter-everywhere.
- [ ] **No overused pairings** (Space Grotesk, Instrument Serif, Geist) and **no italic serif accent word** in a headline.
- [ ] **No all-caps section labels** or letter-spaced kickers. Sentence case only.
- [ ] Weights are limited to regular, medium, and one bold for titles. Real hierarchy (size and weight), not decoration.

### Colour
- [ ] **No purple-to-indigo gradient, no lavender default, no neon glow, no bright cyan on dark.**
- [ ] **No cream or beige as a stand-in for a considered palette.** The canvas is white and light grey; colour is used for meaning.
- [ ] **No permanent dark mode** with grey body text; dark mode only where it is chosen and passes contrast.
- [ ] **No gradients on buttons, text, or backgrounds.** Flat fills. Contrast meets WCAG AA everywhere.
- [ ] Every colour has a job: blue = act or follow, green = Tsela and verified, red/amber = problems, route colours = data only.

### Layout
- [ ] **No centred full-width hero with a gradient**, no badge or pill above the headline, no floating chips around the art.
- [ ] **No row of three identical cards with a thin icon on top**, no icon-grid "feature section", no repeated card grids that give every point the same weight. Use asymmetry and varied rhythm; one layout primitive, used on purpose.
- [ ] **No numbered "1, 2, 3" step blocks** and **no stat banner or hero-metric row** (a huge number with a small label). Numbers appear inside the content they belong to, ideally in a table.
- [ ] **No testimonial carousels, marquees, or auto-scrolling anything.**
- [ ] **No cards inside cards** ("cardocalypse"), **no coloured side-border cards**, and no border on every element.
- [ ] Lead with a real screenshot. Prefer tables and lists for data.

### Components and effects
- [ ] **No glassmorphism, blur, glow, or large coloured shadows.** Surfaces separate with a 1px border; shadow is reserved for things that float (menus, dialogs).
- [ ] **No extreme corner radii.** Cards 12 to 16px, buttons pill-shaped as in Material, inputs 8px.
- [ ] **No massive decorative icon tiles.** Icons are 20 to 24px, outlined, and only where they aid scanning. No emoji as icons.
- [ ] **No pulsing status dots, bouncing or wiggling icons, or decorative blinking cursors.** Motion is short (150 to 200ms), eased, and explains a change.
- [ ] Buttons look pressable through size and colour, not through inner shadows.

### Copy
- [ ] **Say something only Tsela could say.** No "supercharge", "world-class", "seamless", "unlock".
- [ ] **No em-dash habit**, no forced contrast ("not X, but Y" in every line), no calling things "theatre".
- [ ] Specific over abstract: name the place, the route, the number.

### Imagery
- [ ] **No placeholder-style art** built from generic circles and blocks. Drawings are specific (a real combi, a real stop), imperfect on purpose, and few. Photography and screenshots are real.
- [ ] Craft cues are welcome where they mean something: sketch-like line wobble, off-register spot colour, visible line variation, slight imperfection. Never as decoration on every surface, and never captioned as hand-drawn when it is generated.

### Process
- [ ] Decisions are written down once, in `design/tokens.css` and this file, and every surface reads them. Silence in the system produces the average of the web.
- [ ] Review every new screen against this list, in light and dark where dark exists, on a phone and on a desktop.

## Tokens

The values live in [design/tokens.css](../design/tokens.css) and are copied into each app by `node design/sync.mjs`, which CI checks for drift. See the file's header for the contrast figures.

## Sources

- [Impeccable: the missing design vocabulary for agents](https://impeccable.style/slop/) (24 named anti-patterns)
- [AI Design Slop: 16 Patterns That Out Your App as Vibe-Coded](https://www.developersdigest.tech/blog/ai-design-slop-and-how-to-spot-it), Developers Digest
- [AI Slop Fonts and Gradients: The Tells That Give Away AI Design](https://www.925studios.co/blog/ai-slop-design-tells), 925 Studios
- [AI Slop Web Design: Complete Guide to Spotting and Fixing Generic Websites](https://www.925studios.co/blog/ai-slop-web-design-guide), 925 Studios
- [How to Avoid AI Slop When Using Claude Design (The Design System Approach)](https://www.mindstudio.ai/blog/claude-design-avoid-ai-slop-design-system), MindStudio
- [Why Every AI-Built Website Looks the Same (Blame Tailwind's Indigo-500)](https://dev.to/alanwest/why-every-ai-built-website-looks-the-same-blame-tailwinds-indigo-500-3h2p), DEV Community
- [How to Avoid AI Slop in Web Design](https://www.wpbeaverbuilder.com/avoid-ai-slop-in-web-design/), Beaver Builder
- [Avoiding AI slop: 7 prompt techniques to stop your interfaces from looking generic](https://ui-ux-pro-max-skill.com/blog/avoiding-ai-slop/)
- [Real AI Design Workflow: How to Avoid AI Slop](https://sergeichyrkov.com/blog/real-ai-design-workflow-avoid-ai-slop), Sergei Chyrkov
- [How to Design Anti-AI Aesthetics Without Traditional Skills](https://www.illustration.app/blog/how-to-design-anti-ai-aesthetics-without-traditional-skills)
- [Proof of Hand: Why Designers Are Reaching for Imperfection in 2026](https://studio2am.co/blogs/news/proof-of-hand-why-designers-are-reaching-for-imperfection-in-2026), Studio 2AM
- [Anti-AI Crafting: The Handmade Rebellion Reshaping Design in 2026](https://designmagazine.com.au/anti-ai-crafting-the-50-million-handmade-rebellion-reshaping-design-in-2026/), Design Magazine
- [Android Developers: Android Studio](https://developer.android.com/studio), the visual reference for structure and tone
- [Android Developers: Multidevice](https://developer.android.com/multidevice), [Design for Android](https://developer.android.com/design/ui) and [Widgets on Android](https://developer.android.com/design/ui/widget), the reference for varying a page's hero by what it's about
