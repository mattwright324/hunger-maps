import os
import json
import csv
import re
import math
from collections import Counter, defaultdict, deque

# FModel export of the game's /Game content folder
EXPORT_ROOT = r"C:\Users\mattwright324\AppData\Local\Temp\7zO01F3A62F\Output\Exports\ProjectRLH\Content"

def content_path(*parts):
    return os.path.join(EXPORT_ROOT, *parts)

AI_SPAWNER_TABLES = content_path("AI")
ITEM_TABLES = content_path("Data", "Loot", "ItemTables")
LOOT_SOURCES_JSON = content_path("Data", "Loot", "DT_LootSources.json")
LOOT_TABLES_JSON = content_path("Data", "Loot", "DT_LootTables.json")
SMART_BRUSHES = content_path("Data", "UI", "Styling", "Brushes")
INVENTORY_DEFS = content_path("Data", "Inventory", "Definitions")
RESOURCE_NODES = content_path("Data", "Resources", "Nodes")

BP_FOLDERS = [
    content_path("Data"),
    content_path("Gameplay"),
    content_path("Meshes", "Blueprints"),
    content_path("Blueprints"),
    content_path("AI"),
]

OUTPUT_FOLDER = r"output/"
PARSE_MAP = [
    {
        "folder": content_path("Levels", "Map01", "map01_p_WP"),
        "output": "map01_components.csv"
    },
    {
        "folder": content_path("Levels", "Map02", "map02_p_WP"),
        "output": "map02_components.csv"
    },
    {
        "folder": content_path("Levels", "Map03", "map03_p_WP"),
        "output": "map03_components.csv"
    },
    {
        "folder": content_path("Levels", "Chateau", "Chateau_p_WP"),
        "output": "map00_components.csv",
        "skip_actor_types": ["StaticMeshActor", "Actor"],
    },
]

### Reading exports

def load_exports(folders, skip_prefix="LI_"):
    """Yield (full_path, objects) for every FModel export file in the folders."""
    for folder in folders:
        count = 0
        for root, _, files in os.walk(folder):
            for file in files:
                if not file.lower().endswith(".json"):
                    continue
                if skip_prefix and file.startswith(skip_prefix): # Skip blueprint "world" files
                    continue
                full_path = os.path.join(root, file)
                try:
                    with open(full_path, "r", encoding="utf-8") as f:
                        objects = json.load(f)
                except Exception as e:
                    print(f"Failed to parse {full_path}: {e}")
                    continue
                if not isinstance(objects, list) or not all(isinstance(obj, dict) for obj in objects):
                    print(f"Skipping {full_path}: not a list of exports")
                    continue
                count += 1
                yield full_path, objects
        print(f"Read {count} files in {folder}")

def package_name(full_path):
    """C:\\...\\Content\\Data\\Foo\\Bar.json -> /Game/Data/Foo/Bar"""
    relative = os.path.relpath(os.path.splitext(full_path)[0], EXPORT_ROOT)
    return "/Game/" + relative.replace(os.sep, "/")

def parse_ref(ref):
    """Split an FModel ObjectName into (type, name).

    "Type'/Game/Path/Asset.Asset_C'"                  -> ("Type", "Asset_C")
    "Type'map01_p_WP:PersistentLevel.Actor.Component'" -> ("Type", "Actor")
    "Type'Default__Asset_C:SceneRoot'"                 -> ("Type", "Default__Asset_C")
    Anything else is returned as (None, ref).
    """
    matches = re.fullmatch(r"(\w+)'(.*)'", ref or "")
    if not matches:
        return None, ref
    ref_type, path = matches.groups()
    if ":PersistentLevel." in path:
        path = path.split(":PersistentLevel.", 1)[1]
    elif path.startswith("/"):
        path = path.rsplit("/", 1)[-1].split(".", 1)[-1]
    return ref_type, re.split(r"[.:]", path)[0]

def ref_name(ref):
    return parse_ref(ref)[1]

def asset_name(asset_path):
    """/Game/UI/Icons/T_Icon.T_Icon -> T_Icon"""
    return re.split(r"[.:]", asset_path.rsplit("/", 1)[-1])[-1] if asset_path else asset_path

def level_outer(obj):
    """(type, name) of the level actor an object belongs to, from its Outer ObjectName."""
    outer_full = (obj.get("Outer") or {}).get("ObjectName") or ""
    matches = re.search(r"(.+)'\w+:PersistentLevel\.(.+)'", outer_full)
    if matches:
        return matches.group(1), matches.group(2)
    return None, None

### Resolving references

