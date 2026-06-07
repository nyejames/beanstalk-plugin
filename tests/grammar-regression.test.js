const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const rootDir = path.resolve(__dirname, "..");
const grammarPath = path.join(rootDir, "syntaxes", "bst.tmLanguage.json");
const packagePath = path.join(rootDir, "package.json");
const fixturePath = path.join(__dirname, "fixtures", "highlighting-samples.bst");

const grammar = JSON.parse(fs.readFileSync(grammarPath, "utf8"));
const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));

function walkObjects(value, fn) {
  if (!value || typeof value !== "object") return;
  fn(value);
  if (Array.isArray(value)) {
    for (const item of value) walkObjects(item, fn);
    return;
  }
  for (const nested of Object.values(value)) walkObjects(nested, fn);
}

function findPatternsByName(name) {
  const results = [];
  walkObjects(grammar, (node) => {
    if (node && typeof node === "object" && typeof node.name === "string") {
      if (node.name === name || node.name.split(/\s+/).includes(name)) {
        results.push(node);
      }
    }
  });
  return results;
}

function includesAtRoot(includeName) {
  return grammar.patterns.some((pattern) => pattern.include === includeName);
}

function repoExists(name) {
  return name in grammar.repository;
}

// ── KEYWORDS ────────────────────────────────────────────────────────

test("assert is a builtin function, not a keyword.other", () => {
  const builtinPattern = grammar.repository.constants.patterns.find(
    (p) => p.name === "support.function.builtin.bst"
  );
  assert.ok(builtinPattern, "expected support.function.builtin.bst pattern");
  assert.ok(/\bassert\b/.test(builtinPattern.match), "expected assert in builtin match");

  const keywordOther = grammar.repository.keywords.patterns.find(
    (p) => p.name === "keyword.other.bst"
  );
  assert.ok(keywordOther, "expected keyword.other.bst pattern");
  assert.ok(!/\bassert\b/.test(keywordOther.match), "assert must not be in keyword.other.bst");
});

test("removed keywords case and yield are absent", () => {
  const flowPattern = grammar.repository.keywords.patterns.find(
    (p) => p.name === "keyword.control.flow.bst"
  );
  assert.ok(flowPattern, "expected keyword.control.flow.bst");
  assert.ok(!/\bcase\b/.test(flowPattern.match), "case should be removed");
  assert.ok(!/\byield\b/.test(flowPattern.match), "yield should be removed");
});

test("future reserved keywords async, checked, block remain", () => {
  const kwOther = grammar.repository.keywords.patterns.find(
    (p) => p.name === "keyword.other.bst"
  );
  assert.ok(kwOther, "expected keyword.other.bst");
  assert.ok(/\basync\b/.test(kwOther.match), "async should remain (future reserved)");
  assert.ok(/\bchecked\b/.test(kwOther.match), "checked should remain (future reserved)");
  assert.ok(/\bblock\b/.test(kwOther.match), "block should remain (future reserved)");
});

test("this is reserved via variable.language.this.bst", () => {
  const thisPattern = grammar.repository.keywords.patterns.find(
    (p) => p.name === "variable.language.this.bst"
  );
  assert.ok(thisPattern, "expected variable.language.this.bst");
  const thisRegex = new RegExp("^" + thisPattern.match + "$");
  assert.ok(thisRegex.test("this"), "regex should match 'this'");
  assert.ok(!thisRegex.test("thistle"), "regex should not match 'thistle'");
});

test("required current keywords are present", () => {
  const keywordText = grammar.repository.keywords.patterns
    .map((p) => p.match || "").join(" ");

  const required = [
    "if", "else", "return", "loop", "break", "continue", "catch", "then",
    "is", "not", "and", "or",
    "import", "export", "as", "copy", "must",
    "to", "by",
  ];
  for (const kw of required) {
    assert.ok(
      new RegExp("\\b" + kw + "\\b").test(keywordText),
      `expected keyword '${kw}' in grammar`
    );
  }
});

// ── TYPES & CONSTANTS ────────────────────────────────────────────────

