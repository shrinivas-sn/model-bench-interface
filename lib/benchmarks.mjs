/**
 * Developer & Terminal Benchmark Aggregations
 *
 * Normalizes and compares official developer metrics across:
 *  - SWE-bench Verified (Real GitHub Issue Resolution)
 *  - Artificial Analysis Indices (Coding, Agentic & Tool-Use, Intelligence)
 *  - LiveBench Polyglot & Code Tasks (Generation, Completion, Python, TS, JS, C++)
 *  - LiveBench Logic & AMPS Math
 *  - Design Arena (Website, Mobile UI, GameDev, SVG, 3D)
 */

export function extractSweBenchSummary(canonicalId, sweRows = []) {
  if (!canonicalId) return null;
  const matches = sweRows.filter(
    (r) => r.canonical_id === canonicalId && r.resolved_pct != null
  );
  if (!matches.length) return null;
  const sorted = [...matches].sort((a, b) => (b.resolved_pct ?? 0) - (a.resolved_pct ?? 0));
  const bestRun = sorted[0];
  return {
    best: bestRun.resolved_pct,
    totalRuns: matches.length,
    topAgent: bestRun.agent || bestRun.system,
    topSystem: bestRun.system,
    runDate: bestRun.run_date,
    url: bestRun.url,
  };
}