class ExportIndex:
    """Looks up exports by their exact ObjectPath ("/Game/Package.ExportIndex").

    A map index can be layered over a shared blueprint index with parent=, so lookups
    fall through to the blueprints without indexing them again for every map.
    """

    def __init__(self, parent=None):
        self.parent = parent
        self.packages = {}
        self.assets = {}
        self.by_type = defaultdict(list)
        self.by_name = defaultdict(list)
        self.children = defaultdict(list)
        self.class_by_cdo = {}
        self.classes = defaultdict(list)

    def load(self, folders, source_folder, is_level=False, skip_prefix="LI_"):
        for full_path, objects in load_exports(folders, skip_prefix):
            self.add_package(package_name(full_path), objects, source_folder, os.path.basename(full_path), is_level)
        return self

    def add_package(self, package, objects, source_folder, file, is_level):
        self.packages[package] = objects
        # FModel writes a level's .umap into the level's own folder: Chateau_p_WP/Chateau_p_WP.json
        folder, base = package.rsplit("/", 1)
        if folder.endswith("/" + base):
            self.packages.setdefault(folder, objects)

        for obj in objects:
            obj["SourceFolder"] = source_folder
            obj["SourceFile"] = file
            obj["IsLevel"] = is_level
            if obj.get("Type"):
                self.by_type[obj["Type"]].append(obj)
            if obj.get("Name"):
                self.by_name[obj["Name"]].append(obj)
            if not obj.get("Outer"):
                self.assets[f"{package}.{obj.get('Name')}"] = obj
            if obj.get("Type") == "BlueprintGeneratedClass":
                self.classes[obj.get("Name")].append(obj)

        # Outer and ClassDefaultObject always point inside the same package
        for obj in objects:
            outer = self.resolve(obj.get("Outer"))
            if outer:
                self.children[id(outer)].append(obj)
            cdo = self.resolve(obj.get("ClassDefaultObject"))
            if cdo:
                self.class_by_cdo[id(cdo)] = obj

    def resolve(self, ref):
        """Export a {"ObjectName", "ObjectPath"} reference points at, or None if it isn't loaded."""
        if not isinstance(ref, dict):
            return None
        package, _, index = (ref.get("ObjectPath") or "").rpartition(".")
        if not index.isdigit():
            return None
        objects = self.packages.get(package)
        if objects is None:
            return self.parent.resolve(ref) if self.parent else None
        index = int(index)
        return objects[index] if index < len(objects) else None

    def find_asset(self, asset_path):
        """Top-level export by "/Game/Package.Name", as used in Class and soft object paths."""
        found = self.assets.get(asset_path)
        if not found and self.parent:
            return self.parent.find_asset(asset_path)
        return found

    def get_children(self, obj):
        children = self.children.get(id(obj), [])
        return children + self.parent.get_children(obj) if self.parent else children

    def get_by_type(self, type):
        found = self.by_type.get(type, [])
        return found + self.parent.get_by_type(type) if self.parent else found

    def get_classes(self, name):
        found = self.classes.get(name, [])
        return found + self.parent.get_classes(name) if self.parent else found

    def class_of(self, cdo):
        found = self.class_by_cdo.get(id(cdo))
        if not found and self.parent:
            return self.parent.class_of(cdo)
        return found

    def cdo_of(self, obj):
        """A blueprint class reference stands for its class default object."""
        if obj and obj.get("Type") == "BlueprintGeneratedClass":
            return self.resolve(obj.get("ClassDefaultObject")) or obj
        return obj

    def archetype(self, obj):
        """The object obj was created from and inherits unset properties from."""
        template = self.resolve(obj.get("Template"))
        if template:
            return template
        # A class default object inherits from its parent class's default object
        clazz = self.class_of(obj)
        if clazz:
            return self.cdo_of(self.resolve(clazz.get("SuperStruct")))
        # A blueprint's component inherits from the same-named component of the parent blueprint
        outer = self.resolve(obj.get("Outer"))
        if outer and self.class_of(outer):
            outer_archetype = self.archetype(outer)
            if outer_archetype:
                for child in self.get_children(outer_archetype):
                    if child.get("Name") == obj.get("Name"):
                        return child
        # Anything else, like a blueprint's template of a child actor, inherits from its
        # class's default object
        class_type, class_path = re.fullmatch(r"(\w+)'(.*)'", obj.get("Class") or "x''").groups()
        if class_type == "BlueprintGeneratedClass":
            cdo = self.cdo_of(self.find_asset(class_path))
            if cdo is not obj:
                return cdo
        return None

    def archetype_chain(self, obj):
        chain = []
        while obj and all(obj is not seen for seen in chain):
            chain.append(obj)
            obj = self.archetype(obj)
        return chain

    def properties(self, obj, chain=None):
        """obj's properties merged over its archetype chain, so a value set on a placed
        instance wins over the blueprint it was made from, which wins over its parent
        blueprint. Also returns which export each property came from."""
        props = {}
        sources = {}
        for archetype in chain or self.archetype_chain(obj):
            for key, value in (archetype.get("Properties") or {}).items():
                if key not in props:
                    props[key] = value
                    sources[key] = archetype
        return props, sources

    def subobjects(self, chain):
        """Components and other subobjects of obj and every object in its archetype chain."""
        found = []
        for archetype in chain:
            found.extend(self.get_children(archetype))
            clazz = self.class_of(archetype)
            if clazz:
                found.extend(self.get_children(clazz))
        return found

    def actor_properties(self, actor):
        """properties() of an actor followed by each of its components."""
        chain = self.archetype_chain(actor)
        yield self.properties(actor, chain)
        for part in self.subobjects(chain):
            yield self.properties(part)

    def walk(self, start, extra_links=None, max_nodes=2000, exclude=()):
        """Yield (obj, props, sources) for start and the exports linked to it, nearest first.
        props and sources are from properties().

        Links followed: Outer, subobjects (components), and object reference properties.
        References to other level actors are skipped (except ChildActor, which the component
        owns) so the walk stays on the one placed actor. Objects in exclude are not visited.
        """
        queue = deque([start])
        seen = {id(obj) for obj in exclude}
        max_nodes += len(seen)
        while queue:
            obj = queue.popleft()
            if id(obj) in seen:
                continue
            seen.add(id(obj))
            if len(seen) > max_nodes:
                print(f"Stopped walking {start.get('Type')}'{start.get('Name')}' of {(start.get('Outer') or {}).get('ObjectName')} after {max_nodes} objects")
                return

            chain = self.archetype_chain(obj)
            props, sources = self.properties(obj, chain)
            yield obj, props, sources

            linked = []
            outer = self.resolve(obj.get("Outer"))
            if outer and outer.get("Type") not in ("Level", "World"):
                linked.append(outer)
            linked.extend(self.subobjects(chain))
            for key, value in props.items():
                target = self.resolve(value)
                if target and (not target.get("IsLevel") or key == "ChildActor"):
                    linked.append(self.cdo_of(target))
            if extra_links:
                linked.extend(extra_links(obj, chain))
            queue.extend(linked)

