"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { marked } from "marked";
import DOMPurify from "dompurify";

const AGGIE_MAROON = "#500000";

const COMMON_DEPTS = [
  "AALO",
  "ACCT",
  "AERO",
  "AERS",
  "AFST",
  "AGCJ",
  "AGEC",
  "AGLS",
  "AGSC",
  "AGSM",
  "ALEC",
  "ALED",
  "ANSC",
  "ANTH",
  "ARAB",
  "ARCH",
  "AREN",
  "ARSC",
  "ARTS",
  "ASCC",
  "ASIA",
  "ASTR",
  "ATMO",
  "ATTR",
  "BAEN",
  "BEFB",
  "BESC",
  "BICH",
  "BIMS",
  "BIOL",
  "BMEN",
  "BOTN",
  "BUSH",
  "BUSN",
  "CARC",
  "CEHD",
  "CHEM",
  "CHEN",
  "CHIN",
  "CLAS",
  "CLEN",
  "COMM",
  "COSC",
  "CSCE",
  "CULN",
  "CVEN",
  "CYBR",
  "DAEN",
  "DASC",
  "DCED",
  "DDHS",
  "DIVE",
  "ECCB",
  "ECDE",
  "ECEN",
  "ECFB",
  "ECHE",
  "ECMT",
  "ECON",
  "EDCI",
  "EHRD",
  "ENDG",
  "ENDS",
  "ENGL",
  "ENGR",
  "ENSS",
  "ENST",
  "ENTC",
  "ENTO",
  "EPFB",
  "EPSY",
  "ESET",
  "EURO",
  "EVEN",
  "FILM",
  "FINC",
  "FINP",
  "FIVS",
  "FREN",
  "FSCI",
  "FSTC",
  "FYEX",
  "GALV",
  "GENE",
  "GEOG",
  "GEOL",
  "GEOP",
  "GERM",
  "GLST",
  "HBRW",
  "HEFB",
  "HHUM",
  "HISP",
  "HIST",
  "HLTH",
  "HMGT",
  "HORT",
  "HUMA",
  "IBUS",
  "IDIS",
  "INST",
  "INTA",
  "ISEN",
  "ISTM",
  "ITAL",
  "ITDE",
  "ITSV",
  "JAPN",
  "JOUR",
  "JWST",
  "KINE",
  "KNFB",
  "LAND",
  "LING",
  "LMAS",
  "LTPS",
  "MARA",
  "MARB",
  "MARE",
  "MARR",
  "MARS",
  "MART",
  "MASC",
  "MASE",
  "MAST",
  "MATH",
  "MEEN",
  "MEFB",
  "MEPS",
  "MGMT",
  "MICR",
  "MKTG",
  "MLSC",
  "MMET",
  "MODL",
  "MSEN",
  "MSTC",
  "MTDE",
  "MUSC",
  "MUST",
  "MXET",
  "NAUT",
  "NRSC",
  "NUEN",
  "NURS",
  "NUTR",
  "NVSC",
  "OCEN",
  "OCNG",
  "PBSI",
  "PERF",
  "PETE",
  "PHIL",
  "PHLT",
  "PHYS",
  "PLPA",
  "POLS",
  "PORT",
  "POSC",
  "PVFA",
  "RDNG",
  "RELS",
  "RPTS",
  "RUSS",
  "RWFM",
  "SCMT",
  "SCSC",
  "SEFB",
  "SENG",
  "SOCI",
  "SOMS",
  "SPAN",
  "SPED",
  "SPEN",
  "SPMT",
  "STAT",
  "TCMG",
  "TEED",
  "TEFB",
  "THEA",
  "UGST",
  "URPN",
  "VIBS",
  "VIST",
  "VLCS",
  "VSCS",
  "VTPB",
  "VTPP",
  "WFSC",
  "WGST",
  "ZOOL",
];
function isProbablyCourseNumber(value) {
  if (!value) return false;
  return /(^\d{2,4}$)|(^[A-Za-z]{2,6}\s*\d{2,4}$)/.test(value.trim());
}

