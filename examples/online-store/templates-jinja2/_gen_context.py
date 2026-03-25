import json
from pathlib import Path


def get_contexts(parent_context):
    model_path = Path(__file__).parent.parent / "models" / "model.json"
    with open(model_path) as f:
        model = json.load(f)

    entities = model["entities"]

    # Build a lookup so templates can find related entities by name
    entity_map = {e["name"]: e for e in entities}

    # Attach the full entity list and lookup to each entity
    for entity in entities:
        entity["all_entities"] = entities
        entity["entity_map"] = entity_map

    return [{"entity": entity} for entity in entities]
