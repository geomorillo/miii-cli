import { z, type ZodTypeAny } from 'zod'
import type { JsonSchema } from './types.js'

/** Map a JsonSchema property type to a Zod schema. Unknown types stay permissive. */
function propSchema(spec: { type: string; enum?: string[] }): ZodTypeAny {
  if (spec.enum && spec.enum.length) return z.enum(spec.enum as [string, ...string[]])
  switch (spec.type) {
    case 'string': return z.string()
    case 'number': return z.number()
    case 'integer': return z.number().int()
    case 'boolean': return z.boolean()
    case 'array': return z.array(z.unknown())
    case 'object': return z.record(z.unknown())
    default: return z.unknown()
  }
}

/** Build a Zod object schema from a tool's declared input_schema. */
function toZod(schema: JsonSchema): ZodTypeAny {
  const required = new Set(schema.required ?? [])
  const shape: Record<string, ZodTypeAny> = {}
  for (const [key, spec] of Object.entries(schema.properties)) {
    // Enforce type only on required fields — that's where a missing or
    // wrong-typed arg reaches fs/exec and crashes. Optional fields stay
    // permissive (some tools accept loose/dual types, e.g. grep flags).
    shape[key] = required.has(key) ? propSchema(spec) : z.unknown().optional()
  }
  // Allow unknown extra keys — models often add stray fields; only enforce
  // declared types + required presence.
  return z.object(shape).passthrough()
}

/**
 * Validate a tool call's input against its declared input_schema.
 * Returns null on success, or a human-readable error string on failure.
 */
export function validateInput(schema: JsonSchema, input: unknown): string | null {
  const result = toZod(schema).safeParse(input ?? {})
  if (result.success) return null
  const issues = result.error.issues
    .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('; ')
  return `Invalid arguments: ${issues}`
}
