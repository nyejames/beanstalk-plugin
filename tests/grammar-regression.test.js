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
  if (!value || typeof value !== "object") {
    return;
  }

  fn(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      walkObjects(item, fn);
    }
    return;
  }

  for (const nested of Object.values(value)) {
    walkObjects(nested, fn);
  }
}

function findPatternByName(name) {
  let result = null;

  walkObjects(grammar, (node) => {
    if (!result && node && typeof node === "object" && typeof node.name === "string") {
      if (node.name === name || node.name.split(/\s+/).includes(name)) {
        result = node;
      }
    }
  });

  return result;
}

function findPatternByNameContains(nameFragment) {
  let result = null;

  walkObjects(grammar, (node) => {
    if (!result && node && typeof node === "object" && typeof node.name === "string") {
      if (node.name.includes(nameFragment)) {
        result = node;
      }
    }
  });

  return result;
}

function includesAtRoot(includeName) {
  return grammar.patterns.some((pattern) => pattern.include === includeName);
}

test("removes legacy scene-era grammar repositories", () => {
  for (const key of ["scenes", "scene-tags", "code-blocks", "tuples", "lib-functions"]) {
    assert.ok(!(key in grammar.repository), `expected legacy key '${key}' to be removed`);
  }
});

test("root pattern order prioritizes comments, paths, templates, then lexical tokens", () => {
  const rootIncludes = grammar.patterns.map((pattern) => pattern.include);

  assert.deepEqual(rootIncludes.slice(0, 4), [
    "#comments",
    "#path-literals",
    "#invalid-at-sign",
    "#template-code-js"
  ]);

  assert.ok(rootIncludes.indexOf("#template-generic") < rootIncludes.indexOf("#strings"));
  assert.ok(rootIncludes.indexOf("#strings") < rootIncludes.indexOf("#keywords"));
  assert.ok(rootIncludes.indexOf("#keywords") < rootIncludes.indexOf("#operators"));
  assert.ok(rootIncludes.indexOf("#operators") < rootIncludes.indexOf("#identifiers"));
});

test("keywords and types match supported compiler/docs keywords and exclude old ones", () => {
  const keywordPatterns = grammar.repository.keywords.patterns
    .map((pattern) => pattern.match)
    .filter(Boolean)
    .map((pattern) => new RegExp(pattern));

  const typePatterns = grammar.repository.types.patterns
    .map((pattern) => pattern.match)
    .filter(Boolean)
    .map((pattern) => new RegExp(pattern));

  const requiredKeywords = [
    "if", "else", "return", "loop", "break", "continue", "yield",
    "in", "to", "upto", "by", "is", "not", "and", "or",
    "import", "as", "copy", "use"
  ];

  for (const keyword of requiredKeywords) {
    assert.ok(
      keywordPatterns.some((regex) => regex.test(keyword)),
      `expected keyword '${keyword}' to be matched`
    );
  }

  const requiredTypes = ["Int", "Float", "String", "Bool", "None", "Fn", "true", "false", "True", "False"];
  for (const token of requiredTypes) {
    assert.ok(
      typePatterns.some((regex) => regex.test(token)),
      `expected type/literal '${token}' to be matched`
    );
  }

  const typeRegexText = grammar.repository.types.patterns.map((pattern) => pattern.match || "").join(" ");
  const keywordRegexText = grammar.repository.keywords.patterns.map((pattern) => pattern.match || "").join(" ");
  const removed = ["Decimal", "Template", "Choice", "Type", "Error", "Function", "async", "defer"];

  for (const staleToken of removed) {
    assert.ok(!typeRegexText.includes(staleToken), `did not expect stale type token '${staleToken}'`);
    assert.ok(!keywordRegexText.includes(staleToken), `did not expect stale keyword token '${staleToken}'`);
  }
});

test("path syntax repository includes dedicated import path and grouped symbols scopes", () => {
  const pathPattern = findPatternByName("meta.path.import.bst");
  assert.ok(pathPattern, "expected meta.path.import.bst pattern to exist");
  assert.ok(new RegExp(pathPattern.begin).test("@(a/b/c)"));
  assert.ok(new RegExp(pathPattern.begin).test("@(styles/docs/{footer, navbar})"));

  const groupPattern = findPatternByName("meta.path.import.group.bst");
  assert.ok(groupPattern, "expected grouped import pattern to exist");

  const symbolPattern = findPatternByName("entity.name.import.symbol.bst");
  assert.ok(symbolPattern, "expected grouped import symbol scope");
  assert.ok(new RegExp(symbolPattern.match).test("footer"));

  const invalidAtPattern = findPatternByName("invalid.illegal.path-at.bst");
  assert.ok(invalidAtPattern, "expected malformed @ fallback pattern");
  assert.ok(new RegExp(invalidAtPattern.match).test("@not_a_path"));
  assert.ok(!new RegExp(invalidAtPattern.match).test("@(valid/path)"));
});

