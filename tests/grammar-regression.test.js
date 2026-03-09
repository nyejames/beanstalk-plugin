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
  const pathPatterns = findPatternsByName("meta.path.import.bst");
  assert.ok(pathPatterns.length >= 2, "expected parenthesized and bare path patterns");

  const parenthesizedPathPattern = pathPatterns.find(
    (pattern) => typeof pattern.begin === "string" && pattern.begin.includes("(@)(\\()")
  );
  assert.ok(parenthesizedPathPattern, "expected parenthesized path pattern");
  assert.ok(new RegExp(parenthesizedPathPattern.begin).test("@(a/b/c)"));
  assert.ok(new RegExp(parenthesizedPathPattern.begin).test("@(styles/docs/{footer, navbar})"));

  const barePathPattern = pathPatterns.find(
    (pattern) => typeof pattern.begin === "string" && pattern.begin.includes("(?!\\()")
  );
  assert.ok(barePathPattern, "expected bare path pattern");
  assert.ok(new RegExp(barePathPattern.begin).test("@a/b/c"));
  assert.ok(new RegExp(barePathPattern.begin).test("@styles/docs/{footer, navbar}"));
  assert.ok(new RegExp(barePathPattern.begin).test("@styles/docs/ {footer, navbar}"));

  const groupPattern = findPatternByName("meta.path.import.group.bst");
  assert.ok(groupPattern, "expected grouped import pattern to exist");

  const symbolPattern = findPatternByName("entity.name.import.symbol.bst");
  assert.ok(symbolPattern, "expected grouped import symbol scope");
  assert.ok(new RegExp(symbolPattern.match).test("footer"));

  const invalidAtPattern = findPatternByName("invalid.illegal.path-at.bst");
  assert.ok(invalidAtPattern, "expected malformed @ fallback pattern");
  assert.ok(new RegExp(invalidAtPattern.match).test("@!not_a_path"));
  assert.ok(!new RegExp(invalidAtPattern.match).test("@(valid/path)"));
  assert.ok(!new RegExp(invalidAtPattern.match).test("@valid/path"));
});

test("template scopes define head/body and slot-specific highlighting", () => {
  for (const scopeName of [
    "meta.template.head.bst",
    "meta.template.body.bst",
    "meta.template.slot.marker.bst",
    "meta.template.slot.directive.bst",
    "meta.template.children.directive.bst",
    "meta.template.comment.directive.bst",
    "meta.template.doc.directive.bst"
  ]) {
    assert.ok(findPatternByName(scopeName), `expected scope '${scopeName}'`);
  }

  assert.equal(grammar.repository["template-style-child"], undefined);

  const slotPattern = findPatternByName("meta.template.slot.marker.bst");
  const slotRegex = new RegExp(slotPattern.match);
  assert.ok(slotRegex.test("[$slot]"));
  assert.ok(slotRegex.test("[   $slot   ]"));
  assert.ok(slotRegex.test("[$slot(\"style\")]"));
  assert.ok(slotRegex.test("[   $slot ( \"style\" )   ]"));
  assert.ok(!slotRegex.test("[..]"));
  assert.ok(!slotRegex.test("[$insert(\"style\")]"));
  assert.ok(!slotRegex.test("[.]"));

  const legacySlotPattern = findPatternByName("invalid.deprecated.template.slot.marker.bst");
  assert.ok(legacySlotPattern, "expected legacy slot fallback to be marked invalid");
  const legacySlotRegex = new RegExp(legacySlotPattern.match);
  assert.ok(legacySlotRegex.test("[..]"));
  assert.ok(legacySlotRegex.test("[   ....   ]"));
  assert.ok(!legacySlotRegex.test("[$slot]"));

  const slotDirectivePatterns = findPatternsByName("meta.template.slot.directive.bst");
  assert.ok(slotDirectivePatterns.length >= 2, "expected distinct $slot and $insert directive patterns");

  const anchoredSlotDirectiveRegexes = slotDirectivePatterns
    .map((pattern) => pattern.match)
    .filter(Boolean)
    .map((match) => new RegExp(`^${match}$`));
  assert.ok(anchoredSlotDirectiveRegexes.some((regex) => regex.test("$slot")));
  assert.ok(anchoredSlotDirectiveRegexes.some((regex) => regex.test("$insert(\"style\")")));
  assert.ok(!anchoredSlotDirectiveRegexes.some((regex) => regex.test("$slot(\"style\")")));
  assert.ok(!anchoredSlotDirectiveRegexes.some((regex) => regex.test("$1")));

  const childrenDirectivePattern = findPatternByName("meta.template.children.directive.bst");
  assert.ok(childrenDirectivePattern, "expected $children directive pattern");
  assert.ok(new RegExp(childrenDirectivePattern.begin).test("$children(\"style\")"));
  assert.ok(new RegExp(childrenDirectivePattern.begin).test("$children([: Prefix])"));

  const noteTodoDirectivePattern = findPatternByName("meta.template.comment.directive.bst");
  assert.ok(noteTodoDirectivePattern, "expected $note/$todo directive pattern");
  const noteTodoBeginRegex = new RegExp(noteTodoDirectivePattern.begin);
  assert.ok(noteTodoBeginRegex.test("$note["));
  assert.ok(noteTodoBeginRegex.test("$todo ["));

  const docDirectivePattern = findPatternByName("meta.template.doc.directive.bst");
  assert.ok(docDirectivePattern, "expected $doc directive pattern");
  assert.ok(new RegExp(docDirectivePattern.begin).test("$doc["));

  assert.equal(findPatternByName("entity.name.template.slot.label.bst"), null);
});