test("outdated types None and Fn are removed from primitive types", () => {
  const primPattern = grammar.repository.types.patterns.find(
    (p) => p.name === "support.type.primitive.bst"
  );
  assert.ok(primPattern);
  assert.ok(!/\bNone\b/.test(primPattern.match), "None should be removed from primitive types");
  assert.ok(!/\bFn\b/.test(primPattern.match), "Fn should be removed from primitive types");
});

test("current primitive types are present", () => {
  const primPattern = grammar.repository.types.patterns.find(
    (p) => p.name === "support.type.primitive.bst"
  );
  for (const t of ["Int", "Float", "String", "Bool", "Char"]) {
    assert.ok(new RegExp("\\b" + t + "\\b").test(primPattern.match), `expected type '${t}'`);
  }
});

test("True and False are removed from boolean literals", () => {
  const boolPattern = grammar.repository.types.patterns.find(
    (p) => p.name === "constant.language.boolean.bst"
  );
  assert.ok(boolPattern);
  assert.ok(!/\bTrue\b/.test(boolPattern.match), "True should be removed");
  assert.ok(!/\bFalse\b/.test(boolPattern.match), "False should be removed");
  assert.ok(/\btrue\b/.test(boolPattern.match), "true should remain");
  assert.ok(/\bfalse\b/.test(boolPattern.match), "false should remain");
});

test("IO is a builtin type alongside Error", () => {
  const builtinType = grammar.repository.constants.patterns.find(
    (p) => p.name === "support.type.builtin.bst"
  );
  assert.ok(builtinType);
  assert.ok(/\bError\b/.test(builtinType.match), "Error should be in builtin types");
  assert.ok(/\bIO\b/.test(builtinType.match), "IO should be in builtin types");
});

test("type and of are highlighted as generics", () => {
  const genericsPattern = grammar.repository.types.patterns.find(
    (p) => p.name === "variable.language.generics.bst"
  );
  assert.ok(genericsPattern);
  assert.ok(/\btype\b/.test(genericsPattern.match));
  assert.ok(/\bof\b/.test(genericsPattern.match));
});

test("This is highlighted as trait-this", () => {
  const thisTraitPattern = grammar.repository.types.patterns.find(
    (p) => p.name === "variable.language.trait-this.bst"
  );
  assert.ok(thisTraitPattern);
  assert.ok(/\bThis\b/.test(thisTraitPattern.match));
});

// ── DIRECTIVES ───────────────────────────────────────────────────────

test("template-head-directives includes css, html, and escape_html", () => {
  const directivePattern = grammar.repository["template-head-directives"].patterns.find(
    (p) => (p.match || "").includes("slot") && (p.match || "").includes("insert")
  );
  assert.ok(directivePattern, "expected known-directive pattern");
  for (const d of ["css", "html", "escape_html"]) {
    assert.ok(
      directivePattern.match.includes(d),
      `expected directive '${d}' in known-directive match`
    );
  }
});

// ── NEW CODEBLOCK LANGUAGES ─────────────────────────────────────────

test("template-code-rs repository exists and matches rs/rust", () => {
  assert.ok(repoExists("template-code-rs"), "expected template-code-rs repository");
  assert.ok(repoExists("template-body-code-rs"), "expected template-body-code-rs repository");
  assert.ok(repoExists("embedded-code-rs"), "expected embedded-code-rs repository");

  const rsPattern = grammar.repository["template-code-rs"].patterns[0];
  assert.ok(rsPattern.name.includes("meta.template.code.rs.bst"));

  // Verify the begin regex matches "rs" and "rust"
  const beginRe = new RegExp(rsPattern.begin);
  assert.ok(beginRe.test('[$code("rs"):'), 'should match $code("rs")');
  assert.ok(beginRe.test('[$code("rust"):'), 'should match $code("rust")');
  assert.ok(!beginRe.test('[$code("py"):'), 'should not match $code("py")');
});

