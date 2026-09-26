"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Command } from "cmdk";
import { Drawer } from "vaul";
import type { LivebenchModel } from "@/lib/data";
import { groupModels, formatFamilyLabel, EFFORT_LEVELS } from "@/lib/picker.mjs";
import Link from "next/link";
import "./model-picker.css";

export type ModelPickerProps = {
  models: LivebenchModel[];
  value: string; // benchmark_name
  onChange(name: string): void;
  slotLabel: string;
  vendorDisplay: Record<string, string>;
  open?: boolean;
  onOpenChange?(open: boolean): void;
};

const RECENTS_KEY = "mb.recentModels";

function loadRecents(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch {
    return [];
  }
}

function recordRecent(name: string) {
  if (typeof window === "undefined" || !name) return;
  try {
    const current = loadRecents().filter((n) => n !== name);
    current.unshift(name);
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(current.slice(0, 5)));
  } catch {
    // Ignore localStorage exceptions
  }
}

export function EffortChip({
  effort,
  onClick,
  active,
}: {
  effort: string | null;
  onClick?: (e: React.MouseEvent) => void;
  active?: boolean;
}) {
  const chipClass = effort
    ? `effort-chip effort-chip-${effort}`
    : "effort-chip effort-chip-null";
  const label = effort || "not stated";

  if (onClick) {
    return (
      <span
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick(e as unknown as React.MouseEvent);
          }
        }}
        className={`${chipClass} picker-chip-clickable ${active ? "picker-chip-active" : ""}`}
      >
        {label}
      </span>
    );
  }

  return <span className={chipClass}>{label}</span>;
}