export function buildOfficialBenchmarkComparison(modelA, modelB, sweRows = []) {
  const sweA = extractSweBenchSummary(modelA?.canonical_id, sweRows);
  const sweB = extractSweBenchSummary(modelB?.canonical_id, sweRows);

  const aaA = modelA?.external_benchmarks?.artificial_analysis || {};
  const aaB = modelB?.external_benchmarks?.artificial_analysis || {};

  const daA = Array.isArray(modelA?.external_benchmarks?.design_arena)
    ? modelA.external_benchmarks.design_arena
    : [];
  const daB = Array.isArray(modelB?.external_benchmarks?.design_arena)
    ? modelB.external_benchmarks.design_arena
    : [];

  const items = [];

  // 1. SWE-bench Verified
  if (sweA?.best != null || sweB?.best != null) {
    items.push({
      id: "swe-bench-verified",
      category: "swe",
      categoryLabel: "Software Engineering",
      name: "SWE-bench Verified",
      tag: "500 GitHub Issues",
      authority: "SWE-bench Verified",
      description: "Percentage of 500 human-verified GitHub issue tickets autonomously resolved end-to-end (Python repository code modification + test passing).",
      valA: sweA?.best ?? null,
      valB: sweB?.best ?? null,
      unit: "%",
      max: 100,
      detailA: sweA ? `${sweA.best.toFixed(1)}% · ${sweA.totalRuns} runs (${sweA.topAgent || "agent"})` : "Not evaluated",
      detailB: sweB ? `${sweB.best.toFixed(1)}% · ${sweB.totalRuns} runs (${sweB.topAgent || "agent"})` : "Not evaluated",
      urlA: sweA?.url,
      urlB: sweB?.url,
    });
  }

  // 2. Artificial Analysis Coding Index
  const aaCodingA = aaA.coding_index ?? modelA?.categories?.coding ?? null;
  const aaCodingB = aaB.coding_index ?? modelB?.categories?.coding ?? null;
  if (aaCodingA != null || aaCodingB != null) {
    items.push({
      id: "aa-coding-index",
      category: "coding",
      categoryLabel: "Coding & Terminal",
      name: "Artificial Analysis Coding Index",
      tag: "Multi-Language Synthesis",
      authority: "Artificial Analysis",
      description: "Standardized multi-language coding index evaluating syntax accuracy, context synthesis, and algorithmic problem-solving across standard benchmarks.",
      valA: aaCodingA,
      valB: aaCodingB,
      unit: "/100",
      max: 100,
      detailA: aaA.coding_index != null ? "Official Artificial Analysis" : "Derived coding composite",
      detailB: aaB.coding_index != null ? "Official Artificial Analysis" : "Derived coding composite",
    });
  }

  // 3. Artificial Analysis Agentic & Tool-Use Index
  const aaAgenticA = aaA.agentic_index ?? null;
  const aaAgenticB = aaB.agentic_index ?? null;
  if (aaAgenticA != null || aaAgenticB != null) {
    items.push({
      id: "aa-agentic-index",
      category: "agentic",
      categoryLabel: "Agentic & Tool Use",
      name: "Artificial Analysis Agentic & Tool-Use",
      tag: "Terminal & CLI Tools",
      authority: "Artificial Analysis",
      description: "Measures autonomous terminal execution, command sequences, API tool calling, multi-step planning, state tracking, and error recovery.",
      valA: aaAgenticA,
      valB: aaAgenticB,
      unit: "/100",
      max: 100,
      detailA: aaAgenticA != null ? "Official Agentic & Tool Index" : "Not measured",
      detailB: aaAgenticB != null ? "Official Agentic & Tool Index" : "Not measured",
    });
  }

  // 4. Artificial Analysis Intelligence Index
  const aaIntelA = aaA.intelligence_index ?? modelA?.categories?.reasoning ?? null;
  const aaIntelB = aaB.intelligence_index ?? modelB?.categories?.reasoning ?? null;
  if (aaIntelA != null || aaIntelB != null) {
    items.push({
      id: "aa-intelligence-index",
      category: "reasoning",
      categoryLabel: "Reasoning & Logic",
      name: "Artificial Analysis Intelligence Index",
      tag: "Complex Logic & Reasoning",
      authority: "Artificial Analysis",
      description: "Multi-step reasoning, mathematical problem decomposition, and deep contextual inference.",
      valA: aaIntelA,
      valB: aaIntelB,
      unit: "/100",
      max: 100,
      detailA: aaA.intelligence_index != null ? "Official Intelligence Index" : "Derived reasoning composite",
      detailB: aaB.intelligence_index != null ? "Official Intelligence Index" : "Derived reasoning composite",
    });
  }

  // 5. LiveBench Code Generation
  const lbCodeGenA = modelA?.tasks?.code_generation ?? null;
  const lbCodeGenB = modelB?.tasks?.code_generation ?? null;
  if (lbCodeGenA != null || lbCodeGenB != null) {
    items.push({
      id: "lb-code-generation",
      category: "coding",
      categoryLabel: "Coding & Terminal",
      name: "LiveBench Code Generation",
      tag: "Algorithm Generation",
      authority: "LiveBench",
      description: "Contamination-free benchmark testing function and algorithmic synthesis from formal problem descriptions.",
      valA: lbCodeGenA,
      valB: lbCodeGenB,
      unit: "/100",
      max: 100,
      detailA: lbCodeGenA != null ? "LiveBench evaluation" : "Not evaluated",
      detailB: lbCodeGenB != null ? "LiveBench evaluation" : "Not evaluated",
    });
  }

  // 6. LiveBench Code Completion
  const lbCodeCompA = modelA?.tasks?.code_completion ?? null;
  const lbCodeCompB = modelB?.tasks?.code_completion ?? null;
  if (lbCodeCompA != null || lbCodeCompB != null) {
    items.push({
      id: "lb-code-completion",
      category: "coding",
      categoryLabel: "Coding & Terminal",
      name: "LiveBench Code Completion",
      tag: "Context Completion",
      authority: "LiveBench",
      description: "Fills in complex code blocks with contextual awareness of surrounding repository modules.",
      valA: lbCodeCompA,
      valB: lbCodeCompB,
      unit: "/100",
      max: 100,
      detailA: lbCodeCompA != null ? "LiveBench evaluation" : "Not evaluated",
      detailB: lbCodeCompB != null ? "LiveBench evaluation" : "Not evaluated",
    });
  }

  // 7. LiveBench Polyglot Breakdown (Python, TypeScript, JavaScript, C++)
  const polyglotTasks = [
    { key: "python", name: "Python Language Synthesis", tag: "Python" },
    { key: "typescript", name: "TypeScript Type & Logic", tag: "TypeScript" },
    { key: "javascript", name: "JavaScript Web Logic", tag: "JavaScript" },
    { key: "cpp", name: "C++ Systems Code", tag: "C++" },
  ];

  for (const { key, name, tag } of polyglotTasks) {
    const vA = modelA?.tasks?.[key] ?? null;
    const vB = modelB?.tasks?.[key] ?? null;
    if (vA != null || vB != null) {
      items.push({
        id: `lb-polyglot-${key}`,
        category: "polyglot",
        categoryLabel: "Polyglot & Languages",
        name,
        tag,
        authority: "LiveBench Polyglot",
        description: `Language-specific benchmark evaluating syntax accuracy, idiomatic constructs, and type correctness in ${tag}.`,
        valA: vA,
        valB: vB,
        unit: "/100",
        max: 100,
        detailA: vA != null ? `${tag} score: ${vA.toFixed(1)}` : "Not evaluated",
        detailB: vB != null ? `${tag} score: ${vB.toFixed(1)}` : "Not evaluated",
      });
    }
  }

  // 8. LiveBench Logic & AMPS Math
  const mathTasks = [
    { key: "amps_math", name: "AMPS Mathematical Reasoning", tag: "Competition Math" },
    { key: "logic_puzzle", name: "Logic Puzzles & Spatial Reasoning", tag: "Logic Puzzles" },
  ];

  for (const { key, name, tag } of mathTasks) {
    const vA = modelA?.tasks?.[key] ?? null;
    const vB = modelB?.tasks?.[key] ?? null;
    if (vA != null || vB != null) {
      items.push({
        id: `lb-math-${key}`,
        category: "reasoning",
        categoryLabel: "Reasoning & Logic",
        name,
        tag,
        authority: "LiveBench Reasoning",
        description: `Rigorous problem solving benchmark testing mathematical proof steps and logical deduction.`,
        valA: vA,
        valB: vB,
        unit: "/100",
        max: 100,
        detailA: vA != null ? `${tag} score: ${vA.toFixed(1)}` : "Not evaluated",
        detailB: vB != null ? `${tag} score: ${vB.toFixed(1)}` : "Not evaluated",
      });
    }
  }

  // 9. Design Arena (Frontend UI / App / GameDev)
  const designCategories = ["website", "mobileapps", "gamedev", "svg", "3d"];
  for (const cat of designCategories) {
    const entryA = daA.find((e) => e.category === cat);
    const entryB = daB.find((e) => e.category === cat);
    if (entryA || entryB) {
      const catLabel = cat === "website" ? "Website Generation" : cat === "mobileapps" ? "Mobile Apps UI" : cat === "gamedev" ? "Game Development" : cat === "svg" ? "Vector SVG Code" : "3D Graphics";
      items.push({
        id: `design-arena-${cat}`,
        category: "design",
        categoryLabel: "Frontend & Design",
        name: `Design Arena · ${catLabel}`,
        tag: `Arena ${cat.toUpperCase()}`,
        authority: "Design Arena",
        description: `Head-to-head human and automated evaluations for ${catLabel} quality, aesthetic appeal, and layout precision.`,
        valA: entryA?.elo ?? null,
        valB: entryB?.elo ?? null,
        unit: "elo",
        max: 1800,
        detailA: entryA ? `Elo ${entryA.elo} · Rank #${entryA.rank} (${entryA.win_rate}% win rate)` : "Unranked",
        detailB: entryB ? `Elo ${entryB.elo} · Rank #${entryB.rank} (${entryB.win_rate}% win rate)` : "Unranked",
      });
    }
  }

  return items;
}