test("embedded-code-rs delegates to source.rust", () => {
  const embeddedPatterns = grammar.repository["embedded-code-rs"].patterns;
  const langPattern = embeddedPatterns.find(
    (p) => p.contentName && p.contentName.includes("source.rust")
  );
  assert.ok(langPattern, "expected embedded-code-rs to delegate to source.rust");

  const hasSourceRust = langPattern.patterns.some((p) => p.include === "source.rust");
  assert.ok(hasSourceRust, "expected source.rust include in embedded-code-rs");
});

test("template-code-shell repository exists and matches sh/shell/bash", () => {
  assert.ok(repoExists("template-code-shell"), "expected template-code-shell repository");
  assert.ok(repoExists("template-body-code-shell"), "expected template-body-code-shell repository");
  assert.ok(repoExists("embedded-code-shell"), "expected embedded-code-shell repository");

  const shellPattern = grammar.repository["template-code-shell"].patterns[0];
  assert.ok(shellPattern.name.includes("meta.template.code.shell.bst"));

  const beginRe = new RegExp(shellPattern.begin);
  assert.ok(beginRe.test('[$code("sh"):'), 'should match $code("sh")');
  assert.ok(beginRe.test('[$code("shell"):'), 'should match $code("shell")');
  assert.ok(beginRe.test('[$code("bash"):'), 'should match $code("bash")');
  assert.ok(!beginRe.test('[$code("py"):'), 'should not match $code("py")');
});

test("embedded-code-shell delegates to source.shell", () => {
  const embeddedPatterns = grammar.repository["embedded-code-shell"].patterns;
  const langPattern = embeddedPatterns.find(
    (p) => p.contentName && p.contentName.includes("source.shell")
  );
  assert.ok(langPattern, "expected embedded-code-shell to delegate to source.shell");

  const hasSourceShell = langPattern.patterns.some((p) => p.include === "source.shell");
  assert.ok(hasSourceShell, "expected source.shell include in embedded-code-shell");
});

test("new code includes are wired into template body patterns", () => {
  const bodyRepos = [
    "template-body-code-js", "template-body-code-ts", "template-body-code-py",
    "template-body-code-beanstalk", "template-body-code-generic",
    "template-body-generic", "template-body-html", "template-body-markdown",
  ];

  for (const repoKey of bodyRepos) {
    const patterns = grammar.repository[repoKey].patterns[0].patterns;
    const includes = patterns.filter((p) => p.include).map((p) => p.include);
    assert.ok(
      includes.includes("#template-code-rs"),
      `${repoKey} should include #template-code-rs`
    );
    assert.ok(
      includes.includes("#template-code-shell"),
      `${repoKey} should include #template-code-shell`
    );
  }
});

// ── ROOT PATTERN ORDER ──────────────────────────────────────────────

test("root patterns include new code blocks in correct order", () => {
  assert.ok(includesAtRoot("#template-code-rs"), "expected #template-code-rs at root");
  assert.ok(includesAtRoot("#template-code-shell"), "expected #template-code-shell at root");

  const rootIncludes = grammar.patterns.map((p) => p.include);
  const pyIdx = rootIncludes.indexOf("#template-code-py");
  const rsIdx = rootIncludes.indexOf("#template-code-rs");
  const shellIdx = rootIncludes.indexOf("#template-code-shell");
  const bstIdx = rootIncludes.indexOf("#template-code-beanstalk");

  assert.ok(pyIdx < rsIdx, "#template-code-rs should come after #template-code-py");
  assert.ok(rsIdx < shellIdx, "#template-code-shell should come after #template-code-rs");
  assert.ok(shellIdx < bstIdx, "#template-code-shell should come before #template-code-beanstalk");
});

// ── PACKAGE.JSON EMBEDDED LANGUAGES ─────────────────────────────────

