type SettingKey = { category: string; subcategory: string; name: string; stripPercent?: boolean; boolean?: true };

function extractValue(raw: unknown): string {
  if (Array.isArray(raw)) return String(raw[0] ?? "");
  return String(raw ?? "");
}

function stripPct(v: string): string {
  return v.replace(/%+$/, "").trim();
}

function normaliseBool(raw: unknown): "true" | "false" {
  // Bambu profiles often wrap values in arrays — unwrap before coercing
  const scalar: unknown = Array.isArray(raw) ? raw[0] ?? "" : raw;
  if (scalar === true || scalar === 1 || scalar === "1" || scalar === "true") return "true";
  return "false";
}

export const FILAMENT_MAP: Record<string, SettingKey> = {
  nozzle_temperature:                { category: "Temperature", subcategory: "Nozzle", name: "Nozzle Temperature" },
  nozzle_temperature_initial_layer:  { category: "Temperature", subcategory: "Nozzle", name: "Nozzle Temp (First Layer)" },
  nozzle_temperature_range_low:      { category: "Temperature", subcategory: "Nozzle", name: "Nozzle Temp Range Low" },
  nozzle_temperature_range_high:     { category: "Temperature", subcategory: "Nozzle", name: "Nozzle Temp Range High" },
  cool_plate_temp:                   { category: "Temperature", subcategory: "Bed", name: "Cool Plate Temp" },
  cool_plate_temp_initial_layer:     { category: "Temperature", subcategory: "Bed", name: "Cool Plate Temp (First Layer)" },
  eng_plate_temp:                    { category: "Temperature", subcategory: "Bed", name: "Engineering Plate Temp" },
  eng_plate_temp_initial_layer:      { category: "Temperature", subcategory: "Bed", name: "Engineering Plate Temp (First Layer)" },
  hot_plate_temp:                    { category: "Temperature", subcategory: "Bed", name: "High Temp Plate" },
  hot_plate_temp_initial_layer:      { category: "Temperature", subcategory: "Bed", name: "High Temp Plate (First Layer)" },
  textured_plate_temp:               { category: "Temperature", subcategory: "Bed", name: "Textured Plate Temp" },
  textured_plate_temp_initial_layer: { category: "Temperature", subcategory: "Bed", name: "Textured Plate Temp (First Layer)" },
  chamber_temperatures:              { category: "Temperature", subcategory: "Chamber", name: "Chamber Temperature" },
  chamber_temperature:               { category: "Temperature", subcategory: "Chamber", name: "Chamber Temperature" },
  textured_cool_plate_temp:          { category: "Temperature", subcategory: "Bed", name: "Textured Cool Plate Temp" },
  textured_cool_plate_temp_initial_layer: { category: "Temperature", subcategory: "Bed", name: "Textured Cool Plate Temp (First Layer)" },
  idle_temperature:                  { category: "Temperature", subcategory: "Nozzle", name: "Idle Temperature" },
  temperature_vitrification:         { category: "Temperature", subcategory: "Chamber", name: "Vitrification Temperature" },
  close_fan_the_first_x_layers:      { category: "Cooling", subcategory: "Fan", name: "Disable Fan (First X Layers)" },
  fan_min_speed:                     { category: "Cooling", subcategory: "Fan", name: "Fan Min Speed" },
  fan_max_speed:                     { category: "Cooling", subcategory: "Fan", name: "Fan Max Speed" },
  fan_cooling_layer_time:            { category: "Cooling", subcategory: "Fan", name: "Cooling Layer Time" },
  slow_down_layer_time:              { category: "Cooling", subcategory: "Fan", name: "Slow Down Layer Time" },
  slow_down_min_speed:               { category: "Cooling", subcategory: "Fan", name: "Slow Down Min Speed" },
  slow_down_for_layer_cooling:       { category: "Cooling", subcategory: "Fan", name: "Slow Down for Layer Cooling", boolean: true },
  pre_start_fan_time:                { category: "Cooling", subcategory: "Fan", name: "Pre-start Fan Time" },
  additional_cooling_fan_speed:      { category: "Cooling", subcategory: "Fan", name: "Auxiliary Fan Speed" },
  reduce_fan_stop_start_freq:        { category: "Cooling", subcategory: "Fan", name: "Reduce Fan Stop/Start Freq", boolean: true },
  overhang_fan_threshold:            { category: "Cooling", subcategory: "Overhang", name: "Overhang Fan Threshold", stripPercent: true },
  overhang_fan_speed:                { category: "Cooling", subcategory: "Overhang", name: "Overhang Fan Speed" },
  enable_overhang_bridge_fan:        { category: "Cooling", subcategory: "Overhang", name: "Enable Overhang Bridge Fan", boolean: true },
  dont_slow_down_outer_wall:         { category: "Cooling", subcategory: "Fan", name: "Don't Slow Down Outer Wall", boolean: true },
  full_fan_speed_layer:              { category: "Cooling", subcategory: "Fan", name: "Full Fan Speed Layer" },
  filament_cooling_moves:            { category: "Cooling", subcategory: "Fan", name: "Cooling Moves" },
  filament_cooling_initial_speed:    { category: "Cooling", subcategory: "Fan", name: "Cooling Initial Speed" },
  filament_cooling_final_speed:      { category: "Cooling", subcategory: "Fan", name: "Cooling Final Speed" },
  during_print_exhaust_fan_speed:    { category: "Cooling", subcategory: "Exhaust", name: "Exhaust Fan Speed (During Print)" },
  complete_print_exhaust_fan_speed:  { category: "Cooling", subcategory: "Exhaust", name: "Exhaust Fan Speed (After Print)" },
  activate_air_filtration:           { category: "Cooling", subcategory: "Exhaust", name: "Activate Air Filtration", boolean: true },
  filament_retraction_length:        { category: "Retraction", subcategory: "", name: "Retraction Length" },
  filament_retraction_speed:         { category: "Retraction", subcategory: "", name: "Retraction Speed" },
  filament_deretraction_speed:       { category: "Retraction", subcategory: "", name: "Deretraction Speed" },
  filament_z_hop:                    { category: "Retraction", subcategory: "", name: "Z Hop" },
  filament_z_hop_types:              { category: "Retraction", subcategory: "", name: "Z Hop Type" },
  filament_wipe:                     { category: "Retraction", subcategory: "Wipe", name: "Wipe", boolean: true },
  filament_wipe_distance:            { category: "Retraction", subcategory: "Wipe", name: "Wipe Distance" },
  filament_retract_before_wipe:      { category: "Retraction", subcategory: "Wipe", name: "Retract Before Wipe", stripPercent: true },
  filament_retraction_minimum_travel: { category: "Retraction", subcategory: "", name: "Retraction Minimum Travel" },
  filament_retract_restart_extra:    { category: "Retraction", subcategory: "", name: "Retract Restart Extra" },
  filament_loading_speed:            { category: "Retraction", subcategory: "Loading", name: "Loading Speed" },
  filament_loading_speed_start:      { category: "Retraction", subcategory: "Loading", name: "Loading Speed Start" },
  filament_unloading_speed:          { category: "Retraction", subcategory: "Loading", name: "Unloading Speed" },
  filament_unloading_speed_start:    { category: "Retraction", subcategory: "Loading", name: "Unloading Speed Start" },
  filament_minimal_purge_on_wipe_tower: { category: "Retraction", subcategory: "Loading", name: "Minimal Purge on Wipe Tower" },
  pressure_advance:                  { category: "Filament", subcategory: "", name: "Pressure Advance" },
  enable_pressure_advance:           { category: "Filament", subcategory: "", name: "Enable Pressure Advance", boolean: true },
  filament_flow_ratio:               { category: "Filament", subcategory: "", name: "Flow Ratio" },
  filament_max_volumetric_speed:     { category: "Filament", subcategory: "", name: "Max Volumetric Speed" },
  filament_scarf_seam_type:          { category: "Filament", subcategory: "", name: "Scarf Seam Type" },
  filament_density:                  { category: "Filament", subcategory: "", name: "Density" },
  filament_diameter:                 { category: "Filament", subcategory: "", name: "Diameter" },
  filament_cost:                     { category: "Filament", subcategory: "", name: "Cost" },
  filament_type:                     { category: "Filament", subcategory: "", name: "Filament Type" },
  filament_vendor:                   { category: "Filament", subcategory: "", name: "Vendor" },
};

