"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import { Drawer } from "vaul";
import Link from "next/link";

import type { LivebenchModel } from "@/lib/data";
import {
  formatFamilyLabel,
  formatPerMillion,
  groupModels,
  readRecents,
  searchFamilies,
  writeRecents,
} from "@/lib/picker.mjs";
import { EffortChip } from "./EffortChip";
import { ArrowLeftIcon, ChevronDownIcon, SearchIcon } from "./icons";
import "./model-picker.css";

export type ModelPickerProps = {
  models: LivebenchModel[];
  /** benchmark_name of the selected variant */
  value: string;
  onChange(name: string): void;
  slotLabel: string;
  vendorDisplay: Record<string, string>;
  open?: boolean;
  onOpenChange?(open: boolean): void;
};

type Stage = "company" | "model";

/** Shapes returned by lib/picker.mjs, typed here so the render code is checked. */
type PickerFamily = {
  family_id: string;
  family_label: string;
  vendor: string;
  vendor_name: string;
  variants: LivebenchModel[];
  primary: LivebenchModel;
  overall_score: number | null;
  pricing: { input_per_million: number | null; output_per_million: number | null } | null;
  keywords: string;
};

type PickerGroup = {
  vendor: string;
  vendor_name: string;
  model_count: number;
  families: PickerFamily[];
};

