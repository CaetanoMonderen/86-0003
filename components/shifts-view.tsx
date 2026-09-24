"use client"

const SLOTS = [
  { day: "Zaterdag", time: "17u - 19u" },
  { day: "Zaterdag", time: "19u - 21u" },
  { day: "Zondag", time: "12u - 14u" },
  { day: "Zondag", time: "14u - 16u" },
  { day: "Zondag", time: "16u - 18u" },
  { day: "Zondag", time: "18u - 20u" },
]

// Shift assignments per person, ordered to match SLOTS above.
const SHIFTS: { name: string; slots: string[] }[] = [
  { name: "Amber", slots: ["Keuken", "Keuken", "Zaal (Rij 1)", "Keuken", "Keuken", "Eten met familie"] },
  { name: "Amelie", slots: ["Zaal (Rij 1)", "Zaal (Rij 1)", "Keuken", "Zaal (Rij 1)", "Zaal (Rij 1)", "Zaal (Rij 1)"] },
  { name: "Amy", slots: ["Zaal (Rij 2)", "Zaal (Rij 2)", "Keuken", "Zaal (waar hulp nodig)", "Zaal (waar hulp nodig)", "Zaal (Rij 2)"] },
  { name: "Aveline", slots: ["Eten met familie", "Zaal (Rij 3)", "Eten met familie", "Keuken", "Zaal (Rij 2)", "Zaal (Rij 2)"] },
  { name: "Caetano", slots: ["Keuken", "Kassa", "Keuken", "Kassa", "Keuken", "Kassa"] },
  { name: "Chanaya", slots: ["Zaal (Rij 5)", "Zaal (Rij 5)", "Eten met familie", "Zaal (Rij 5)", "Zaal (Rij 5)", "Zaal (Rij 5)"] },
  { name: "Charlotte", slots: ["Zaal (Rij 5)", "Zaal (Rij 5)", "Keuken", "Zaal (achteraan)", "Zaal (achteraan)", "Zaal (achteraan)"] },
  { name: "Cisse Leon", slots: ["Keuken", "Keuken", "Zaal (Rij 3)", "", "", "Zaal (Rij 4)"] },
  { name: "Eowyn", slots: ["Keuken", "Zaal (Rij 4)", "Zaal (Rij 5)", "Keuken", "Keuken", "Zaal (Rij 4)"] },
  { name: "Iebe", slots: ["Zaal (Rij 2)", "Zaal (Rij 2)", "Zaal (Rij 2)", "Zaal (Rij 2)", "Keuken", "Zaal (achteraan)"] },
  { name: "Lyna", slots: ["Zaal (Rij 3)", "Eten met familie", "Keuken", "Zaal (Rij 3)", "Zaal (Rij 3)", "Keuken"] },
  { name: "Maarten", slots: ["", "Keuken", "Zaal (Rij 4)", "Zaal (Rij 4)", "Zaal (Rij 4)", "Keuken"] },
  { name: "Maia", slots: ["Keuken", "Zaal (Rij 4)", "Zaal (Rij 4)", "Zaal (Rij 4)", "Zaal (Rij 4)", "Keuken"] },
  { name: "Malin", slots: ["Zaal (Rij 4)", "Keuken", "Eten met familie", "Keuken", "Zaal (Rij 3)", "Zaal (Rij 3)"] },
  { name: "Marie", slots: ["Zaal (achteraan)", "Eten met familie", "Zaal (Rij 1)", "Keuken", "Keuken", "Keuken"] },
  { name: "Marthe", slots: ["Zaal (Rij 1)", "Zaal (Rij 1)", "Eten met familie", "Zaal (Rij 1)", "Zaal (Rij 1)", "Zaal (Rij 1)"] },
  { name: "Nora", slots: ["Keuken", "Zaal (achteraan)", "Zaal (Rij 3)", "Zaal (Rij 3)", "Keuken", "Keuken"] },
  { name: "Nyah", slots: ["Zaal (Rij 4)", "Keuken", "Zaal (Rij 5)", "Zaal (Rij 5)", "Zaal (Rij 5)", "Zaal (Rij 5)"] },
  { name: "Olivia", slots: ["Keuken", "Keuken", "Zaal (Rij 2)", "Keuken", "Keuken", "Keuken"] },
  { name: "Rica", slots: ["Keuken", "Keuken", "Keuken", "Zaal (Rij 2)", "Zaal (Rij 2)", "Keuken"] },
  { name: "Silas", slots: ["Zaal (Rij 3)", "Keuken", "Keuken", "Zaal (achteraan)", "Zaal (achteraan)", "Keuken"] },
  { name: "Silke", slots: ["Kassa", "Zaal (Rij 3)", "Kassa", "Keuken", "Kassa", "Zaal (Rij 3)"] },
  { name: "Yorin", slots: ["", "", "", "", "", ""] },
]