test("directive-gated template contexts support markdown/code and common last-wins ordering", () => {
  const markdownTemplate = findPatternByNameContains("meta.template.markdown.bst");
  const cssTemplate = findPatternByNameContains("meta.template.css.bst");
  const jsTemplate = findPatternByNameContains("meta.template.code.js.bst");
  const bstTemplate = findPatternByNameContains("meta.template.code.bstlang.bst");
  const genericCodeTemplate = findPatternByNameContains("meta.template.code.generic.bst");

  assert.ok(markdownTemplate && cssTemplate && jsTemplate && bstTemplate && genericCodeTemplate);

  const markdownBegin = new RegExp(markdownTemplate.begin);
  const cssBegin = new RegExp(cssTemplate.begin);
  const jsBegin = new RegExp(jsTemplate.begin);
  const bstBegin = new RegExp(bstTemplate.begin);
  const genericCodeBegin = new RegExp(genericCodeTemplate.begin);

  assert.ok(markdownBegin.test("[$markdown: body]"));
  assert.ok(cssBegin.test("[$css: body]"));
  assert.ok(jsBegin.test("[$code(\"js\"): body]"));
  assert.ok(bstBegin.test("[$code(\"bst\"): body]"));
  assert.ok(genericCodeBegin.test("[$code: body]"));

  assert.ok(jsBegin.test("[$markdown, $code(\"js\"): body]"));
  assert.ok(jsBegin.test("[$css, $code(\"js\"): body]"));
  assert.ok(markdownBegin.test("[$code(\"js\"), $markdown: body]"));
  assert.ok(markdownBegin.test("[$css, $markdown: body]"));
  assert.ok(cssBegin.test("[$code(\"js\"), $css: body]"));
});

test("escaped brackets do not open or close templates", () => {
  const beginSamples = [
    ["template-code-js", "[$code(\"js\"): body]", "\\[$code(\"js\"): body]"],
    ["template-code-ts", "[$code(\"ts\"): body]", "\\[$code(\"ts\"): body]"],
    ["template-code-py", "[$code(\"py\"): body]", "\\[$code(\"py\"): body]"],
    ["template-code-beanstalk", "[$code(\"bst\"): body]", "\\[$code(\"bst\"): body]"],
    ["template-code-generic", "[$code: body]", "\\[$code: body]"],
    ["template-css", "[$css: body]", "\\[$css: body]"],
    ["template-markdown", "[$markdown: body]", "\\[$markdown: body]"],
    ["template-generic", "[: body]", "\\[: body]"]
  ];

  for (const [repositoryKey, openSample, escapedOpenSample] of beginSamples) {
    const templatePattern = grammar.repository[repositoryKey].patterns[0];
    const beginRegex = new RegExp(templatePattern.begin);
    const endRegex = new RegExp(templatePattern.end);

    assert.ok(beginRegex.test(openSample), `${repositoryKey} should open on unescaped '['`);
    assert.ok(!beginRegex.test(escapedOpenSample), `${repositoryKey} should ignore escaped '['`);
    assert.ok(endRegex.test("]"), `${repositoryKey} should close on unescaped ']'`);
    assert.ok(!endRegex.test("\\]"), `${repositoryKey} should ignore escaped ']'`);
  }
});