export function ModelPicker({
  models,
  value,
  onChange,
  slotLabel,
  vendorDisplay,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: ModelPickerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const setIsOpen = useCallback(
    (open: boolean) => {
      if (!isControlled) {
        setInternalOpen(open);
      }
      controlledOnOpenChange?.(open);
    },
    [isControlled, controlledOnOpenChange]
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [recents, setRecents] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport (< 640px)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Load recents on mount and when palette opens
  useEffect(() => {
    if (isOpen) {
      setRecents(loadRecents());
    }
  }, [isOpen]);

  // Global Ctrl+K / Cmd+K shortcut for slot A
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

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, setIsOpen]);

  const currentModel = useMemo(
    () => models.find((m) => m.benchmark_name === value) || null,
    [models, value]
  );

  const vendorGroups = useMemo(
    () => groupModels(models, vendorDisplay),
    [models, vendorDisplay]
  );

  const recentModels = useMemo(() => {
    return recents
      .map((name) => models.find((m) => m.benchmark_name === name))
      .filter((m): m is LivebenchModel => Boolean(m));
  }, [recents, models]);

  const handleSelect = (benchmarkName: string) => {
    onChange(benchmarkName);
    recordRecent(benchmarkName);
    setIsOpen(false);
    setSearchQuery("");
  };

  const currentVendorName = currentModel
    ? vendorDisplay[currentModel.display_vendor] || currentModel.display_vendor
    : "Select Model";
  const currentFamilyLabel = currentModel
    ? formatFamilyLabel(currentModel.family_id || currentModel.benchmark_name)
    : "Choose Model";
  const currentPromptPrice = currentModel?.pricing?.prompt != null
    ? `$${currentModel.pricing.prompt.toFixed(2)}/M in`
    : null;

  // Command palette inner contents
  const paletteContent = (
    <Command
      className="picker-command"
      shouldFilter={true}
      loop
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setIsOpen(false);
        }
      }}
    >
      <div className="picker-input-wrap">
        <span className="picker-search-icon">🔍</span>
        <Command.Input
          className="picker-input"
          placeholder="Search models, companies, effort…"
          value={searchQuery}
          onValueChange={setSearchQuery}
          autoFocus
        />
        {slotLabel === "A" && !isMobile && (
          <span className="picker-shortcut-badge">Esc to close</span>
        )}
      </div>

      <Command.List className="picker-list">
        <Command.Empty className="picker-empty">
          No model matches &ldquo;{searchQuery}&rdquo;.
          <div className="picker-empty-hint">
            Unmatched LiveBench names are listed on{" "}
            <Link href="/quality" onClick={() => setIsOpen(false)}>
              /quality
            </Link>
          </div>
        </Command.Empty>

        {/* Recents Group */}
        {!searchQuery && recentModels.length > 0 && (
          <Command.Group heading="Recent picks" className="picker-group">
            {recentModels.map((m) => {
              const familyLabel = formatFamilyLabel(m.family_id || m.benchmark_name);
              const vendor = vendorDisplay[m.display_vendor] || m.display_vendor;
              return (
                <Command.Item
                  key={`recent-${m.benchmark_name}`}
                  value={`recent-${m.benchmark_name}`}
                  keywords={[familyLabel, vendor, m.benchmark_name, m.effort || ""]}
                  onSelect={() => handleSelect(m.benchmark_name)}
                  className="picker-item"
                >
                  <div className="picker-item-left">
                    <span className="picker-item-label">{familyLabel}</span>
                    <span className="dim" style={{ fontSize: "0.75rem" }}>
                      ({vendor})
                    </span>
                    <EffortChip effort={m.effort} />
                    {m.thinking && <span className="thinking-badge">thinking</span>}
                  </div>
                  <div className="picker-item-right">
                    {m.pricing?.prompt != null && (
                      <span className="picker-price mono">
                        ${m.pricing.prompt.toFixed(2)}/M
                      </span>
                    )}
                  </div>
                </Command.Item>
              );
            })}
          </Command.Group>
        )}

        {/* Vendor Groups */}
        {vendorGroups.map((group) => (
          <Command.Group
            key={group.vendor}
            heading={`${group.vendor_name} (${group.model_count})`}
            className="picker-group"
          >
            {group.families.map((family) => {
              const hasMultipleVariants = family.variants.length > 1;

              return (
                <Command.Item
                  key={family.family_id}
                  value={family.family_id}
                  keywords={[family.keywords]}
                  onSelect={() => handleSelect(family.primary.benchmark_name)}
                  className="picker-item"
                >
                  <div className="picker-item-left">
                    <span className="picker-item-label">{family.family_label}</span>

                    {/* Effort chips */}
                    <div className="picker-chips-container">
                      {hasMultipleVariants ? (
                        family.variants.map((v) => (
                          <EffortChip
                            key={v.benchmark_name}
                            effort={v.effort}
                            active={v.benchmark_name === value}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelect(v.benchmark_name);
                            }}
                          />
                        ))
                      ) : (
                        <EffortChip effort={family.primary.effort} />
                      )}

                      {family.primary.thinking && (
                        <span className="thinking-badge">thinking</span>
                      )}
                    </div>
                  </div>

                  <div className="picker-item-right">
                    {family.overall_score != null && (
                      <div className="picker-score-bar-wrap" title={`Overall mean: ${family.overall_score}`}>
                        <div className="picker-score-bar-track">
                          <div
                            className="picker-score-bar-fill"
                            style={{ width: `${Math.min(100, family.overall_score)}%` }}
                          />
                        </div>
                        <span className="picker-score-text mono">{family.overall_score}</span>
                      </div>
                    )}

                    {family.pricing?.prompt != null ? (
                      <span className="picker-price mono">
                        ${family.pricing.prompt.toFixed(2)}/M
                      </span>
                    ) : (
                      <span className="picker-price dim">—</span>
                    )}
                  </div>
                </Command.Item>
              );
            })}
          </Command.Group>
        ))}
      </Command.List>
    </Command>
  );

  return (
    <div className="model-picker-wrap">
      {/* Hit-area Trigger Button */}
      <button
        type="button"
        className="picker-trigger-btn"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <div className="picker-trigger-left">
          <div className="picker-trigger-header">
            <span className="picker-slot-badge">Model {slotLabel}</span>
            <span className="picker-company-name">{currentVendorName}</span>
          </div>
          <div className="picker-trigger-main">
            <span className="picker-model-title">{currentFamilyLabel}</span>
            <EffortChip effort={currentModel?.effort ?? null} />
            {currentModel?.thinking && (
              <span className="thinking-badge">thinking</span>
            )}
          </div>
        </div>

        <div className="picker-trigger-right">
          {currentPromptPrice && (
            <span className="picker-price mono">{currentPromptPrice}</span>
          )}
          <span className="picker-trigger-caret">▼</span>
        </div>
      </button>

      {/* Modal Dialog for Desktop (>= 640px) */}
      {!isMobile && isOpen && (
        <div
          className="picker-dialog-overlay"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="picker-dialog-content"
            onClick={(e) => e.stopPropagation()}
          >
            {paletteContent}
          </div>
        </div>
      )}

      {/* Vaul Bottom Sheet for Mobile (< 640px) */}
      {isMobile && (
        <Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
          <Drawer.Portal>
            <Drawer.Overlay className="picker-sheet-overlay" />
            <Drawer.Content className="picker-sheet-content">
              <Drawer.Handle className="picker-sheet-handle" />
              {paletteContent}
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      )}
    </div>
  );
}