const LEGEND = [
  { label: "Rij 1", desc: "Alles aan linkse kant + laatste rij voor podium (links)" },
  { label: "Rij 2", desc: "Alle tafels in rij 2 (van links) + linkse tafel podium" },
  { label: "Rij 3", desc: "Middelste rij" },
  { label: "Rij 4", desc: "4de rij + rechtse tafel podium" },
  { label: "Rij 5", desc: "Helemaal rechts (met goed weer buiten)" },
  { label: "Achteraan", desc: "Als je de gildezaal binnenkomt, naar links op het einde is er een extra zaal" },
]

function roleClasses(slot: string) {
  const s = slot.toLowerCase()
  if (!slot) return "bg-muted/40 text-muted-foreground"
  if (s.includes("kassa")) return "bg-primary/15 text-primary font-semibold"
  if (s.includes("keuken")) return "bg-amber-500/15 text-amber-600 dark:text-amber-400"
  if (s.includes("eten met familie")) return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
  return "bg-sky-500/15 text-sky-600 dark:text-sky-400"
}

export function ShiftsView() {
  return (
    <div className="menu-content-transition menu-content-enter">
      <div className="corporate-section-header">
        <div className="flex items-center gap-2">SHIFTEN — MOSSELWEEKEND 2026</div>
      </div>

      <div className="corporate-content p-6">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <span className="text-sm text-muted-foreground">{SHIFTS.length} leiding · {SLOTS.length} shiften</span>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-primary/15 px-3 py-1 text-primary font-medium">Kassa</span>
            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-amber-600 dark:text-amber-400 font-medium">Keuken</span>
            <span className="rounded-full bg-sky-500/15 px-3 py-1 text-sky-600 dark:text-sky-400 font-medium">Zaal</span>
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-600 dark:text-emerald-400 font-medium">Eten met familie</span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/60">
                <th className="sticky left-0 z-10 bg-muted/60 px-4 py-3 text-left font-semibold whitespace-nowrap">
                  Leiding
                </th>
                {SLOTS.map((slot, i) => (
                  <th key={i} className="px-4 py-3 text-left font-semibold whitespace-nowrap">
                    <div className="text-foreground">{slot.day}</div>
                    <div className="text-xs font-normal text-muted-foreground">{slot.time}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SHIFTS.map((person, r) => (
                <tr key={person.name} className={r % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                  <td className="sticky left-0 z-10 px-4 py-2 font-medium whitespace-nowrap bg-inherit border-r border-border">
                    {person.name}
                  </td>
                  {person.slots.map((slot, c) => (
                    <td key={c} className="px-2 py-2">
                      <span
                        className={`inline-block w-full rounded-md px-2 py-1.5 text-center text-xs leading-tight ${roleClasses(
                          slot,
                        )}`}
                      >
                        {slot || "—"}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Legende zaal</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {LEGEND.map((item) => (
              <div key={item.label} className="flex gap-3 rounded-md border border-border bg-muted/20 px-3 py-2">
                <span className="shrink-0 font-semibold text-primary">{item.label}</span>
                <span className="text-sm text-muted-foreground">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
