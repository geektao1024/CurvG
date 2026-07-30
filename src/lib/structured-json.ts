/**
 * Parse a JSON object from an LLM response without using the fragile
 * "first opening brace / last closing brace" heuristic. Braces inside JSON
 * strings are ignored and surrounding prose or fences are tolerated.
 */
export function parseStructuredJsonObject(value: string): unknown {
  const unfenced = value
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  try {
    const parsed = JSON.parse(unfenced) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Fall through to balanced-object extraction.
  }

  for (let start = unfenced.indexOf('{'); start >= 0; ) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < unfenced.length; index += 1) {
      const character = unfenced[index];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (character === '\\') {
          escaped = true;
        } else if (character === '"') {
          inString = false;
        }
        continue;
      }
      if (character === '"') {
        inString = true;
        continue;
      }
      if (character === '{') depth += 1;
      if (character !== '}') continue;
      depth -= 1;
      if (depth !== 0) continue;
      try {
        const parsed = JSON.parse(unfenced.slice(start, index + 1)) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        break;
      }
    }
    start = unfenced.indexOf('{', start + 1);
  }

  throw new Error('AI returned invalid JSON');
}
