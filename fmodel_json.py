import os
import json
import csv

# --- CONFIG ---
INPUT_FOLDER = r"C:\Users\mattwright324\AppData\Local\Temp\7zO01F3A62F\Output\Exports\ProjectRLH\Content\Levels\Map01\map01_p_WP\_Generated_"   # folder containing .json files
OUTPUT_CSV   = r"C:\\Users\\mattwright324\\Desktop\\map01_components.csv"

def parse_file(objects):
    """
    Extract SceneComponents and StaticMeshComponents from a single JSON file.
    Returns rows: (Type, SceneObjectName, StaticMeshName, X, Y, Z)
    """

    scene_components = []
    static_mesh_components = []

    for obj in objects:

        # Only process SceneComponent or StaticMeshComponent
        obj_type = obj.get("Type")
        if not (obj_type == "SceneComponent" or obj_type == "StaticMeshComponent"):
            continue

        # --- StaticMeshComponent ---
        if obj_type == "StaticMeshComponent":
            outer = obj.get("Outer", {})
            sm_outer_name = outer.get("ObjectName", "")

            props = obj.get("Properties", {})
            sm = props.get("StaticMesh", {})
            sm_name = sm.get("ObjectName", "")

            rel_loc = props.get("RelativeLocation", {})
            x = rel_loc.get("X", "")
            y = rel_loc.get("Y", "")
            z = rel_loc.get("Z", "")

            static_mesh_components.append(
                ("StaticMeshComponent", sm_outer_name, sm_name, x, y, z)
            )

        # --- SceneComponent ---
        elif obj_type == "SceneComponent":
            outer = obj.get("Outer", {})
            scene_name = outer.get("ObjectName", "UNKNOWN")

            props = obj.get("Properties", {})
            rel_loc = props.get("RelativeLocation", {})

            x = rel_loc.get("X", "")
            y = rel_loc.get("Y", "")
            z = rel_loc.get("Z", "")

            scene_components.append(
                ("SceneComponent", scene_name, "", x, y, z)
            )

    # Combine both lists
    return scene_components + static_mesh_components


def main():
    all_rows = []

    for root, _, files in os.walk(INPUT_FOLDER):
        for file in files:
            if not file.lower().endswith(".json"):
                continue

            full_path = os.path.join(root, file)

            try:
                with open(full_path, "r", encoding="utf-8") as f:
                    objects = json.load(f)

                rows = parse_file(objects)
                all_rows.extend(rows)

            except Exception as e:
                print(f"Failed to parse {full_path}: {e}")

    # Write CSV
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["Type", "ObjectName", "StaticMeshName", "X", "Y", "Z", "SpawnChance"])
        writer.writerows(all_rows)

    print(f"Done. Wrote {len(all_rows)} rows to {OUTPUT_CSV}")


if __name__ == "__main__":
    main()