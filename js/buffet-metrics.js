(function () {
  const DEFAULT_PAYING_AGE = 7;

  function normalizePayingAge(value) {
    const age = Number.parseInt(value, 10);
    return Number.isInteger(age) && age >= 1 && age <= 18
      ? age
      : DEFAULT_PAYING_AGE;
  }

  function parseAgeInMonths(value) {
    const normalized = String(value || "")
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    if (!normalized) {
      return null;
    }

    if (normalized === "menos de 1 mes") {
      return 0;
    }

    const yearsMatch = normalized.match(/(\d+)\s*ano/);
    const monthsMatch = normalized.match(/(\d+)\s*mes/);

    if (!yearsMatch && !monthsMatch) {
      return null;
    }

    return (
      Number(yearsMatch?.[1] || 0) * 12 +
      Number(monthsMatch?.[1] || 0)
    );
  }

  function classifyChild(age, payingAge) {
    const ageInMonths = parseAgeInMonths(age);

    if (ageInMonths === null) {
      return "child-unknown";
    }

    return ageInMonths >= normalizePayingAge(payingAge) * 12
      ? "child-paying"
      : "child-non-paying";
  }

  function getCategoryLabel(category) {
    const labels = {
      "adult-paying": "Pagante",
      "child-paying": "Criança pagante",
      "child-non-paying": "Criança não pagante",
      "child-unknown": "Criança sem idade",
    };

    return labels[category] || "-";
  }

  function getConfirmedPeople(guest, rsvp, payingAge) {
    if (!rsvp || rsvp.presence !== "Sim") {
      return [];
    }

    const members = rsvp.guest_data?.members || [];
    const companions = rsvp.guest_data?.companions || [];
    const invitedPeople = members.length
      ? members
          .filter((member) => member.presence === "Sim")
          .map((member) => ({
            age: "",
            category: "adult-paying",
            child: "Não",
            name: member.name || "Sem nome",
            paying: true,
            type: "Membro do convite",
          }))
      : [
          {
            age: "",
            category: "adult-paying",
            child: "Não",
            name: guest?.name || rsvp.guest_data?.name || "Convidado",
            paying: true,
            type: "Convidado",
          },
        ];

    const companionPeople = companions.map((companion) => {
      const isChild = companion.is_child === "Sim";
      const category = isChild
        ? classifyChild(companion.age, payingAge)
        : "adult-paying";

      return {
        age: companion.age || "",
        category,
        child: isChild ? "Sim" : "Não",
        name: companion.name || "Sem nome",
        paying:
          category === "adult-paying" || category === "child-paying",
        type: "Acompanhante",
      };
    });

    return [...invitedPeople, ...companionPeople];
  }

  function summarizePeople(people) {
    return people.reduce(
      (metrics, person) => {
        metrics.totalPeople += 1;

        if (person.paying) {
          metrics.payingPeople += 1;
        }

        if (person.child === "Sim") {
          metrics.children += 1;
        }

        if (person.category === "child-paying") {
          metrics.payingChildren += 1;
        }

        if (person.category === "child-non-paying") {
          metrics.nonPayingChildren += 1;
        }

        if (person.category === "child-unknown") {
          metrics.unknownAgeChildren += 1;
        }

        return metrics;
      },
      {
        children: 0,
        nonPayingChildren: 0,
        payingChildren: 0,
        payingPeople: 0,
        totalPeople: 0,
        unknownAgeChildren: 0,
      },
    );
  }

  function getRSVPMetrics(guest, rsvp, payingAge) {
    return summarizePeople(getConfirmedPeople(guest, rsvp, payingAge));
  }

  function getAttendanceMetrics(guests, rsvps, payingAge) {
    const guestMap = (guests || []).reduce((map, guest) => {
      map[guest.id] = guest;
      return map;
    }, {});
    const people = (rsvps || []).flatMap((rsvp) =>
      getConfirmedPeople(guestMap[rsvp.guest_id], rsvp, payingAge),
    );

    return summarizePeople(people);
  }

  window.BuffetMetrics = {
    DEFAULT_PAYING_AGE,
    classifyChild,
    getAttendanceMetrics,
    getCategoryLabel,
    getConfirmedPeople,
    getRSVPMetrics,
    normalizePayingAge,
    parseAgeInMonths,
  };
})();