export const PROCESS_MAP: Record<string, SettingKey> = {
  layer_height:                       { category: "Quality", subcategory: "Layers", name: "Layer Height" },
  initial_layer_print_height:         { category: "Quality", subcategory: "Layers", name: "First Layer Height" },
  elefant_foot_compensation:          { category: "Quality", subcategory: "Layers", name: "Elephant Foot Compensation" },
  xy_size_compensation:               { category: "Quality", subcategory: "Layers", name: "XY Size Compensation" },
  enable_arc_fitting:                 { category: "Quality", subcategory: "Layers", name: "Arc Fitting", boolean: true },
  wall_loops:                         { category: "Quality", subcategory: "Walls", name: "Wall Loops" },
  wall_generator:                     { category: "Quality", subcategory: "Walls", name: "Wall Generator" },
  detect_thin_wall:                   { category: "Quality", subcategory: "Walls", name: "Detect Thin Wall", boolean: true },
  reduce_crossing_wall:               { category: "Quality", subcategory: "Walls", name: "Reduce Crossing Wall", boolean: true },
  max_travel_detour_distance:         { category: "Quality", subcategory: "Walls", name: "Max Travel Detour Distance" },
  top_shell_layers:                   { category: "Quality", subcategory: "Top/Bottom", name: "Top Shell Layers" },
  bottom_shell_layers:                { category: "Quality", subcategory: "Top/Bottom", name: "Bottom Shell Layers" },
  top_surface_pattern:                { category: "Quality", subcategory: "Top/Bottom", name: "Top Surface Pattern" },
  bottom_surface_pattern:             { category: "Quality", subcategory: "Top/Bottom", name: "Bottom Surface Pattern" },
  internal_solid_infill_pattern:      { category: "Quality", subcategory: "Top/Bottom", name: "Internal Solid Infill Pattern" },
  seam_position:                      { category: "Quality", subcategory: "Seam", name: "Seam Position" },
  sparse_infill_density:              { category: "Infill", subcategory: "", name: "Infill Density", stripPercent: true },
  sparse_infill_pattern:              { category: "Infill", subcategory: "", name: "Infill Pattern" },
  infill_wall_overlap:                { category: "Infill", subcategory: "", name: "Infill/Wall Overlap", stripPercent: true },
  initial_layer_speed:                { category: "Speed", subcategory: "Print", name: "First Layer Speed" },
  initial_layer_infill_speed:         { category: "Speed", subcategory: "Print", name: "First Layer Infill Speed" },
  outer_wall_speed:                   { category: "Speed", subcategory: "Print", name: "Outer Wall Speed" },
  inner_wall_speed:                   { category: "Speed", subcategory: "Print", name: "Inner Wall Speed" },
  sparse_infill_speed:                { category: "Speed", subcategory: "Print", name: "Infill Speed" },
  internal_solid_infill_speed:        { category: "Speed", subcategory: "Print", name: "Internal Solid Infill Speed" },
  top_surface_speed:                  { category: "Speed", subcategory: "Print", name: "Top Surface Speed" },
  bridge_speed:                       { category: "Speed", subcategory: "Print", name: "Bridge Speed" },
  gap_infill_speed:                   { category: "Speed", subcategory: "Print", name: "Gap Fill Speed" },
  small_perimeter_speed:              { category: "Speed", subcategory: "Print", name: "Small Perimeter Speed" },
  small_perimeter_threshold:          { category: "Speed", subcategory: "Print", name: "Small Perimeter Threshold" },
  vertical_shell_speed:               { category: "Speed", subcategory: "Print", name: "Vertical Shell Speed", stripPercent: true },
  support_speed:                      { category: "Speed", subcategory: "Support", name: "Support Speed" },
  support_interface_speed:            { category: "Speed", subcategory: "Support", name: "Support Interface Speed" },
  travel_speed:                       { category: "Speed", subcategory: "Travel", name: "Travel Speed" },
  travel_speed_z:                     { category: "Speed", subcategory: "Travel", name: "Z Travel Speed" },
  enable_overhang_speed:              { category: "Speed", subcategory: "Overhang", name: "Enable Overhang Speed", boolean: true },
  overhang_1_4_speed:                 { category: "Speed", subcategory: "Overhang", name: "Overhang Speed (25%)" },
  overhang_2_4_speed:                 { category: "Speed", subcategory: "Overhang", name: "Overhang Speed (50%)" },
  overhang_3_4_speed:                 { category: "Speed", subcategory: "Overhang", name: "Overhang Speed (75%)" },
  overhang_4_4_speed:                 { category: "Speed", subcategory: "Overhang", name: "Overhang Speed (100%)" },
  overhang_totally_speed:             { category: "Speed", subcategory: "Overhang", name: "Bridge/Overhang Speed" },
  bridge_flow:                        { category: "Speed", subcategory: "Overhang", name: "Bridge Flow" },
  default_acceleration:               { category: "Acceleration", subcategory: "", name: "Default" },
  outer_wall_acceleration:            { category: "Acceleration", subcategory: "", name: "Outer Wall" },
  inner_wall_acceleration:            { category: "Acceleration", subcategory: "", name: "Inner Wall" },
  top_surface_acceleration:           { category: "Acceleration", subcategory: "", name: "Top Surface" },
  travel_acceleration:                { category: "Acceleration", subcategory: "", name: "Travel" },
  initial_layer_acceleration:         { category: "Acceleration", subcategory: "", name: "First Layer" },
  initial_layer_travel_acceleration:  { category: "Acceleration", subcategory: "", name: "First Layer Travel" },
  sparse_infill_acceleration:         { category: "Acceleration", subcategory: "", name: "Infill", stripPercent: true },
  line_width:                         { category: "Line Width", subcategory: "", name: "Default" },
  outer_wall_line_width:              { category: "Line Width", subcategory: "", name: "Outer Wall" },
  inner_wall_line_width:              { category: "Line Width", subcategory: "", name: "Inner Wall" },
  top_surface_line_width:             { category: "Line Width", subcategory: "", name: "Top Surface" },
  initial_layer_line_width:           { category: "Line Width", subcategory: "", name: "First Layer" },
  internal_solid_infill_line_width:   { category: "Line Width", subcategory: "", name: "Internal Solid Infill" },
  sparse_infill_line_width:           { category: "Line Width", subcategory: "", name: "Infill" },
  support_line_width:                 { category: "Line Width", subcategory: "", name: "Support" },
  skin_infill_line_width:             { category: "Line Width", subcategory: "", name: "Skin Infill" },
  skeleton_infill_line_width:         { category: "Line Width", subcategory: "", name: "Skeleton Infill" },
};