test("template and embedded body splitters ignore escaped closing brackets", () => {
  const templateBodyEndRegex = new RegExp(grammar.repository["template-body-code-js"].patterns[0].end);
  assert.ok(templateBodyEndRegex.test("]"), "template body should end on unescaped ']'");
  assert.ok(!templateBodyEndRegex.test("\\]"), "template body should ignore escaped ']'");

  const embeddedJsBody = grammar.repository["embedded-code-js"].patterns.find(
    (pattern) => pattern.contentName === "meta.embedded.block.code.js.bst source.js"
  );
  assert.ok(embeddedJsBody, "expected JS embedded body pattern");

  const embeddedBodyEndRegex = new RegExp(embeddedJsBody.end);
  assert.ok(embeddedBodyEndRegex.test("]"), "embedded code body should split on unescaped ']'");
  assert.ok(!embeddedBodyEndRegex.test("\\]"), "embedded code body should ignore escaped ']'");
});

test("code template bodies prioritize embedded parsing before generic template fallback", () => {
  for (const [repositoryKey, embeddedInclude] of [
    ["template-body-code-js", "#embedded-code-js"],
    ["template-body-code-ts", "#embedded-code-ts"],
    ["template-body-code-py", "#embedded-code-py"],
    ["template-body-code-beanstalk", "#embedded-code-beanstalk"],
    ["template-body-code-generic", "#embedded-code-generic"]
  ]) {
    const bodyPattern = grammar.repository[repositoryKey].patterns[0];
    const includes = bodyPattern.patterns.map((pattern) => pattern.include).filter(Boolean);

    assert.ok(includes.includes("#template-generic"), `${repositoryKey} should include #template-generic fallback`);
    assert.ok(includes.includes(embeddedInclude), `${repositoryKey} should include ${embeddedInclude}`);
    assert.ok(
      includes.indexOf(embeddedInclude) < includes.indexOf("#template-generic"),
      `${repositoryKey} should parse embedded content before generic template fallback`
    );
  }
});

