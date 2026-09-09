/* Flash Forward global animations (map reveal, hero intro, nav/burger). Requires gsap,
   ScrollTrigger, SplitType, jQuery - all deferred.

   The hero intro used to be a 5.2s timeline that held .section-hero at autoAlpha 0 and
   .hero-video-background at scale 1.5 for its whole length. Deferred scripts execute a
   few seconds in on a throttled phone, so it was hiding content that had already painted
   and then animating it back - which pinned Speed Index at roughly the timeline length.
   The reveal is CSS now, and what remains here is skipped entirely if this script did not
   arrive early enough for an intro to still make sense. */
const prefersReducedMotion = () =>
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function mapRevealAnimation() {
  const mapSection = document.querySelector(".section-worldmap");
  const mapWrapper =
    mapSection && mapSection.querySelector(".map-dotted-wrapper");
  const mapHeadline =
    mapSection && mapSection.querySelector("#worldmap-headline");
  const mapParagraphs = mapSection
    ? mapSection.querySelectorAll(".paragraph-base")
    : [];
  const mapButtons = mapSection
    ? mapSection.querySelectorAll(".button-base")
    : [];

  if (
    !mapSection ||
    !mapWrapper ||
    !mapHeadline ||
    !mapParagraphs.length ||
    mapSection.dataset.ffMapRevealReady
  ) {
    return;
  }
  mapSection.dataset.ffMapRevealReady = "true";

  if (prefersReducedMotion()) {
    mapWrapper.style.clipPath = "circle(100%)";
    return;
  }

  const timeline = window.gsap.timeline({
    scrollTrigger: {
      trigger: mapWrapper,
      start: window.innerWidth > 767 ? "top 50%" : "top 90%",
      markers: false,
      toggleActions: "play none none none",
    },
  });

  if (window.innerWidth > 767) {
    timeline
      .from(mapHeadline, { y: "120%", ease: "Power4.easeOut", duration: 0.65 })
      .to(
        mapWrapper,
        { clipPath: "circle(100%)", ease: "Power4.easeOut", duration: 3 },
        "-=0.8",
      )
      .from(
        mapParagraphs,
        { y: "120%", ease: "Power4.easeOut", duration: 1 },
        0.2,
      );
    if (mapButtons.length) {
      timeline.from(
        mapButtons,
        { opacity: 0, ease: "Power4.easeOut", duration: 1 },
        0.5,
      );
    }
  } else {
    timeline
      .from(mapHeadline, { y: "120%", ease: "Power4.easeOut", duration: 0.65 })
      .from(
        mapParagraphs,
        { opacity: 0, ease: "Power4.easeOut", duration: 1 },
        0.5,
      )
      .to(
        mapWrapper,
        { clipPath: "circle(100%)", ease: "Power4.easeOut", duration: 2 },
        0.8,
      );
    if (mapButtons.length) {
      timeline.from(
        mapButtons,
        { opacity: 0, ease: "Power4.easeOut", duration: 1 },
        0.6,
      );
    }
  }
}

const initializeHeroSectionAnimation = () => {
  const announcementBar = document.querySelector(".announcement-wrapper");
  if (!announcementBar) return null;
  return gsap
    .timeline()
    .to(announcementBar, { opacity: 1, ease: "power4.out", duration: 0.4 }, 0);
};

if (!prefersReducedMotion()) {
  gsap.registerPlugin(ScrollTrigger);
  initializeHeroSectionAnimation();

  const introHeading = document.querySelector(".introduction-wrapper h2");
  const introSection =
    introHeading && introHeading.closest(".section-introduction");

  if (introSection) {
    new SplitType(introHeading, {
      types: "lines",
      lineClass: "intro-line",
    });
    const introLines = introSection.querySelectorAll(".intro-line");

    introLines.forEach((line) => {
      const lineMask = document.createElement("div");
      lineMask.classList.add("overflow-hidden");
      line.parentNode.insertBefore(lineMask, line);
      lineMask.appendChild(line);
    });

    if (introLines.length) {
      gsap.from(introLines, {
        scrollTrigger: {
          trigger: introSection,
          start: "top 70%",
          markers: false,
          toggleActions: "play none none none",
        },
        opacity: 0,
        y: "120%",
        ease: "Power4.easeOut",
        duration: 1,
        stagger: 0.1,
      });
    }

    const introButtons = introSection.querySelectorAll(".button-base");
    if (introButtons.length) {
      gsap.from(introButtons, {
        scrollTrigger: {
          trigger: introSection,
          start: "top 70%",
          markers: false,
          toggleActions: "play none none none",
        },
        ease: "Power4.easeOut",
        opacity: 0,
        delay: 0.7,
        duration: 0.5,
      });
    }
  }
}

/* This single call covers both paths: with motion it plays the scroll-triggered reveal,
   with reduced motion it only expands the map's clip-path so the section is visible. */
mapRevealAnimation();

