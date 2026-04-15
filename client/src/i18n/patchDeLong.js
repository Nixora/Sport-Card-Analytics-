/** German long-form copy layered on top of mergeDeep(en, euCore.de). */
export const patchDeLong = {
  faq: {
    helmetDescription: "Häufige Fragen zu Nixsora — Marktplatz, Daten, Alarme, Premium und Support.",
    title: "Häufig gestellte Fragen",
    lede: "Kurze Antworten zum Marktplatz, zu Preisen, Alarmen und Ihrem Konto. Rechtliches in der Datenschutzerklärung; persönliche Hilfe über Kontakt.",
    jumpLabel: "FAQ-Bereiche",
    bannerText: "Bleiben Sie mit Alarmen vorn, wenn neue Angebote Ihre Kriterien treffen.",
    heroAlt: "Marktplatzvergleich und Kartenlistings in Nixsora.",
    footerStill: "Immer noch unsicher?",
    footerSend: "Nachricht senden",
    footerOrAsk: "oder fragen in der",
    footerEnd: ".",
    sections: [
      {
        id: "marketplace",
        title: "Marktplatz & Suche",
        items: [
          {
            q: "Was ist der Marktplatz?",
            a: "Hier durchsuchen Sie Karten aus Ihrer Import-Stichprobe, vergleichen Angebotspreise über Quellen und öffnen Detailseiten für Trends und Filter. Kein Warenkorb — wir zeigen Analysen, keinen Live-Checkout bei Verkäufern.",
          },
          {
            q: "Warum weichen Preise von eBay oder Auktionshäusern ab?",
            a: "Angebote ändern sich ständig. Nixsora spiegelt Ihre importierten Daten und den letzten Stand. Mediane hängen von Abfrage, Filtern und Ingest — nicht überall Echtzeit-Verkaufspreise.",
          },
          {
            q: "Kann ich dieselbe Karte über mehrere Marktplätze vergleichen?",
            a: "Ja, das ist die Idee. Nutzen Sie Filter und Vergleichsansichten. Die Abdeckung hängt von verbundenen Quellen und normalisierten Karten-Keys ab.",
          },
        ],
      },
      {
        id: "data",
        title: "Daten & Genauigkeit",
        items: [
          {
            q: "Ist das Anlageberatung?",
            a: "Nein. Diagramme und Alarme sind informativ. Märkte sind volatil — eigene Recherche vor Kauf/Verkauf.",
          },
          {
            q: "Was bedeutet „Median-Angebot“ hier?",
            a: "Typischerweise der Median der Angebotspreise aus Ihrer aktuellen Stichprobe, kein garantierter FMV für verkaufte Karten. Bezeichnungen können sich ändern.",
          },
          {
            q: "Sind Sie mit eBay oder anderen Marktplätzen verbunden?",
            a: "Nein. Nixsora ist unabhängig. Wir können öffentliche Listingsdaten gemäß Ihrer Konfiguration zeigen, ohne Billigung der Plattformen.",
          },
        ],
      },
      {
        id: "alerts",
        title: "Alarme & Premium",
        items: [
          {
            q: "Wie funktionieren Preisalarme?",
            a: "Sie setzen Schwellen oder gespeicherte Suchen. Bei Treffern benachrichtigen wir per E-Mail oder in der App — je nach Plan und Einstellungen.",
          },
          {
            q: "Was ist Premium?",
            a: "Eine geplante Stufe mit mehr Alarmen, Historie und Team-Plätzen. Die Preisseite zeigt Platzhalter, bis Billing live ist.",
          },
        ],
      },
      {
        id: "account",
        title: "Konto, Datenschutz & Support",
        items: [
          {
            q: "Wie ändere ich Profil oder Passwort?",
            a: "Öffnen Sie „Profil“ in der Kopfzeile. Dort Anzeigename, Tags oder Avatar — Passwort gemäß den Auth-Einstellungen Ihrer Umgebung.",
          },
          {
            q: "Wo ist die Datenschutzerklärung?",
            aBefore: "Siehe unsere ",
            aLinkPrivacy: "Datenschutzerklärung",
            aAfter: " zu personenbezogenen Daten.",
          },
          {
            q: "Wen kontaktiere ich bei Hilfe?",
            aBefore: "Besuchen Sie ",
            aLinkContact: "Kontakt",
            aAfter: " für E-Mail und Formular oder die dort angegebene Support-Adresse.",
          },
        ],
      },
    ],
  },
  privacy: {
    helmetDescription: "Wie Nixsora Informationen erhebt, nutzt und schützt.",
    title: "Datenschutzerklärung",
    lastUpdated: "Zuletzt aktualisiert: {{date}}",
    updatedDate: "11. April 2026",
    lede: "Diese Seite erklärt, welche Daten wir sammeln, warum, und welche Wahlmöglichkeiten Sie haben. Vorlage — juristisch prüfen vor Compliance-Verlassen.",
    highlightsLabel: "Kernaussagen",
    hi1: "Kein Verkauf personenbezogener Daten",
    hi2: "Konto- und Nutzungsdaten unten beschrieben",
    hi3: "Kontakt bei Datenschutzfragen",
    heroAlt: "Analytics-Oberfläche mit Diagrammen zur Verarbeitung von Marktdaten.",
    backHome: "Zurück zur Startseite",
    sections: [
      {
        title: "Wer wir sind",
        imageAlt: "Team am Laptop, Nixsora.",
        body: [
          "Nixsora („wir“) bietet Marktplatz-Analysen, Alarme und Community. Diese Erklärung beschreibt den Umgang mit Informationen bei Nutzung der Website und Dienste.",
        ],
      },
      {
        title: "Welche Daten wir erheben",
        imageAlt: "Recherche und gesammelte Informationen.",
        body: [
          "Kontodaten wie E-Mail und Anzeigename bei Registrierung oder Profil-Update.",
          "Nutzungsdaten zum Betrieb, z. B. Gerät- und Log-Informationen (Seitenaufrufe, Diagnose).",
          "Inhalte, die Sie in Community oder Support einreichen.",
        ],
      },
      {
        title: "Wie wir Daten nutzen",
        imageAlt: "Dashboard und Diagramme zur Produktnutzung.",
        body: [
          "Bereitstellung, Absicherung und Verbesserung — inkl. Personalisierung von Charts, Alarmen und Community nach Opt-in.",
          "Kommunikation zu Konto, Updates oder Support.",
          "Erfüllung rechtlicher Pflichten und Schutz von Nutzern und Plattform.",
        ],
      },
      {
        title: "Weitergabe",
        imageAlt: "Community und geteilte Inhalte.",
        body: [
          "Wir verkaufen keine personenbezogenen Daten. Weitergabe an Auftragsverarbeiter unter Vertraulichkeit oder wenn das Gesetz es verlangt.",
          "Öffentliche Profilfelder oder Community-Beiträge können für andere Nutzer sichtbar sein.",
        ],
      },
      {
        title: "Aufbewahrung & Sicherheit",
        imageAlt: "Graded Card im Case.",
        body: [
          "Daten nur so lange wie nötig, sofern nicht längere gesetzliche Fristen gelten.",
          "Angemessene technische und organisatorische Maßnahmen — keine absolute Sicherheit bei Internetübertragung.",
        ],
      },
      {
        title: "Ihre Wahlmöglichkeiten",
        imageAlt: "Benachrichtigungs-Steuerung in der Oberfläche.",
        body: [
          "Profilinformationen in den Kontoeinstellungen bearbeiten, wo verfügbar.",
          "Kontakt zu Fragen oder zur Ausübung von Rechten in Ihrer Jurisdiktion.",
        ],
      },
      {
        title: "Kontakt",
        imageAlt: "Marktplatzvergleich in Nixsora.",
        body: [
          "Datenschutz: support@example.com (vor Launch durch Produktionsadresse ersetzen).",
          "Wir können diese Erklärung aktualisieren — das Datum „Zuletzt aktualisiert“ ändert sich dann.",
        ],
      },
    ],
  },
  dashboard: {
    helmetTitle: "Sports Card Analytics",
    helmetDescription:
      "Vergleichen Sie Preise über Marktplätze. Analysen, Alarme, Grading-Einblicke und Community — mit Nixsora.",
    hero: {
      l1: "Sports Cards",
      l2: "Analytics",
      sub: "Marktplätze vergleichen, Trends lesen und mit Daten entscheiden — nicht raten.",
      getStarted: "Loslegen",
      learnMore: "Mehr erfahren",
      exploreLink: "Über uns ↓",
    },
    marketStateTitle: "Aktueller Markt für Sports Cards",
    marketStateLead:
      "Momentaufnahme — was Adoption fördert und was Sammler und Investoren noch bremst.",
    tailwindsKicker: "Rückenwind",
    tailwindsTitle: "Was den Markt antreibt",
    tailwindsSub: "3 Treiber",
    bridge: "Trotz Wachstums gibt es Herausforderungen:",
    headwindsKicker: "Gegenwind",
    headwindsTitle: "Wo Sammler noch kämpfen",
    headwindsSub: "3 typische Schmerzpunkte",
    whySectionTitle: "Warum brauchen wir diese Plattform?",
    whySectionLead: "Sichtbarkeit • Vergleich • Tempo • Modellierung • Portfolio — ohne Textwände.",
    whyCarouselAria: "Warum diese Plattform",
    whyLearnMore: "Mehr erfahren",
    whyPrevSlide: "Vorherige Folie",
    whyNextSlide: "Nächste Folie",
    whySlidesNav: "Folien",
    whyHighlights: "Highlights",
    whySlideStepAria: "Folie {{index}}: {{keyword}}",
    featuresPhaseAria: "Plattform-Schritt {{step}}: {{title}}",
    featuresHeading: "Warum diese Plattform: vom Stöbern zur Überzeugung",
    featuresDek:
      "Angebote vergleichen, das Tape lesen, Alarme setzen, Grading ernst nehmen — und mit Peers verbunden bleiben. Scrollen Sie mit.",
    featuresPlatformKicker: "Plattform",
    featuresPhotoCreditPrefix: "Stockfotos von",
    featuresPhotoCreditSuffix: ".",
    aboutEyebrow: "Über uns",
    aboutTitle: "Für Sammler gebaut, die Klarheit wollen",
    aboutLead:
      "Nixsora hilft Ihnen, Listings zu vergleichen, Preisbewegungen einzuordnen und Ihre Sammlung mit weniger Rauschen zu tracken.",
    aboutCtaCommunity: "Zur Community",
    aboutCtaContact: "Kontakt",
    ABOUT_COMPANY_STATS: [
      { label: "Firma", value: "Nixsora" },
      { label: "Produkt", value: "Sports Card Analytics" },
      { label: "Fokus", value: "Marktvergleich + Portfolio-Analysen" },
      { label: "E-Mail", value: "support@nixsora.com" },
    ],
    aboutMissionKicker: "Unsere Mission",
    aboutMissionTitle: "Sammlern helfen, mit Daten sicher zu entscheiden.",
    aboutMissionBody:
      "Wir bauen Tools, die fragmentierte Listings in nutzbare Insights verwandeln — damit Sie Märkte vergleichen, Zustand & Grading berücksichtigen und Ihre Sammlung ohne Tab-Chaos tracken.",
    aboutMissionBody2:
      "Egal ob erstes Grading oder ernsthaftes Portfolio: Unser Ziel bleibt gleich — die nächste Entscheidung schneller, einfacher und besser begründbar zu machen.",
    aboutQuoteText: "Sammeln ist emotional. Entscheidungen müssen es nicht sein.",
    aboutQuoteBy: "Das Nixsora-Team",
    aboutImageAlt: "Vorschau eines Analytics-Dashboards mit Chart und Kennzahlen.",
    aboutImageCaption: "Ein klarerer Blick auf Bewegung, Comps und Momentum — ohne Rauschen.",
    aboutDiffsKicker: "Unterscheidungsmerkmale",
    aboutDiffsTitle: "Für echte Hobby-Workflows gebaut",
    ABOUT_DIFFS: [
      {
        title: "Vergleich an einem Ort",
        body: "Comps und Marktplatz-Kontext zusammenführen — schneller und fundierter entscheiden.",
      },
      {
        title: "Signal statt Rauschen",
        body: "Fokus auf das, was Entscheidungen bewegt: Preis, Timing, Zustand, Grading und Nachfrage-Kontext.",
      },
      {
        title: "Mit der Community iterieren",
        body: "Wir bauen mit Sammlern — Feedback und schnelle Iteration halten das Produkt nah am Verhalten.",
      },
    ],
    aboutValuesKicker: "Unsere Kultur",
    aboutValuesTitle: "Werte, die unsere Arbeit prägen",
    ABOUT_VALUES: [
      { word: "OFFEN", def: "Wir teilen Wissen, begrüßen Feedback und bleiben neugierig." },
      { word: "PRAGMATISCH", def: "Wir liefern Verbesserungen, die Workflows schnell besser machen." },
      { word: "ENGAGIERT", def: "Wir sind für Nutzer und Team da — und ziehen es durch." },
      { word: "VERBUNDEN", def: "Wir lieben das Hobby und gutes Handwerk beim Bauen." },
      { word: "PROAKTIV", def: "Wir übernehmen Verantwortung und halten Momentum." },
    ],
    aboutTeamKicker: "Unser Team",
    aboutTeamTitle: "Remote-first, sammler-first",
    aboutTeamBody:
      "Wir sind ein verteiltes Team und bauen gemeinsam mit der Community. Remote hilft, starke Talente überall zu gewinnen — und nah an echten Sammler-Workflows zu bleiben.",
    aboutTeamCountriesAria: "Team-Standorte",
    ABOUT_TEAM_COUNTRIES: ["Deutschland", "Frankreich", "UK", "Spanien", "USA", "Nepal", "Kenia", "Rumänien"],
    hubEyebrow: "Gesamte Plattform",
    hubTitle: "Jeden Bereich von Nixsora erkunden",
    hubLead:
      "Oben steht das „Warum“. Unten die Karte zu Marktplatz, Tools, Plänen, Community, Hilfe und Richtlinien — direkt einsteigen.",
    hubOpen: "Öffnen",
    premiumFootnoteBefore: "Steuern können anfallen. Team-Preise mit Vertrieb. Fragen? ",
    ABOUT_POINTS: [
      {
        title: "Wir verbinden Kontext",
        body: "Comps, Trends und Marktplatz-Kontext an einem Ort — Entscheidungen ohne Tab-Chaos.",
      },
      {
        title: "Wir achten auf Details",
        body: "Grading, Zustand und Timing zählen. Der Flow ist für echtes Sammeln und Investieren gebaut.",
      },
      {
        title: "Wir bauen mit dem Hobby",
        body: "Feedback, Community, Iteration — damit das Produkt mit echten Workflows wächst.",
      },
    ],
    MARKET_GROWTH_ROWS: [
      {
        icon: "investors",
        keyword: "Investorennachfrage",
        points: ["Alternativanlage-Framing", "Fokus auf Rarität & Autogramm", "Breiter als nur Hobbykäufer"],
      },
      {
        icon: "marketplaces",
        keyword: "Online-Liquidität",
        points: ["eBay, StockX, Auktionen", "Sichtbarkeit von Preisen", "Nationales / globales Publikum"],
      },
      {
        icon: "grading",
        keyword: "Grading & Vertrauen",
        points: ["PSA, Beckett u. a.", "Standardisiertes Zustandssignal", "Note eng mit Preis gekoppelt"],
      },
    ],
    MARKET_CHALLENGE_ROWS: [
      {
        icon: "fragmented",
        keyword: "Keine zentrale Sicht",
        points: ["Viele Kauf-/Verkaufsorte", "Kein einheitlicher Preisvergleich", "Performance über Marktplätze undurchsichtig"],
      },
      {
        icon: "volatile",
        keyword: "Uneinheitliche Preissignale",
        points: ["Große Spreads je Plattform", "Zustand verändert die Comp", "News & Spielerperformance als Rauschen"],
      },
      {
        icon: "uncertain",
        keyword: "Upside schwer einzuschätzen",
        points: ["Welche Karten laufen?", "Treiber undurchsichtig", "Kurzfristige Schwankungen"],
      },
    ],
    WHY_PLATFORM_CARDS: [
      {
        id: "realtime",
        overline: "Echtzeit-Sicht",
        keyword: "Live-Preise & Trends",
        body: "Neueste Angebote und Kontext — Richtung über Tage und Wochen, damit Sie Bewegungen früh sehen.",
        tags: ["Live-Angebote", "Listentiefe", "Trendkontext"],
        ctaTo: "/marketplace",
      },
      {
        id: "compare",
        overline: "Kontext über Marktplätze",
        keyword: "Dieselbe Karte überall vergleichen",
        body: "Eine Karte, viele Plattformen — klarere Kauf-/Verkaufs-/Pass-Entscheidungen ohne Tab-Chaos.",
        tags: ["Multi-Markt", "Nebeneinander", "Comps"],
        ctaTo: "/marketplace",
      },
      {
        id: "alerts",
        overline: "Voraus sein",
        keyword: "Intelligente Preisalarme",
        body: "Hinweise zu Spikes, Drops oder neuen Comps — Ziele setzen und rechtzeitig handeln.",
        tags: ["Ziele", "Benachrichtigungen", "Preisbewegungen"],
        ctaTo: "/comparison-alert",
      },
      {
        id: "forecast",
        overline: "Modellierung",
        keyword: "Prognosesignale",
        body: "Historie mit Trendmodellierung für vorausschauende Spannen — keine Versprechen, sondern bessere Einordnung.",
        tags: ["Modellierung", "Historie", "Spannen"],
        ctaTo: "/marketplace",
      },
      {
        id: "portfolio",
        overline: "Ihre Sammlung",
        keyword: "Portfolio in einer Ansicht",
        body: "Bestände, Performance und Konzentration — Lücken und Risiko auf einen Blick.",
        tags: ["Bestände", "Performance", "Allokation"],
        ctaTo: "/marketplace",
      },
    ],
    HOME_HUB_TILES: [
      { to: "/marketplace", title: "Marktplatz", blurb: "Karten, Filter und Detailseiten mit Quellenkontext.", glyph: "marketplace" },
      { to: "/comparison-alert", title: "Vergleich & Alarme", blurb: "Ziele setzen und Preisbewegungen rechtzeitig erwischen.", glyph: "alerts" },
      { to: "/seller-analysis", title: "Verkäuferanalyse", blurb: "Aktivität und Muster von Verkäufern einordnen.", glyph: "sellers" },
      { to: "/premium", title: "Preise", blurb: "Starter, Pro und Team vergleichen — Billing folgt.", glyph: "pricing" },
      { to: "/community", title: "Community", blurb: "Artikel, Threads und Recherche mit anderen Sammlern.", glyph: "community" },
      { to: "/#faq", title: "FAQ", blurb: "Antworten zu Daten, Alarmen, Konto und Hilfe.", glyph: "faq" },
      { to: "/privacy-policy", title: "Datenschutz", blurb: "Wie Nixsora mit personenbezogenen Daten umgeht.", glyph: "privacy" },
      { to: "/contact", title: "Kontakt", blurb: "Team per E-Mail oder Formular erreichen.", glyph: "contact" },
    ],
    FEATURE_CARDS: [
      {
        id: "compare",
        title: "Marktplatzvergleich",
        summary: "Dieselbe Karte auf großen Plattformen — weniger Tabs, klarere Comps.",
        bullets: ["Angebots- und Verkaufskontext bündeln.", "Nebeneinander auf großen Marktplätzen.", "Weniger Tab-Chaos."],
        to: "/marketplace",
        cta: "Vergleich öffnen",
      },
      {
        id: "analytics",
        title: "Analysen & Trends",
        summary: "Trend-Kennzahlen und historischer Kontext pro Karte.",
        bullets: ["Trend-Stats und Schlagwörter pro Karte.", "Mover und Listentiefe im Feed.", "Median-Angebote mit Kontext."],
        to: "/marketplace",
        cta: "Karte öffnen",
      },
      {
        id: "alerts",
        title: "Intelligente Alarme",
        summary: "Preisbewegungen nach Ihren Regeln.",
        bullets: ["Ziele für Spikes, Drops, neue Comps.", "Priorisieren, was zuerst pingt.", "Handeln, solange es zählt."],
        to: "/comparison-alert",
        cta: "Alarme setzen",
      },
      {
        id: "grading",
        title: "Grading-Fokus",
        summary: "PSA, BGS und Zusammenhang Note–Liquidität.",
        bullets: ["PSA, BGS und Spreads.", "Raw vs. slabbed auf einem Screen.", "Note und Liquidität zusammen sehen."],
        to: "/marketplace",
        cta: "Karten stöbern",
      },
      {
        id: "community",
        title: "Langfristige Partnerschaft",
        summary: "Geteilte Recherche über einzelne Listings hinaus.",
        bullets: [],
        to: "/community",
        cta: "Community beitreten",
      },
    ],
  },
};
