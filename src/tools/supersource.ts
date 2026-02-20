import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getAtem, getInputName } from '../services/atem-connection.js';

export function registerSuperSourceTools(server: McpServer): void {

  server.registerTool(
    'atem_get_supersource_state',
    {
      title: 'Get SuperSource State',
      description: `Get the current SuperSource configuration including all box settings and border properties.

Returns: JSON object with box configurations (position, size, source, crop) and border settings for each SuperSource.`,
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async () => {
      const atem = getAtem();
      const superSources = atem.state?.video?.superSources ?? [];

      if (superSources.length === 0) {
        return { content: [{ type: 'text', text: 'No SuperSource available on this ATEM model.' }] };
      }

      const result: Record<string, unknown> = {};

      superSources.forEach((ss, index) => {
        if (!ss) return;

        const boxes: Record<string, unknown> = {};
        for (let boxIdx = 0; boxIdx < ss.boxes.length; boxIdx++) {
          const box = ss.boxes[boxIdx];
          if (!box) continue;
          boxes[`Box ${boxIdx + 1}`] = {
            enabled: box.enabled,
            source: box.source,
            sourceName: getInputName(box.source),
            x: box.x,
            y: box.y,
            size: box.size,
            cropped: box.cropped,
            cropTop: box.cropTop,
            cropBottom: box.cropBottom,
            cropLeft: box.cropLeft,
            cropRight: box.cropRight
          };
        }

        result[`SuperSource ${index + 1}`] = {
          boxes,
          properties: ss.properties ?? 'No art properties available',
          border: ss.border ?? 'No border properties available'
        };
      });

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.registerTool(
    'atem_set_supersource_box',
    {
      title: 'Set SuperSource Box Settings',
      description: `Configure a SuperSource box's position, size, source, and crop settings.

Args:
  - boxIndex (number): Box number (0-3, where 0 = Box 1)
  - enabled (boolean): Whether the box is visible
  - source (number): Input source number to display in this box
  - x (number): Horizontal position (-4800 to 4800)
  - y (number): Vertical position (-3400 to 3400)
  - size (number): Box size (70 to 1000, where 1000 = full size)
  - cropped (boolean): Whether cropping is enabled
  - cropTop (number, optional): Top crop (0 to 18000)
  - cropBottom (number, optional): Bottom crop (0 to 18000)
  - cropLeft (number, optional): Left crop (0 to 18000)
  - cropRight (number, optional): Right crop (0 to 18000)

Common uses: creating multi-viewer layouts, picture-in-picture arrangements, split screens.`,
      inputSchema: {
        boxIndex: z.number().int().min(0).max(3).describe('Box number (0-based, 0 = Box 1)'),
        enabled: z.boolean().describe('Whether the box is visible'),
        source: z.number().int().describe('Input source number to display'),
        x: z.number().int().min(-4800).max(4800).describe('Horizontal position (-4800 to 4800)'),
        y: z.number().int().min(-3400).max(3400).describe('Vertical position (-3400 to 3400)'),
        size: z.number().int().min(70).max(1000).describe('Box size (70-1000, 1000 = full)'),
        cropped: z.boolean().describe('Whether cropping is enabled'),
        cropTop: z.number().int().min(0).max(18000).optional().describe('Top crop (0-18000)'),
        cropBottom: z.number().int().min(0).max(18000).optional().describe('Bottom crop (0-18000)'),
        cropLeft: z.number().int().min(0).max(18000).optional().describe('Left crop (0-18000)'),
        cropRight: z.number().int().min(0).max(18000).optional().describe('Right crop (0-18000)')
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ boxIndex, enabled, source, x, y, size, cropped, cropTop, cropBottom, cropLeft, cropRight }) => {
      const atem = getAtem();

      const settings: Record<string, unknown> = {
        enabled,
        source,
        x,
        y,
        size,
        cropped
      };

      if (cropTop !== undefined) settings.cropTop = cropTop;
      if (cropBottom !== undefined) settings.cropBottom = cropBottom;
      if (cropLeft !== undefined) settings.cropLeft = cropLeft;
      if (cropRight !== undefined) settings.cropRight = cropRight;

      await atem.setSuperSourceBoxSettings(settings, boxIndex);

      const sourceName = getInputName(source);
      return {
        content: [{
          type: 'text',
          text: `SuperSource Box ${boxIndex + 1}: ${enabled ? 'enabled' : 'disabled'}, source = ${source} (${sourceName}), position = (${x}, ${y}), size = ${size}${cropped ? ', cropped' : ''}`
        }]
      };
    }
  );

  server.registerTool(
    'atem_set_supersource_border',
    {
      title: 'Set SuperSource Border',
      description: `Configure the SuperSource border properties.

Args:
  - enabled (boolean): Whether the border is enabled
  - borderWidth (number, optional): Border outer width (0-1600)
  - borderInnerWidth (number, optional): Border inner width (0-1600)
  - borderOuterSoftness (number, optional): Outer edge softness (0-100)
  - borderInnerSoftness (number, optional): Inner edge softness (0-100)
  - borderHue (number, optional): Border color hue (0-3599, in 0.1 degree units)
  - borderSaturation (number, optional): Border color saturation (0-1000)
  - borderLuma (number, optional): Border luminance (0-1000)`,
      inputSchema: {
        enabled: z.boolean().describe('Whether the border is enabled'),
        borderWidth: z.number().int().min(0).max(1600).optional().describe('Border outer width (0-1600)'),
        borderInnerWidth: z.number().int().min(0).max(1600).optional().describe('Border inner width (0-1600)'),
        borderOuterSoftness: z.number().int().min(0).max(100).optional().describe('Outer edge softness (0-100)'),
        borderInnerSoftness: z.number().int().min(0).max(100).optional().describe('Inner edge softness (0-100)'),
        borderHue: z.number().int().min(0).max(3599).optional().describe('Border hue (0-3599)'),
        borderSaturation: z.number().int().min(0).max(1000).optional().describe('Border saturation (0-1000)'),
        borderLuma: z.number().int().min(0).max(1000).optional().describe('Border luminance (0-1000)')
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ enabled, borderWidth, borderInnerWidth, borderOuterSoftness, borderInnerSoftness, borderHue, borderSaturation, borderLuma }) => {
      const atem = getAtem();

      const properties: Record<string, unknown> = {
        borderEnabled: enabled
      };

      if (borderWidth !== undefined) properties.borderOuterWidth = borderWidth;
      if (borderInnerWidth !== undefined) properties.borderInnerWidth = borderInnerWidth;
      if (borderOuterSoftness !== undefined) properties.borderOuterSoftness = borderOuterSoftness;
      if (borderInnerSoftness !== undefined) properties.borderInnerSoftness = borderInnerSoftness;
      if (borderHue !== undefined) properties.borderHue = borderHue;
      if (borderSaturation !== undefined) properties.borderSaturation = borderSaturation;
      if (borderLuma !== undefined) properties.borderLuma = borderLuma;

      await atem.setSuperSourceBorder(properties);

      const details: string[] = [`border ${enabled ? 'enabled' : 'disabled'}`];
      if (borderWidth !== undefined) details.push(`width = ${borderWidth}`);
      if (borderInnerWidth !== undefined) details.push(`inner width = ${borderInnerWidth}`);
      if (borderHue !== undefined) details.push(`hue = ${borderHue}`);
      if (borderSaturation !== undefined) details.push(`saturation = ${borderSaturation}`);
      if (borderLuma !== undefined) details.push(`luma = ${borderLuma}`);

      return { content: [{ type: 'text', text: `SuperSource: ${details.join(', ')}` }] };
    }
  );
}