const animateBurgerLines = (menuOpen) => {
  gsap.to(".line-1", {
    duration: 0.2,
    rotate: menuOpen ? 45 : 0,
    y: menuOpen ? 6 : 0,
  });
  gsap.to(".line-2", { duration: 0.2, opacity: menuOpen ? 0 : 1 });
  gsap.to(".line-3", {
    duration: 0.2,
    rotate: menuOpen ? -45 : 0,
    y: menuOpen ? -6 : 0,
  });
};

const animateMenu = (menuOpen) => {
  if (menuOpen) {
    gsap.set(".fullscreen-wrapper", {
      display: "block",
      y: 0,
      yPercent: -100,
      overflow: "hidden",
    });
    gsap.set(".fullscreen-menu-container", { opacity: 1 });
    gsap
      .timeline()
      .to(
        ".fullscreen-wrapper",
        { duration: 0.2, yPercent: 0, overflow: "visible" },
        0,
      )
      .from(
        ".navbar-menu-dropdown",
        {
          duration: 0.5,
          opacity: 0,
          y: -20,
          stagger: 0.1,
          ease: "power2.out",
        },
        "-=0.1",
      )
      .from(
        ".fullscreen-menu-bottom",
        { duration: 0.5, opacity: 0, y: 20, ease: "power2.out" },
        "<",
      );
  } else {
    gsap.set(".fullscreen-menu-container", { opacity: 0 });
    gsap.to(".fullscreen-wrapper", {
      duration: 0.1,
      yPercent: -100,
      ease: "power2.out",
      onComplete: () => gsap.set(".fullscreen-wrapper", { display: "none" }),
    });
  }
};

const setMenuState = (menuOpen) => {
  document.body.classList.toggle("burger-menu-open", menuOpen);
  animateBurgerLines(menuOpen);
  animateMenu(menuOpen);
  document.querySelectorAll(".burger-menu").forEach((burgerButton) => {
    burgerButton.setAttribute("aria-expanded", String(menuOpen));
    burgerButton.setAttribute(
      "aria-label",
      menuOpen ? "Close menu" : "Open menu",
    );
  });
};

const toggleMenu = () => {
  setMenuState(!document.body.classList.contains("burger-menu-open"));
};

const handleBurgerMenuClick = () => {
  document.querySelectorAll(".burger-menu").forEach((burgerButton) => {
    burgerButton.addEventListener("click", toggleMenu);
    burgerButton.addEventListener("keydown", (event) => {
      if (event.repeat) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleMenu();
      }
    });
  });
  document
    .querySelectorAll(".nav-menu-link, .nav-menu-link .navbar-item")
    .forEach((menuLink) => {
      menuLink.addEventListener("click", () => {
        if (document.body.classList.contains("burger-menu-open")) {
          setMenuState(false);
        }
      });
    });
};

const handleScrollEvent = () => {
  const navBars = document.querySelectorAll(".nav-bar");
  const navLogoLink = document.querySelector(".nav-logo-link.w-nav-brand");
  const navButtonWrapper = document.querySelector(".nav-button-wrapper");
  const announcementBar = document.querySelector(".announcement-wrapper");
  let lastScrollY = 0;
  let announcementHeight = announcementBar ? announcementBar.offsetHeight : 0;
  let scrollTicking = false;

  const updateNavOnScroll = () => {
    const scrollY = window.scrollY;
    navBars.forEach((navBar) => {
      navBar.classList.toggle("scrolled", scrollY > 50);
    });
    if (scrollY > lastScrollY && scrollY > 50) {
      navBars.forEach((navBar) => {
        navBar.style.transform = `translateY(-${announcementHeight}px)`;
      });
      navLogoLink?.classList.add("hide-nav-element");
      navButtonWrapper?.classList.add("hide-nav-element");
    } else if (scrollY < lastScrollY) {
      navBars.forEach((navBar) => {
        navBar.style.transform = "translateY(0)";
      });
      navLogoLink?.classList.remove("hide-nav-element");
      navButtonWrapper?.classList.remove("hide-nav-element");
    }
    lastScrollY = Math.max(0, scrollY);
    scrollTicking = false;
  };

  window.addEventListener("scroll", () => {
    if (!scrollTicking) {
      requestAnimationFrame(updateNavOnScroll);
      scrollTicking = true;
    }
  });
  window.addEventListener("resize", () => {
    if (announcementBar) {
      announcementHeight = announcementBar.offsetHeight;
    }
  });
};

