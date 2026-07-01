(function () {
  const config = {
    celebrant: {
      name: "Livia",
      birthDate: "1999-08-05",
    },
    celebration: {
      date: "2026-08-08",
      time: "18:00",
      utcOffset: "-03:00",
      rsvpDeadline: "2026-08-01",
    },
    venue: {
      name: "Geek Bunker Burger",
      address: "Av. Jovita Feitosa, 2802 · Parquelândia",
      city: "Fortaleza",
      state: "CE",
      postalCode: "60455-410",
    },
  };

  function parseDate(value) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function getCelebrationDate() {
    return new Date(`${config.celebration.date}T${config.celebration.time}:00${config.celebration.utcOffset}`);
  }

  function getCelebratedAge() {
    const birth = parseDate(config.celebrant.birthDate);
    const celebration = parseDate(config.celebration.date);
    let age = celebration.getFullYear() - birth.getFullYear();
    if (celebration.getMonth() < birth.getMonth() ||
        (celebration.getMonth() === birth.getMonth() && celebration.getDate() < birth.getDate())) {
      age -= 1;
    }
    return age;
  }

  function formatDate(value, options = {}) {
    return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", ...options }).format(parseDate(value));
  }

  function getMapsUrl() {
    const location = `${config.venue.name}, ${config.venue.address}, ${config.venue.city}, ${config.venue.state}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  }

  window.EventConfig = Object.freeze({
    ...config,
    formatDate,
    getCelebratedAge,
    getCelebrationDate,
    getMapsUrl,
  });
})();