class GameLinks:
    """Links this game makes that are not an ObjectPath on the object being walked."""

    def __init__(self, index):
        self.index = index
        # Quest objectives and deliveries reference the actor class they target, so
        # look them up in reverse: actor class -> objects targeting it
        self.targeted_by = defaultdict(list)
        for objects in index.packages.values():
            for obj in objects:
                props = obj.get("Properties") or {}
                targets = [props.get("TargetItem"), props.get("TargetContainer")]
                for stage in props.get("QuestStages", []):
                    for objective in stage.get("Objectives", []):
                        targets.append(objective.get("Objective"))
                for target in targets:
                    target = self.index.resolve(target)
                    if target:
                        target = self.index.class_of(target) or target
                        if obj not in self.targeted_by[id(target)]:
                            self.targeted_by[id(target)].append(obj)

    def __call__(self, obj, chain):
        clazz = next((self.index.class_of(a) for a in chain if self.index.class_of(a)), None)
        if not clazz:
            return []
        linked = list(self.targeted_by.get(id(clazz), []))
        # Quest interaction scenes BP_QIS_X_C belong to quest BP_X_C
        name = clazz.get("Name", "")
        if "_QIS" in name:
            for quest in self.index.get_classes(name.replace("_QIS", "")):
                linked.append(self.index.cdo_of(quest))
        return linked

### Exports

