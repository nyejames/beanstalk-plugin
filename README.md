# Beanstalk VS Code Extension

Language support and syntax highlighting for Beanstalk (`.bst`) files.

## Current Highlighting Coverage

### Keywords

- Control flow: `if`, `else`, `return`, `loop`, `break`, `continue`, `yield`
- Range/iteration: `in`, `to`, `upto`, `by`
- Logical operators: `is`, `not`, `and`, `or`
- Other language keywords: `import`, `as`, `copy`, `use`

### Types and literals

- Primitive/type-like: `Int`, `Float`, `String`, `Bool`, `None`, `Fn`
- Bool literals: `true`, `false`, `True`, `False`

### Operators and punctuation

- Assignment/operators: `=`, `+=`, `-=`, `*=`, `/=`, `//=`, `%=`, `%%=`, `^=`
- Other symbols: `+`, `-`, `*`, `/`, `//`, `%`, `%%`, `^`, `<`, `<=`, `>`, `>=`, `->`, `=>`, `>>`, `<<`, `~`, `?`, `!`, `.`, `..`, `:`, `::`, `|`, `#`
- Punctuation: `,`, `;`, `{}`, `()`, `[]`

Legacy scene-era scopes and stale keyword/type entries were removed.

## Path Syntax Highlighting

The extension now has dedicated highlighting for path literals with optional
parentheses:

- `@path/to/file`
- `@(path/to/file)`
- `@path/to/file/{symbol_a, symbol_b}`
- `@path/to/file/ {symbol_a, symbol_b}`
- `@(path/to/file/ {symbol_a, symbol_b})`
- `@path\\to\\file`
- `@(path\\to\\file)`

Supported path scopes include:

- `meta.path.import.bst`
- Distinct group/import symbol scopes inside `{...}`
- Invalid standalone `@` fallback highlighting when not used as a valid path literal

## Template Highlighting

Templates now separate head and body regions with dedicated scopes:

- `meta.template.head.bst`
- `meta.template.body.bst`

Slot syntax is visually distinct:

- Body slot markers like `[..]` / `[ .... ]` -> `meta.template.slot.marker.bst`
- Labeled slot targets like `$1`, `$2` in heads -> `entity.name.template.slot.label.bst`

## Directive-Gated Body Highlighting

Template body highlighting is gated by formatter directives in template heads:

- `$markdown` -> `meta.embedded.block.markdown.bst`
- `$code` -> `meta.embedded.block.code.generic.bst`
- `$code("bst")` / `$code("beanstalk")` -> Beanstalk-flavoured code scopes
- `$code("js")` / `$code("javascript")` -> JS embedded scopes
- `$code("ts")` / `$code("typescript")` -> TS embedded scopes
- `$code("py")` / `$code("python")` -> Python embedded scopes

Mixed `$markdown` and `$code(...)` directives use a TextMate lookahead heuristic to mimic last-directive-wins for common patterns.

`$formatter(...)` remains neutrally directive-highlighted (not marked invalid).

## Known Limits

This extension uses TextMate grammars only (no semantic token provider). For highly complex template heads (especially deeply mixed directive ordering with nested constructs), formatter-body activation can fall back to generic template-body highlighting.

## Development

Run grammar regression checks:

```bash
npm test
```

Create a VSIX package:

```bash
vsce package
```