test("markdown template bodies assign paragraph scopes without template string fallback", () => {
  const bodyPattern = grammar.repository["template-body-markdown"].patterns[0];
  const bodyIncludes = bodyPattern.patterns.map((pattern) => pattern.include).filter(Boolean);
  assert.ok(bodyIncludes.includes("#embedded-markdown"), "template-body-markdown should include #embedded-markdown");

  const markdownEmbedding = grammar.repository["embedded-markdown"].patterns.find(
    (pattern) =>
      pattern.name === "meta.embedded.block.markdown.bst" &&
      typeof pattern.contentName === "string" &&
      pattern.contentName.includes("text.html.markdown")
  );

  assert.ok(markdownEmbedding, "expected markdown embedded body pattern");

  const markdownFragment = grammar.repository["markdown-fragment"];
  assert.ok(markdownFragment, "expected reusable markdown fragment repository");

  const fragmentPatterns = markdownFragment.patterns || [];
  const paragraphPatterns = fragmentPatterns.filter(
    (pattern) => pattern.name === "meta.paragraph.markdown"
  );
  assert.ok(paragraphPatterns.length >= 2, "expected markdown paragraph fallback patterns");

  const headingPattern = fragmentPatterns.find(
    (pattern) => pattern.name === "markup.heading.markdown"
  );
  assert.ok(headingPattern, "expected markdown heading pattern");
  const headingRegex = new RegExp(headingPattern.match, "m");
  assert.ok(headingRegex.test("# Title"));
  assert.ok(headingRegex.test("        ### Indented Title"));

  const markdownLinkPattern = fragmentPatterns.find(
    (pattern) => pattern.name === "meta.link.inline.markdown.bst"
  );
  assert.ok(markdownLinkPattern, "expected custom markdown @target (label) link pattern");
  const markdownLinkRegex = new RegExp(`^${markdownLinkPattern.match}$`);
  assert.ok(markdownLinkRegex.test("@https://example.com/docs (Docs)"));
  assert.ok(markdownLinkRegex.test("@/docs/intro (Intro)"));
  assert.ok(markdownLinkRegex.test("@./local/path (Local)"));
  assert.ok(markdownLinkRegex.test("@../parent/path (Parent)"));
  assert.ok(markdownLinkRegex.test("@#section (Section)"));
  assert.ok(markdownLinkRegex.test("@?tab=overview (Overview)"));
  assert.ok(!markdownLinkRegex.test("x@https://example.com (Docs)"));
  assert.ok(!markdownLinkRegex.test("@https://example.com(Docs)"));
  assert.ok(!markdownLinkRegex.test("@https://example.com ()"));
  assert.ok(!markdownLinkRegex.test("@invalid-target (Docs)"));

  const paragraphRunPattern = paragraphPatterns.find((pattern) => pattern.match === "[^\\[\\]`*@\\n]+");
  assert.ok(paragraphRunPattern, "expected markdown paragraph run pattern to avoid inline delimiter and newline greed");

  const paragraphSingleCharPattern = paragraphPatterns.find((pattern) => pattern.match === "[^\\[\\]\\n]");
  assert.ok(paragraphSingleCharPattern, "expected markdown paragraph single-char fallback pattern");

  const paragraphRunRegex = new RegExp("^" + paragraphRunPattern.match + "$");
  assert.ok(paragraphRunRegex.test("plain markdown text"));
  assert.ok(!paragraphRunRegex.test("*italic*"));
  assert.ok(!paragraphRunRegex.test("**bold**"));
  assert.ok(!paragraphRunRegex.test(" **bold**"));

  const markdownIncludes = (markdownEmbedding.patterns || []).map((pattern) => pattern.include).filter(Boolean);
  assert.ok(markdownIncludes.includes("#markdown-fragment"));
  assert.ok(
    !markdownIncludes.includes("text.html.markdown"),
    "embedded markdown should avoid full markdown include that can consume template delimiters"
  );
  assert.ok(
    !(markdownEmbedding.patterns || []).some(
      (pattern) => typeof pattern.name === "string" && pattern.name.includes("string.unquoted.template.body.bst")
    ),
    "embedded markdown should avoid template string fallback scopes for plain text"
  );
});

test("css template bodies embed css and avoid child-template fallback", () => {
  const bodyPattern = grammar.repository["template-body-css"].patterns[0];
  const bodyIncludes = bodyPattern.patterns.map((pattern) => pattern.include).filter(Boolean);
  assert.deepEqual(bodyIncludes, ["#escapes", "#embedded-css"]);

  const cssEmbedding = grammar.repository["embedded-css"].patterns.find(
    (pattern) =>
      pattern.name === "meta.embedded.block.css.bst" &&
      typeof pattern.contentName === "string" &&
      pattern.contentName.includes("source.css")
  );
  assert.ok(cssEmbedding, "expected CSS embedded body pattern");
});

test("embedded css/code modes recurse over balanced square brackets", () => {
  for (const repositoryKey of [
    "embedded-css",
    "embedded-code-js",
    "embedded-code-ts",
    "embedded-code-py",
    "embedded-code-beanstalk",
    "embedded-code-generic"
  ]) {
    const recursiveBracketPattern = grammar.repository[repositoryKey].patterns.find(
      (pattern) =>
        pattern.begin === "(?<!\\\\)\\[" &&
        pattern.end === "(?<!\\\\)\\]" &&
        Array.isArray(pattern.patterns) &&
        pattern.patterns.some((nestedPattern) => nestedPattern.include === `#${repositoryKey}`)
    );

    assert.ok(recursiveBracketPattern, `expected recursive square-bracket handling in ${repositoryKey}`);
  }
});