test("package.json includes new embedded language mappings", () => {
  const grammarContribution = pkg.contributes.grammars.find((g) => g.language === "bst");
  const embedded = grammarContribution.embeddedLanguages || {};

  assert.equal(embedded["meta.embedded.block.code.rs.bst"], "rust");
  assert.equal(embedded["meta.embedded.block.code.shell.bst"], "shellscript");

  // Existing mappings intact
  assert.equal(embedded["meta.embedded.block.markdown.bst"], "markdown");
  assert.equal(embedded["meta.embedded.block.css.bst"], "css");
  assert.equal(embedded["meta.embedded.block.html.bst"], "html");
  assert.equal(embedded["meta.embedded.block.code.js.bst"], "javascript");
  assert.equal(embedded["meta.embedded.block.code.ts.bst"], "typescript");
  assert.equal(embedded["meta.embedded.block.code.py.bst"], "python");
  assert.equal(embedded["meta.embedded.block.code.bstlang.bst"], "bst");
  assert.equal(embedded["meta.embedded.block.code.generic.bst"], "plaintext");
});

// ── REPOSITORY INTEGRITY ────────────────────────────────────────────

test("all expected repository families are present", () => {
  const expectedRepos = [
    "comments", "path-literals", "path-group", "invalid-at-sign",
    "template-code-js", "template-code-ts", "template-code-py",
    "template-code-rs", "template-code-shell",
    "template-code-beanstalk", "template-code-generic",
    "template-css", "template-html", "template-markdown", "template-generic",
    "template-head", "template-head-directives",
    "template-body-code-js", "template-body-code-ts", "template-body-code-py",
    "template-body-code-rs", "template-body-code-shell",
    "template-body-code-beanstalk", "template-body-code-generic",
    "template-body-css", "template-body-html", "template-body-markdown",
    "template-body-generic",
    "embedded-code-js", "embedded-code-ts", "embedded-code-py",
    "embedded-code-rs", "embedded-code-shell",
    "embedded-code-beanstalk", "embedded-code-generic",
    "embedded-markdown", "embedded-css", "embedded-html",
    "raw-strings", "strings", "chars", "numbers",
    "keywords", "types", "operators", "punctuation", "constants",
    "type-identifiers", "identifiers", "escapes",
    "template-slot-marker", "template-slot-directive",
    "template-children-directive", "template-doc-directive",
    "template-note-todo-directive", "template-doc-nested-brackets",
    "template-note-todo-nested-brackets",
    "markdown-fragment", "code-beanstalk-fragment", "code-generic-fragment",
    "embedded-html-fragment", "embedded-html-string-double", "embedded-html-string-single",
  ];

  for (const repoKey of expectedRepos) {
    assert.ok(repoExists(repoKey), `expected repository '${repoKey}'`);
  }
});

// ── FIXTURE ─────────────────────────────────────────────────────────

