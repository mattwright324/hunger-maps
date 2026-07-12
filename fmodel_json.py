import os
import json
import csv

# --- CONFIG ---

OUTPUT_FOLDER = r"output/"
PARSE_MAP = [
    {
        "folder": r"C:\Users\mattwright324\AppData\Local\Temp\7zO01F3A62F\Output\Exports\ProjectRLH\Content\Levels\Map01\map01_p_WP\_Generated_",
        "output": "map01_components.csv"
    },
    {
        "folder": r"C:\Users\mattwright324\AppData\Local\Temp\7zO01F3A62F\Output\Exports\ProjectRLH\Content\Levels\Map02\map02_p_WP\_Generated_",
        "output": "map02_components.csv"
    },
    {
        "folder": r"C:\Users\mattwright324\AppData\Local\Temp\7zO01F3A62F\Output\Exports\ProjectRLH\Content\Levels\Map03\map03_p_WP\_Generated_",
        "output": "map03_components.csv"
    },
]

types = []

def parse_file(objects, full_path):
    loot_nodes = []
    extractions = []
    ai_spawners = []
    spawn_chances = []

    scene_components = []
    static_mesh_components = []
    instanced_static_mesh_components = []
    fast_geos = []

    for obj in objects:
        obj_type = obj.get("Type")
        props = obj.get("Properties", {})

        if obj_type not in types:
            types.append(obj_type)

        if "LootNode" in obj_type:
            name = obj.get("Name")
            loot_name = props.get("ItemTable", {}).get("AssetPathName")
            extractions.append([obj_type, name, loot_name])

        if "RaidExtractionPoint" in obj_type:
            name = obj.get("Name")
            extract_name = props.get("Name", {}).get("SourceString")
            extractions.append([obj_type, name, extract_name])

        if "AISpawner" in obj_type:
            name = obj.get("Name")
            spawner_name = props.get("SpawnChancesSet", {}).get("ObjectName")
            ai_spawners.append([obj_type, name, spawner_name])

        if "InitialSpawnChance" in props:
            name = obj.get("Name")
            spawn_chance = props.get("InitialSpawnChance", "")
            spawn_chances.append([obj_type, name, spawn_chance])


        # Only process SceneComponent or StaticMeshComponent
        if not (obj_type == "SceneComponent" or obj_type == "StaticMeshComponent" or obj_type == "InstancedStaticMeshComponent" or obj_type == "SphereComponent" or obj_type == "FastGeoContainer"):
            continue

        if obj_type == "FastGeoContainer":
            clusters = obj.get("ComponentClusters", [])
            for cluster in clusters:
                sm_comps = cluster.get("StaticMeshComponents", [])
                for comp in sm_comps:
                    loc = comp.get("WorldTransform", {}).get("Translation", {})
                    sm_name = comp.get("SceneProxyDesc", {}).get("StaticMeshSceneProxyDesc", {}).get("StaticMesh", {}).get("ObjectName", "")

                    if "X" not in loc:
                        continue;

                    x = loc.get("X", "")
                    y = loc.get("Y", "")
                    z = loc.get("Z", "")

                    fast_geos.append(["FastGeoContainer", "", sm_name, x, y, z])

                ism_comps = cluster.get("InstancedStaticMeshComponents", [])
                for comp in ism_comps:
                    loc = comp.get("WorldTransform", {}).get("Translation", {})
                    sm_name = comp.get("SceneProxyDesc", {}).get("StaticMeshSceneProxyDesc", {}).get("StaticMesh", {}).get("ObjectName", "")

                    if not ("StairIntegrated" in sm_name):
                        continue;
                    if "X" not in loc:
                        continue;

                    x = loc.get("X", "")
                    y = loc.get("Y", "")
                    z = loc.get("Z", "")

                    fast_geos.append(["FastGeoContainer", "", sm_name, x, y, z])

        # --- StaticMeshComponent ---
        if obj_type == "StaticMeshComponent":
            outer = obj.get("Outer", {})
            sm_outer_name = outer.get("ObjectName", "")

            sm = props.get("StaticMesh", {})
            sm_name = sm.get("ObjectName", "")

            rel_loc = props.get("RelativeLocation", {})
            if "X" not in rel_loc:
                continue;
            x = rel_loc.get("X", "")
            y = rel_loc.get("Y", "")
            z = rel_loc.get("Z", "")

            static_mesh_components.append(
                ["StaticMeshComponent", sm_outer_name, sm_name, x, y, z]
            )

        # --- InstancedStaticMeshComponent ---
        if obj_type == "InstancedStaticMeshComponent":
            outer = obj.get("Outer", {})
            sm_outer_name = outer.get("ObjectName", "")

            sm = props.get("StaticMesh", {})
            sm_name = sm.get("ObjectName", "")

            rel_loc = props.get("CachedBounds", {})
            value = rel_loc.get("Value", {})
            origin = value.get("Origin", {})
            if "X" not in origin:
                continue;
            x = origin.get("X", "")
            y = origin.get("Y", "")
            z = origin.get("Z", "")

            colls = []

            body_instance = obj.get("BodyInstance", {})
            coll_responses = body_instance.get("CollisionResponses", {})
            res_arr = coll_responses.get("ResponseArray", [])
            for coll in res_arr:
                if not coll.get("Response") == "ECollisionResponse::ECR_Ignore":
                    colls.append(coll.get("Channel", ""))

            #if not colls and not ("StoneStair" in sm_name):
            if not colls:
                continue;

            instanced_static_mesh_components.append(
                ["InstancedStaticMeshComponent", sm_outer_name, sm_name, x, y, z]
            )

            per_instance = obj.get("PerInstanceSMData", [])
            for instance in per_instance:
                transform = instance.get("TransformData", {})
                translation = transform.get("Translation", {})
                if "X" not in translation:
                    continue;
                x = translation.get("X", "")
                y = translation.get("Y", "")
                z = translation.get("Z", "")
                instanced_static_mesh_components.append(
                    ["InstancedStaticMeshComponent", sm_outer_name, sm_name, x, y, z]
                )

        # --- SceneComponent ---
        elif obj_type == "SceneComponent" or obj_type == "SphereComponent":
            outer = obj.get("Outer", {})
            scene_name = outer.get("ObjectName", "UNKNOWN")

            rel_loc = props.get("RelativeLocation", {})
            if "X" not in rel_loc:
                continue;
            x = rel_loc.get("X", "")
            y = rel_loc.get("Y", "")
            z = rel_loc.get("Z", "")

            scene_components.append(
                [obj_type, scene_name, "", x, y, z]
            )

    # Combine both lists
    combined_lists = scene_components + static_mesh_components + instanced_static_mesh_components + fast_geos

    for arr in combined_lists:
        for nodes in loot_nodes:
            if nodes[1] in (arr[1] or ""):
                arr[2] = nodes[2] + " " + arr[2]
        for extracts in extractions:
            if extracts[1] in (arr[1] or ""):
                arr[2] = extracts[2]
        for spawner in ai_spawners:
            if spawner[1] in (arr[1] or ""):
                arr[2] = spawner[2]
        chance = ""
        for chance in spawn_chances:
            if chance[1] in (arr[1] or "") or chance[1] in (arr[2] or ""):
                chance = chance[2]
        arr.append(chance)

    return combined_lists


def main():
    os.makedirs(OUTPUT_FOLDER, exist_ok=True)
    for map in PARSE_MAP:
        INPUT_FOLDER = map["folder"]
        OUTPUT_CSV = os.path.join(OUTPUT_FOLDER, map["output"])
        all_rows = []

        for root, _, files in os.walk(INPUT_FOLDER):
            print(f"Reading files in {root}...")

            for file in files:
                if not file.lower().endswith(".json"):
                    continue

                full_path = os.path.join(root, file)

                try:
                    with open(full_path, "r", encoding="utf-8") as f:
                        objects = json.load(f)

                    rows = parse_file(objects, full_path)
                    all_rows.extend(rows)

                except Exception as e:
                    print(f"Failed to parse {full_path}: {e}")

        # print(types)

        # Write CSV
        with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(["Type", "ObjectName", "StaticMeshName", "X", "Y", "Z", "SpawnChance"])
            all_rows.sort()
            writer.writerows(all_rows)

        print(f"Done. Wrote {len(all_rows)} rows to {OUTPUT_CSV}")


if __name__ == "__main__":
    main()