def export_inventory_items_recipes():
    item_index = ExportIndex().load([INVENTORY_DEFS, SMART_BRUSHES], "Inventory")
    brushes = {}
    for obj in item_index.by_name["DT_SmartBrushes_Inventory"] + item_index.by_name["DT_SmartBrushes_Weapons"]:
        for item_tag in obj.get("Rows", {}):
            item_obj = obj.get("Rows")[item_tag].get("Default", {}).get("Default", {})
            image = item_obj.get("Image", {}).get("AssetPathName")
            if image:
                brushes[item_tag] = asset_name(image)
            else:
                print(f"No image for {item_tag}")
    item_dict = {}
    items_csv = []
    for obj_type in item_index.by_type:
        for obj in item_index.by_type[obj_type]:
            if obj_type == "DataTable":
                continue
            type = obj.get("Type")
            name = obj.get("Name")
            props = obj.get("Properties", {})

            value = props.get("Value")
            rarity = props.get("Rarity", {}).get("TagName")
            capacity = props.get("Capacity")
            max_stack_size = props.get("MaxStackSize")
            loot_gen_min = props.get("LootGenerationMin")
            loot_gen_max = props.get("LootGenerationMax")
            display_name = props.get("DisplayName", {}).get("SourceString")

            icon_src = None
            icon = None
            brush = props.get("BrushSetID", {}).get("ItemName")
            for key in props:
                if "Icon" in key:
                    icon = asset_name(props.get(key).get("AssetPathName"))
                    icon_src = "Def"
                    break
            if brush and brush in brushes:
                icon = brushes[brush]
                icon_src = "Smart Brush"

            item_dict[name] = {
                "BrushID": brush,
                "Icon": icon,
                "IconSrc": icon_src,
                "DisplayName": display_name,
                "Value": value,
                "Rarity": rarity,
                "Capacity": capacity,
                "MaxStackSize": max_stack_size,
                "LootGenMin": loot_gen_min,
                "LootGenMax": loot_gen_max
            }
            items_csv.append([type, name, brush, icon, icon_src, display_name, value, rarity, capacity, max_stack_size, loot_gen_min, loot_gen_max])

    recipes = []
    for obj in item_index.by_type["InventoryDefinition_CraftingRecipe"]:
        props = obj.get("Properties")
        result_item = None
        item_name = props.get("CraftedItem", {}).get("ObjectName")
        if item_name:
            item_name = ref_name(item_name)
            result_item = item_dict.get(item_name)

        material_cost = 0
        for m in props.get("Materials", []):
            amount = m.get("Value", 0)
            material_name = ref_name(m.get("Key", ""))
            m_item = item_dict.get(material_name)
            if m_item:
                material_cost += int(amount or 0) * int(m_item.get("Value") or 0)
            else:
                print(f"Unknown material {material_name}")

        if result_item:
            prof = (props.get("UsableByProfessions") or [""])[0]
            level = int(props.get("RecipeLevel") or 0)
            print(f"{prof} {level} {item_name} {result_item.get("DisplayName")} {result_item.get("Value")} {material_cost} {int(result_item.get("Value") or 0) - material_cost}")
            recipes.append([prof, level, item_name, result_item.get("DisplayName"), result_item.get("Value"), material_cost, int(result_item.get("Value") or 0) - material_cost])

    with open("output/recipe_items.csv", "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["Profession", "Level", "ItemName", "DisplayName", "Value", "MaterialCost", "Profit"])
        recipes.sort(key=lambda r: (r[0], r[1], r[2]), reverse=True)
        writer.writerows(recipes)
        print(f"Wrote {len(recipes)} rows to output/recipe_items.csv")

    with open("output/inventory_items.csv", "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["ItemType", "ItemName", "BrushID", "Icon", "IconSrc", "DisplayName", "Value", "Rarity", "Capacity", "MaxStackSize", "LootGenMin", "LootGenMax"])
        items_csv.sort()
        items_csv.reverse()
        writer.writerows(items_csv)
        print(f"Wrote {len(items_csv)} rows to output/inventory_items.csv")

def export_loot_tables():
    loot_csv_rows = []
    for full_path, objects in load_exports([ITEM_TABLES], skip_prefix=None):
        file = os.path.basename(full_path)
        try:
            for obj in objects:
                type = obj.get("Type")
                name = obj.get("Name")
                props = obj.get("Properties", {})
                if type != "LootItemTable":
                    print(f"Skipping non-LootItemTable: {type}'{name}'")
                    continue
                weight_sum = props.get("WeightSum", 0)
                content = props.get("Content", [])
                for item in content:
                    weight = item.get("Weight", 0)
                    obj_name = ref_name((item.get("Item") or {}).get("ObjectName", "Nothing"))
                    print(f"{file} {name} {weight} {weight_sum} {weight / weight_sum} {obj_name}")
                    loot_csv_rows.append([name, weight, weight_sum, '%.4f'%(100 * (weight / weight_sum)), obj_name])
        except Exception as e:
            print(f"Failed to parse {full_path}: {e}")

    with open("output/loot_tables.csv", "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["TableName", "Weight", "WeightSum", "WeightPercent", "ObjectName"])
        loot_csv_rows.sort()
        loot_csv_rows.reverse()
        writer.writerows(loot_csv_rows)
        print(f"Wrote {len(loot_csv_rows)} rows to output/loot_tables.csv")

def export_loot_sources():
    loot_sources = None
    loot_tables = None
    with open(LOOT_SOURCES_JSON, "r", encoding="utf-8") as f:
        loot_sources = json.load(f)
    with open(LOOT_TABLES_JSON, "r", encoding="utf-8") as f:
        loot_tables = json.load(f)

    tables = loot_tables.get("tables", {})
    sources = loot_sources[0].get("Rows", {})

    csv_rows = []
    for source_name in sources:
        source = sources[source_name]
        item_tables = tables.get(source.get("LootTable"), {})
        if item_tables:
            for table in item_tables.get("entries", []):
                csv_rows.append([source_name, source.get("MinEntries"), source.get("MaxEntries"), source.get("LootTable"), table.get("item_table"), table.get("weight"), item_tables.get("weight_sum"), table.get("pct"), table.get("always_spawn")])
        else:
            csv_rows.append([source_name, source.get("MinEntries"), source.get("MaxEntries"), source.get("LootTable"), None, 100, 100, 100, None])

    with open("output/loot_sources.csv", "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["SourceName", "MinEntries", "MaxEntries", "LootTable", "TableName", "Weight", "WeightSum", "WeightPercent", "AlwaysSpawn"])
        csv_rows.sort()
        csv_rows.reverse()
        writer.writerows(csv_rows)
        print(f"Wrote {len(csv_rows)} rows to output/loot_sources.csv")

def export_ai_tables():
    ai_index = ExportIndex().load([AI_SPAWNER_TABLES], "AI")
    links = GameLinks(ai_index)

    ai_csv = []
    for root_obj in ai_index.by_type.get("AISpawnerConfigSet", []):
        name = root_obj.get("Name")
        chances = root_obj.get("Properties", {}).get("SpawnChances", [])
        weight_sum = sum(item.get("Value", 0) for item in chances)
        for item in chances:
            weight = item.get("Value", 0)
            key = item.get("Key", "0")
            obj_name = "Nothing" if key == "0" else ref_name(key)

            display_name = None
            loot_source = None
            if obj_name != "Nothing":
                # Keys are "BlueprintGeneratedClass'/Game/Path/BP_Monster.BP_Monster_C'"
                spawned = ai_index.cdo_of(ai_index.find_asset(re.sub(r"^\w+'(.*)'$", r"\1", key)))
                if not spawned:
                    print(f"Spawn {key} not found in {name}")
                for obj, props, sources in ai_index.walk(spawned, links) if spawned else []:
                    if "DisplayName" in props and not display_name:
                        display_name = (props.get("DisplayName") or {}).get("SourceString")
                    if "LootSource" in props and not loot_source:
                        loot_source = props.get("LootSource")
                    if "LootSourceID" in props and not loot_source:
                        loot_source = props.get("LootSourceID")
                    if display_name and loot_source:
                        break

            row = [name, weight, weight_sum, '%.4f'%(100 * (weight / weight_sum)), obj_name, display_name, loot_source]
            print(row)
            ai_csv.append(row)

    with open("output/ai_tables.csv", "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["TableName", "Weight", "WeightSum", "WeightPercent", "ObjectName", "DisplayName", "LootSource"])
        ai_csv.sort()
        ai_csv.reverse()
        writer.writerows(ai_csv)
        print(f"Wrote {len(ai_csv)} rows to output/ai_tables.csv")

def export_resource_nodes():
    nodes_csv_rows = []
    for full_path, objects in load_exports([RESOURCE_NODES], skip_prefix=None):
        try:
            for obj in objects:
                rows = obj.get("Rows", [])
                for resource_key in rows:
                    row = rows[resource_key]
                    required_level = row.get("RequiredLevel")
                    spawn_chance = row.get("ChanceToSpawn")
                    display_name = row.get("DisplayName", {}).get("SourceString")
                    item = ref_name(row.get("Item", {}).get("ObjectName"))

                    min_amount = row.get("Quantities", {}).get("X")
                    max_amount = row.get("Quantities", {}).get("Y")

                    nodes_csv_rows.append([resource_key, required_level, spawn_chance, display_name, item, min_amount, max_amount])
        except Exception as e:
            print(f"Failed to parse {full_path}: {e}")

    with open("output/resource_nodes.csv", "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["ResourceKey", "RequiredLevel", "SpawnChance", "DisplayName", "Item", "MinAmount", "MaxAmount"])
        nodes_csv_rows.sort()
        nodes_csv_rows.reverse()
        writer.writerows(nodes_csv_rows)
        print(f"Wrote {len(nodes_csv_rows)} rows to output/resource_nodes.csv")

def export_vendor_tables(bp_index):
    vendor_csv = []
    for obj in bp_index.by_type.get("VendorData", []):
        props = obj.get("Properties", {})
        root_outer_name = ref_name(obj.get("Outer", {}).get("ObjectName"))
        weight_sum = 0
        for item in props.get("VendorItems", []):
            weight_sum += item.get("Weight")
        for item in props.get("VendorItems", []):
            item_name = ref_name(item.get("Item", {}).get("ObjectName"))
            vendor_csv.append([root_outer_name, item.get("Weight"), weight_sum, 100 * item.get("Weight") / weight_sum, item_name])

    with open("output/vendor_data.csv", "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["TableName", "Weight", "WeightSum", "WeightPercent", "ObjectName"])
        vendor_csv.sort()
        vendor_csv.reverse()
        writer.writerows(vendor_csv)
        print(f"Wrote {len(vendor_csv)} rows to output/vendor_data.csv")

LOOT_KEYS = ("LootSource", "LootSourceID", "ItemTable")

def has_loot(index, obj, props):
    """Whether obj, one of its components, or an actor class it references (SpawnedActorClass,
    SpawnedChestClass, ...) or that class's components have a loot source."""
    def any_loot(actor):
        return any(key in part_props for part_props, _ in index.actor_properties(actor) for key in LOOT_KEYS)

    if any(key in props for key in LOOT_KEYS) or any_loot(obj):
        return True
    for value in props.values():
        target = index.resolve(value)
        if target and target.get("Type") == "BlueprintGeneratedClass" and any_loot(index.cdo_of(target)):
            return True
    return False

### Child actors

# Properties that make a child actor worth its own marker, or counting in "contains"
DATA_KEYS = LOOT_KEYS + ("SpawnChance", "InitialSpawnChance", "SpawnChancesSet", "QuestId", "ObjectiveInstruction", "InteractionText", "Health")
# A packed group gets a row per child when its children are further apart than this (cm).
# Closer children (a crow trap and the nest under it) would stack, so they stay one row.
SPLIT_DISTANCE = 100

class Transform:
    """World location plus scaled rotation axes, enough to place nested components."""

    def __init__(self, location=(0.0, 0.0, 0.0), axes=((1.0, 0.0, 0.0), (0.0, 1.0, 0.0), (0.0, 0.0, 1.0))):
        self.location = location
        self.axes = axes

    @staticmethod
    def relative(props):
        """A component's RelativeLocation/Rotation/Scale3D, with axes as UE's FRotationMatrix."""
        location = props.get("RelativeLocation") or {}
        rotation = props.get("RelativeRotation") or {}
        scale = props.get("RelativeScale3D") or {}
        sp, cp = math.sin(math.radians(rotation.get("Pitch", 0))), math.cos(math.radians(rotation.get("Pitch", 0)))
        sy, cy = math.sin(math.radians(rotation.get("Yaw", 0))), math.cos(math.radians(rotation.get("Yaw", 0)))
        sr, cr = math.sin(math.radians(rotation.get("Roll", 0))), math.cos(math.radians(rotation.get("Roll", 0)))
        x = (cp * cy, cp * sy, sp)
        y = (sr * sp * cy - cr * sy, sr * sp * sy + cr * cy, -sr * cp)
        z = (-(cr * sp * cy + sr * sy), cy * sr - cr * sp * sy, cr * cp)
        scales = (scale.get("X", 1.0), scale.get("Y", 1.0), scale.get("Z", 1.0))
        axes = tuple(tuple(c * s for c in axis) for axis, s in zip((x, y, z), scales))
        return Transform((location.get("X", 0.0), location.get("Y", 0.0), location.get("Z", 0.0)), axes)

    def apply(self, point):
        return tuple(self.location[i] + sum(point[j] * self.axes[j][i] for j in range(3)) for i in range(3))

    def then(self, child):
        """child, given relative to this transform, in this transform's space."""
        axes = tuple(tuple(sum(axis[j] * self.axes[j][i] for j in range(3)) for i in range(3)) for axis in child.axes)
        return Transform(self.apply(child.location), axes)

def component_transform(index, component, base):
    """Transform of a component, following AttachParent up to the top of its attachment.

    Components placed in the level attach all the way up (a child actor's root attaches to the
    parent's child actor component), ending at a world-space root. A blueprint's template
    components stop at the blueprint's root, which sits on base (a parent's child actor component).
    """
    attach_chain = []
    while component and all(component is not seen for seen in attach_chain):
        attach_chain.append(component)
        component = index.resolve(index.properties(component)[0].get("AttachParent"))
    transform = Transform() if attach_chain and attach_chain[-1].get("IsLevel") else base
    for part in reversed(attach_chain):
        transform = transform.then(Transform.relative(index.properties(part)[0]))
    return transform

def has_data(index, actor):
    """Whether a child actor has gameplay data, including a spawner whose only data is the
    loot of the actor it spawns (a barrel spawner with no spawn chance of its own)."""
    if any(key in props for props, _ in index.actor_properties(actor) for key in DATA_KEYS):
        return True
    return has_loot(index, actor, index.properties(actor)[0])

def child_actors(index, actor, base):
    """(component, class name, child, candidates, child base) for each ChildActorComponent of actor.

    The child actor placed in the level is preferred over the blueprint's template of it, then
    the class default. candidates holds all of them so walks can include or skip them all.
    Native child classes (LootNode) have no export, but the instance and template still do.
    child base is the component's transform, which the child's root is attached to.
    """
    names = set()
    for part in index.subobjects(index.archetype_chain(actor)):
        props, _ = index.properties(part)
        if not isinstance(props.get("ChildActorClass"), dict):
            continue
        # A placed component and the blueprint template it came from are the same child
        name = part.get("Name", "").replace("_GEN_VARIABLE", "")
        if name in names:
            continue
        names.add(name)
        candidates = [c for c in (index.resolve(props.get("ChildActor")), index.resolve(props.get("ChildActorTemplate")),
                                  index.cdo_of(index.resolve(props.get("ChildActorClass")))) if c]
        if candidates:
            class_name = ref_name(props["ChildActorClass"].get("ObjectName"))
            yield part, class_name, candidates[0], candidates, component_transform(index, part, base)

def data_units(index, actor, base, path, depth=0):
    """Child actors with gameplay data, looking through children without any (a well holding a chest).
    Yields (path of component names, class name, child, candidates, child base, owners), where owners
    are the objects above the child that a walk of it should not wander back into."""
    owners = list(index.archetype_chain(actor))
    owners.extend(c for a in list(owners) if (c := index.class_of(a)))
    children = list(child_actors(index, actor, base))
    owners.extend(part for part, *_ in children)
    for part, class_name, child, candidates, child_base in children:
        child_path = path + [part.get("Name", "").replace("_GEN_VARIABLE", "")]
        if has_data(index, child):
            yield child_path, class_name, child, candidates, child_base, owners
        elif depth < 8:
            for unit in data_units(index, child, child_base, child_path, depth + 1):
                yield unit[:5] + (owners + unit[5],)

def contained(index, actor, depth=0):
    """Count of each data-carrying child actor class inside actor, at any depth."""
    counts = Counter()
    for _, class_name, child, _, _ in child_actors(index, actor, Transform()):
        if has_data(index, child):
            counts[class_name] += 1
        if depth < 8:
            counts.update(contained(index, child, depth + 1))
    return counts

def unit_location(index, child, base):
    root = index.resolve(index.properties(child)[0].get("RootComponent"))
    return root, (component_transform(index, root, base) if root else base).location

def should_split(classes, locations):
    """Split a group of different things into a row each, unless they'd stack in one spot.
    Groups of one thing (four crows on a beam) stay one row with a count in "contains"."""
    return len(set(classes)) >= 2 and max(math.dist(a[:2], b[:2]) for a in locations for b in locations) > SPLIT_DISTANCE

def read_map_fields(index, found, obj, props, sources, locations):
    """Fill in found from one walked object. The first object to set a field wins."""
    csv_json = found["json"]

    def text(key):
        value = props.get(key)
        return value.get("SourceString") if isinstance(value, dict) else None

    def tag(key):
        value = props.get(key)
        return value.get("TagName") if isinstance(value, dict) else None

    def ref(key):
        value = props.get(key)
        return value.get("ObjectName") if isinstance(value, dict) else None

    # A packed group can hold several child actors with their own spawn chance (a crow trap
    # and a bird's nest). When the row shows loot, use the chance of whatever has that loot.
    for key in ("SpawnChance", "InitialSpawnChance"):
        if key in props:
            chance = (str(props.get(key)), "Custom" if sources[key].get("IsLevel") else "Blueprint")
            if not found["chance"]:
                found["chance"] = chance
            if not found["loot_chance"] and has_loot(index, obj, props):
                found["loot_chance"] = chance
    if "Health" in props and not csv_json.get("health"):
        csv_json["health"] = str(props.get("Health")) + " HP"
    for key in ("DisplayName", "Name", "WorkbenchName"):
        if key in props and not found["display_name"]:
            found["display_name"] = text(key)
    if "KeyDefinition" in props and not csv_json.get("keyed"):
        csv_json["keyed"] = ref_name(ref("KeyDefinition"))
    if "LootSource" in props and not found["loot_source"]:
        found["loot_source"] = props.get("LootSource")
    if "LootSourceID" in props and not found["loot_source"]:
        found["loot_source"] = props.get("LootSourceID")
    if "ItemTable" in props and not found["loot_source"]:
        found["loot_source"] = ((props.get("ItemTable") or {}).get("AssetPathName") or "").split(".")[-1]
    if "AISpawner" in obj.get("Type", "") and "SpawnChancesSet" in props and not found["ai_spawn"]:
        found["ai_spawn"] = ref_name(ref("SpawnChancesSet"))
    # Only the row's own component, not whatever hidden collision meshes the actor has
    if obj is found["root"] and "bVisible" in props:
        csv_json["visible"] = props.get("bVisible")
    elif obj is found["root"] and "bHiddenInGame" in props:
        csv_json["visible"] = not props.get("bHiddenInGame")
    if "HarvestableByProfession" in props and csv_json.get("harvestable_by") is None:
        csv_json["harvestable_by"] = tag("HarvestableByProfession")
        if "AssetsHandle" in props and csv_json.get("node_tag") is None:
            csv_json["node_tag"] = (props.get("AssetsHandle") or {}).get("RowName")
    if "LocationTag" in props and csv_json.get("location_tag") is None:
        csv_json["location_tag"] = tag("LocationTag")
        if csv_json["location_tag"] in locations:
            found["display_name"] = locations[csv_json["location_tag"]].get("DisplayName", {}).get("SourceString")
    if "QuestId" in props and csv_json.get("quest_id") is None:
        csv_json["quest_id"] = tag("QuestId")
    if "QuestGiver" in props and csv_json.get("quest_giver") is None:
        csv_json["quest_giver"] = tag("QuestGiver")
    if "Requirement" in props and csv_json.get("required_quests") is None:
        csv_json["area_name"] = props.get("AreaName")
        if "RequiredQuests" in (props.get("Requirement") or {}):
            csv_json["required_quests"] = [quest.get("TagName") for quest in props["Requirement"]["RequiredQuests"]]
    if "InteractionText" in props and csv_json.get("interaction") is None:
        csv_json["interaction"] = text("InteractionText")
    if "ObjectiveInstruction" in props and csv_json.get("instruction") is None:
        csv_json["instruction"] = text("ObjectiveInstruction")
    if "GrantItems" in props and csv_json.get("grant_items") is None:
        csv_json["grant_items"] = {ref_name(item.get("Key")): item.get("Value") for item in props.get("GrantItems", [])}
    if "VendorData" in props and csv_json.get("vendor_data") is None:
        csv_json["vendor_data"] = ref_name(ref("VendorData"))

def export_map_data(bp_index):
    links = GameLinks(bp_index)
    for level in PARSE_MAP:
        output_csv = os.path.join(OUTPUT_FOLDER, level["output"])
        skip_actor_types = level.get("skip_actor_types", [])
        level_folder = os.path.basename(level["folder"])
        map_index = ExportIndex(parent=bp_index).load([level["folder"]], level_folder, is_level=True, skip_prefix=None)
        csv_rows = []

        def has_coordinates(obj):
            return obj.get("Properties", {}).get("RelativeLocation", {}).get("X") is not None

        roots = []
        for root_type in ["SceneComponent", "StaticMeshComponent", "SphereComponent"]:
            roots.extend(filter(has_coordinates, map_index.by_type.get(root_type, [])))
        for objects in map_index.packages.values():
            roots.extend(obj for obj in objects if has_coordinates(obj) and level_outer(obj)[0] == "DiscoverableLocationVolume")
        # The level's .umap is registered under two package names
        roots = list({id(obj): obj for obj in roots}.values())

        locations = {}
        for obj in map_index.get_by_type("DiscoverableLocationsTable"):
            for loc in obj.get("Properties", {}).get("Locations2", []):
                locations[loc.get("Tag", {}).get("TagName")] = loc

        # Child actors are also placed in the level, but their location is relative to the
        # parent's component. They're covered by splitting the parent below.
        placed_children = set()
        for objects in map_index.packages.values():
            for obj in objects:
                child = map_index.resolve((obj.get("Properties") or {}).get("ChildActor"))
                if child:
                    placed_children.add(id(child))

        def map_row(start, root, outer_type, outer_name, location, actor, exclude=()):
            found = {"root": root, "display_name": None, "loot_source": None, "chance": None, "loot_chance": None, "ai_spawn": None, "json": {}}
            for obj, props, sources in map_index.walk(start, links, exclude=exclude):
                read_map_fields(map_index, found, obj, props, sources, locations)
            # Loot with no spawn chance of its own (a barrel mesh in a packed group) always spawns
            chance, chance_type = (found["loot_chance"] if found["loot_source"] else found["chance"]) or (None, None)
            counts = contained(map_index, actor) if actor else {}
            if sum(counts.values()) >= 2:
                found["json"]["contains"] = dict(sorted(counts.items()))
            return [root.get("Type") if root else "SceneComponent", outer_type, outer_name, *location,
                    found["display_name"], found["loot_source"], chance, chance_type, found["ai_spawn"], json.dumps(found["json"])]

        split_count = Counter()
        for root_obj in roots:
            outer_type, outer_name = level_outer(root_obj)
            actor = map_index.resolve(root_obj.get("Outer"))
            if outer_type in skip_actor_types or (actor and id(actor) in placed_children):
                continue
            location = root_obj["Properties"]["RelativeLocation"]
            location = (location.get("X"), location.get("Y"), location.get("Z"))

            # Only the actor's root component row speaks for its child actors
            is_actor_root = actor and map_index.resolve(map_index.properties(actor)[0].get("RootComponent")) is root_obj
            units = list(data_units(map_index, actor, Transform(), [outer_name])) if is_actor_root else []
            unit_locations = [unit_location(map_index, unit[2], unit[4]) for unit in units]
            split = bool(units) and should_split([unit[1] for unit in units], [loc for _, loc in unit_locations])
            if not split:
                csv_rows.append(map_row(root_obj, root_obj, outer_type, outer_name, location, actor if is_actor_root else None))
                continue

            # One row for the group's own data, then one per child actor at its own location
            split_count[outer_type] += 1
            all_candidates = [c for unit in units for c in unit[3]]
            csv_rows.append(map_row(root_obj, root_obj, outer_type, outer_name, location, None, exclude=all_candidates))
            for (path, class_name, child, candidates, base, owners), (child_root, child_location) in zip(units, unit_locations):
                csv_rows.append(map_row(child, child_root, class_name, ".".join(path), child_location, child, exclude=owners))
        for group_type, n in split_count.items():
            print(f"Split {n} {group_type} into a row per child actor")

        for root_obj in map_index.get_by_type("FastGeoContainer"):
            if root_obj.get("SourceFolder") != level_folder:
                continue
            for clusters in root_obj.get("ComponentClusters", []):
                for obj in clusters.get("StaticMeshComponents", []) + clusters.get("InstancedStaticMeshComponents", []):
                    object_full = obj.get("SceneProxyDesc", {}).get("StaticMeshSceneProxyDesc", {}).get("StaticMesh", {}).get("ObjectName", "")
                    if "StairIntegrated" not in object_full:
                        continue
                    object_type, object_name = parse_ref(object_full)
                    translation = obj.get("WorldTransform", {}).get("Translation", {})
                    if translation.get("X") is None:
                        continue
                    csv_json = {}
                    if "bVisible" in obj:
                        csv_json["visible"] = obj.get("bVisible")
                    elif "bHiddenInGame" in obj:
                        csv_json["visible"] = not obj.get("bHiddenInGame")
                    csv_rows.append([root_obj.get("Type"), object_type, object_name, translation.get("X"), translation.get("Y"), translation.get("Z"), None, None, None, None, None, json.dumps(csv_json)])

        with open(output_csv, "w", newline="", encoding="utf-8") as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(["RootType", "OuterType", "OuterName", "X", "Y", "Z", "DisplayName", "LootSource", "Chance", "ChanceType", "AISpawner", "JSON"])
            csv_rows.sort()
            writer.writerows(csv_rows)
            print(f"Wrote {len(csv_rows)} rows to {output_csv}")

def get_bp_index():
    return ExportIndex().load(BP_FOLDERS, "Blueprints")

def main():
    os.makedirs(OUTPUT_FOLDER, exist_ok=True)

    export_loot_sources()
    export_loot_tables()
    export_ai_tables()
    export_inventory_items_recipes()
    export_resource_nodes()

    bp_index = get_bp_index()
    export_vendor_tables(bp_index)
    export_map_data(bp_index)

    print("Done")

if __name__ == "__main__":
    main()