export type SettingType = "string" | "number" | "boolean";
export type ImportedValue = { category: string; subcategory: string; name: string; value: string; type?: SettingType };
export type ImportType = "filament" | "process";

export type ParseResult =
  | { ok: true; type: ImportType; values: ImportedValue[]; profileName?: string }
  | { ok: false; error: string };

function detectProfileType(obj: Record<string, unknown>): "filament" | "process" | null {
  const processMatches = Object.keys(PROCESS_MAP).filter(k => k in obj).length;
  const filamentMatches = Object.keys(FILAMENT_MAP).filter(k => k in obj).length;
  if (processMatches === 0 && filamentMatches === 0) return null;
  // On equal matches, prefer "process" (OrcaSlicer process files are the primary use case).
  return processMatches >= filamentMatches ? "process" : "filament";
}

export function parseProfileJson(raw: unknown): ParseResult {
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "Not a valid JSON object." };
  const obj = raw as Record<string, unknown>;
  const explicitType = typeof obj.type === "string" ? obj.type : null;
  let resolvedType: "filament" | "process" | null = null;

  if (explicitType === "filament" || explicitType === "process") {
    resolvedType = explicitType;
  } else if (explicitType !== null) {
    return { ok: false, error: `Unknown profile type: "${explicitType}". Expected "filament" or "process".` };
  } else if ("filament_settings_id" in obj) {
    // OrcaSlicer filament profiles use filament_settings_id instead of type="filament"
    resolvedType = "filament";
  } else {
    resolvedType = detectProfileType(obj);
    if (!resolvedType) return { ok: false, error: "Could not detect profile type: no recognisable process or filament settings found." };
  }

  const map = resolvedType === "filament" ? FILAMENT_MAP : PROCESS_MAP;
  const type = resolvedType;

  const profileName = typeof obj.name === "string" ? obj.name : undefined;
  const values: ImportedValue[] = [];

  for (const [key, meta] of Object.entries(map)) {
    if (!(key in obj)) continue;
    const rawVal = obj[key];

    if (meta.boolean) {
      // Unwrap array first, then skip if null/empty — consistent with string-value skipping below
      const scalar: unknown = Array.isArray(rawVal) ? rawVal[0] : rawVal;
      if (scalar === null || scalar === undefined || scalar === "") continue;
      values.push({ category: meta.category, subcategory: meta.subcategory, name: meta.name, value: normaliseBool(rawVal), type: "boolean" });
      continue;
    }

    // Detect native JSON boolean not explicitly flagged in map
    if (typeof rawVal === "boolean") {
      values.push({ category: meta.category, subcategory: meta.subcategory, name: meta.name, value: normaliseBool(rawVal), type: "boolean" });
      continue;
    }

    let value = extractValue(rawVal);
    if (meta.stripPercent) value = stripPct(value);
    if (!value || value === "null" || value === "undefined") continue;
    values.push({ category: meta.category, subcategory: meta.subcategory, name: meta.name, value });
  }

  // Deduplicate by compound key (category|subcategory|name) — last entry wins.
  // This handles e.g. chamber_temperatures vs chamber_temperature mapping to the same display name.
  const seen = new Map<string, ImportedValue>();
  for (const v of values) {
    seen.set(`${v.category}|${v.subcategory}|${v.name}`, v);
  }

  return { ok: true, type: type as ImportType, values: Array.from(seen.values()), profileName };
}