/** localStorage can throw (private mode, blocked cookies) — never let it escape. */
function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function ModelPicker({
  models = [],
  value,
  onChange,
  slotLabel,
  vendorDisplay = {},
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: ModelPickerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const setIsOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      controlledOnOpenChange?.(next);
    },
    [isControlled, controlledOnOpenChange]
  );

  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<Stage>("company");
  const [vendor, setVendor] = useState<string | null>(null);
  const [recents, setRecents] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Every open starts at step one, so the flow is always predictable.
  useEffect(() => {
    if (!isOpen) return;
    setSearch("");
    setStage("company");
    setVendor(null);
    setRecents(readRecents(storage()));
  }, [isOpen]);

  // Ctrl/⌘+K opens slot A from anywhere on the page.
  useEffect(() => {
    if (slotLabel !== "A") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [slotLabel, isOpen, setIsOpen]);

  const groups = useMemo<PickerGroup[]>(
    () => groupModels(models, vendorDisplay) as PickerGroup[],
    [models, vendorDisplay]
  );

  const currentModel = useMemo(
    () => models.find((m) => m.benchmark_name === value) ?? null,
    [models, value]
  );

  const activeGroup = useMemo<PickerGroup | null>(
    () => groups.find((g) => g.vendor === vendor) ?? null,
    [groups, vendor]
  );

  const results = useMemo<{ family: PickerFamily; vendor: string; vendor_name: string }[]>(
    () => searchFamilies(groups, search),
    [groups, search]
  );
  const searching = search.trim().length > 0;

  const recentModels = useMemo(
    () =>
      recents
        .map((name) => models.find((m) => m.benchmark_name === name))
        .filter((m): m is LivebenchModel => Boolean(m)),
    [recents, models]
  );

  const commit = useCallback(
    (benchmarkName: string) => {
      onChange(benchmarkName);
      setRecents(writeRecents(storage(), benchmarkName));
      setIsOpen(false);
    },
    [onChange, setIsOpen]
  );

  /** Choosing a family immediately selects its primary variant and closes the picker. */
  const chooseFamily = useCallback(
    (family: PickerFamily) => {
      const bestName = family.variants[0]?.benchmark_name || family.primary?.benchmark_name || family.family_id;
      commit(bestName);
    },
    [commit]
  );

  const goBack = useCallback(() => {
    if (stage === "model") {
      setStage("company");
      setVendor(null);
    } else {
      setIsOpen(false);
    }
  }, [stage, setIsOpen]);

  const selectedEffortFor = (family: PickerFamily | null) =>
    family?.variants.find((v) => v.benchmark_name === value)?.benchmark_name ?? null;

  const currentVendorName = currentModel
    ? vendorDisplay[currentModel.display_vendor] || currentModel.display_vendor
    : "Choose a company";
  const currentFamilyLabel = currentModel
    ? formatFamilyLabel(currentModel.family_id || currentModel.benchmark_name)
    : "No model selected";

  /* ---------------- shared rows ---------------- */

  const familyRow = (family: PickerFamily, keyPrefix: string) => {
    const isCurrentFamily = currentModel?.family_id === family.family_id;
    return (
      <Command.Item
        key={`${keyPrefix}-${family.family_id}`}
        value={`${keyPrefix}-${family.family_id}`}
        keywords={[family.keywords]}
        onSelect={() => chooseFamily(family)}
        className="picker-item"
        data-current={isCurrentFamily}
      >
        <div className="picker-item-left">
          <span className="picker-item-label">{family.family_label}</span>
          <span className="picker-chips-container">
            {family.variants.some((v) => v.effort != null) ? (
              family.variants
                .filter((v) => v.effort != null)
                .map((v) => <EffortChip key={v.benchmark_name} effort={v.effort} />)
            ) : (
              <EffortChip effort={null} />
            )}
            {family.variants.some((v) => v.thinking) && (
              <span className="thinking-badge">thinking</span>
            )}
          </span>
          {isCurrentFamily && <span className="picker-item-sub">selected</span>}
        </div>

        <div className="picker-item-right">
          {family.overall_score != null && (
            <div
              className="picker-score-bar-wrap"
              title={`LiveBench overall: ${family.overall_score}`}
            >
              <div className="picker-score-bar-track">
                <div
                  className="picker-score-bar-fill"
                  style={{ width: `${Math.min(100, Math.max(0, family.overall_score))}%` }}
                />
              </div>
              <span className="picker-score-text mono">{family.overall_score}</span>
            </div>
          )}
          <span className="picker-price mono">
            {formatPerMillion(family.pricing?.input_per_million ?? null)}/M
          </span>
        </div>
      </Command.Item>
    );
  };

  const recentRow = (m: LivebenchModel) => (
    <Command.Item
      key={`recent-${m.benchmark_name}`}
      value={`recent-${m.benchmark_name}`}
      keywords={[m.benchmark_name, m.family_id, m.effort ?? ""]}
      onSelect={() => commit(m.benchmark_name)}
      className="picker-item"
    >
      <div className="picker-item-left">
        <span className="picker-item-label">
          {formatFamilyLabel(m.family_id || m.benchmark_name)}
        </span>
        <span className="picker-chips-container">
          <EffortChip effort={m.effort} />
          {m.thinking && <span className="thinking-badge">thinking</span>}
        </span>
      </div>
      <div className="picker-item-right">
        <span className="picker-price mono">
          {formatPerMillion(m.pricing?.input_per_million ?? null)}/M
        </span>
      </div>
    </Command.Item>
  );

  /* ---------------- stages ---------------- */

  const companyStage = (
    <>
      {recentModels.length > 0 && (
        <Command.Group heading="Recent" className="picker-group">
          {recentModels.map(recentRow)}
        </Command.Group>
      )}

      <Command.Group
        heading={`Companies (${groups.length})`}
        className="picker-group picker-company-group"
      >
        {groups.map((g) => (
          <Command.Item
            key={g.vendor}
            value={`company-${g.vendor}`}
            keywords={[g.vendor_name, g.vendor]}
            onSelect={() => {
              setVendor(g.vendor);
              setStage("model");
            }}
            className="picker-company-btn"
          >
            <span>{g.vendor_name}</span>
            <span className="picker-company-count">{g.model_count}</span>
          </Command.Item>
        ))}
      </Command.Group>
    </>
  );

  const modelStage = activeGroup && (
    <Command.Group
      heading={`${activeGroup.vendor_name} — ${activeGroup.families.length} models`}
      className="picker-group"
    >
      {activeGroup.families.map((f) => familyRow(f, "family"))}
    </Command.Group>
  );

  const searchResults = (
    <Command.Group heading={`${results.length} match${results.length === 1 ? "" : "es"}`} className="picker-group">
      {results.map(({ family }) => familyRow(family, `hit-${family.vendor}`))}
    </Command.Group>
  );

  const paletteContent = (
    <Command
      className="picker-command"
      shouldFilter={false}
      loop
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          goBack();
        }
      }}
    >
      <div className="picker-input-wrap">
        <span className="picker-search-icon">
          <SearchIcon size={15} />
        </span>
        <Command.Input
          className="picker-input"
          placeholder="Search company or model…"
          value={search}
          onValueChange={setSearch}
          autoFocus={!isMobile}
        />
        <span className="picker-shortcut-badge">
          {searching ? `${results.length} found` : stage === "company" ? "Esc" : "Esc to go back"}
        </span>
      </div>

      {/* Breadcrumb trail: Companies > Vendor Name */}
      {!searching && stage === "model" && (
        <div className="picker-stage-head">
          <button type="button" className="picker-back-btn" onClick={goBack}>
            <ArrowLeftIcon size={13} /> Back
          </button>
          <div className="picker-crumbs">
            <span className="picker-crumb">Companies</span>
            <span className="picker-crumb-sep">›</span>
            <span className="picker-crumb" data-current="true">
              {activeGroup?.vendor_name ?? "—"}
            </span>
          </div>
        </div>
      )}

      <Command.List className="picker-list">
        {searching && results.length === 0 ? (
          <Command.Empty className="picker-empty">
            No model matches &ldquo;{search}&rdquo;.
            <div className="picker-empty-hint">
              Try a company (anthropic), a family (opus), or a model name. Names that
              could not be matched to the OpenRouter catalog are listed on{" "}
              <Link href="/quality" onClick={() => setIsOpen(false)}>
                /quality
              </Link>
              .
            </div>
          </Command.Empty>
        ) : searching ? (
          searchResults
        ) : stage === "company" ? (
          companyStage
        ) : (
          modelStage
        )}
      </Command.List>
    </Command>
  );

  return (
    <div className="model-picker-wrap">
      <button
        type="button"
        className="picker-trigger-btn"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`Change model ${slotLabel}. Currently ${currentVendorName} ${currentFamilyLabel}.`}
      >
        <span className="picker-trigger-left">
          <span className="picker-slot-badge" data-slot={slotLabel}>
            {slotLabel}
          </span>
          <span className="picker-trigger-text">
            <span className="picker-company-name">{currentVendorName}</span>
            <span className="picker-trigger-main">
              <span className="picker-model-title">{currentFamilyLabel}</span>
              <EffortChip effort={currentModel?.effort ?? null} />
              {currentModel?.thinking && <span className="thinking-badge">thinking</span>}
            </span>
          </span>
        </span>

        <span className="picker-trigger-right">
          {currentModel?.pricing?.input_per_million != null && (
            <span className="picker-price mono">
              {formatPerMillion(currentModel.pricing.input_per_million)}/M
            </span>
          )}
          <span className="picker-trigger-caret">
            <ChevronDownIcon size={14} />
          </span>
        </span>
      </button>

      {!isMobile && isOpen && (
        <div className="picker-dialog-overlay" onClick={() => setIsOpen(false)}>
          <div
            className="picker-dialog-content"
            role="dialog"
            aria-modal="true"
            aria-label={`Choose model ${slotLabel}`}
            onClick={(e) => e.stopPropagation()}
          >
            {paletteContent}
          </div>
        </div>
      )}

      {isMobile && (
        <Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
          <Drawer.Portal>
            <Drawer.Overlay className="picker-sheet-overlay" />
            <Drawer.Content className="picker-sheet-content" aria-label={`Choose model ${slotLabel}`}>
              <Drawer.Handle className="picker-sheet-handle" />
              {paletteContent}
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      )}
    </div>
  );
}