export default function AggiePredictor() {
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [savedTranscript, setSavedTranscript] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("aggie_saved_transcript")) || null;
    } catch (e) {
      return null;
    }
  });

  const [scenarios, setScenarios] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("aggie_scenarios")) || [];
    } catch (e) {
      return [];
    }
  });

  const [validationMap, setValidationMap] = useState({});
  const [courses, setCourses] = useState([
    { id: Date.now(), dept: "", number: "" },
  ]);
  const [results, setResults] = useState([]);
  const [profModalOpen, setProfModalOpen] = useState(false);
  const [profModalData, setProfModalData] = useState(null);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const map = {};
      courses.forEach((c) => {
        const problems = [];
        if (!c.dept || !COMMON_DEPTS.includes(c.dept))
          problems.push("Select a valid department");
        if (!isProbablyCourseNumber(c.number))
          problems.push("Invalid course number format");
        map[c.id] = {
          valid: problems.length === 0,
          message: problems.join("; "),
        };
      });
      setValidationMap(map);
    }, 250);
    return () => clearTimeout(t);
  }, [courses]);

  function addCourse() {
    setCourses((s) => [
      ...s,
      { id: Date.now() + Math.random(), dept: "", number: "" },
    ]);
  }

  function removeCourse(id) {
    setCourses((s) => s.filter((c) => c.id !== id));
  }

  function updateCourse(id, patch) {
    setCourses((s) => s.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function saveScenarios(next) {
    try {
      setScenarios(next);
      localStorage.setItem("aggie_scenarios", JSON.stringify(next));
    } catch (e) {}
  }

  function saveCurrentScenario(name) {
    if (!name) name = `Scenario ${scenarios.length + 1}`;
    const payload = {
      id: Date.now() + Math.random(),
      name,
      courses: courses.map((c) => ({ dept: c.dept, number: c.number })),
    };
    const next = [...scenarios, payload];
    saveScenarios(next);
  }

  function saveTranscriptToLocal(file) {
    if (!file) return;
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize)
      return setError("Transcript too large to save locally (limit 5MB).");
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result;
      const payload = {
        name: file.name,
        size: file.size,
        type: file.type,
        data,
      };
      try {
        localStorage.setItem("aggie_saved_transcript", JSON.stringify(payload));
        setSavedTranscript(payload);
      } catch (e) {
        setError("Failed to save transcript locally.");
      }
    };
    reader.onerror = () => setError("Failed to read file for saving.");
    reader.readAsDataURL(file);
  }

  function openProfModal(classes, title) {
    if (!classes || !Array.isArray(classes) || classes.length === 0) return;
    setProfModalData({ classes, title });
    setProfModalOpen(true);
  }

  function getDifficultyFromRaw(raw) {
    if (!raw) return "Unknown";
    try {
      const m = /Likely Difficulty[:\s\-]*([A-Za-z ]+)/i.exec(raw);
      if (m && m[1]) return m[1].trim();
      const lowered = raw.toLowerCase();
      if (lowered.includes("very challenging")) return "Very Challenging";
      if (lowered.includes("challenging")) return "Challenging";
      if (lowered.includes("moderate")) return "Moderate";
      if (lowered.includes("easy")) return "Easy";
      return "Unknown";
    } catch (e) {
      return "Unknown";
    }
  }

  const DIFFICULTY_COLORS = {
    Easy: "bg-green-100 text-green-800",
    Moderate: "bg-yellow-100 text-yellow-800",
    Challenging: "bg-red-100 text-red-800",
    "Very Challenging": "bg-red-200 text-red-900",
    Unknown: "bg-gray-100 text-gray-800",
  };

  function computeRecentProfessorStats(classesArr) {
    if (!Array.isArray(classesArr) || classesArr.length === 0) return [];
    const currentYear = new Date().getFullYear();
    const allowedYears = [currentYear - 1, currentYear - 2];
    let recent = classesArr.filter((c) => {
      const y = parseInt(c.year, 10);
      return Number.isFinite(y) && allowedYears.includes(y);
    });
    if (recent.length === 0) {
      const years = classesArr
        .map((c) => parseInt(c.year, 10))
        .filter((y) => Number.isFinite(y));
      if (years.length === 0) return [];
      const maxYear = Math.max(...years);
      const minYear = maxYear - 1;
      recent = classesArr.filter((c) => {
        const y = parseInt(c.year, 10);
        return Number.isFinite(y) && y >= minYear && y <= maxYear;
      });
    }
    const byProf = {};
    recent.forEach((c) => {
      const prof = (c.prof || "Unknown").trim();
      const gpa = parseFloat(c.gpa);
      if (!byProf[prof]) byProf[prof] = { count: 0, sum: 0, entries: [] };
      if (!Number.isNaN(gpa)) {
        byProf[prof].sum += gpa;
        byProf[prof].count += 1;
      }
      byProf[prof].entries.push({
        year: c.year,
        semester: c.semester,
        gpa: c.gpa,
      });
    });
    const stats = Object.keys(byProf).map((prof) => {
      const rec = byProf[prof];
      const avg = rec.count > 0 ? rec.sum / rec.count : null;
      return {
        prof,
        avgGpa: avg === null ? null : Number(avg.toFixed(2)),
        count: rec.count,
        entries: rec.entries,
      };
    });
    stats.sort((a, b) => {
      if (a.avgGpa === null && b.avgGpa === null) return b.count - a.count;
      if (a.avgGpa === null) return 1;
      if (b.avgGpa === null) return -1;
      return b.avgGpa - a.avgGpa || b.count - a.count;
    });
    return stats;
  }

  function validate() {
    if (!fileRef.current?.files?.[0]) return "Please upload a transcript.";
    const validCourses = courses.filter(
      (c) =>
        c.dept && c.dept.trim().length >= 2 && isProbablyCourseNumber(c.number)
    );
    if (validCourses.length === 0)
      return "Please add at least one valid course (dept + number).";
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setResults([]);
    const v = validate();
    if (v) return setError(v);
    const file = fileRef.current.files[0];
    if (!file) return setError("No file selected");
    if (file.type !== "application/pdf")
      return setError("Only PDF transcripts are accepted.");
    setLoading(true);
    try {
      const validCourses = courses.filter(
        (c) =>
          c.dept &&
          c.dept.trim().length >= 2 &&
          isProbablyCourseNumber(c.number)
      );
      const requests = validCourses.map(async (c) => {
        const params = new URLSearchParams({
          dept: c.dept.trim(),
          number: c.number.trim(),
        });
        const fd = new FormData();
        fd.append("file", file);
        const url = `http://localhost:4000/grades?${params.toString()}`;
        const res = await fetch(url, { method: "POST", body: fd });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `Server returned ${res.status}`);
        }
        const json = await res.json().catch(() => null);
        const analysis = json?.aiAnalysis ?? json?.analysis ?? json ?? null;
        return {
          id: c.id,
          dept: c.dept,
          number: c.number,
          raw:
            typeof analysis === "string"
              ? analysis
              : JSON.stringify(analysis, null, 2),
          classes: json?.classes ?? [],
        };
      });
      const all = await Promise.allSettled(requests);
      const finished = all.map((r) =>
        r.status === "fulfilled"
          ? { ok: true, value: r.value }
          : { ok: false, reason: r.reason?.message ?? String(r.reason) }
      );
      setResults(finished);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-[#500000] text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-md">
              <Image src="/tamu-logo.svg" alt="TAMU" width={34} height={34} />
            </div>
            <div>
              <div className="font-bold text-xl">Aggie Course Insights</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="rounded-xl p-8 mb-8 text-center bg-gradient-to-r from-[#7b2c2c] to-[#4c1f1f] text-white shadow-2xl">
          <h1 className="text-3xl font-extrabold">Predict course difficulty</h1>
          <p className="mt-2 text-sm opacity-90">
            Upload your transcript, pick courses, and compare professor trends.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-black mb-2">
              📄 Upload Transcript (PDF)
            </label>
            <div className="border-2 border-dashed border-black rounded-xl p-8 text-center mb-6 bg-gray-50 relative">
              <div className="mx-auto max-w-xs">
                <div className="text-3xl">📁</div>
                <div className="mt-3 text-sm text-black">
                  Click to upload PDF file
                </div>
                <div className="mt-1 text-xs text-gray-700">
                  PDF files only · Drag and drop supported
                </div>
                <div className="mt-2 text-sm text-black">
                  {fileName || "No file chosen"}
                </div>
              </div>
              <input
                id="file-input"
                ref={fileRef}
                type="file"
                accept="application/pdf"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
                className="absolute inset-0 z-10 opacity-0 cursor-pointer"
              />
            </div>

            <div className="space-y-4">
              {courses.map((c, idx) => (
                <div key={c.id}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="flex flex-col">
                      <label className="block text-sm font-medium text-gray-900">
                        🏛️ Department
                      </label>
                      <select
                        value={c.dept}
                        onChange={(e) =>
                          updateCourse(c.id, { dept: e.target.value })
                        }
                        className="mt-2 block w-full rounded border px-3 py-2 bg-white text-black h-12"
                      >
                        <option value="">Select department</option>
                        {COMMON_DEPTS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col">
                      <label className="block text-sm font-medium text-gray-900">
                        🎓 Course Number
                      </label>
                      <input
                        value={c.number}
                        onChange={(e) =>
                          updateCourse(c.id, { number: e.target.value })
                        }
                        className="mt-2 block w-full rounded border px-3 py-2 text-black h-12"
                        placeholder="e.g., 301 or CS 101"
                      />
                    </div>

                    <div className="flex items-end gap-2">
                      <button
                        type="button"
                        onClick={() => removeCourse(c.id)}
                        disabled={courses.length === 1}
                        className={`inline-flex items-center justify-center gap-2 px-3 h-12 border rounded text-sm ${
                          courses.length === 1
                            ? "opacity-50 cursor-not-allowed text-gray-500 border-gray-200"
                            : "text-black hover:bg-gray-100"
                        }`}
                      >
                        Remove
                      </button>
                      {idx === courses.length - 1 && (
                        <button
                          type="button"
                          onClick={addCourse}
                          className="inline-flex items-center justify-center gap-2 bg-[#7b2c2c] text-white px-3 h-12 rounded text-sm hover:opacity-95"
                        >
                          + Add
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Validation message below the row */}
                  {validationMap[c.id] && !validationMap[c.id].valid && (
                    <div className="text-xs text-red-600 mt-1 md:pl-0">
                      {validationMap[c.id].message}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-black rounded bg-white text-black">
                <div className="flex justify-between items-center">
                  <div className="font-medium">Scenarios</div>
                  <button
                    type="button"
                    onClick={() => saveCurrentScenario()}
                    className="text-sm text-[#7b2c2c]"
                  >
                    Save
                  </button>
                </div>
                <div className="mt-2 text-sm max-h-40 overflow-y-auto text-black">
                  {scenarios.length === 0 && (
                    <div className="text-xs text-gray-700">
                      No saved scenarios
                    </div>
                  )}
                  {scenarios.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between py-1"
                    >
                      <label className="text-sm">{s.name}</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCourses(
                              s.courses.map((c) => ({
                                ...c,
                                id: Date.now() + Math.random(),
                              }))
                            );
                          }}
                          className="text-xs text-[#4c1f1f]"
                        >
                          Load
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            saveScenarios(
                              scenarios.filter((x) => x.id !== s.id)
                            );
                          }}
                          className="text-xs text-gray-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 border border-black rounded bg-white text-black">
                <div className="font-medium">Saved Transcript</div>
                <div className="mt-2 text-sm text-black">
                  {savedTranscript ? (
                    <div className="text-sm">
                      <div className="font-medium">{savedTranscript.name}</div>
                      <div className="text-xs">
                        {Math.round(savedTranscript.size / 1024)} KB
                      </div>
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            localStorage.removeItem("aggie_saved_transcript");
                            setSavedTranscript(null);
                          }}
                          className="text-xs text-gray-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-700">
                      No transcript saved locally. Upload and use "Save
                      transcript".
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const f = fileRef.current?.files?.[0];
                    if (f) saveTranscriptToLocal(f);
                  }}
                  className="px-4 py-2 rounded border text-sm"
                >
                  Save transcript
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCourses([{ id: Date.now(), dept: "", number: "" }]);
                    setResults([]);
                    setError(null);
                  }}
                  className="px-4 py-2 rounded border text-sm"
                >
                  Reset
                </button>
              </div>
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#7b2c2c] text-white px-6 py-3 rounded-md shadow-sm hover:opacity-95"
                >
                  {loading ? "Analyzing…" : "Analyze Difficulty"}
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="mt-6">
          {error && (
            <div className="rounded p-3 bg-red-50 text-red-700 border border-red-100">
              {error}
            </div>
          )}

          {results && results.length > 0 ? (
            <div className="space-y-4">
              {results.map((r, idx) => {
                if (!r.ok)
                  return (
                    <div
                      key={idx}
                      className="rounded p-3 bg-yellow-50 border border-yellow-100"
                    >
                      <div className="font-medium">Request failed</div>
                      <div className="text-sm text-gray-700">
                        {r.reason || "Unknown error"}
                      </div>
                    </div>
                  );

                const difficulty = getDifficultyFromRaw(r.value.raw || "");
                const badgeCls =
                  DIFFICULTY_COLORS[difficulty] || DIFFICULTY_COLORS.Unknown;

                return (
                  <article
                    key={idx}
                    className="rounded-lg bg-white shadow-sm border border-black p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <div
                            className="text-2xl font-bold"
                            style={{ color: AGGIE_MAROON }}
                          >
                            {r.value.dept} {r.value.number}
                          </div>
                          <div
                            className={`text-xs px-3 py-1 rounded-full ${badgeCls}`}
                          >
                            {difficulty}
                          </div>
                        </div>
                        <div className="text-sm text-gray-900 mt-3 max-w-3xl">
                          <div
                            className="prose max-w-none text-gray-900"
                            dangerouslySetInnerHTML={{
                              __html: DOMPurify.sanitize(
                                marked.parse(r.value.raw || "")
                              ),
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3">
                        <button
                          onClick={() =>
                            openProfModal(
                              r.value.classes,
                              `${r.value.dept} ${r.value.number}`
                            )
                          }
                          className="text-sm px-3 py-1 bg-[#4c1f1f] text-white rounded"
                        >
                          Compare Professors
                        </button>
                        <div className="text-xs text-gray-700">
                          {r.value.classes?.length ?? 0} class records
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-8 text-sm text-gray-800 text-center">
              No results yet.
            </div>
          )}

          {profModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 text-black max-h-[80vh] overflow-hidden">
                <div className="flex justify-between items-center">
                  <h4 className="text-lg font-semibold">
                    Recent Professors — {profModalData?.title}
                  </h4>
                  <button
                    onClick={() => {
                      setProfModalOpen(false);
                      setProfModalData(null);
                    }}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    Close
                  </button>
                </div>
                <div className="mt-4 text-black">
                  {(() => {
                    const stats =
                      profModalData?.classes &&
                      Array.isArray(profModalData.classes)
                        ? profModalData.classes
                        : [];
                    if (!stats || stats.length === 0)
                      return <div>No recent professor data available.</div>;
                    const computed = computeRecentProfessorStats(stats);
                    return (
                      <div className="space-y-3">
                        <div className="max-h-[60vh] overflow-y-auto pr-2">
                          {computed.slice(0, 20).map((s) => (
                            <div
                              key={s.prof}
                              className="border rounded p-3 mb-3"
                            >
                              <div className="flex justify-between items-center">
                                <div className="font-medium text-black">
                                  {s.prof}
                                </div>
                                <div className="text-sm text-black">
                                  {s.avgGpa !== null
                                    ? `Avg GPA: ${s.avgGpa} (${s.count} classes)`
                                    : `No GPA data (${s.count} classes)`}
                                </div>
                              </div>
                              <div className="mt-2 text-xs text-black">
                                {s.entries.map((e, i) => (
                                  <div key={i}>
                                    {e.semester} {e.year} — GPA:{" "}
                                    {Number(e.gpa).toFixed(2)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
// setRawResult(null);
