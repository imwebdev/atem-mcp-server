import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Enums } from 'atem-connection';
import { getAtem, getInputName } from '../services/atem-connection.js';

export function registerMediaTools(server: McpServer): void {

  server.registerTool(
    'atem_set_input_label',
    {
      title: 'Set Input Label',
      description: `Set the short and long label for an ATEM input source.

Args:
  - inputId (number): Input source number to relabel
  - longLabel (string): Long name for the input (max 20 characters)
  - shortLabel (string): Short name for the input (max 4 characters)

Returns: Confirmation of the label change.`,
      inputSchema: {
        inputId: z.number().int().describe('Input source number to relabel'),
        longLabel: z.string().max(20).describe('Long name for the input (max 20 characters)'),
        shortLabel: z.string().max(4).describe('Short name for the input (max 4 characters)')
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ inputId, longLabel, shortLabel }) => {
      const atem = getAtem();
      await atem.setInputSettings({ longName: longLabel, shortName: shortLabel }, inputId);
      return { content: [{ type: 'text', text: `Input ${inputId} labels set: long="${longLabel}", short="${shortLabel}"` }] };
    }
  );

  server.registerTool(
    'atem_get_media_pool',
    {
      title: 'Get Media Pool',
      description: `Get the current media pool state including stills and clips.

Returns: JSON object with stills and clips arrays showing slot index, name, and usage status.`,
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
      const media = atem.state?.media;

      const stills = (media?.stillPool ?? []).map((still, index) => ({
        index,
        isUsed: still?.isUsed ?? false,
        fileName: still?.fileName ?? '',
        hash: still?.hash ?? ''
      }));

      const clips = (media?.clipPool ?? []).map((clip, index) => ({
        index,
        isUsed: clip?.isUsed ?? false,
        name: clip?.name ?? '',
        frameCount: clip?.frameCount ?? 0
      }));

      const players = (media?.players ?? []).map((player, index) => ({
        index,
        sourceType: player?.sourceType === Enums.MediaSourceType.Still ? 'still' : 'clip',
        clipIndex: player?.clipIndex ?? 0,
        stillIndex: player?.stillIndex ?? 0,
        playing: player?.playing ?? false,
        loop: player?.loop ?? false
      }));

      const result = { stills, clips, players };
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.registerTool(
    'atem_set_media_player_source',
    {
      title: 'Set Media Player Source',
      description: `Set which media pool still or clip a media player uses.

Args:
  - mediaPlayerIndex (number): Media player index (0-3, where 0=Media Player 1)
  - sourceType (string): "still" or "clip"
  - sourceIndex (number): Index of the still or clip in the media pool

Returns: Confirmation of the media player source change.`,
      inputSchema: {
        mediaPlayerIndex: z.number().int().min(0).max(3).describe('Media player index (0=MP1, 1=MP2, etc.)'),
        sourceType: z.enum(['still', 'clip']).describe('Source type: "still" or "clip"'),
        sourceIndex: z.number().int().min(0).describe('Index of the still or clip in the media pool')
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ mediaPlayerIndex, sourceType, sourceIndex }) => {
      const atem = getAtem();

      if (sourceType === 'still') {
        await atem.setMediaPlayerSource(
          { sourceType: Enums.MediaSourceType.Still, stillIndex: sourceIndex },
          mediaPlayerIndex
        );
      } else {
        await atem.setMediaPlayerSource(
          { sourceType: Enums.MediaSourceType.Clip, clipIndex: sourceIndex },
          mediaPlayerIndex
        );
      }

      return { content: [{ type: 'text', text: `Media Player ${mediaPlayerIndex + 1} source set to ${sourceType} index ${sourceIndex}` }] };
    }
  );
}
