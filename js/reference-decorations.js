(function () {
  const references = [
    "bacurinha.png",
    "beatles.png",
    "controle-n64.png",
    "friends.png",
    "impala-supernatural.png",
    "musica.png",
    "nossa-senhora-de-fatima.png",
    "terco.png",
    "the-office.png"
  ];

  const isAdminLogin = document.body.classList.contains("admin-login-page");
  const usesReferenceRails = document.body.classList.contains(
    "site-reference-rails",
  );

  if (usesReferenceRails) {
    if (window.matchMedia("(max-width: 1439px)").matches) {
      renderMobileReferenceAccent();
    } else {
      renderReferenceRails();
    }

    return;
  }

  const count = isAdminLogin ? 12 : 15;
  const layer = document.createElement("div");

  layer.className = "login-watermark-layer";
  layer.setAttribute("aria-hidden", "true");

  const shuffledReferences = [...references].sort(() => Math.random() - 0.5);
  const pickedReferences = Array.from({ length: count }, (_, index) => {
    return shuffledReferences[index % shuffledReferences.length];
  });
  const positions = getDistributedPositions(count, isAdminLogin);

  pickedReferences.forEach((name, index) => {
    const image = document.createElement("img");
    const size = randomBetween(
      isAdminLogin ? 86 : 96,
      isAdminLogin ? 158 : 190,
    );
    const position = positions[index];

    image.src = getReferencePath(name);
    image.alt = "";
    image.className = "login-watermark";
    image.style.width = `${size}px`;
    image.style.left = `${position.left}%`;
    image.style.top = `${position.top}%`;
    image.style.setProperty("--rotation", `${randomBetween(-28, 28)}deg`);
    image.style.setProperty("--delay", `${index * 0.08}s`);

    layer.appendChild(image);
  });

  document.body.prepend(layer);

  function randomBetween(min, max) {
    return Math.round(min + Math.random() * (max - min));
  }

  function getReferencePath(name) {
    const fileName = /\.(?:png|svg)$/i.test(name) ? name : `${name}.svg`;

    return `assets/images/login-references/${fileName}`;
  }

  function getDistributedPositions(total, compact) {
    const columns = compact ? 4 : 5;
    const rows = compact ? 3 : 4;
    const slots = [];

    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        slots.push({ column, row });
      }
    }

    return slots
      .sort(() => Math.random() - 0.5)
      .slice(0, total)
      .map(({ column, row }) => ({
        left: Math.round(
          ((column + randomBetween(24, 76) / 100) / columns) * 100,
        ),
        top: Math.round(((row + randomBetween(22, 78) / 100) / rows) * 100),
      }));
  }

  function renderReferenceRails() {
    const layer = document.createElement("div");
    const leftRail = document.createElement("div");
    const rightRail = document.createElement("div");
    const perSide = 5;
    const railReferences = [...references].sort(() => Math.random() - 0.5);

    layer.className = "reference-rail-layer";
    layer.setAttribute("aria-hidden", "true");
    leftRail.className = "reference-rail-side left";
    rightRail.className = "reference-rail-side right";

    [leftRail, rightRail].forEach((rail, railIndex) => {
      const positions = getRailPositions(perSide);

      positions.forEach((position, index) => {
        const image = document.createElement("img");
        const referenceIndex = railIndex * perSide + index;
        const name = railReferences[referenceIndex % railReferences.length];
        const size = randomBetween(70, 128);

        image.src = getReferencePath(name);
        image.alt = "";
        image.className = "reference-rail";
        image.style.width = `${size}px`;
        image.style.left = `${position.left}%`;
        image.style.top = `${position.top}%`;
        image.style.setProperty("--rotation", `${randomBetween(-24, 24)}deg`);
        image.style.setProperty("--delay", `${referenceIndex * 0.08}s`);

        rail.appendChild(image);
      });
    });

    layer.append(leftRail, rightRail);
    document.body.prepend(layer);
  }

  function getRailPositions(total) {
    return Array.from({ length: total }, (_, index) => ({
      left: randomBetween(36, 64),
      top: Math.round(((index + randomBetween(24, 76) / 100) / total) * 100),
    })).sort(() => Math.random() - 0.5);
  }

  function renderMobileReferenceAccent() {
    const sections = getMobileAccentSections();
    const footer = document.querySelector(".footer, footer");
    const script = document.currentScript;

    sections.forEach((section, index) => {
      section.insertAdjacentElement(
        "afterend",
        createMobileReferenceAccent(index),
      );
    });

    const hasFooterAccent = sections.some(
      (section) => section.nextElementSibling === footer,
    );

    if (footer?.parentNode && !hasFooterAccent) {
      footer.parentNode.insertBefore(
        createMobileReferenceAccent(sections.length),
        footer,
      );
      return;
    }

    if (!footer) {
      document.body.insertBefore(
        createMobileReferenceAccent(sections.length),
        script || null,
      );
    }
  }

  function createMobileReferenceAccent(groupIndex) {
    const accent = document.createElement("div");
    const selectedReferences = [...references]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    accent.className = "mobile-reference-accent";
    accent.setAttribute("aria-hidden", "true");

    selectedReferences.forEach((name, index) => {
      const image = document.createElement("img");

      image.src = getReferencePath(name);
      image.alt = "";
      image.style.setProperty("--rotation", `${randomBetween(-18, 18)}deg`);
      image.style.setProperty("--delay", `${(groupIndex + index) * 0.1}s`);

      accent.appendChild(image);
    });

    return accent;
  }

  function getMobileAccentSections() {
    if (document.querySelector(".countdown-section")) {
      return [".countdown-section", ".welcome-section", ".event-section"]
        .map((selector) => document.querySelector(selector))
        .filter(Boolean);
    }

    if (document.querySelector(".timeline-section")) {
      return [".timeline-section", ".final-section"]
        .map((selector) => document.querySelector(selector))
        .filter(Boolean);
    }

    return [];
  }
})();
