# Moth VS Code Syntax Highlighting

Language support and syntax highlighting for Moth (`.moth`) files.

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
