import os
import json
import csv
import re
import random

AI_SPAWNER_TABLES = r"C:\Users\mattwright324\AppData\Local\Temp\7zO01F3A62F\Output\Exports\ProjectRLH\Content\AI"
ITEM_TABLES = r"C:\Users\mattwright324\AppData\Local\Temp\7zO01F3A62F\Output\Exports\ProjectRLH\Content\Data\Loot\ItemTables"
SMART_BRUSHES = r"C:\Users\mattwright324\AppData\Local\Temp\7zO01F3A62F\Output\Exports\ProjectRLH\Content\Data\UI\Styling\Brushes"
INVENTORY_DEFS = r"C:\Users\mattwright324\AppData\Local\Temp\7zO01F3A62F\Output\Exports\ProjectRLH\Content\Data\Inventory\Definitions"
RESOURCE_NODES = r"C:\Users\mattwright324\AppData\Local\Temp\7zO01F3A62F\Output\Exports\ProjectRLH\Content\Data\Resources\Nodes"

BP_FOLDERS = [
    r"C:\Users\mattwright324\AppData\Local\Temp\7zO01F3A62F\Output\Exports\ProjectRLH\Content\Data",
    r"C:\Users\mattwright324\AppData\Local\Temp\7zO01F3A62F\Output\Exports\ProjectRLH\Content\Gameplay",
    r"C:\Users\mattwright324\AppData\Local\Temp\7zO01F3A62F\Output\Exports\ProjectRLH\Content\Meshes\Blueprints",
    r"C:\Users\mattwright324\AppData\Local\Temp\7zO01F3A62F\Output\Exports\ProjectRLH\Content\Blueprints",
]

OUTPUT_FOLDER = r"output/"
PARSE_MAP = [
    # {
    #     "folder": r"C:\Users\mattwright324\AppData\Local\Temp\7zO01F3A62F\Output\Exports\ProjectRLH\Content\Levels\Map01\map01_p_WP",
    #     "output": "map01_components.csv"
    # },
    # {
    #     "folder": r"C:\Users\mattwright324\AppData\Local\Temp\7zO01F3A62F\Output\Exports\ProjectRLH\Content\Levels\Map02\map02_p_WP",
    #     "output": "map02_components.csv"
    # },
    # {
    #     "folder": r"C:\Users\mattwright324\AppData\Local\Temp\7zO01F3A62F\Output\Exports\ProjectRLH\Content\Levels\Map03\map03_p_WP",
    #     "output": "map03_components.csv"
    # },
    {
        "folder": r"C:\Users\mattwright324\AppData\Local\Temp\7zO01F3A62F\Output\Exports\ProjectRLH\Content\Levels\Chateau\Chateau_p_WP\_Generated_",
        "output": "map00_components.csv"
    },
]

