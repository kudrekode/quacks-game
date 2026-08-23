# Asset Policy

All files under `preDocs` are research references only. Do not ship, trace, crop, recolor, vectorize, texture-sample, or otherwise derive production assets from the commercial boards, cards, books, tokens, characters, typography, or ornament.

Production may use original SVG/CSS/procedural assets: geometric token medallions; unique abstract symbols and patterns per ingredient; an original spiral track computed from layout data; original ruby, flask, droplet, rat, market, and die icons; generated paper/glass/brass textures; and original UI illustration. Mechanical color categories and numeric denominations may be retained because they convey rules, but shape/pattern must also distinguish them.

Permitted direction: historical apothecary, alchemy laboratory, potion glass, brass instruments, parchment ledgers, wood workbench, and European market atmosphere. Prohibited direction: matching the supplied composition, characters, book illustrations, board silhouette/details, icon poses, lettering, or decorative motifs closely enough to be mistaken for official art.

Every asset needs a source record: creator/tool, date, license, prompt or design brief, editable source path, and proof it did not incorporate a `preDocs` image. Third-party fonts/icons/textures require redistribution-compatible licenses and attribution where required. AI-generated assets must be checked for logos, signatures, near-copying, and accessibility.

Temporary PDF renders/crops used for rules inspection belong under `tmp/` and must never enter builds or releases. CI should fail if imports or public assets reference `preDocs/` or `tmp/`.