const initializeTeamModalA11y = () => {
  const focusableSelector = "a[href],button,input,select,textarea,[tabindex]";
  const supportsInert = "inert" in HTMLElement.prototype;
  const triggers = [
    ...document.querySelectorAll(".sidebar-button[aria-controls]"),
  ];
  const entries = triggers
    .map((trigger) => ({
      trigger,
      modal: document.getElementById(trigger.getAttribute("aria-controls")),
    }))
    .filter((entry) => entry.modal);
  if (!entries.length) return;

  let activeEntry = null;

  const getModalDescendants = (modal) => [
    ...modal.querySelectorAll(focusableSelector),
  ];
  const getFocusableElements = (modal) =>
    getModalDescendants(modal).filter(
      (node) =>
        !node.disabled &&
        node.getAttribute("aria-hidden") !== "true" &&
        node.tabIndex >= 0 &&
        node.getClientRects().length,
    );
  const safeFocus = (node) => {
    if (!node) return;
    try {
      node.focus({ preventScroll: true });
    } catch (error) {
      node.focus();
    }
  };
  const syncTriggerExpanded = (entry, open) =>
    entry.trigger.setAttribute("aria-expanded", String(open));
  const setModalInactive = (modal, inactive) => {
    modal.setAttribute("aria-hidden", String(inactive));
    if (supportsInert) {
      modal.inert = inactive;
    } else if (inactive) {
      modal.setAttribute("inert", "");
    } else {
      modal.removeAttribute("inert");
    }
    if (!supportsInert) {
      if (inactive) {
        getModalDescendants(modal).forEach((node) => {
          if (!node.hasAttribute("data-ff-old-tabindex")) {
            node.setAttribute(
              "data-ff-old-tabindex",
              node.hasAttribute("tabindex")
                ? node.getAttribute("tabindex")
                : "",
            );
          }
          node.setAttribute("tabindex", "-1");
        });
      } else {
        modal.querySelectorAll("[data-ff-old-tabindex]").forEach((node) => {
          const oldValue = node.getAttribute("data-ff-old-tabindex");
          if (oldValue === "") {
            node.removeAttribute("tabindex");
          } else {
            node.setAttribute("tabindex", oldValue);
          }
          node.removeAttribute("data-ff-old-tabindex");
        });
      }
    }
  };
  const entryForModal = (modal) =>
    entries.find((entry) => entry.modal === modal);
  const closeModal = (modal, shouldReturnFocus) => {
    const entry = entryForModal(modal);
    const wasActive = Boolean(activeEntry && activeEntry.modal === modal);
    if (wasActive) activeEntry = null;
    setModalInactive(modal, true);
    if (entry) syncTriggerExpanded(entry, false);
    if (wasActive && shouldReturnFocus && entry) {
      const returnTarget = entry.trigger;
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (activeEntry && activeEntry.modal !== modal) return;
          safeFocus(returnTarget);
        }),
      );
    }
  };
  const requestModalClose = (modal) => {
    const closeButton = modal.querySelector("button.form-close-wrapper");
    if (closeButton) {
      closeButton.click();
    } else {
      closeModal(modal, true);
    }
  };
  const activateModal = (entry) => {
    const previousEntry = activeEntry;
    if (previousEntry && previousEntry.modal !== entry.modal) {
      requestModalClose(previousEntry.modal);
    }
    activeEntry = entry;
    setModalInactive(entry.modal, false);
    syncTriggerExpanded(entry, true);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (
          !activeEntry ||
          activeEntry.modal !== entry.modal ||
          getComputedStyle(entry.modal).display === "none"
        ) {
          return;
        }
        safeFocus(
          entry.modal.querySelector("button.form-close-wrapper") || entry.modal,
        );
      }),
    );
  };

  entries.forEach((entry) => {
    const modal = entry.modal;
    const trigger = entry.trigger;
    const closeButton = modal.querySelector("button.form-close-wrapper");
    const overlay = modal.querySelector(".sidebar-overlay");

    setModalInactive(modal, true);
    syncTriggerExpanded(entry, false);

    trigger.addEventListener(
      "click",
      (event) => {
        if (activeEntry && activeEntry.modal === modal) {
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }
        activateModal(entry);
      },
      true,
    );
    trigger.addEventListener("keydown", (event) => {
      if (event.repeat) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        trigger.click();
      }
    });
    if (closeButton) {
      closeButton.addEventListener("click", () => closeModal(modal, true));
    }
    if (overlay) {
      overlay.addEventListener("click", (event) => {
        const currentModal = event.currentTarget.closest(".sidebar-wrapper");
        if (currentModal) closeModal(currentModal, true);
      });
    }
  });

  document.addEventListener("keydown", (event) => {
    if (!activeEntry) return;
    if (event.key === "Escape") {
      event.preventDefault();
      requestModalClose(activeEntry.modal);
      return;
    }
    if (event.key !== "Tab") return;
    const focusableElements = getFocusableElements(activeEntry.modal);
    if (!focusableElements.length) {
      event.preventDefault();
      safeFocus(activeEntry.modal);
      return;
    }
    if (!activeEntry.modal.contains(document.activeElement)) {
      event.preventDefault();
      safeFocus(
        event.shiftKey
          ? focusableElements[focusableElements.length - 1]
          : focusableElements[0],
      );
      return;
    }
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    if (event.shiftKey && document.activeElement === firstFocusable) {
      event.preventDefault();
      safeFocus(lastFocusable);
    } else if (!event.shiftKey && document.activeElement === lastFocusable) {
      event.preventDefault();
      safeFocus(firstFocusable);
    }
  });
};

handleBurgerMenuClick();
handleScrollEvent();
initializeTeamModalA11y();