test("fixture contains expected scenarios for manual token inspection", () => {
  assert.ok(fs.existsSync(fixturePath), "expected highlighting fixture to exist");

  const fixture = fs.readFileSync(fixturePath, "utf8");

  // Paths and imports
  for (const snippet of [
    'import @styles/docs {navbar, title, section}',
    'import @html {center}',
    'import @core/math as math',
  ]) {
    assert.ok(fixture.includes(snippet), `expected fixture to include '${snippet}'`);
  }

  // Const declarations
  for (const snippet of [
    'page_title #= "Templates"',
    'page_description #String = "Template syntax in Beanstalk."',
    'page_head #= theme_head',
  ]) {
    assert.ok(fixture.includes(snippet), `expected fixture to include '${snippet}'`);
  }

  // Binding forms
  for (const snippet of [
    'count ~= 0',
    'ratio Float = 1.5',
    'text_slice = "text"',
    "raw_slice = `raw`",
    "letter = 'A'",
    'values ~{Int} = {}',
    'names {String} = {"Priya", "Gollum"}',
  ]) {
    assert.ok(fixture.includes(snippet), `expected fixture to include '${snippet}'`);
  }

  // Structs, choices, functions
  for (const snippet of [
    "Person = |",
    "Status ::",
    "increment |value Int| -> Int:",
    "return value + 1",
    "name, count = pair()",
  ]) {
    assert.ok(fixture.includes(snippet), `expected fixture to include '${snippet}'`);
  }

  // this receiver
  for (const snippet of [
    "display |this Person| -> String:",
    "return this.name",
  ]) {
    assert.ok(fixture.includes(snippet), `expected fixture to include '${snippet}'`);
  }

  // Control flow
  for (const snippet of [
    "if value is true:",
    "io(\"then\")",
    "io(\"else\")",
    "if value is:",
    "loop items |item, index|:",
    "loop 0 to 10 by 2 |i|:",
  ]) {
    assert.ok(fixture.includes(snippet), `expected fixture to include '${snippet}'`);
  }

  // assert
  for (const snippet of [
    "assert(index < items.length)",
    'assert(index < items.length, "out of bounds")',
  ]) {
    assert.ok(fixture.includes(snippet), `expected fixture to include '${snippet}'`);
  }

  // Options, results, then/catch
  for (const snippet of [
    "maybe_name String? = none",
    "if maybe_name is |name| then name else",
    "parse_number(text)!",
    "parse_number(text) catch:",
    "then 0",
  ]) {
    assert.ok(fixture.includes(snippet), `expected fixture to include '${snippet}'`);
  }

  // Templates
  for (const snippet of [
    "[$markdown:",
    "[$slot]",
    '[$slot("style")]',
    '[$insert("style"): color: blue;]',
    "[$children([: Prefix]):",
    "[if show:",
    "[list, if show:",
  ]) {
    assert.ok(fixture.includes(snippet), `expected fixture to include '${snippet}'`);
  }

  // Code blocks - all languages
  for (const snippet of [
    '$code("bst")',
    '$code("js")',
    '$code("ts")',
    '$code("py")',
    '$code("rs")',
    '$code("rust")',
    '$code("sh")',
    '$code("shell")',
    '$code("bash")',
  ]) {
    assert.ok(fixture.includes(snippet), `expected fixture to include '${snippet}'`);
  }

  // CSS and HTML directives
  for (const snippet of [
    "[$css:",
    "[$html:",
  ]) {
    assert.ok(fixture.includes(snippet), `expected fixture to include '${snippet}'`);
  }

  // Escape sequences
  for (const snippet of [
    'escaped = \\n \\a \\[ \\]',
  ]) {
    assert.ok(fixture.includes(snippet), `expected fixture to include '${snippet}'`);
  }

  // Generics
  assert.ok(fixture.includes("value = identity(42)"), "expected identity call");

  // Traits
  assert.ok(fixture.includes("SHOW must:"), "expected trait declaration");
  assert.ok(fixture.includes("show |This| -> String"), "expected trait This receiver");
});

// ── SCOPE REGRESSION CHECKS ─────────────────────────────────────────

test("key scopes exist for regex-based highlighting", () => {
  const scopes = [
    "comment.line.double-dash.bst",
    "keyword.control.flow.bst",
    "keyword.control.loop.range.bst",
    "keyword.other.bst",
    "keyword.control.logical.bst",
    "variable.language.this.bst",
    "support.type.primitive.bst",
    "constant.language.boolean.bst",
    "constant.language.none.bst",
    "variable.language.trait-this.bst",
    "variable.language.generics.bst",
    "support.function.builtin.bst",
    "support.type.builtin.bst",
    "string.quoted.double.bst",
    "string.quoted.raw.bst",
    "string.quoted.single.char.bst",
    "constant.numeric.bst",
    "entity.name.type.bst",
    "variable.other.bst",
  ];

  for (const scope of scopes) {
    const found = findPatternsByName(scope);
    assert.ok(found.length > 0, `expected scope '${scope}' to exist`);
  }
});

test("template meta scopes exist", () => {
  const scopes = [
    "meta.template.bst",
    "meta.template.markdown.bst",
    "meta.template.css.bst",
    "meta.template.html.bst",
    "meta.template.code.js.bst",
    "meta.template.code.ts.bst",
    "meta.template.code.py.bst",
    "meta.template.code.rs.bst",
    "meta.template.code.shell.bst",
    "meta.template.code.bstlang.bst",
    "meta.template.code.generic.bst",
  ];

  for (const scope of scopes) {
    const found = findPatternsByName(scope);
    assert.ok(found.length > 0, `expected scope '${scope}' to exist`);
  }
});