test("template scopes define head/body and slot-specific highlighting", () => {
  for (const scopeName of [
    "meta.template.head.bst",
    "meta.template.body.bst",
    "meta.template.slot.marker.bst",
    "entity.name.template.slot.label.bst"
  ]) {
    assert.ok(findPatternByName(scopeName), `expected scope '${scopeName}'`);
  }

  const slotPattern = findPatternByName("meta.template.slot.marker.bst");
  const slotRegex = new RegExp(slotPattern.match);
  assert.ok(slotRegex.test("[..]"));
  assert.ok(slotRegex.test("[   ....   ]"));
  assert.ok(!slotRegex.test("[.]"));

  const slotTargetPattern = findPatternByName("entity.name.template.slot.label.bst");
  assert.ok(new RegExp(slotTargetPattern.match).test("$1"));
  assert.ok(new RegExp(slotTargetPattern.match).test("$22"));
});

test("directive-gated template contexts support markdown/code and common last-wins ordering", () => {
  const markdownTemplate = findPatternByNameContains("meta.template.markdown.bst");
  const jsTemplate = findPatternByNameContains("meta.template.code.js.bst");
  const bstTemplate = findPatternByNameContains("meta.template.code.bstlang.bst");
  const genericCodeTemplate = findPatternByNameContains("meta.template.code.generic.bst");

  assert.ok(markdownTemplate && jsTemplate && bstTemplate && genericCodeTemplate);

  const markdownBegin = new RegExp(markdownTemplate.begin);
  const jsBegin = new RegExp(jsTemplate.begin);
  const bstBegin = new RegExp(bstTemplate.begin);
  const genericCodeBegin = new RegExp(genericCodeTemplate.begin);

  assert.ok(markdownBegin.test("[$markdown: body]"));
  assert.ok(jsBegin.test("[$code(\"js\"): body]"));
  assert.ok(bstBegin.test("[$code(\"bst\"): body]"));
  assert.ok(genericCodeBegin.test("[$code: body]"));

  assert.ok(jsBegin.test("[$markdown, $code(\"js\"): body]"));
  assert.ok(markdownBegin.test("[$code(\"js\"), $markdown: body]"));
});

test("embedded language scopes are exposed in package.json", () => {
  const grammarContribution = pkg.contributes.grammars.find((grammarItem) => grammarItem.language === "bst");
  assert.ok(grammarContribution, "expected bst grammar contribution");

  const embedded = grammarContribution.embeddedLanguages || {};
  assert.equal(embedded["meta.embedded.block.markdown.bst"], "markdown");
  assert.equal(embedded["meta.embedded.block.code.js.bst"], "javascript");
  assert.equal(embedded["meta.embedded.block.code.ts.bst"], "typescript");
  assert.equal(embedded["meta.embedded.block.code.py.bst"], "python");
  assert.equal(embedded["meta.embedded.block.code.bstlang.bst"], "bst");
});

test("fixture contains expected scenarios for manual token inspection", () => {
  assert.ok(fs.existsSync(fixturePath), "expected highlighting fixture to exist");

  const fixture = fs.readFileSync(fixturePath, "utf8");
  for (const snippet of [
    "import @(a/b/c)",
    "import @(styles/docs/{footer, navbar})",
    "[..]",
    "[$1: first slot]",
    "$markdown",
    "$code(\"js\")",
    "$code(\"py\")",
    "$formatter(markdown, 10)"
  ]) {
    assert.ok(fixture.includes(snippet), `expected fixture to include '${snippet}'`);
  }
});

test("repository exposes all expected new stable scope families", () => {
  const expectedIncludes = [
    "#path-literals",
    "#template-markdown",
    "#template-code-generic",
    "#template-generic"
  ];

  for (const includeName of expectedIncludes) {
    assert.ok(includesAtRoot(includeName), `expected root include '${includeName}'`);
  }

  for (const scopeName of [
    "meta.path.import.bst",
    "meta.embedded.block.markdown.bst",
    "meta.embedded.block.code.generic.bst",
    "meta.embedded.block.code.js.bst",
    "meta.embedded.block.code.ts.bst",
    "meta.embedded.block.code.py.bst"
  ]) {
    assert.ok(findPatternByName(scopeName), `expected scope '${scopeName}'`);
  }
});
