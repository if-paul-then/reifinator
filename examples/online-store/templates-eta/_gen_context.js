import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function getContexts(parentContext) {
  const modelPath = join(__dirname, "..", "models", "model.json");
  const model = JSON.parse(readFileSync(modelPath, "utf-8"));

  const entities = model.entities;
  const entityMap = Object.fromEntries(entities.map((e) => [e.name, e]));

  for (const entity of entities) {
    entity.all_entities = entities;
    entity.entity_map = entityMap;
  }

  return entities.map((entity) => ({ entity }));
}