class Resolver:
    def __init__(self, all_objects, folder_name):
        self.by_type = {}
        self.by_name = {}
        self.by_class = {}
        self.by_custom_ref = {}
        self.by_outer_full = {}
        self.by_outer_name = {}
        self.by_outer_type = {}
        self.by_target_full = {}
        self.by_target_name = {}
        self.index_objects(all_objects, folder_name)

    def index_objects(self, objects, folder_name):
        print(f"Indexing {len(objects)} objects in {folder_name}...")
        for obj in objects:
            obj["SourceFolder"] = folder_name

            type = obj.get("Type")
            name = obj.get("Name")
            clazz = obj.get("Class")
            props = obj.get("Properties", {})

            outer_full = obj.get("Outer", {}).get("ObjectName")
            outer_type = None
            outer_name = None
            match = None
            if outer_full:
                match = re.search(r"(.+)'\w+:PersistentLevel.(.+)'", outer_full)
            if match and "PersistentLevel" in outer_full:
                outer_type = match.group(1)
                outer_name = match.group(2)
                obj["CustomOuterType"] = outer_type
                obj["CustomOuterName"] = outer_name

            target_full = props.get("TargetItem", props.get("TargetContainer", {})).get("ObjectName")
            target_name = None
            if target_full:
                match = re.search(r"(.+)'(.+)'", target_full)
                if match:
                    target_name = match.group(2)
                    obj["CustomTargetName"] = target_name

            for stage in props.get("QuestStages", []):
                for objective in stage.get("Objectives", []):
                    target_full = objective.get("Objective", {}).get("ObjectName")
                    if target_full:
                        if target_full not in self.by_target_full:
                            self.by_target_full[target_full] = []
                        self.by_target_full[target_full].append(obj)
                    if target_full:
                        match = re.search(r"(.+)'(.+)'", target_full)
                        if match:
                            target_name = match.group(2)
                            obj["CustomTargetName"] = target_name
                            if target_name:
                                if target_name not in self.by_target_name:
                                    self.by_target_name[target_name] = []
                                self.by_target_name[target_name].append(obj)

            custom_ref = None
            if folder_name.startswith("map"):
                custom_ref = f"{type}'{folder_name}:PersistentLevel.{name}'"
            if custom_ref:
                if custom_ref not in self.by_custom_ref:
                    self.by_custom_ref[custom_ref] = []
                self.by_custom_ref[custom_ref].append(obj)

            obj["CustomRef"] = custom_ref

            if type:
                if type not in self.by_type:
                    self.by_type[type] = []
                self.by_type[type].append(obj)
            if name:
                if name not in self.by_name:
                    self.by_name[name] = []
                self.by_name[name].append(obj)
            if clazz:
                if clazz not in self.by_class:
                    self.by_class[clazz] = []
                self.by_class[clazz].append(obj)
            if outer_full:
                if outer_full not in self.by_outer_full:
                    self.by_outer_full[outer_full] = []
                self.by_outer_full[outer_full].append(obj)
            if outer_name:
                if outer_name not in self.by_outer_name:
                    self.by_outer_name[outer_name] = []
                self.by_outer_name[outer_name].append(obj)
            if outer_type:
                if outer_type not in self.by_outer_type:
                    self.by_outer_type[outer_type] = []
                self.by_outer_type[outer_type].append(obj)
            if target_full:
                if target_full not in self.by_target_full:
                    self.by_target_full[target_full] = []
                self.by_target_full[target_full].append(obj)
            if target_name:
                if target_name not in self.by_target_name:
                    self.by_target_name[target_name] = []
                self.by_target_name[target_name].append(obj)

    def resolve_all(self, ref):
        results = []
        if ref in self.by_type:
            results.extend(self.by_type[ref])
        if ref in self.by_name:
            results.extend(self.by_name[ref])
        if ref in self.by_class:
            results.extend(self.by_class[ref])
        if ref in self.by_custom_ref:
            results.extend(self.by_custom_ref[ref])
        if ref in self.by_outer_full:
            results.extend(self.by_outer_full[ref])
        if ref in self.by_outer_name:
            results.extend(self.by_outer_name[ref])
        if ref in self.by_outer_type:
            results.extend(self.by_outer_type[ref])
        if ref in self.by_target_full:
            results.extend(self.by_target_full[ref])
        if ref in self.by_target_name:
            results.extend(self.by_target_name[ref])
        return results

    def resolve_first(self, ref):
        all_refs = self.resolve_all(ref)
        if all_refs:
            return all_refs[0]
        return None

def contains_string(obj, needle):
    if needle in obj.get("Name", ""):
        return True
    if needle in obj.get("Type", ""):
        return True
    if needle in obj.get("Class", ""):
        return True
    if needle in obj.get("Outer", {}).get("ObjectName", ""):
        return True
    return False

