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

const eventConfig = window.EventConfig;
const celebrationDate = eventConfig.getCelebrationDate();
const countdownIds = ["days", "hours", "minutes", "seconds"];

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function applyEventContent() {
  const { celebrant, celebration, venue } = eventConfig;
  const age = eventConfig.getCelebratedAge();
  const birthdayDay = Number(celebrant.birthDate.slice(-2));
  const celebrationDay = Number(celebration.date.slice(-2));
  const eventDateLong = eventConfig.formatDate(celebration.date, { day: "2-digit", month: "long", year: "numeric" });
  const eventDateDetail = eventConfig.formatDate(celebration.date, { weekday: "long", day: "numeric", month: "long" });
  const deadline = eventConfig.formatDate(celebration.rsvpDeadline, { day: "numeric", month: "long", year: "numeric" });
  const formattedTime = celebration.time.replace(":00", "h");

  document.title = `Aniversário da ${celebrant.name}`;
  document.querySelector('meta[name="description"]')?.setAttribute("content", `Aniversário de ${celebrant.name} — ${eventDateLong}, no ${venue.name}.`);
  setText("siteLogo", celebrant.name);
  setText("heroTitle", `${celebrant.name} · ${age} anos`);
  setText("heroDate", `${eventDateLong} · ${formattedTime}`);
  setText("birthdayCallout", `O aniversário é dia ${birthdayDay}, mas a missão de comemorar está marcada para dia ${celebrationDay}.`);
  setText("eventDateDetail", eventDateDetail.charAt(0).toUpperCase() + eventDateDetail.slice(1));
  setText("eventTimeDetail", `A partir das ${formattedTime}`);
  setText("venueName", venue.name);
  setText("venueAddress", `${venue.address}\n${venue.city} · ${venue.state}, ${venue.postalCode}`);
  document.getElementById("venueCard")?.setAttribute("href", eventConfig.getMapsUrl());
  setText("rsvpDeadline", deadline);
  setText("footerName", celebrant.name);
  setText("footerEvent", `${eventDateLong} · ${venue.city}, ${venue.state}`);
}

applyEventContent();

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
