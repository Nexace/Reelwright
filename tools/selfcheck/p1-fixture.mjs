// Shared fixture alias: p1-fixture.mjs was renamed fixture.mjs; this re-export stays until its last importer
// (a file another change owns) imports the new name. Remove it then.
export * from "./fixture.mjs";
