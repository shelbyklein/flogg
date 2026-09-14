import { useState, useRef, useEffect } from "react";
import { Control, useFieldArray, useWatch, useController } from "react-hook-form";
import { ChevronDown, ChevronRight, Plus, Trash2, Eye, EyeOff, Check, X, ChevronsDownUp, ChevronsUpDown, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FormControl, FormField, FormItem } from "@/components/ui/form";
import { cn } from "@/lib/utils";

export const FILAMENT_CATEGORIES = ["Temperature", "Cooling", "Retraction", "Filament"] as const;
export const PROCESS_CATEGORIES  = ["Quality", "Infill", "Speed", "Acceleration", "Line Width"] as const;
export const CATEGORIES = [...FILAMENT_CATEGORIES, ...PROCESS_CATEGORIES] as const;
export type Category = (typeof CATEGORIES)[number];

export function settingLookupKey(category: string, subcategory: string, name: string) {
  return `${category}|${subcategory}|${name}`;
}

type SettingType = "string" | "number" | "boolean";

interface SettingRow {
  id: string;
  name: string;
  value: string;
  unit?: string;
  category?: string;
  subcategory?: string;
  visible?: boolean;
  type?: SettingType;
}

interface SettingsAccordionProps {
  control: Control<any>;
  fieldsName: string;
  baseValueMap?: Map<string, string>;
  isEditing: boolean;
  prevDiffKeys?: Set<string>;
  settingsSearch?: string;
}

function CategoryIcon({ category }: { category: string }) {
  const icons: Record<string, string> = {
    Temperature: "🌡",
    Cooling: "❄",
    Retraction: "↩",
    Filament: "🧵",
    Quality: "◈",
    Infill: "⬡",
    Speed: "⚡",
    Acceleration: "🚀",
    "Line Width": "⟺",
  };
  return <span className="text-base leading-none">{icons[category] ?? "·"}</span>;
}

