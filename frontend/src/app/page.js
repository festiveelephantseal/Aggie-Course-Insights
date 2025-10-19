"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { marked } from "marked";
import DOMPurify from "dompurify";

const AGGIE_MAROON = "#500000";
const AGGIE_WHITE = "#ffffff";

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
const TERMS = ["Fall 2025", "Spring 2026", "Summer 2026", "Fall 2026"];

function isProbablyCourseNumber(value) {
  if (!value) return false;
  return /(^\d{2,4}$)|(^[A-Za-z]{2,6}\s*\d{2,4}$)/.test(value.trim());
}

export default function AggiePredictor() {
  const [dept, setDept] = useState("");
  const [courseNumber, setCourseNumber] = useState("");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [rawResult, setRawResult] = useState(null);
  const [resultHtml, setResultHtml] = useState(null);
  const [error, setError] = useState(null);
  const [classesData, setClassesData] = useState([]);
  const [profModalOpen, setProfModalOpen] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    const el = document.getElementById("dept-input");
    if (el) el.focus();
  }, []);

  useEffect(() => {
    if (!rawResult) return setResultHtml(null);
    try {
      const html = marked.parse(rawResult || "");
      const safe = DOMPurify.sanitize(html);
      setResultHtml(safe);
    } catch (err) {
      setResultHtml(`<pre>${String(rawResult)}</pre>`);
    }
  }, [rawResult]);

  function validate() {
    if (!fileRef.current?.files?.[0]) return "Please upload a transcript PDF.";
    if (!dept || dept.trim().length < 2)
      return "Please enter a department code or name.";
    if (!courseNumber || !isProbablyCourseNumber(courseNumber))
      return "Please enter a valid course number (e.g. 101 or ENGL 104).";
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setRawResult(null);

    const v = validate();
    if (v) return setError(v);

    const file = fileRef.current.files[0];
    if (!file) return setError("No file selected");
    if (file.type !== "application/pdf")
      return setError("Only PDF transcripts are accepted.");

    setLoading(true);
    try {
      const params = new URLSearchParams({
        dept: dept.trim(),
        number: courseNumber.trim(),
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
      // Save classes array for professor comparison UI
      setClassesData(json?.classes ?? []);
      const analysis = json?.aiAnalysis ?? json?.analysis ?? json ?? null;
      if (!analysis) return setError("No analysis returned from server.");
      setRawResult(
        typeof analysis === "string"
          ? analysis
          : JSON.stringify(analysis, null, 2)
      );
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  function computeRecentProfessorStats(classesArr) {
    if (!Array.isArray(classesArr) || classesArr.length === 0) return [];
    // Prefer the last 1-2 years relative to current year (e.g., 2024 & 2023
    // when currentYear is 2025). If none found, fall back to the latest
    // years present in the data.
    const currentYear = new Date().getFullYear();
    const allowedYears = [currentYear - 1, currentYear - 2];

    let recent = classesArr.filter((c) => {
      const y = parseInt(c.year, 10);
      return Number.isFinite(y) && allowedYears.includes(y);
    });

    // Fallback: if no classes in the last 1-2 years, use the most recent
    // year present in the data and the year before it (data-driven fallback).
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

    // Group by prof and compute average gpa
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

    // Sort by avgGpa desc (nulls last) then by count desc
    stats.sort((a, b) => {
      if (a.avgGpa === null && b.avgGpa === null) return b.count - a.count;
      if (a.avgGpa === null) return 1;
      if (b.avgGpa === null) return -1;
      return b.avgGpa - a.avgGpa || b.count - a.count;
    });

    return stats;
  }

  function handleOpenCompare() {
    if (!classesData || classesData.length === 0) return;
    setProfModalOpen(true);
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top maroon header */}
      <header className="bg-[#500000] text-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded flex items-center justify-center">
              <Image src="/tamu-logo.svg" alt="TAMU" width={28} height={28} />
            </div>
            <div>
              <div className="font-bold">Aggie Course Insights</div>
              {/* <div className="text-xs opacity-90">Texas A&amp;M University</div> */}
            </div>
          </div>
          {/* <div className="text-sm opacity-90">
            Howdy! <span className="ml-2">🎓</span>
          </div> */}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Hero card */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-[#500000] text-center">
            Predict how difficult a course will be!
          </h2>
          <p className="mt-4 text-center text-gray-800">
            Upload your transcript and discover how challenging your next course
            will be
          </p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit}>
            {/* Dropzone */}
            {/* Dropzone */}
            <label className="block text-sm font-medium text-black mb-2">
              📄 Upload Transcript (PDF)
            </label>

            {/* Make this container relative so the absolute input is scoped to it */}
            <div className="border-2 border-dashed border-gray-300 rounded-md p-10 text-center mb-6 bg-gray-50 relative">
              <div className="mx-auto max-w-xs pointer-events-none">
                <div className="text-3xl">📁</div>
                <div className="mt-3 text-sm text-black">
                  Click to upload PDF file
                </div>
                <div className="mt-1 text-xs text-gray-600">
                  PDF files only · Drag and drop supported
                </div>

                <div className="mt-2 text-xs text-black">
                  {fileName || "No file chosen"}
                </div>
              </div>

              {/* Invisible functional file input overlay, scoped to the dropzone (relative parent) */}
              <input
                id="file-input"
                ref={fileRef}
                type="file"
                accept="application/pdf"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
                className="absolute inset-0 z-10 opacity-0 cursor-pointer"
                // optional: allow keyboard focus
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="dept-input"
                  className="block text-sm font-medium text-gray-800"
                >
                  🏛️ Department
                </label>
                <select
                  id="dept-input"
                  value={dept}
                  onChange={(e) => setDept(e.target.value)}
                  className="mt-2 block w-full rounded border px-3 py-2 bg-white text-black"
                >
                  <option value="">Select department</option>
                  {COMMON_DEPTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="course-input"
                  className="block text-sm font-medium text-gray-800"
                >
                  🎓 Course Number
                </label>
                <input
                  id="course-input"
                  value={courseNumber}
                  onChange={(e) => setCourseNumber(e.target.value)}
                  className="mt-2 block w-full rounded border px-3 py-2 text-black"
                  placeholder="e.g., 301 or CS 101"
                />
              </div>
            </div>

            {/* term removed as requested */}

            <div className="mt-6 flex justify-center gap-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-[#7b2c2c] text-white px-6 py-3 rounded-md shadow-sm hover:opacity-95"
              >
                {loading ? "Analyzing…" : "Analyze Difficulty"}
              </button>

              <button
                type="button"
                onClick={handleOpenCompare}
                disabled={!classesData || classesData.length === 0}
                className="bg-[#4c1f1f] text-white px-4 py-3 rounded-md shadow-sm hover:opacity-95 disabled:opacity-50"
              >
                Compare Professors
              </button>
            </div>
          </form>

          {/* Result area */}
          <div className="mt-6">
            {error && (
              <div className="rounded p-3 bg-red-50 text-red-700 border border-red-100">
                {error}
              </div>
            )}

            {rawResult ? (
              <article
                className="mt-4 rounded p-4 bg-gray-50 border"
                style={{ borderColor: AGGIE_MAROON }}
              >
                <h3
                  className="text-lg font-semibold"
                  style={{ color: AGGIE_MAROON }}
                >
                  Advisor analysis
                </h3>
                <div
                  className="mt-2 prose max-w-none text-gray-800"
                  dangerouslySetInnerHTML={{
                    __html: resultHtml ?? `<pre>${rawResult}</pre>`,
                  }}
                />
                {/* Compare button moved to form controls */}
              </article>
            ) : (
              <div className="mt-4 text-sm text-gray-800 text-center">
                No results yet.
              </div>
            )}
            {/* Professors modal */}
            {profModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 text-black max-h-[80vh] overflow-hidden">
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-semibold">Recent Professors</h4>
                    <button
                      onClick={() => setProfModalOpen(false)}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      Close
                    </button>
                  </div>
                  <div className="mt-4 text-black">
                    {(() => {
                      const stats = computeRecentProfessorStats(classesData);
                      if (!stats || stats.length === 0)
                        return <div>No recent professor data available.</div>;

                      return (
                        <div className="space-y-3">
                          <div className="max-h-[60vh] overflow-y-auto pr-2">
                            {stats.slice(0, 20).map((s) => (
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
                                  {s.entries.map((e, idx) => (
                                    <div key={idx}>
                                      {e.semester} {e.year} — GPA: {e.gpa}
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
        </div>
      </main>
    </div>
  );
}
