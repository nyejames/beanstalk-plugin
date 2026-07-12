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

function repoIncludes(repoKey) {
  const patterns = grammar.repository[repoKey].patterns[0].patterns || [];
  return patterns.filter((p) => p.include).map((p) => p.include);
}

function regexpFromPattern(pattern) {
  return new RegExp(pattern);
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

test("cast is highlighted as a current conversion keyword", () => {
  const kwOther = grammar.repository.keywords.patterns.find(
    (p) => p.name === "keyword.other.bst"
  );
  assert.ok(kwOther, "expected keyword.other.bst");
  assert.ok(/\bcast\b/.test(kwOther.match), "cast should be highlighted");
});

test("this is reserved via variable.language.this.bst", () => {
  const thisPattern = grammar.repository.keywords.patterns.find(
    (p) => p.name === "variable.language.this.bst"
  );
  assert.ok(thisPattern, "expected variable.language.this.bst");
  const thisRegex = new RegExp("^" + thisPattern.match + "$", "u");
  assert.ok(thisRegex.test("this"), "regex should match 'this'");
  assert.ok(!thisRegex.test("thistle"), "regex should not match 'thistle'");
});

test("required current keywords are present", () => {
  const keywordText = grammar.repository.keywords.patterns
    .map((p) => p.match || "").join(" ");

  const required = [
    "if", "else", "return", "loop", "break", "continue", "catch", "then",
    "is", "not", "and", "or",
    "import", "export", "as", "copy", "must", "cast",
    "to", "by",
  ];
  for (const kw of required) {
    assert.ok(
      new RegExp("\\b" + kw + "\\b").test(keywordText),
      `expected keyword '${kw}' in grammar`
    );
  }
});

test("inclusive range ampersand is highlighted outside word-boundary matching", () => {
  const rangePattern = grammar.repository.keywords.patterns.find(
    (p) => p.name === "keyword.control.loop.range.bst"
  );
  assert.ok(rangePattern, "expected range keyword pattern");
  const re = regexpFromPattern(rangePattern.match);
  assert.ok(re.test("to"));
  assert.ok(re.test("by"));
  assert.ok(re.test("&"));
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

// ── OPERATORS AND NUMBERS ────────────────────────────────────────────

test("symbol operators include plus and longer Beanstalk tokens", () => {
  const symbol = grammar.repository.operators.patterns.find(
    (p) => p.name === "keyword.operator.symbol.bst"
  );
  assert.ok(symbol, "expected symbolic operator pattern");
  const re = new RegExp("^(?:" + symbol.match + ")$");
  for (const op of ["+", "-", "=>", "->", "::", "//", "<=", ">=", "..", "$"]) {
    assert.ok(re.test(op), `expected operator '${op}'`);
  }
  assert.ok(!re.test("|"), "pipe should not be encoded as a symbol operator");
  assert.ok(!re.test("+-"), "plus should not be encoded as a '+-' operator");
});

test("compound assignment operators include #= and ~=", () => {
  const compound = grammar.repository.operators.patterns.find(
    (p) => p.name === "keyword.operator.assignment.compound.bst"
  );
  assert.ok(compound, "expected compound assignment pattern");
  const re = new RegExp("^(?:" + compound.match + ")$");
  for (const op of ["+=", "-=", "*=", "//=", "/=", "%=", "^=", "#=", "~="]) {
    assert.ok(re.test(op), `expected compound/operator form '${op}'`);
  }
});

test("punctuation covers pipe brackets and dot accessor", () => {
  const punct = grammar.repository.punctuation.patterns;
  const pipePattern = punct.find((p) => p.name === "punctuation.brackets.pipe.bst");
  const dotPattern = punct.find((p) => p.name === "punctuation.accessor.dot.bst");
  assert.ok(pipePattern, "expected pipe bracket punctuation");
  assert.ok(dotPattern, "expected dot accessor punctuation");
  assert.ok(new RegExp("^(?:" + pipePattern.match + ")$").test("|"), "pipe should match");
  assert.ok(new RegExp("^(?:" + dotPattern.match + ")$").test("."), "dot should match");
});

test("number literal pattern covers exponent notation", () => {
  const numeric = grammar.repository.numbers.patterns.find(
    (p) => p.name === "constant.numeric.bst"
  );
  assert.ok(numeric, "expected numeric pattern");
  const re = regexpFromPattern(numeric.match);
  for (const n of ["1", "1.5", "1e6", "1.0e-6", "-2147483648"]) {
    assert.ok(re.test(n), `expected numeric literal '${n}'`);
  }
});

// ── DIRECTIVES ───────────────────────────────────────────────────────

test("template-head-directives includes css, html, code, and escape_html", () => {
  const directivePattern = grammar.repository["template-head-directives"].patterns.find(
    (p) => (p.match || "").includes("slot") && (p.match || "").includes("insert")
  );
  assert.ok(directivePattern, "expected known-directive pattern");
  for (const d of ["md", "css", "html", "code", "escape_html"]) {
    assert.ok(
      directivePattern.match.includes(d),
      `expected directive '${d}' in known-directive match`
    );
  }
  assert.ok(!directivePattern.match.includes("markdown"), "$markdown should be replaced by $md");
});

test("template-code-rs repository exists and matches rs/rust", () => {
  assert.ok(repoExists("template-code-rs"), "expected template-code-rs repository");
  assert.ok(repoExists("template-body-code-rs"), "expected template-body-code-rs repository");
  assert.ok(repoExists("embedded-code-rs"), "expected embedded-code-rs repository");

  const rsPattern = grammar.repository["template-code-rs"].patterns[0];
  assert.ok(rsPattern.name.includes("meta.template.code.rs.bst"));

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
  assert.ok(langPattern.patterns.some((p) => p.include === "source.rust"));
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
  assert.ok(langPattern.patterns.some((p) => p.include === "source.shell"));
});

test("code-beanstalk fragments highlight imports and @html paths inside $code('bst')", () => {
  const includes = grammar.repository["code-beanstalk-fragment"].patterns
    .filter((p) => p.include)
    .map((p) => p.include);
  assert.ok(includes.includes("#path-literals"), "expected @path highlighting in embedded bst code");
  assert.ok(includes.includes("#invalid-at-sign"), "expected invalid @ fallback in embedded bst code");
});

test("embedded Beanstalk code bracket blocks keep fragment highlighting active", () => {
  const nestedBlock = grammar.repository["embedded-code-beanstalk"].patterns.find(
    (p) => p.begin === "(?<!\\\\)\\["
  );
  assert.ok(nestedBlock, "expected recursive bracket block");
  const includes = (nestedBlock.patterns || []).map((p) => p.include);
  assert.ok(includes.includes("#embedded-code-beanstalk"), "expected nested bracket recursion");
  assert.ok(includes.includes("#code-beanstalk-fragment"), "expected Beanstalk code highlighting inside nested brackets");
});

test("CSS formatter body uses bounded CSS fragment rules", () => {
  const bodyIncludes = repoIncludes("template-body-css");
  assert.ok(bodyIncludes.includes("#embedded-css"), "expected $css body to use embedded CSS");

  const cssPatterns = grammar.repository["embedded-css"].patterns;
  const contentPattern = cssPatterns.find((p) => p.contentName && p.contentName.includes("source.css"));
  assert.ok(contentPattern, "expected embedded CSS content scope for VS Code language mapping");
  assert.ok(contentPattern.patterns.some((p) => p.include === "#css-fragment"));
  assert.ok(!contentPattern.patterns.some((p) => p.include === "source.css"), "external source.css can leak past the template close");
  assert.ok(cssPatterns.some((p) => p.begin === String.raw`(?<!\\)\[` && p.end === String.raw`(?<!\\)\]`));
});

test("bounded CSS fragment covers declaration snippets without external CSS state", () => {
  assert.ok(repoExists("css-fragment"), "expected bounded css-fragment repository");
  const cssPatterns = grammar.repository["css-fragment"].patterns;
  const names = cssPatterns.map((p) => p.name || "");
  assert.ok(names.includes("support.type.property-name.css"));
  assert.ok(names.includes("support.function.css"));
  assert.ok(names.includes("constant.other.color.rgb-value.hex.css"));

  const propertyPattern = cssPatterns.find((p) => p.name === "support.type.property-name.css");
  const functionPattern = cssPatterns.find((p) => p.name === "support.function.css");
  const numberPattern = cssPatterns.find((p) => p.name === "constant.numeric.css");
  assert.ok(regexpFromPattern(propertyPattern.match).test("clip-path: circle(55%);"));
  assert.ok(regexpFromPattern(functionPattern.match).test("circle(55%);"));
  assert.ok(regexpFromPattern(numberPattern.match).test("55%"));
});
test("new code includes are wired into template body patterns", () => {
  const bodyRepos = [
    "template-body-code-js", "template-body-code-ts", "template-body-code-py",
    "template-body-code-beanstalk", "template-body-code-generic",
    "template-body-generic", "template-body-html", "template-body-markdown",
  ];

  for (const repoKey of bodyRepos) {
    const includes = repoIncludes(repoKey);
    assert.ok(includes.includes("#template-code-rs"), `${repoKey} should include #template-code-rs`);
    assert.ok(includes.includes("#template-code-shell"), `${repoKey} should include #template-code-shell`);
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

test("package.json includes embedded language mappings", () => {
  const grammarContribution = pkg.contributes.grammars.find((g) => g.language === "bst");
  const embedded = grammarContribution.embeddedLanguages || {};

  assert.equal(embedded["meta.embedded.block.markdown.bst"], "markdown");
  assert.equal(embedded["meta.embedded.block.css.bst"], "css");
  assert.equal(embedded["meta.embedded.block.html.bst"], "html");
  assert.equal(embedded["meta.embedded.block.code.js.bst"], "javascript");
  assert.equal(embedded["meta.embedded.block.code.ts.bst"], "typescript");
  assert.equal(embedded["meta.embedded.block.code.py.bst"], "python");
  assert.equal(embedded["meta.embedded.block.code.bstlang.bst"], "bst");
  assert.equal(embedded["meta.embedded.block.code.generic.bst"], "plaintext");
  assert.equal(embedded["meta.embedded.block.code.rs.bst"], "rust");
  assert.equal(embedded["meta.embedded.block.code.shell.bst"], "shellscript");
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
    "embedded-markdown", "embedded-css", "css-fragment", "embedded-html",
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

  for (const snippet of [
    'import @styles/docs {navbar, title, section}',
    'import @html {center}',
    'import @core/math as math',
    'page_title #= "Templates"',
    'page_description #String = "Template syntax in Beanstalk."',
    'count ~= 0',
    'ratio Float = 1.5',
    'text_slice = "text"',
    "raw_slice = `raw`",
    "letter = 'A'",
    'values ~{Int} = {}',
    'names {String} = {"Priya", "Gollum"}',
    "Person = |",
    "Status ::",
    "increment |value Int| -> Int:",
    "return value + 1",
    "name, count = pair()",
    "display |this Person| -> String:",
    "return this.name",
    "if value is true:",
    "io(\"then\")",
    "io(\"else\")",
    "if value is:",
    "loop items |item, index|:",
    "loop 0 to 10 by 2 |i|:",
    "loop 0 to & 10 |i|:",
    "assert(index < items.length)",
    'assert(index < items.length, "out of bounds")',
    "maybe_name String? = none",
    "if maybe_name is |name| then name else",
    "parse_number(text)!",
    "parse_number(text) catch:",
    "then 0",
    "count_text String = cast count",
    "value = identity(42)",
    "[$md:",
    "- This is a Markdown bullet.",
    "[$slot]",
    '[$slot("style")]',
    '[$insert("style"): color: blue;]',
    "[$children([: Prefix]):",
    "[if show:",
    "[list, if show:",
    '$code("bst")', '$code("js")', '$code("ts")', '$code("py")',
    '$code("rs")', '$code("rust")', '$code("sh")', '$code("shell")', '$code("bash")',
    "[$css:", "[$html:",
    "clip-path: circle(55%);",
    "This paragraph is styled by the HTML builder's @html constants.",
    '["[literal]"]',
    'escaped = \\n \\a \\[ \\]',
    "SHOW must:",
    "show |This| -> String",
  ]) {
    assert.ok(fixture.includes(snippet), `expected fixture to include '${snippet}'`);
  }
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

// ── MARKDOWN LINKS ──────────────────────────────────────────────────

test("markdown bullet markers have dedicated list punctuation scopes", () => {
  const markdownFragment = grammar.repository["markdown-fragment"].patterns;
  const bulletPattern = markdownFragment.find(
    (p) => p.name === "markup.list.unnumbered.markdown"
  );
  assert.ok(bulletPattern, "expected unordered Markdown list pattern");

  const re = regexpFromPattern(bulletPattern.match);
  for (const bullet of ["- item", "  * item", "+ item"]) {
    assert.ok(re.test(bullet), `expected bullet marker to match: ${bullet}`);
  }
  assert.ok(!re.test("-item"), "a hyphen without following whitespace is not a bullet");
  assert.equal(
    bulletPattern.captures["1"].name,
    "punctuation.definition.list.begin.markdown"
  );
});

test("markdown link regex matches Beanstalk link syntax and rejects bare domains", () => {
  const markdownFragment = grammar.repository["markdown-fragment"].patterns;
  const linkPattern = markdownFragment.find(
    (p) => p.name === "meta.link.inline.markdown.bst"
  );
  assert.ok(linkPattern, "expected inline markdown link pattern");
  const re = regexpFromPattern(linkPattern.match);

  for (const link of [
    "@https://example.com (Example)",
    "@//cdn.example.com/lib.js (CDN)",
    "@/docs/getting-started (Docs)",
    "@./local/path (Local)",
    "@../parent/path (Parent)",
    "@#overview (Overview)",
    "@?q=beanstalk (Search)",
  ]) {
    assert.ok(re.test(link), `expected valid link to match: ${link}`);
  }

  for (const nonLink of [
    "@example.com (Example)",
    "@https://example.com(Example)",
    "@https://example.com\n(Example)",
  ]) {
    assert.ok(!re.test(nonLink), `expected invalid link not to match: ${nonLink}`);
  }
});
