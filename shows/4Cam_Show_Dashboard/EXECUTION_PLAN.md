# Execution Plan: 4Cam_Show_Dashboard

## Overview
Ordered steps to configure the ATEM switcher for the 4-camera show dashboard. All operations are idempotent and safe to re-run.

## Pre-Flight
- Verify ATEM connection: `atem_connect` to `192.168.1.20:9910`
- Confirm model capabilities: `atem_get_status` — verify M/E count, DSK count, SuperSource availability

## Step 1: Label Inputs
Set human-readable labels on all 4 camera inputs.

| Order | Tool | Parameters | Purpose |
|-------|------|-----------|---------|
| 1.1 | `atem_set_input_label` | `inputId: 1, longLabel: "CAM1 HOST", shortLabel: "CM1"` | Label Camera 1 as Host |
| 1.2 | `atem_set_input_label` | `inputId: 2, longLabel: "CAM2 GUEST", shortLabel: "CM2"` | Label Camera 2 as Guest |
| 1.3 | `atem_set_input_label` | `inputId: 3, longLabel: "CAM3", shortLabel: "CM3"` | Label Camera 3 |
| 1.4 | `atem_set_input_label` | `inputId: 4, longLabel: "CAM4", shortLabel: "CM4"` | Label Camera 4 |

**Rollback:** Re-run with original/default labels.

## Step 2: Configure Media Players
Set up media players for title slide and logo bug overlays.

| Order | Tool | Parameters | Purpose |
|-------|------|-----------|---------|
| 2.1 | `atem_set_media_player_source` | `mediaPlayerIndex: 0, sourceType: "still", sourceIndex: 0` | MP1 → Still slot 0 (Title) |
| 2.2 | `atem_set_media_player_source` | `mediaPlayerIndex: 1, sourceType: "still", sourceIndex: 1` | MP2 → Still slot 1 (Logo) |

**Note:** Stills must be pre-loaded into the ATEM media pool (slots 0 and 1). If not available, these commands still execute — the media player will show black until a still is uploaded.

**Rollback:** No destructive change; media players can be reassigned at any time.

## Step 3: Configure Downstream Keyers (Overlays)

### DSK1 — Title Slide (Full-Frame Overlay)
| Order | Tool | Parameters | Purpose |
|-------|------|-----------|---------|
| 3.1 | `atem_set_dsk_sources` | `dskIndex: 0, fillSource: 3010, keySource: 3011` | DSK1 fill=MP1, key=MP1 Key |
| 3.2 | `atem_set_dsk_on_air` | `dskIndex: 0, onAir: false` | Ensure title starts off-air |

### DSK2 — Logo Bug (Corner Overlay)
| Order | Tool | Parameters | Purpose |
|-------|------|-----------|---------|
| 3.3 | `atem_set_dsk_sources` | `dskIndex: 1, fillSource: 3020, keySource: 3021` | DSK2 fill=MP2, key=MP2 Key |
| 3.4 | `atem_set_dsk_on_air` | `dskIndex: 1, onAir: false` | Ensure logo starts off-air |

**Rollback:** Set both DSKs off-air, then clear sources.

## Step 4: Configure SuperSource (2-Up Layout)

| Order | Tool | Parameters | Purpose |
|-------|------|-----------|---------|
| 4.1 | `atem_set_supersource_box` | `boxIndex: 0, enabled: true, source: 1, x: -480, y: 0, size: 500, cropped: false` | Left box → CAM1 |
| 4.2 | `atem_set_supersource_box` | `boxIndex: 1, enabled: true, source: 2, x: 480, y: 0, size: 500, cropped: false` | Right box → CAM2 |
| 4.3 | `atem_set_supersource_box` | `boxIndex: 2, enabled: false` | Disable box 3 |
| 4.4 | `atem_set_supersource_box` | `boxIndex: 3, enabled: false` | Disable box 4 |
| 4.5 | `atem_set_supersource_border` | `enabled: true, borderWidth: 50, borderHue: 0, borderSaturation: 0, borderLuma: 1000` | White border between boxes |

**Rollback:** Disable all 4 boxes, disable border.

## Step 5: Configure Default Transition

| Order | Tool | Parameters | Purpose |
|-------|------|-----------|---------|
| 5.1 | `atem_set_transition_style` | `style: "mix"` | Default transition = mix dissolve |
| 5.2 | `atem_set_transition_rate` | `rate: 25` | Default rate = 25 frames (~0.83s at 29.97fps) |

**Rollback:** No destructive change; transition settings are always overwritable.

## Step 6: Set Initial Program/Preview State

| Order | Tool | Parameters | Purpose |
|-------|------|-----------|---------|
| 6.1 | `atem_set_program` | `inputId: 1` | Program = CAM1 (Host) |
| 6.2 | `atem_set_preview` | `inputId: 2` | Preview = CAM2 (Guest) |

**Rollback:** Set program/preview to any valid input.

## Step 7: Deploy Dashboard
The web dashboard is served by the MCP server's HTTP mode:
1. Start server: `TRANSPORT=http ATEM_HOST=192.168.1.20 npm start`
2. Dashboard accessible at: `http://<server-ip>:3000/dashboard`
3. MCP endpoint for tool calls: `http://<server-ip>:3000/mcp`

## Execution Summary

| Phase | Steps | Idempotent | Risk Level |
|-------|-------|-----------|------------|
| Label Inputs | 1.1–1.4 | Yes | Low (cosmetic) |
| Media Players | 2.1–2.2 | Yes | Low |
| DSK Config | 3.1–3.4 | Yes | Low (starts off-air) |
| SuperSource | 4.1–4.5 | Yes | Low |
| Transitions | 5.1–5.2 | Yes | Low |
| Initial State | 6.1–6.2 | Yes | Low (changes live output) |
| Dashboard | 7 | Yes | None |

## Full Rollback Procedure
To completely undo this configuration:
1. `atem_set_dsk_on_air` — both DSKs off
2. `atem_set_supersource_box` — disable all 4 boxes
3. `atem_set_supersource_border` — disable border
4. Re-label inputs to defaults
5. Set program/preview to input 1 / input 2
6. Stop the dashboard server

All operations are non-destructive to the physical signal path. Only routing and labeling are affected.
