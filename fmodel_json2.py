import os
import json
import csv
import re
import random

ITEM_TABLES = r"C:\Users\mattwright324\AppData\Local\Temp\7zO01F3A62F\Output\Exports\ProjectRLH\Content\Data\Loot\ItemTables"

BP_FOLDERS = [
    r"C:\Users\mattwright324\AppData\Local\Temp\7zO01F3A62F\Output\Exports\ProjectRLH\Content\Meshes\Blueprints",
    r"C:\Users\mattwright324\AppData\Local\Temp\7zO01F3A62F\Output\Exports\ProjectRLH\Content\Blueprints",
]

OUTPUT_FOLDER = r"output/"
PARSE_MAP = [
    {
        "folder": r"C:\Users\mattwright324\AppData\Local\Temp\7zO01F3A62F\Output\Exports\ProjectRLH\Content\Levels\Map01\map01_p_WP",
        "output": "map01_components.csv"
    },
    {
        "folder": r"C:\Users\mattwright324\AppData\Local\Temp\7zO01F3A62F\Output\Exports\ProjectRLH\Content\Levels\Map02\map02_p_WP",
        "output": "map02_components.csv"
    },
    {
        "folder": r"C:\Users\mattwright324\AppData\Local\Temp\7zO01F3A62F\Output\Exports\ProjectRLH\Content\Levels\Map03\map03_p_WP",
        "output": "map03_components.csv"
    },
    # {
    #     "folder": r"C:\Users\mattwright324\AppData\Local\Temp\7zO01F3A62F\Output\Exports\ProjectRLH\Content\Levels\Chateau\Chateau_p_WP\_Generated_",
    #     "output": "map00_components.csv"
    # },
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
        self.index_objects(all_objects, folder_name)

    def index_objects(self, objects, folder_name):
        print(f"Indexing {len(objects)} objects in {folder_name}...")
        for obj in objects:
            obj["SourceFolder"] = folder_name

            type = obj.get("Type")
            name = obj.get("Name")
            clazz = obj.get("Class")

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

    def resolve_all(self, ref):
        if ref in self.by_type:
            return self.by_type[ref]
        if ref in self.by_name:
            return self.by_name[ref]
        if ref in self.by_class:
            return self.by_class[ref]
        if ref in self.by_custom_ref:
            return self.by_custom_ref[ref]
        if ref in self.by_outer_full:
            return self.by_outer_full[ref]
        if ref in self.by_outer_name:
            return self.by_outer_name[ref]
        if ref in self.by_outer_type:
            return self.by_outer_type[ref]
        return None

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

    # loot_csv_rows = []
    # for root, _, files in os.walk(ITEM_TABLES):
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
    #                     props = obj.get("Properties", {})
    #                     if type != "LootItemTable":
    #                         print(f"Skipping non-LootItemTable: {type}'{name}'")
    #                         continue
    #                     weight_sum = props.get("WeightSum", 0)
    #                     content = props.get("Content", [])
    #                     for item in content:
    #                         weight = item.get("Weight", 0)
    #                         obj_name = item.get("Item", {}).get("ObjectName", "")
    #                         if obj_name:
    #                             matches = re.search(r"(\w+)'(?:\w+:PersistentLevel\.)?(\w+)(?:[:.]\w+)?'", obj_name)
    #                             if matches:
    #                                 obj_name = matches.group(2)
    #                         print(f"{file} {name} {weight} {weight_sum} {weight / weight_sum} {obj_name}")
    #                         loot_csv_rows.append([name, weight, weight_sum, '%.4f'%(100 * (weight / weight_sum)), obj_name])
    #         except Exception as e:
    #             print(f"Failed to parse {full_path}: {e}")
    #
    # with open("output/loot_tables.csv", "w", newline="", encoding="utf-8") as csvfile:
    #     writer = csv.writer(csvfile)
    #     writer.writerow(["TableName", "Weight", "WeightSum", "WeightPercent", "ObjectName"])
    #     loot_csv_rows.sort()
    #     loot_csv_rows.reverse()
    #     writer.writerows(loot_csv_rows)
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
            chance = None
            chance_type = None
            health = None
            display_name = None
            keyed = None
            loot_source = None
            ai_spawn = None
            visible = None

            def walk_props(obj, parent=None, depth=0, search_text=None):
                nonlocal read_count, read
                nonlocal x, y, z, chance, chance_type, health, display_name, keyed, loot_source, ai_spawn, visible

                # if obj.get("Type").startswith("Level"):
                #     return
                if obj.get("SourceFolder") != "Blueprints" and not contains_string(obj, root_outer_name):
                    return
                # if obj.get("SourceFolder") == "Blueprints" and obj.get("Class", "").startswith("UScriptClass"):
                #     return
                if depth > 30:
                    return

                if obj.get("ReadHash") == read_hash:
                    return
                obj["ReadHash"] = read_hash
                read_count += 1
                read.append(f"{depth} {parent} {obj.get("SourceFolder")}/{obj.get("SourceFile")} {search_text} {obj.get('Type')}'{obj.get("Name")}'")

                obj_props = obj.get("Properties", {})

                if "RelativeLocation" in obj_props and not x:
                    x = obj_props.get("RelativeLocation", {}).get("X")
                    y = obj_props.get("RelativeLocation", {}).get("Y")
                    z = obj_props.get("RelativeLocation", {}).get("Z")
                if "SpawnChance" in obj_props and not chance:
                    chance = str(obj_props.get("SpawnChance"))
                    if obj.get("SourceFolder") == "Blueprints":
                        chance_type = "Blueprint"
                    else:
                        chance_type = "Custom)"
                if "InitialSpawnChance" in obj_props and not chance:
                    chance = str(obj_props.get("InitialSpawnChance"))
                    if obj.get("SourceFolder") == "Blueprints":
                        chance_type = "Blueprint"
                    else:
                        chance_type = "Custom"
                if "Health" in obj_props and not health:
                    health = str(obj_props.get("Health")) + " HP"
                if "DisplayName" in obj_props and not display_name:
                    display_name = obj_props.get("DisplayName", {}).get("SourceString")
                if "Name" in obj_props and not display_name:
                    display_name = obj_props.get("Name", {}).get("SourceString")
                if "KeyDefinition" in obj_props and not keyed:
                    keyed = obj_props.get("KeyDefinition", {}).get("ObjectName")
                if "LootSource" in obj_props and not loot_source:
                    loot_source = obj_props.get("LootSource")
                if "LootSourceID" in obj_props and not loot_source:
                    loot_source = obj_props.get("LootSourceID")
                if "ItemTable" in obj_props and not loot_source:
                    loot_source = obj_props.get("ItemTable", {}).get("AssetPathName", "").split(".")[::-1][0]
                if "AISpawner" in obj.get("Type") and "SpawnChancesSet" in obj_props and not ai_spawn:
                    ai_spawn = obj_props.get("SpawnChancesSet", {}).get("ObjectName")
                if "bVisible" in obj_props and visible is None:
                    visible = obj_props.get("bVisible")
                if "bHiddenInGame" in obj_props and visible is None:
                    visible = obj_props.get("bHiddenInGame")

                for obj2 in resolver.by_outer_full.get(obj.get("Outer", {}).get("ObjectName"), []):
                    walk_props(obj2, "OuterNameFull", depth + 1, obj.get("Outer", {}).get("ObjectName"))

                # Get spawn chance here first (custom)
                if obj.get("CustomOuterName"):
                    for obj2 in resolver.resolve_all(obj.get("CustomOuterName")) or []:
                        walk_props(obj2, "CustomOuterName", depth + 1, obj.get("CustomOuterName"))

                if obj.get("CustomOuterType") and "Component" not in obj.get("CustomOuterType"):
                    for obj2 in resolver.resolve_all(obj.get("CustomOuterType")) or []:
                        walk_props(obj2, "CustomOuterType", depth + 1, obj.get("CustomOuterType"))

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

            # Usually indicates a problem with filtering resolved things
            if read_count > 100:
                print(f"{read_count} {read}")
                print(f"{display_name} {root_obj.get('CustomOuterType')}: {health}, {chance} ({chance_type}), {x}, {y}, {z}, {keyed}, {loot_source}, {ai_spawn}")
                print()

            csv_rows.append([root_obj.get("Type"), root_obj.get('CustomOuterType'), root_obj.get('CustomOuterName'), x, y, z, display_name, chance, chance_type, health, keyed, loot_source, ai_spawn, visible])

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
                    visible = None
                    if "bVisible" in obj and visible is None:
                        visible = obj.get("bVisible")
                    if "bHiddenInGame" in obj and visible is None:
                        visible = not obj.get("bHiddenInGame")
                    csv_rows.append([root_obj.get("Type"), obj.get('CustomOuterType'), obj.get('CustomOuterName'), x, y, z, None, None, None, None, None, None, None, visible])

        with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(["RootType", "OuterType", "OuterName", "X", "Y", "Z", "DisplayName", "SpawnChance", "ChanceType", "Health", "Keyed", "LootSource", "AISpawner","Visible"])
            csv_rows.sort()
            writer.writerows(csv_rows)

    print("Done")

if __name__ == "__main__":
    main()