function SettingRowEditor({
  control,
  fieldIndex,
  lookupKey,
  baseValue,
  isEditing,
  isVisible,
  onRemove,
  prevDiffKeys,
}: {
  control: Control<any>;
  fieldIndex: number;
  lookupKey: string;
  baseValue?: string;
  isEditing: boolean;
  isVisible: boolean;
  onRemove: () => void;
  prevDiffKeys?: Set<string>;
}) {
  const { field: valueField } = useController({
    control,
    name: `settings.${fieldIndex}.value`,
    defaultValue: "",
  });
  const { field: typeField } = useController({
    control,
    name: `settings.${fieldIndex}.type`,
    defaultValue: undefined,
  });
  const { field: visibleField } = useController({
    control,
    name: `settings.${fieldIndex}.visible`,
    defaultValue: false,
  });

  const [nameFocused, setNameFocused] = useState(false);

  const currentValue = valueField.value;
  const currentType: SettingType | undefined = typeField.value || undefined;
  const isBool = currentType === "boolean";

  const isChanged = baseValue !== undefined && currentValue !== baseValue;
  const isInPrevDiff = prevDiffKeys?.has(lookupKey) ?? false;

  // Determine highlight mode
  const copyFromMode = prevDiffKeys !== undefined;
  const showYellow = copyFromMode && isInPrevDiff && !isChanged;
  const showRed = copyFromMode && isChanged;
  const showAmber = !copyFromMode && isChanged;

  const rowBg = showRed
    ? "bg-red-50 dark:bg-red-950/30 -mx-2 px-2"
    : showYellow
    ? "bg-yellow-50 dark:bg-yellow-950/30 -mx-2 px-2"
    : showAmber
    ? "bg-amber-50 dark:bg-amber-950/40 -mx-2 px-2"
    : "";

  const nameBorderClass = showRed
    ? "border-red-400 dark:border-red-600"
    : showYellow
    ? "border-yellow-400 dark:border-yellow-600"
    : showAmber
    ? "border-amber-400 dark:border-amber-600"
    : "";

  const valueBorderClass = showRed
    ? "border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-950/60"
    : showYellow
    ? "border-yellow-400 dark:border-yellow-600"
    : showAmber
    ? "border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/60"
    : "";

  const handleTypeChange = (newType: SettingType) => {
    typeField.onChange(newType);
    if (newType === "boolean") {
      const v = valueField.value;
      valueField.onChange(v === "1" || v === "true" ? "true" : "false");
    }
  };

  if (!isEditing && !isVisible) return null;

  return (
    <div
      className={cn("flex items-center gap-1.5 py-1 rounded transition-colors", rowBg)}
      data-testid={`row-setting-${fieldIndex}`}
    >
      <div className="flex-1 grid grid-cols-5 gap-1 items-center min-w-0">
        {/* Name */}
        <FormField
          control={control}
          name={`settings.${fieldIndex}.name`}
          render={({ field }) => (
            isEditing ? (
              <FormItem className={nameFocused ? "col-span-5" : "col-span-2"}>
                <FormControl>
                  <Input
                    placeholder="Parameter"
                    {...field}
                    onFocus={() => setNameFocused(true)}
                    onBlur={(e) => { setNameFocused(false); field.onBlur(); }}
                    className={cn("text-xs h-8 w-full", nameBorderClass)}
                    data-testid={`input-setting-name-${fieldIndex}`}
                  />
                </FormControl>
              </FormItem>
            ) : (
              <span className="col-span-2 text-xs font-medium text-foreground truncate px-0.5">
                {field.value || <span className="text-muted-foreground/50 italic">—</span>}
              </span>
            )
          )}
        />

        {/* Value — Switch for boolean, Input otherwise — hidden while name is focused */}
        {!nameFocused && (isBool ? (
          isEditing ? (
            <div className="col-span-2 flex items-center gap-2 px-0.5">
              <Switch
                checked={currentValue === "true"}
                onCheckedChange={(checked) => valueField.onChange(checked ? "true" : "false")}
                data-testid={`input-setting-value-${fieldIndex}`}
              />
              <span className="text-xs text-muted-foreground">
                {currentValue === "true" ? "On" : "Off"}
              </span>
            </div>
          ) : (
            <div className="col-span-2 px-0.5">
              <span className={cn(
                "inline-flex text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                currentValue === "true"
                  ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                  : "bg-muted text-muted-foreground"
              )}>
                {currentValue === "true" ? "On" : "Off"}
              </span>
            </div>
          )
        ) : (
          <div className="col-span-2">
            <Input
              placeholder="Value"
              {...valueField}
              type={currentType === "number" ? "number" : "text"}
              className={cn("text-xs h-8 font-mono", valueBorderClass)}
              data-testid={`input-setting-value-${fieldIndex}`}
            />
          </div>
        ))}

        {/* Unit — hidden for boolean, hidden while name is focused */}
        {!nameFocused && (!isBool ? (
          <FormField
            control={control}
            name={`settings.${fieldIndex}.unit`}
            render={({ field }) => (
              isEditing ? (
                <FormItem className="col-span-1">
                  <FormControl>
                    <Input
                      placeholder="Unit"
                      {...field}
                      className="text-xs h-8"
                      data-testid={`input-setting-unit-${fieldIndex}`}
                    />
                  </FormControl>
                </FormItem>
              ) : (
                <span className="col-span-1 text-xs text-muted-foreground truncate px-0.5">
                  {field.value}
                </span>
              )
            )}
          />
        ) : (
          <div className="col-span-1" />
        ))}
      </div>

      {isEditing && (
        <>
          {/* Type selector pills */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {(["string", "number", "boolean"] as const).map((t) => {
              const isActive = (currentType ?? "string") === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeChange(t)}
                  title={t === "string" ? "Text" : t === "number" ? "Number" : "Boolean toggle"}
                  className={cn(
                    "h-5 px-1 rounded text-[9px] font-mono transition-colors leading-none",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground/60 hover:text-muted-foreground"
                  )}
                >
                  {t === "string" ? "Abc" : t === "number" ? "#" : "⏻"}
                </button>
              );
            })}
          </div>

          {/* Visibility toggle */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 flex-shrink-0 transition-colors",
              visibleField.value
                ? "text-foreground hover:text-muted-foreground"
                : "text-muted-foreground/40 hover:text-muted-foreground"
            )}
            onClick={() => visibleField.onChange(!visibleField.value)}
            title={visibleField.value ? "Hide in view mode" : "Show in view mode"}
            data-testid={`button-toggle-visible-${fieldIndex}`}
          >
            {visibleField.value ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" />
            )}
          </Button>

          {/* Delete */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            data-testid={`button-remove-setting-${fieldIndex}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </>
      )}
    </div>
  );
}

function SubcategorySection({
  category,
  subcategory,
  fieldIndices,
  fieldNames,
  visibleIndices,
  control,
  baseValueMap,
  isEditing,
  onRemove,
  onAdd,
  expandAll,
  prevDiffKeys,
  searchQuery,
}: {
  category: string;
  subcategory: string;
  fieldIndices: number[];
  fieldNames: string[];
  visibleIndices: Set<number>;
  control: Control<any>;
  baseValueMap?: Map<string, string>;
  isEditing: boolean;
  onRemove: (index: number) => void;
  onAdd: () => void;
  expandAll?: boolean;
  prevDiffKeys?: Set<string>;
  searchQuery?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (expandAll !== undefined) setOpen(expandAll);
  }, [expandAll]);

  // When a search query is active, auto-expand if we have matches; hide if none
  const q = searchQuery?.trim().toLowerCase() ?? "";
  const subMatchesQuery = q && subcategory.toLowerCase().includes(q);
  const filteredPairs = q
    ? fieldIndices.map((idx, i) => ({ idx, name: fieldNames[i] })).filter(
        ({ name }) => subMatchesQuery || name.toLowerCase().includes(q)
      )
    : fieldIndices.map((idx, i) => ({ idx, name: fieldNames[i] }));

  useEffect(() => {
    if (!q) return;
    setOpen(filteredPairs.length > 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  if (q && filteredPairs.length === 0) return null;

  const activeIndices = filteredPairs.map((p) => p.idx);
  const activeNames   = filteredPairs.map((p) => p.name);

  const displayCount = isEditing
    ? fieldIndices.length
    : fieldIndices.filter((idx) => visibleIndices.has(idx)).length;

  if (!isEditing && displayCount === 0) return null;

  return (
    <div className="ml-1 border-l-2 border-muted pl-3 mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 w-full py-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
        data-testid={`subcategory-${subcategory}`}
      >
        {open ? (
          <ChevronDown className="w-3 h-3 transition-transform" />
        ) : (
          <ChevronRight className="w-3 h-3 transition-transform" />
        )}
        <span className="uppercase tracking-wide">{subcategory}</span>
        <span className="ml-auto text-[10px] font-normal opacity-50">{displayCount}</span>
      </button>

      {open && (
        <div className="space-y-0.5 mt-1">
          {activeIndices.map((idx, i) => {
            const key = settingLookupKey(category, subcategory, activeNames[i]);
            return (
              <SettingRowEditor
                key={idx}
                control={control}
                fieldIndex={idx}
                lookupKey={key}
                baseValue={baseValueMap?.get(key)}
                isEditing={isEditing}
                isVisible={visibleIndices.has(idx)}
                onRemove={() => onRemove(idx)}
                prevDiffKeys={prevDiffKeys}
              />
            );
          })}
          {isEditing && !q && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onAdd}
              className="h-7 text-xs text-muted-foreground hover:text-foreground mt-0.5"
              data-testid={`button-add-to-subcategory-${subcategory}`}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add setting
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function CategorySection({
  category,
  control,
  fields,
  visibleIndices,
  baseValueMap,
  isEditing,
  onAdd,
  onRemove,
  expandAll,
  prevDiffKeys,
  searchQuery,
}: {
  category: string;
  control: Control<any>;
  fields: Array<SettingRow & { _idx: number }>;
  visibleIndices: Set<number>;
  baseValueMap?: Map<string, string>;
  isEditing: boolean;
  onAdd: (category: string, subcategory?: string) => void;
  onRemove: (index: number) => void;
  expandAll?: boolean;
  prevDiffKeys?: Set<string>;
  searchQuery?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (expandAll !== undefined) setOpen(expandAll);
  }, [expandAll]);

  // Filter fields by search query
  const q = searchQuery?.trim().toLowerCase() ?? "";
  const catMatchesQuery = q && category.toLowerCase().includes(q);
  const activeFields = q
    ? fields.filter((f) =>
        catMatchesQuery ||
        f.name.toLowerCase().includes(q) ||
        (f.subcategory ?? "").toLowerCase().includes(q)
      )
    : fields;

  const [addingSubcategory, setAddingSubcategory] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const subcategoryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!q) return;
    setOpen(activeFields.length > 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  if (q && activeFields.length === 0) return null;

  const commitNewSubcategory = () => {
    const name = newSubcategoryName.trim();
    if (name) {
      onAdd(category, name);
    }
    setAddingSubcategory(false);
    setNewSubcategoryName("");
  };

  const subcategoryMap = new Map<string, { indices: number[]; names: string[] }>();
  const noSubcategoryIndices: number[] = [];
  const noSubcategoryNames: string[] = [];

  for (const f of activeFields) {
    const sub = f.subcategory?.trim();
    if (sub) {
      if (!subcategoryMap.has(sub)) subcategoryMap.set(sub, { indices: [], names: [] });
      subcategoryMap.get(sub)!.indices.push(f._idx);
      subcategoryMap.get(sub)!.names.push(f.name);
    } else {
      noSubcategoryIndices.push(f._idx);
      noSubcategoryNames.push(f.name);
    }
  }

  const subcategories = Array.from(subcategoryMap.keys());

  const displayCount = isEditing
    ? fields.length
    : fields.filter((f) => visibleIndices.has(f._idx)).length;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2.5 w-full px-4 py-3 text-sm font-semibold transition-colors text-left",
          open ? "bg-muted/50" : "bg-card hover:bg-muted/30"
        )}
        data-testid={`category-accordion-${category}`}
      >
        <CategoryIcon category={category} />
        <span>{category}</span>
        <span className="ml-auto text-xs font-normal text-muted-foreground mr-1">
          {displayCount} setting{displayCount !== 1 ? "s" : ""}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform duration-200 flex-shrink-0",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="px-4 py-3 space-y-1 border-t border-border bg-card">
          {noSubcategoryIndices.map((idx, i) => {
            const key = settingLookupKey(category, "", noSubcategoryNames[i]);
            return (
              <SettingRowEditor
                key={idx}
                control={control}
                fieldIndex={idx}
                lookupKey={key}
                baseValue={baseValueMap?.get(key)}
                isEditing={isEditing}
                isVisible={visibleIndices.has(idx)}
                onRemove={() => onRemove(idx)}
                prevDiffKeys={prevDiffKeys}
              />
            );
          })}

          {subcategories.map((sub) => (
            <SubcategorySection
              key={sub}
              category={category}
              subcategory={sub}
              fieldIndices={subcategoryMap.get(sub)!.indices}
              fieldNames={subcategoryMap.get(sub)!.names}
              visibleIndices={visibleIndices}
              control={control}
              baseValueMap={baseValueMap}
              isEditing={isEditing}
              onRemove={onRemove}
              onAdd={() => onAdd(category, sub)}
              expandAll={expandAll}
              prevDiffKeys={prevDiffKeys}
              searchQuery={searchQuery}
            />
          ))}

          {displayCount === 0 && !isEditing && (
            <p className="text-xs text-muted-foreground py-1">
              No visible settings. Enable the eye icon on rows while editing.
            </p>
          )}

          {isEditing && (
            <div className="pt-1">
              {addingSubcategory ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    ref={subcategoryInputRef}
                    autoFocus
                    placeholder="Subcategory name…"
                    value={newSubcategoryName}
                    onChange={(e) => setNewSubcategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); commitNewSubcategory(); }
                      if (e.key === "Escape") { setAddingSubcategory(false); setNewSubcategoryName(""); }
                    }}
                    className="h-7 text-xs flex-1"
                    data-testid={`input-new-subcategory-${category}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-primary hover:text-primary/80"
                    onClick={commitNewSubcategory}
                    data-testid={`button-confirm-subcategory-${category}`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground"
                    onClick={() => { setAddingSubcategory(false); setNewSubcategoryName(""); }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAddingSubcategory(true);
                    setOpen(true);
                  }}
                  className="h-7 text-xs w-full border-dashed"
                  data-testid={`button-add-to-category-${category}`}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add subcategory to {category}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SettingsFormAccordion({ control, fieldsName, baseValueMap, isEditing, prevDiffKeys, settingsSearch }: SettingsAccordionProps) {
  const { fields, append, remove } = useFieldArray({ control, name: fieldsName });
  const watchedSettings = useWatch({ control, name: fieldsName }) as Array<SettingRow & { visible?: boolean }> | undefined;

  const [allExpanded, setAllExpanded] = useState(!!isEditing);
  const [changedOnly, setChangedOnly] = useState(!!isEditing);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const typedFields = (fields as Array<SettingRow & { id: string }>).map((f, i) => ({
    ...f,
    _idx: i,
  }));

  const visibleIndices = new Set<number>(
    (watchedSettings ?? [])
      .map((s, i) => (s?.visible === true ? i : -1))
      .filter((i) => i >= 0)
  );

  const hasBaseMap = !!baseValueMap && baseValueMap.size > 0;

  const changedIndices = new Set<number>();
  if (hasBaseMap) {
    (watchedSettings ?? []).forEach((s, i) => {
      if (!s) return;
      const key = settingLookupKey(s.category ?? "", s.subcategory ?? "", s.name ?? "");
      const baseVal = baseValueMap!.get(key);
      if (baseVal !== undefined && s.value !== baseVal) changedIndices.add(i);
    });
  }

  const effectiveVisibleIndices = (changedOnly && hasBaseMap)
    ? changedIndices
    : visibleIndices;

  // Derive custom categories: any category in the data not in the built-in CATEGORIES list
  const customCategories = Array.from(
    new Set(
      (watchedSettings ?? [])
        .map((s) => s?.category?.trim())
        .filter((c): c is string => !!c && !CATEGORIES.includes(c as Category))
    )
  );

  const handleAdd = (category: string, subcategory?: string) => {
    append({ name: "", value: "", unit: "", category, subcategory: subcategory ?? "", visible: false });
  };

  const commitNewCategory = () => {
    const name = newCategoryName.trim();
    if (name) {
      handleAdd(name);
    }
    setAddingCategory(false);
    setNewCategoryName("");
  };

  const processSet = new Set<string>(PROCESS_CATEGORIES);
  const filamentCustom = customCategories.filter((c) => !processSet.has(c));
  const processCustom  = customCategories.filter((c) => processSet.has(c));

  const filamentCats = [...FILAMENT_CATEGORIES, ...filamentCustom];
  const processCats  = [...PROCESS_CATEGORIES,  ...processCustom];

  const renderCategoryGroup = (cats: readonly string[]) =>
    cats.flatMap((cat) => {
      const catFields = typedFields.filter((f) => f.category === cat);
      if (changedOnly && hasBaseMap) {
        const hasChanged = catFields.some((f) => effectiveVisibleIndices.has(f._idx));
        if (!hasChanged) return [];
      }
      return [
        <CategorySection
          key={cat}
          category={cat}
          control={control}
          fields={catFields}
          visibleIndices={effectiveVisibleIndices}
          baseValueMap={baseValueMap}
          isEditing={isEditing}
          onAdd={handleAdd}
          onRemove={remove}
          expandAll={allExpanded}
          prevDiffKeys={prevDiffKeys}
          searchQuery={settingsSearch}
        />,
      ];
    });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-1">
        {hasBaseMap && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setChangedOnly((v) => { if (!v) setAllExpanded(true); return !v; })}
            className={cn(
              "h-7 text-xs gap-1 transition-colors",
              changedOnly
                ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-950/60"
                : "text-muted-foreground hover:text-foreground"
            )}
            data-testid="button-changed-only"
          >
            <Filter className="w-3.5 h-3.5" />
            Diff
            {changedOnly && (
              <span className="ml-0.5 tabular-nums text-[10px] font-semibold">
                ({changedIndices.size})
              </span>
            )}
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setAllExpanded((v) => !v)}
          className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
          data-testid="button-expand-all"
        >
          {allExpanded ? (
            <><ChevronsDownUp className="w-3.5 h-3.5" />Collapse all</>
          ) : (
            <><ChevronsUpDown className="w-3.5 h-3.5" />Expand all</>
          )}
        </Button>
      </div>

      {/* Filament profile group */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 px-0.5">
          🧵 Filament Profile
        </p>
        <div className="space-y-2">{renderCategoryGroup(filamentCats)}</div>
      </div>

      {/* Process profile group */}
      <div className="pt-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 px-0.5">
          ⚙️ Process Profile
        </p>
        <div className="space-y-2">{renderCategoryGroup(processCats)}</div>
      </div>

      {isEditing && (
        <div>
          {addingCategory ? (
            <div className="flex items-center gap-1.5">
              <Input
                autoFocus
                placeholder="Category name…"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); commitNewCategory(); }
                  if (e.key === "Escape") { setAddingCategory(false); setNewCategoryName(""); }
                }}
                className="h-8 text-sm flex-1"
                data-testid="input-new-category"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary hover:text-primary/80"
                onClick={commitNewCategory}
                data-testid="button-confirm-category"
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => { setAddingCategory(false); setNewCategoryName(""); }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAddingCategory(true)}
              className="h-8 text-xs w-full border-dashed"
              data-testid="button-add-category"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add category
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
