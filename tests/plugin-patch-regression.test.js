const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const rootDir = path.resolve(__dirname, "..");
const packagePath = path.join(rootDir, "package.json");
const importGrammarPath = path.join(rootDir, "syntaxes", "bst-import-groups.tmLanguage.json");
const bdGrammarPath = path.join(rootDir, "syntaxes", "bd.tmLanguage.json");
const commentGrammarPath = path.join(rootDir, "syntaxes", "bst-comment-directives.tmLanguage.json");
const bdFixturePath = path.join(__dirname, "fixtures", "highlighting-samples.bd");

const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const importGrammar = JSON.parse(fs.readFileSync(importGrammarPath, "utf8"));
const bdGrammar = JSON.parse(fs.readFileSync(bdGrammarPath, "utf8"));
const commentGrammar = JSON.parse(fs.readFileSync(commentGrammarPath, "utf8"));

function includesFor(repoKey, grammar = importGrammar) {
  return grammar.repository[repoKey].patterns
    .flatMap((pattern) => pattern.patterns || [])
    .filter((pattern) => pattern.include)
    .map((pattern) => pattern.include);
}

test("package registers Beandown files with a dedicated grammar", () => {
  const language = pkg.contributes.languages.find((entry) => entry.id === "bd");
  assert.ok(language, "expected a bd language contribution");
  assert.ok(language.extensions.includes(".bd"), "expected .bd extension support");

  const grammar = pkg.contributes.grammars.find((entry) => entry.language === "bd");
  assert.ok(grammar, "expected a bd grammar contribution");
  assert.equal(grammar.scopeName, "source.bd");
  assert.equal(grammar.path, "./syntaxes/bd.tmLanguage.json");
  assert.equal(grammar.embeddedLanguages["meta.embedded.block.markdown.bst"], "markdown");
  assert.equal(grammar.embeddedLanguages["meta.embedded.block.code.bstlang.bst"], "bst");
});

test("package injects richer import group highlighting into Beanstalk", () => {
  const injected = pkg.contributes.grammars.find(
    (entry) => entry.scopeName === "source.bst.import-groups"
  );

  assert.ok(injected, "expected import group injection grammar");
  assert.deepEqual(injected.injectTo, ["source.bst"]);
  assert.equal(injected.path, "./syntaxes/bst-import-groups.tmLanguage.json");
});

test("import group grammar supports aliases, nested groups, and child paths", () => {
  assert.equal(
    importGrammar.injectionSelector,
    "L:source.bst - meta.template.body.bst - string - comment"
  );

  const groupPattern = importGrammar.repository["path-group"].patterns[0];
  assert.ok(groupPattern, "expected path-group pattern");
  assert.equal(groupPattern.begin, "\\{");
  assert.equal(groupPattern.end, "\\}");

  const includes = includesFor("path-group");
  assert.ok(includes.includes("#path-group"), "expected recursive nested import groups");

  const aliasPattern = groupPattern.patterns.find(
    (pattern) => pattern.name === "keyword.other.alias.bst keyword.other.bst"
  );
  assert.ok(aliasPattern, "expected an alias keyword pattern");
  assert.ok(new RegExp(aliasPattern.match).test("as"), "expected 'as' to be highlighted in groups");

  const separatorPattern = groupPattern.patterns.find(
    (pattern) => pattern.name === "punctuation.separator.path.bst"
  );
  assert.ok(separatorPattern, "expected child import path separators");
  assert.ok(new RegExp(separatorPattern.match).test("/"), "expected / to be allowed in groups");

  const invalidPattern = groupPattern.patterns.find(
    (pattern) => pattern.name === "invalid.illegal.path.group.character.bst"
  );
  const invalidRe = new RegExp(invalidPattern.match);
  assert.equal(invalidRe.test("/"), false, "group paths must not mark / invalid");
  assert.equal(invalidRe.test("{"), false, "nested groups must not mark { invalid");
  assert.equal(invalidRe.test("}"), false, "nested groups must not mark } invalid");
});

test("Beandown grammar starts in markdown-template-body context", () => {
  const bodyPatterns = bdGrammar.repository["beandown-markdown-body"].patterns;
  const includes = bodyPatterns.map((pattern) => pattern.include);

  assert.ok(includes.includes("source.bst#embedded-markdown"));
  assert.ok(includes.includes("source.bst#template-generic"));
  assert.ok(includes.includes("source.bst#template-markdown"));
  assert.ok(includes.includes("source.bst#template-code-beanstalk"));
  assert.ok(includes.includes("source.bst#template-css"));
  assert.ok(includes.includes("source.bst#template-html"));

  assert.ok(!includes.includes("source.bst#template-body-markdown"), ".bd should not require a ':' opener");
  assert.ok(!includes.includes("source.bst#comments"), "-- is body text in .bd files");
});

test("package injects template comment directive highlighting", () => {
  const injected = pkg.contributes.grammars.find(
    (entry) => entry.scopeName === "source.bst.comment-directives"
  );

  assert.ok(injected, "expected comment directive injection grammar");
  assert.deepEqual(injected.injectTo, ["source.bst", "source.bd"]);
  assert.equal(injected.path, "./syntaxes/bst-comment-directives.tmLanguage.json");
});

test("$todo and $note use distinct template scopes but comment-like body scopes", () => {
  const todoPattern = commentGrammar.repository["template-todo-comment"].patterns[0];
  const notePattern = commentGrammar.repository["template-note-comment"].patterns[0];
  const bodyPattern = commentGrammar.repository["template-comment-body"].patterns[0];

  assert.ok(todoPattern.name.includes("meta.template.comment.todo.bst"));
  assert.ok(notePattern.name.includes("meta.template.comment.note.bst"));
  assert.notEqual(todoPattern.name, notePattern.name, "todo and note should be distinguishable");

  assert.ok(bodyPattern.contentName.includes("comment.line.double-dash.bst"));
  assert.ok(bodyPattern.contentName.includes("comment.block.template.comment.bst"));
});

test("$doc uses the markdown-template body stack", () => {
  const docPattern = commentGrammar.repository["template-doc-comment"].patterns[0];
  assert.ok(docPattern.name.includes("meta.template.markdown.bst"));

  const docBodyIncludes = includesFor("template-doc-body", commentGrammar);
  assert.ok(docBodyIncludes.includes("source.bst#embedded-markdown"));
  assert.ok(docBodyIncludes.includes("source.bst#template-generic"));
  assert.ok(docBodyIncludes.includes("source.bst#template-code-beanstalk"));
});

test("Beandown fixture contains direct markdown body and nested template directives", () => {
  assert.ok(fs.existsSync(bdFixturePath), "expected Beandown fixture to exist");
  const fixture = fs.readFileSync(bdFixturePath, "utf8");

  for (const snippet of [
    "# Beandown title",
    "-- this is markdown body text, not a Beanstalk comment",
    "[p:",
    "[$doc:",
    "[$todo:",
    "[$note:",
    "[codeblock, $code(\"bst\"):"
  ]) {
    assert.ok(fixture.includes(snippet), `expected fixture to include '${snippet}'`);
  }
});
