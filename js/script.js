const navbar = document.getElementById("navbar");
const mobileMenu = document.getElementById("mobileMenu");
const navLinks = document.getElementById("navLinks");

window.addEventListener("scroll", () => navbar?.classList.toggle("scrolled", window.scrollY > 50));

mobileMenu?.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("active");
  mobileMenu.setAttribute("aria-expanded", String(isOpen));
});

navLinks?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
  navLinks.classList.remove("active");
  mobileMenu?.setAttribute("aria-expanded", "false");
}));

const celebrationDate = new Date("2026-08-08T19:00:00-03:00");
const countdownIds = ["days", "hours", "minutes", "seconds"];

function updateCountdown() {
  const difference = celebrationDate.getTime() - Date.now();
  if (difference <= 0) {
    countdownIds.forEach((id) => { document.getElementById(id).textContent = "0"; });
    document.getElementById("countdownFinished")?.classList.remove("is-hidden");
    return;
  }
  const values = [
    Math.floor(difference / 86400000),
    Math.floor((difference / 3600000) % 24),
    Math.floor((difference / 60000) % 60),
    Math.floor((difference / 1000) % 60),
  ];
  countdownIds.forEach((id, index) => { document.getElementById(id).textContent = values[index]; });
}

updateCountdown();
setInterval(updateCountdown, 1000);

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => entry.target.classList.toggle("active", entry.isIntersecting));
}, { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach((section) => observer.observe(section));
