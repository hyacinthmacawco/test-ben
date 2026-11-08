import * as THREE from "three";

/**
 * Minecraft-style Ben built entirely from cuboids.
 * Every body part is parented to the matching joint in the rig supplied
 * by main.js, so the existing walk cycle drives the block character.
 */
export function createBen({ createHumanRig }) {
  if (typeof createHumanRig !== "function") {
    throw new TypeError("createBen requires the createHumanRig rig factory.");
  }

  const rig = createHumanRig();
  const { group, joints } = rig;
  group.name = "Ben10CuboidCharacter";

  // Hide the rig's diagnostic bone cylinders and joint markers.
  group.traverse(object => {
    if (object.isMesh) object.visible = false;
  });

  const materials = {
    skin: new THREE.MeshStandardMaterial({ color: 0xd99a82, roughness: 0.9 }),
    hair: new THREE.MeshStandardMaterial({ color: 0x38231d, roughness: 0.95 }),
    hairLight: new THREE.MeshStandardMaterial({ color: 0x503025, roughness: 0.95 }),
    shirt: new THREE.MeshStandardMaterial({ color: 0x151a18, roughness: 0.9 }),
    green: new THREE.MeshStandardMaterial({ color: 0x079b4c, roughness: 0.85 }),
    pants: new THREE.MeshStandardMaterial({ color: 0x704329, roughness: 0.95 }),
    white: new THREE.MeshStandardMaterial({ color: 0xe5e8df, roughness: 0.85 }),
    sole: new THREE.MeshStandardMaterial({ color: 0x252a28, roughness: 0.95 }),
    omnitrix: new THREE.MeshStandardMaterial({ color: 0x087c3d, roughness: 0.6 })
  };

  const box = (parent, name, size, position, material) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(size[0], size[1], size[2]),
      material
    );
    mesh.name = name;
    mesh.position.set(position[0], position[1], position[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // Torso and waist follow the spine and hip respectively.
  box(joints.spine, "BenBlockTorso", [0.43, 0.57, 0.25],
    [0, 0.22, 0], materials.shirt);
  box(joints.spine, "BenGreenChestStripe", [0.075, 0.47, 0.012],
    [0, 0.23, 0.132], materials.green);
  box(joints.hip, "BenBlockWaist", [0.34, 0.20, 0.23],
    [0, -0.015, 0], materials.pants);

  // Head is deliberately featureless: no eyes, nose, mouth or ears.
  const head = joints.head;
  box(head, "BenBlockHead", [0.36, 0.40, 0.31],
    [0, 0.075, 0], materials.skin);

  // Simple, low-profile brown hair cap and front fringe.
  box(head, "BenHairCap", [0.38, 0.105, 0.33],
    [0, 0.305, -0.005], materials.hair);
  box(head, "BenHairFront", [0.38, 0.075, 0.075],
    [0, 0.245, 0.16], materials.hair);
  box(head, "BenHairSideLeft", [0.065, 0.14, 0.30],
    [-0.157, 0.205, 0], materials.hairLight);
  box(head, "BenHairSideRight", [0.065, 0.14, 0.30],
    [0.157, 0.205, 0], materials.hairLight);
  box(head, "BenHairBack", [0.34, 0.16, 0.07],
    [0, 0.16, -0.145], materials.hair);

  // Cuboid arms. Their local X axes run from shoulder toward the elbow.
  for (const side of ["left", "right"]) {
    const sign = side === "left" ? -1 : 1;
    const shoulder = joints[side + "Shoulder"];
    const elbow = joints[side + "Elbow"];
    const wrist = joints[side + "Wrist"];
    const upper = 0.30;
    const forearm = 0.27;

    box(shoulder, side + "GreenSleeve",
      [upper + 0.025, 0.205, 0.235],
      [sign * upper * 0.48, 0, 0], materials.green);
    box(elbow, side + "BlockForearm",
      [forearm + 0.015, 0.145, 0.16],
      [sign * forearm * 0.48, -0.005, 0], materials.skin);
    box(wrist, side + "BlockHand", [0.13, 0.13, 0.15],
      [sign * 0.065, 0, 0], materials.skin);
  }

  // Separate block legs retain a visible gap between the trouser legs.
  for (const side of ["left", "right"]) {
    const thigh = joints[side + "Thigh"];
    const knee = joints[side + "Knee"];
    const ankle = joints[side + "Ankle"];

    box(thigh, side + "BlockTrouserUpper", [0.17, 0.44, 0.20],
      [0, -0.215, 0], materials.pants);
    box(knee, side + "BlockTrouserLower", [0.16, 0.40, 0.19],
      [0, -0.205, 0], materials.pants);
    box(ankle, side + "BlockBoot", [0.19, 0.17, 0.29],
      [0, -0.075, 0.065], materials.white);
    box(ankle, side + "BootSole", [0.195, 0.045, 0.295],
      [0, -0.145, 0.065], materials.sole);
    box(ankle, side + "GreenBootDetail", [0.13, 0.045, 0.035],
      [0, -0.025, 0.215], materials.green);
  }

  // Simple block-shaped Omnitrix attached to the outside/front of the left wrist.
  const watch = new THREE.Group();
  watch.name = "Omnitrix";
  watch.position.set(-0.005, 0, 0.085);
  joints.leftWrist.add(watch);
  box(watch, "OmnitrixStrap", [0.12, 0.15, 0.09],
    [0, 0, 0], materials.white);
  box(watch, "OmnitrixFace", [0.085, 0.095, 0.018],
    [0, 0, 0.054], materials.omnitrix);
  box(watch, "OmnitrixCenter", [0.035, 0.045, 0.008],
    [0, 0, 0.067], materials.green);

  return { group, rig, joints };
}