test("escape patterns cover template bodies, embedded blocks, and string literals", () => {
  const escapeRepo = grammar.repository.escapes;
  assert.ok(escapeRepo, "expected escapes repository");
  const escapePattern = escapeRepo.patterns.find((pattern) => pattern.name === "constant.character.escape.bst");
  assert.ok(escapePattern, "expected escape pattern");

  const escapeRegex = new RegExp("^" + escapePattern.match + "$");
  assert.ok(escapeRegex.test("\\n"));
  assert.ok(escapeRegex.test("\\a"));
  assert.ok(escapeRegex.test("\\["));
  assert.ok(escapeRegex.test("\\]"));
  assert.ok(!escapeRegex.test("\\1"));

  const templateHeadIncludes = grammar.repository["template-head"].patterns[0].patterns
    .map((pattern) => pattern.include)
    .filter(Boolean);
  assert.ok(templateHeadIncludes.includes("#escapes"), "template head should include #escapes");

  for (const repositoryKey of [
    "template-body-generic",
    "template-body-markdown",
    "template-body-css",
    "template-body-code-js",
    "template-body-code-ts",
    "template-body-code-py",
    "template-body-code-beanstalk",
    "template-body-code-generic"
  ]) {
    const bodyIncludes = grammar.repository[repositoryKey].patterns[0].patterns
      .map((pattern) => pattern.include)
      .filter(Boolean);
    assert.ok(bodyIncludes.includes("#escapes"), `${repositoryKey} should include #escapes`);
  }

  for (const repositoryKey of [
    "embedded-markdown",
    "embedded-css",
    "embedded-code-js",
    "embedded-code-ts",
    "embedded-code-py",
    "embedded-code-beanstalk",
    "embedded-code-generic"
  ]) {
    const hasEscapesInclude = grammar.repository[repositoryKey].patterns.some(
      (pattern) =>
        Array.isArray(pattern.patterns) &&
        pattern.patterns.some((nestedPattern) => nestedPattern.include === "#escapes")
    );
    assert.ok(hasEscapesInclude, `${repositoryKey} should include #escapes`);
  }
});

test("embedded language scopes are exposed in package.json", () => {
  const grammarContribution = pkg.contributes.grammars.find((grammarItem) => grammarItem.language === "bst");
  assert.ok(grammarContribution, "expected bst grammar contribution");

  const embedded = grammarContribution.embeddedLanguages || {};
  assert.equal(embedded["meta.embedded.block.markdown.bst"], "markdown");
  assert.equal(embedded["meta.embedded.block.css.bst"], "css");
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
    "import @a/b/c",
    "import @styles/docs/{footer, navbar}",
    "import @styles/docs/ {footer, navbar}",
    "import @(styles/docs/ {footer, navbar})",
    "escaped_string = \"line\\\\n with \\\\a and \\\\[ and \\\\]\"",
    "[$slot]",
    "[$slot(\"style\")]",
    "[$insert(\"style\"): color: blue;]",
    "$slot",
    "$children([: Prefix])",
    "$note[",
    "$todo[",
    "$doc[",
    "$markdown",
    "$css",
    "@https://example.com/docs (Project Docs)",
    "@/docs/getting-started (Guide)",
    "\\n escaped text \\[\\]",
    "        ### Deep Indented Subtitle",
    "escaped = \\a \\[ \\]",
    "$code(\"js\")",
    "const nested = [1, [2, [3]]];",
    "$code(\"py\")",
    "$formatter(markdown, 10)"
  ]) {
    assert.ok(fixture.includes(snippet), `expected fixture to include '${snippet}'`);
  }
});

test("repository exposes all expected new stable scope families", () => {
  const expectedIncludes = [
    "#path-literals",
    "#template-css",
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
    "meta.embedded.block.css.bst",
    "meta.embedded.block.code.generic.bst",
    "meta.embedded.block.code.js.bst",
    "meta.embedded.block.code.ts.bst",
    "meta.embedded.block.code.py.bst"
  ]) {
    assert.ok(findPatternByName(scopeName), `expected scope '${scopeName}'`);
  }
});