def main():
    os.makedirs(OUTPUT_FOLDER, exist_ok=True)

    # item_objects = []
    # for folder in [INVENTORY_DEFS, SMART_BRUSHES]:
    #     for root, _, files in os.walk(folder):
    #         print(f"Reading files in {root}...")
    #         for file in files:
    #             if not file.lower().endswith(".json"):
    #                 continue
    #             if file.startswith("LI_"): # Skip blueprint "world" files
    #                 continue
    #             full_path = os.path.join(root, file)
    #             try:
    #                 with open(full_path, "r", encoding="utf-8") as f:
    #                     objects = json.load(f)
    #                     for obj in objects:
    #                         obj["SourceFile"] = file
    #                 item_objects.extend(objects)
    #             except Exception as e:
    #                 print(f"Failed to parse {full_path}: {e}")
    # item_resolver = Resolver(item_objects, "Inventory")
    # brushes = {}
    # for obj in item_resolver.by_name["DT_SmartBrushes_Inventory"] + item_resolver.by_name["DT_SmartBrushes_Weapons"]:
    #     for item_tag in obj.get("Rows", {}):
    #         item_obj = obj.get("Rows")[item_tag].get("Default", {}).get("Default", {})
    #         image = item_obj.get("Image", {}).get("AssetPathName")
    #         if image:
    #             matches = re.search(r"(?:/.*\.)?(\w+)(?:[:.]\w+)?", image)
    #             if matches:
    #                 image = matches.group(1)
    #             brushes[item_tag] = image
    #         else:
    #             print(f"No image for {item_tag}")
    # items_csv = []
    # for obj_type in item_resolver.by_type:
    #     for obj in item_resolver.by_type[obj_type]:
    #         if obj_type == "DataTable":
    #             continue
    #         type = obj.get("Type")
    #         name = obj.get("Name")
    #         props = obj.get("Properties", {})
    #
    #         value = props.get("Value")
    #         rarity = props.get("Rarity", {}).get("TagName")
    #         capacity = props.get("Capacity")
    #         max_stack_size = props.get("MaxStackSize")
    #         loot_gen_min = props.get("LootGenerationMin")
    #         loot_gen_max = props.get("LootGenerationMax")
    #         display_name = props.get("DisplayName", {}).get("SourceString")
    #
    #         icon_src = None
    #         icon = None
    #         brush = props.get("BrushSetID", {}).get("ItemName")
    #         for key in props:
    #             if "Icon" in key:
    #                 icon = props.get(key).get("AssetPathName")
    #                 icon_src = "Def"
    #                 matches = re.search(r"(?:/.*\.)?(\w+)(?:[:.]\w+)?", icon)
    #                 if matches:
    #                     icon = matches.group(1)
    #                 break
    #         if brush and brush in brushes:
    #             icon = brushes[brush]
    #             icon_src = "Smart Brush"
    #
    #         items_csv.append([type, name, brush, icon, icon_src, display_name, value, rarity, capacity, max_stack_size, loot_gen_min, loot_gen_max])
    #
    # with open("output/inventory_items.csv", "w", newline="", encoding="utf-8") as csvfile:
    #     writer = csv.writer(csvfile)
    #     writer.writerow(["ItemType", "ItemName", "BrushID", "Icon", "IconSrc", "DisplayName", "Value", "Rarity", "Capacity", "MaxStackSize", "LootGenMin", "LootGenMax"])
    #     items_csv.sort()
    #     items_csv.reverse()
    #     writer.writerows(items_csv)
    #     print(f"Wrote {len(items_csv)} rows to output/inventory_items.csv")
    #
    # return

    loot_csv_rows = []
    for root, _, files in os.walk(ITEM_TABLES):
        print(f"Reading files in {root}...")
        for file in files:
            if not file.lower().endswith(".json"):
                continue
            full_path = os.path.join(root, file)
            try:
                with open(full_path, "r", encoding="utf-8") as f:
                    objects = json.load(f)
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
                            obj_name = (item.get("Item") or {}).get("ObjectName", "Nothing")
                            if obj_name:
                                matches = re.search(r"(\w+)'(?:\w+:PersistentLevel\.)?(\w+)(?:[:.]\w+)?'", obj_name)
                                if matches:
                                    obj_name = matches.group(2)
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

    return

    # ai_objects = []
    # for folder in [AI_SPAWNER_TABLES]:
    #     for root, _, files in os.walk(folder):
    #         print(f"Reading files in {root}...")
    #         for file in files:
    #             if not file.lower().endswith(".json"):
    #                 continue
    #             if file.startswith("LI_"): # Skip blueprint "world" files
    #                 continue
    #             full_path = os.path.join(root, file)
    #             try:
    #                 with open(full_path, "r", encoding="utf-8") as f:
    #                     objects = json.load(f)
    #                     for obj in objects:
    #                         obj["SourceFile"] = file
    #                 ai_objects.extend(objects)
    #             except Exception as e:
    #                 print(f"Failed to parse {full_path}: {e}")
    # ai_resolver = Resolver(ai_objects, "AI")
    #
    # ai_csv = []
    # for root_obj in ai_resolver.by_type.get("AISpawnerConfigSet") or []:
    #     type = root_obj.get("Type")
    #     name = root_obj.get("Name")
    #     props = root_obj.get("Properties", {})
    #     chances = props.get("SpawnChances", [])
    #     weight_sum = 0
    #     for item in chances:
    #         obj_name = item.get("Key", "0")
    #         if obj_name:
    #             matches = re.search(r"(\w+)'(?:/.*\.)?(\w+)(?:[:.]\w+)?'", obj_name)
    #             if matches:
    #                 obj_name = matches.group(2)
    #         if obj_name == "0":
    #             obj_name = "Nothing"
    #         item["Key"] = obj_name
    #
    #         weight = item.get("Value", 0)
    #         weight_sum += weight
    #
    #         read_hash = random.getrandbits(128)
    #         read_count = 0
    #         read = []
    #
    #         display_name = None
    #         loot_source = None
    #         def walk_props(obj, parent=None, depth=0, search_text=None):
    #             nonlocal read_count, read
    #             nonlocal display_name, loot_source
    #
    #             if depth > 30:
    #                 return
    #
    #             if obj.get("ReadHash") == read_hash:
    #                 return
    #             obj["ReadHash"] = read_hash
    #             read_count += 1
    #             read.append(f"{depth} {parent} {obj.get("SourceFolder")}/{obj.get("SourceFile")} {search_text} {obj.get('Type')}'{obj.get("Name")}'")
    #
    #             obj_props = obj.get("Properties", {})
    #
    #             if "DisplayName" in obj_props and not display_name:
    #                 display_name = obj_props.get("DisplayName", {}).get("SourceString")
    #             if "LootSource" in obj_props and not loot_source:
    #                 loot_source = obj_props.get("LootSource")
    #             if "LootSourceID" in obj_props and not loot_source:
    #                 loot_source = obj_props.get("LootSourceID")
    #
    #             ### Look for more linked objects
    #
    #             for obj2 in ai_resolver.by_outer_full.get(obj.get("Outer", {}).get("ObjectName"), []):
    #                 walk_props(obj2, "OuterNameFull", depth + 1, obj.get("Outer", {}).get("ObjectName"))
    #
    #             # Get spawn chance here first (custom)
    #             if obj.get("CustomOuterName"):
    #                 for obj2 in ai_resolver.resolve_all(obj.get("CustomOuterName")) or []:
    #                     walk_props(obj2, "CustomOuterName", depth + 1, obj.get("CustomOuterName"))
    #
    #             if obj.get("CustomOuterType") and "Component" not in obj.get("CustomOuterType"):
    #                 for obj2 in ai_resolver.resolve_all(obj.get("CustomOuterType")) or []:
    #                     walk_props(obj2, "CustomOuterType", depth + 1, obj.get("CustomOuterType"))
    #
    #             custom_outer_full = f"{obj.get("Type")}'{obj.get("Name")}'"
    #             for obj2 in ai_resolver.resolve_all(custom_outer_full):
    #                 walk_props(obj2, "CustomOuterFull", depth + 1, custom_outer_full)
    #
    #             if "Component" not in obj.get("Type"):
    #                 for obj2 in ai_resolver.by_target_name.get(obj.get("Type"), []):
    #                     walk_props(obj2, "Type", depth + 1, obj.get("Type"))
    #
    #             if "Template" in obj:
    #                 template_full = obj.get("Template", {}).get("ObjectName")
    #                 for obj2 in ai_resolver.resolve_all(template_full) or []:
    #                     walk_props(obj2, "TemplateFull", depth + 1, template_full)
    #
    #             if obj.get("Class", "").startswith("BlueprintGeneratedClass"):
    #                 for bp in ai_resolver.resolve_all(obj.get("Class")) or []:
    #                     if bp.get("SourceFolder") != 'Blueprints':
    #                         continue
    #                     walk_props(bp, "ClassBP", depth + 1, obj.get("Class"))
    #
    #             for key in obj_props:
    #                 if isinstance(obj_props.get(key), dict) and "ObjectName" in obj_props.get(key):
    #                     prop_obj_name = obj_props.get(key).get("ObjectName")
    #                     matches = re.search(r"(\w+)'(?:\w+:PersistentLevel\.)?(\w+)(?:[:.]\w+)?'", prop_obj_name)
    #                     if matches:
    #                         prop_type = matches.group(1)
    #                         prop_name = matches.group(2)
    #
    #                         if prop_type == "BlueprintGeneratedClass":
    #                             for bp in ai_resolver.by_outer_full.get(prop_obj_name, []):
    #                                 if bp.get("SourceFolder") != 'Blueprints':
    #                                     continue
    #                                 walk_props(bp, "PropFullBP", depth + 1, prop_obj_name)
    #                             for bp in ai_resolver.by_type.get(prop_name, []):
    #                                 if bp.get("SourceFolder") != 'Blueprints':
    #                                     continue
    #                                 walk_props(bp, "PropBP", depth + 1, prop_name)
    #                         else:
    #                             for obj2 in ai_resolver.resolve_all(prop_name) or []:
    #                                 walk_props(obj2, "PropName", depth + 1, prop_name)
    #
    #         if obj_name != "Nothing":
    #             print(f"Walking {obj_name}...")
    #             for spawner_obj in ai_resolver.resolve_all(obj_name):
    #                 walk_props(spawner_obj, "Spawner", 0)
    #
    #         item["DisplayName"] = display_name
    #         item["LootSource"] = loot_source
    #
    #     for item in chances:
    #         weight = item.get("Value", 0)
    #         obj_name = item.get("Key")
    #         display_name = item.get("DisplayName")
    #         loot_source = item.get("LootSource")
    #
    #         row = [name, weight, weight_sum, '%.4f'%(100 * (weight / weight_sum)), obj_name, display_name, loot_source]
    #         print(row)
    #         print(read_count, read)
    #         print()
    #         ai_csv.append(row)
    #
    # with open("output/ai_tables.csv", "w", newline="", encoding="utf-8") as csvfile:
    #     writer = csv.writer(csvfile)
    #     writer.writerow(["TableName", "Weight", "WeightSum", "WeightPercent", "ObjectName", "DisplayName", "LootSource"])
    #     ai_csv.sort()
    #     ai_csv.reverse()
    #     writer.writerows(ai_csv)
    #     print(f"Wrote {len(ai_csv)} rows to output/ai_tables.csv")
    #
    #
    # return

    # nodes_csv_rows = []
    # for root, _, files in os.walk(RESOURCE_NODES):
    #     print(f"Reading files in {root}...")
    #     for file in files:
    #         if not file.lower().endswith(".json"):
    #             continue
    #         full_path = os.path.join(root, file)
    #         try:
    #             with open(full_path, "r", encoding="utf-8") as f:
    #                 objects = json.load(f)
    #                 for obj in objects:
    #                     type = obj.get("Type")
    #                     name = obj.get("Name")
    #                     rows = obj.get("Rows", [])
    #                     for resource_key in rows:
    #                         row = rows[resource_key]
    #                         required_level = row.get("RequiredLevel")
    #                         spawn_chance = row.get("ChanceToSpawn")
    #                         display_name = row.get("DisplayName", {}).get("SourceString")
    #                         item = row.get("Item", {}).get("ObjectName")
    #
    #                         matches = re.search(r"(\w+)'(?:\w+:PersistentLevel\.)?(\w+)(?:[:.]\w+)?'", item)
    #                         if matches:
    #                             item = matches.group(2)
    #
    #                         min_amount = row.get("Quantities", {}).get("X")
    #                         max_amount = row.get("Quantities", {}).get("Y")
    #
    #                         nodes_csv_rows.append([resource_key, required_level, spawn_chance, display_name, item, min_amount, max_amount])
    #
    #         except Exception as e:
    #             print(f"Failed to parse {full_path}: {e}")
    #
    # with open("output/resource_nodes.csv", "w", newline="", encoding="utf-8") as csvfile:
    #     writer = csv.writer(csvfile)
    #     writer.writerow(["ResourceKey", "RequiredLevel", "SpawnChance", "DisplayName", "Item", "MinAmount", "MaxAmount"])
    #     nodes_csv_rows.sort()
    #     nodes_csv_rows.reverse()
    #     writer.writerows(nodes_csv_rows)
    #     print(f"Wrote {len(nodes_csv_rows)} rows to output/resource_nodes.csv")
    #
    # return

    bp_objects = []
    for bp_folder in BP_FOLDERS:
        for root, _, files in os.walk(bp_folder):
            print(f"Reading files in {root}...")
            for file in files:
                if not file.lower().endswith(".json"):
                    continue
                if file.startswith("LI_"): # Skip blueprint "world" files
                    continue
                full_path = os.path.join(root, file)
                try:
                    with open(full_path, "r", encoding="utf-8") as f:
                        objects = json.load(f)
                        for obj in objects:
                            obj["SourceFile"] = file
                    bp_objects.extend(objects)
                except Exception as e:
                    print(f"Failed to parse {full_path}: {e}")

    # for type in bp_resolver.by_type:
    #     print(type, len(bp_resolver.by_type[type]))

    for map in PARSE_MAP:
        INPUT_FOLDER = map["folder"]
        OUTPUT_CSV = os.path.join(OUTPUT_FOLDER, map["output"])
        csv_rows = []

        map_folder_name = os.path.basename(INPUT_FOLDER)
        resolver = Resolver(bp_objects, "Blueprints")
        for root, _, files in os.walk(INPUT_FOLDER):
            print(f"Reading files in {root}...")
            for file in files:
                if not file.lower().endswith(".json"):
                    continue
                full_path = os.path.join(root, file)
                try:
                    with open(full_path, "r", encoding="utf-8") as f:
                        objects = json.load(f)
                        for obj in objects:
                            obj["SourceFile"] = file
                    resolver.index_objects(objects, map_folder_name)
                except Exception as e:
                    print(f"Failed to parse {full_path}: {e}")

        # for type in map_resolver.by_type:
        #     print(type, len(map_resolver.by_type[type]))

        def has_coordinates(obj):
            return obj.get("Properties", {}).get("RelativeLocation", {}).get("X") is not None

        # for sm in map_resolver.by_type["StaticMeshComponent"]:
        objects = list(filter(has_coordinates, resolver.by_type.get("SceneComponent", [])))
        objects.extend(list(filter(has_coordinates, resolver.by_type.get("StaticMeshComponent", []))))
        objects.extend(list(filter(has_coordinates, resolver.by_type.get("SphereComponent", []))))
        objects.extend(list(filter(has_coordinates, resolver.by_outer_type.get("DiscoverableLocationVolume", []))))

        locations = {}
        for obj in resolver.by_type.get("DiscoverableLocationsTable", []):
            props = obj.get("Properties", {})
            for loc in props.get("Locations2", []):
                location_tag = loc.get("Tag", {}).get("TagName")
                locations[location_tag] = loc

        for root_obj in objects:
            if root_obj.get("SourceFolder") == "Blueprints":
                continue
            # Don't read resolved objects already read
            read_hash = random.getrandbits(128)
            read_count = 0
            read = []

            root_outer_name = root_obj.get("CustomOuterName")

            x = None
            y = None
            z = None
            csv_json = {}
            display_name = None
            loot_source = None
            chance = None
            chance_type = None
            ai_spawn = None

            def walk_props(obj, parent=None, depth=0, search_text=None):
                nonlocal read_count, read
                nonlocal x, y, z, csv_json
                nonlocal display_name, loot_source, chance, chance_type, ai_spawn

                if "map00" in OUTPUT_CSV and (obj.get('CustomOuterType') == "StaticMeshActor" or obj.get('CustomOuterType') == "Actor"):
                    return
                if obj.get("SourceFolder") != "Blueprints" and not contains_string(obj, root_outer_name):
                    return
                # if obj.get("SourceFolder") == "Blueprints" and obj.get("Class", "").startswith("UScriptClass"):
                #     return
                if depth > 30 or read_count > 500:
                    return

                if obj.get("ReadHash") == read_hash:
                    return
                obj["ReadHash"] = read_hash
                read_count += 1
                read.append(f"{depth} {parent} {obj.get("SourceFolder")}/{obj.get("SourceFile")} {search_text} {obj.get('Type')}'{obj.get("Name")}'")

                obj_props = obj.get("Properties", {})

                ### Find data points

                if "RelativeLocation" in obj_props and not x:
                    x = obj_props.get("RelativeLocation", {}).get("X")
                    y = obj_props.get("RelativeLocation", {}).get("Y")
                    z = obj_props.get("RelativeLocation", {}).get("Z")
                if "SpawnChance" in obj_props and not chance:
                    chance = str(obj_props.get("SpawnChance"))
                    if obj.get("SourceFolder") == "Blueprints":
                        chance_type = "Blueprint"
                    else:
                        chance_type = "Custom"
                if "InitialSpawnChance" in obj_props and not chance:
                    chance = str(obj_props.get("InitialSpawnChance"))
                    if obj.get("SourceFolder") == "Blueprints":
                        chance_type = "Blueprint"
                    else:
                        chance_type = "Custom"
                if "Health" in obj_props and not csv_json.get("health"):
                    csv_json["health"] = str(obj_props.get("Health")) + " HP"
                if "DisplayName" in obj_props and not display_name:
                    display_name = obj_props.get("DisplayName", {}).get("SourceString")
                if "Name" in obj_props and not display_name:
                    display_name = obj_props.get("Name", {}).get("SourceString")
                if "WorkbenchName" in obj_props and not display_name:
                    display_name = obj_props.get("WorkbenchName", {}).get("SourceString")
                if "KeyDefinition" in obj_props and not csv_json.get("keyed"):
                    csv_json["keyed"] = obj_props.get("KeyDefinition", {}).get("ObjectName")
                    matches = re.search(r"(\w)+'(\w+)'", csv_json["keyed"])
                    if matches:
                        csv_json["keyed"] = matches.group(2)
                if "LootSource" in obj_props and not loot_source:
                    loot_source = obj_props.get("LootSource")
                if "LootSourceID" in obj_props and not loot_source:
                    loot_source = obj_props.get("LootSourceID")
                if "ItemTable" in obj_props and not loot_source:
                    loot_source = obj_props.get("ItemTable", {}).get("AssetPathName", "").split(".")[::-1][0]
                if "AISpawner" in obj.get("Type") and "SpawnChancesSet" in obj_props and not ai_spawn:
                    ai_spawn = obj_props.get("SpawnChancesSet", {}).get("ObjectName")
                    matches = re.search(r"AISpawnerConfigSet'(\w+)'", ai_spawn)
                    if matches:
                        ai_spawn = matches.group(1)
                if "bVisible" in obj_props and csv_json.get("visible") is None:
                    csv_json["visible"] = obj_props.get("bVisible")
                if "bHiddenInGame" in obj_props and csv_json.get("visible") is None:
                    csv_json["visible"] = obj_props.get("bHiddenInGame")
                if "HarvestableByProfession" in obj_props and csv_json.get("harvestable_by") is None:
                    csv_json["harvestable_by"] = obj_props.get("HarvestableByProfession", {}).get("TagName")
                    if "AssetsHandle" in obj_props and csv_json.get("node_tag") is None:
                        csv_json["node_tag"] = obj_props.get("AssetsHandle", {}).get("RowName")
                if "LocationTag" in obj_props and csv_json.get("location_tag") is None:
                    csv_json["location_tag"] = obj_props.get("LocationTag", {}).get("TagName")
                    if csv_json["location_tag"] in locations:
                        display_name = locations[csv_json["location_tag"]].get("DisplayName", {}).get("SourceString")
                if "QuestId" in obj_props and csv_json.get("quest_id") is None:
                    csv_json["quest_id"] = obj_props.get("QuestId", {}).get("TagName")
                if "QuestGiver" in obj_props and csv_json.get("quest_giver") is None:
                    csv_json["quest_giver"] = obj_props.get("QuestGiver", {}).get("TagName")
                if "InteractionText" in obj_props and csv_json.get("interaction") is None:
                    csv_json["interaction"] = obj_props.get("InteractionText", {}).get("SourceString")
                if "ObjectiveInstruction" in obj_props and csv_json.get("instruction") is None:
                    csv_json["instruction"] = obj_props.get("ObjectiveInstruction", {}).get("SourceString")
                if "GrantItems" in obj_props and csv_json.get("grant_items") is None:
                    csv_json["grant_items"] = {}
                    for item in obj_props.get("GrantItems", []):
                        item_name = item.get("Key")
                        matches = re.search(r"(\w+)'.+\.(\w+)'", item_name)
                        if matches:
                            item_name = matches.group(2)
                        csv_json["grant_items"][item_name] = item.get("Value")
                if "VendorData" in obj_props and csv_json.get("vendor_data") is None:
                    csv_json["vendor_data"] = obj_props.get("VendorData", {}).get("ObjectName")
                    matches = re.search(r"(\w+)'(\w+)(?:[:.]\w+)?'", csv_json["vendor_data"])
                    if matches:
                        csv_json["vendor_data"] = matches.group(2)

                ### Look for more linked objects

                for obj2 in resolver.by_outer_full.get(obj.get("Outer", {}).get("ObjectName"), []):
                    walk_props(obj2, "OuterNameFull", depth + 1, obj.get("Outer", {}).get("ObjectName"))

                # Get spawn chance here first (custom)
                if obj.get("CustomOuterName"):
                    for obj2 in resolver.resolve_all(obj.get("CustomOuterName")) or []:
                        walk_props(obj2, "CustomOuterName", depth + 1, obj.get("CustomOuterName"))

                if obj.get("CustomOuterType") and "Component" not in obj.get("CustomOuterType"):
                    for obj2 in resolver.resolve_all(obj.get("CustomOuterType")) or []:
                        walk_props(obj2, "CustomOuterType", depth + 1, obj.get("CustomOuterType"))

                if "Component" not in obj.get("Type"):
                    for obj2 in resolver.by_target_name.get(obj.get("Type"), []):
                        walk_props(obj2, "Type-TargetName", depth + 1, obj.get("Type"))

                if "Package" in obj:
                    matches = re.search(r".*/(\w+)", obj.get("Package"))
                    if matches:
                        package = matches.group(1).replace("_QIS", "") + "_C"
                        for obj2 in resolver.resolve_all(package):
                            walk_props(obj2, "Package", depth + 1, package)

                if "Template" in obj:
                    template_full = obj.get("Template", {}).get("ObjectName")
                    for obj2 in resolver.resolve_all(template_full) or []:
                        walk_props(obj2, "TemplateFull", depth + 1, template_full)

                    matches = re.search(r"(\w+)'(?:\w+:PersistentLevel\.)?(\w+)(?:[:.]\w+)?'", template_full)
                    if matches:
                        template_type = matches.group(1)
                        template_name = matches.group(2)

                        if "Component" not in template_type and "AttributeSet" not in template_type and "Visualizer" not in template_type and "RepAct_" not in template_type:
                            for obj2 in resolver.resolve_all(template_type) or []:
                                walk_props(obj2, "TemplateType", depth + 1, template_type)

                            if "Root" not in template_name:
                                for obj2 in resolver.resolve_all(template_name) or []:
                                    walk_props(obj2, "TemplateName", depth + 1, template_name)

                if obj.get("Class", "").startswith("BlueprintGeneratedClass"):
                    for bp in resolver.resolve_all(obj.get("Class")) or []:
                        if bp.get("SourceFolder") != 'Blueprints':
                            continue
                        walk_props(bp, "ClassBP", depth + 1, obj.get("Class"))

                for key in obj_props:
                    if isinstance(obj_props.get(key), dict) and "ObjectName" in obj_props.get(key):
                        prop_obj_name = obj_props.get(key).get("ObjectName")
                        matches = re.search(r"(\w+)'(?:\w+:PersistentLevel\.)?(\w+)(?:[:.]\w+)?'", prop_obj_name)
                        if matches:
                            prop_type = matches.group(1)
                            prop_name = matches.group(2)

                            if prop_type == "BlueprintGeneratedClass":
                                for bp in resolver.by_outer_full.get(prop_obj_name, []):
                                    if bp.get("SourceFolder") != 'Blueprints':
                                        continue
                                    walk_props(bp, "PropFullBP", depth + 1, prop_obj_name)
                                for bp in resolver.by_type.get(prop_name, []):
                                    if bp.get("SourceFolder") != 'Blueprints':
                                        continue
                                    walk_props(bp, "PropBP", depth + 1, prop_name)
                            else:
                                for obj2 in resolver.resolve_all(prop_name) or []:
                                    walk_props(obj2, "PropName", depth + 1, prop_name)
            walk_props(root_obj, "Root", 0)

            if not x:
                continue

            row = [root_obj.get("Type"), root_obj.get('CustomOuterType'), root_obj.get('CustomOuterName'), x, y, z, display_name, loot_source, chance, chance_type, ai_spawn, json.dumps(csv_json)]

            # Usually indicates a problem with filtering resolved things
            # if read_count > 100:
            if "Extractors" in root_obj.get("CustomOuterType"):
                print(f"{read}")
                print(f"{read_count} {row}")
                print()

            csv_rows.append(row)

        for root_obj in resolver.by_type.get("FastGeoContainer", []):
            for clusters in root_obj.get("ComponentClusters", []):
                for obj in clusters.get("StaticMeshComponents", []) + clusters.get("InstancedStaticMeshComponents", []):
                    obj["Type"] = "FastGeoContainer"
                    obj["SourceFolder"] = root_obj["SourceFolder"]
                    object_full = obj.get("SceneProxyDesc", {}).get("StaticMeshSceneProxyDesc", {}).get("StaticMesh", {}).get("ObjectName", "")
                    if "StairIntegrated" not in object_full:
                        continue
                    matches = re.search(r"(\w+)'(?:\w+:PersistentLevel\.)?(\w+)(?:[:.]\w+)?'", object_full)
                    if matches:
                        object_type = matches.group(1)
                        object_name = matches.group(2)
                        obj["CustomOuterType"] = object_type
                        obj["CustomOuterName"] = object_name
                    x = None
                    y = None
                    z = None
                    if "WorldTransform" in obj:
                        translation = obj.get("WorldTransform", {}).get("Translation", {})
                        x = translation.get("X")
                        y = translation.get("Y")
                        z = translation.get("Z")
                    if not x:
                        continue
                    csv_json = {}
                    if "bVisible" in obj and csv_json.get("visible") is None:
                        csv_json["visible"] = obj.get("bVisible")
                    if "bHiddenInGame" in obj and csv_json.get("visible") is None:
                        csv_json["visible"] = not obj.get("bHiddenInGame")
                    csv_rows.append([root_obj.get("Type"), obj.get('CustomOuterType'), obj.get('CustomOuterName'), x, y, z, None, None, None, None, None, json.dumps(csv_json)])

        with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(["RootType", "OuterType", "OuterName", "X", "Y", "Z", "DisplayName", "LootSource", "Chance", "ChanceType", "AISpawner", "JSON"])
            csv_rows.sort()
            writer.writerows(csv_rows)
            print(f"Wrote {len(csv_rows)} rows to {OUTPUT_CSV}")

        # vendor_csv = []
        # for obj in resolver.by_type.get("VendorData", []):
        #     props = obj.get("Properties", {})
        #     root_outer_name = obj.get("Outer", {}).get("ObjectName")
        #     matches = re.search(r"(\w+)'(\w+)'", root_outer_name)
        #     if matches:
        #         root_outer_name = matches.group(2)
        #     weight_sum = 0
        #     for item in props.get("VendorItems", []):
        #         weight_sum += item.get("Weight")
        #     for item in props.get("VendorItems", []):
        #         item_name = item.get("Item", {}).get("ObjectName")
        #         matches = re.search(r"(\w+)'(\w+)'", item_name)
        #         if matches:
        #             item_name = matches.group(2)
        #         vendor_csv.append([root_outer_name, item.get("Weight"), weight_sum, 100 * item.get("Weight") / weight_sum, item_name])
        #
        # with open("output/vendor_data.csv", "w", newline="", encoding="utf-8") as csvfile:
        #     writer = csv.writer(csvfile)
        #     writer.writerow(["TableName", "Weight", "WeightSum", "WeightPercent", "ObjectName"])
        #     vendor_csv.sort()
        #     vendor_csv.reverse()
        #     writer.writerows(vendor_csv)
        #     print(f"Wrote {len(vendor_csv)} rows to output/vendor_data.csv")


    print("Done")

if __name__ == "__main__":
    main()