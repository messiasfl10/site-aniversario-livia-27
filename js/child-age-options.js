(function () {
  function escapeHTML(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getStandardAges() {
    const ages = ["Menos de 1 mês"];

    for (let month = 1; month <= 11; month += 1) {
      ages.push(`${month} ${month === 1 ? "mês" : "meses"}`);
    }

    for (let year = 1; year <= 17; year += 1) {
      ages.push(`${year} ${year === 1 ? "ano" : "anos"}`);
    }

    return ages;
  }

  function renderOptions(selectedValue = "") {
    const normalizedValue = String(selectedValue || "").trim();
    const standardAges = getStandardAges();
    const options = [
      '<option value="">Selecione a idade na data da festa</option>',
    ];

    if (normalizedValue && !standardAges.includes(normalizedValue)) {
      const safeValue = escapeHTML(normalizedValue);
      options.push(
        `<option value="${safeValue}" selected>Valor atual: ${safeValue}</option>`,
      );
    }

    standardAges.forEach((age) => {
      const selected = age === normalizedValue ? " selected" : "";
      const safeAge = escapeHTML(age);
      options.push(`<option value="${safeAge}"${selected}>${safeAge}</option>`);
    });

    return options.join("");
  }

  window.ChildAgeOptions = {
    renderOptions,
  };
})();
