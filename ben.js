import * as THREE from "three";

/**
 * Ben's articulated, Minecraft-style cuboid model.
 * The skeleton and walk cycle remain in main.js; this file only builds
 * the visible character and attaches each cuboid to its matching joint.
 */
export function createBen({ createHumanRig }) {
  if (typeof createHumanRig !== "function") {
    throw new TypeError("createBen requires the createHumanRig rig factory.");
  }

  const rig = createHumanRig();
  const { group, joints } = rig;
  group.name = "Ben10CuboidCharacter";

  // The rig creates diagnostic meshes for the skeleton. Keep its bones,
  // but hide those meshes so only the character geometry is rendered.
  group.traverse(object => {
    if (object.isMesh) object.visible = false;
  });

  const mat = {
    skin: new THREE.MeshStandardMaterial({ color: 0xc98d78, roughness: 0.92 }),
    hair: new THREE.MeshStandardMaterial({ color: 0x38231e, roughness: 0.96 }),
    shirt: new THREE.MeshStandardMaterial({ color: 0x101512, roughness: 0.9 }),
    green: new THREE.MeshStandardMaterial({ color: 0x079b4b, roughness: 0.86 }),
    pants: new THREE.MeshStandardMaterial({ color: 0x70452f, roughness: 0.96 }),
    pantsDark: new THREE.MeshStandardMaterial({ color: 0x593522, roughness: 0.96 }),
    white: new THREE.MeshStandardMaterial({ color: 0xe7e9e2, roughness: 0.86 }),
    sole: new THREE.MeshStandardMaterial({ color: 0x252a29, roughness: 0.94 }),
    watchGreen: new THREE.MeshStandardMaterial({ color: 0x078b43, roughness: 0.62 }),
    watchDark: new THREE.MeshStandardMaterial({ color: 0x17211c, roughness: 0.55 }),
    watchGlass: new THREE.MeshStandardMaterial({ color: 0x9ca99f, roughness: 0.38, metalness: 0.12 })
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

  // Torso: the waist overlaps the shirt slightly, eliminating the visible
  // floating gap while retaining the separate hip pivot for leg movement.
  box(joints.spine, "BenShirt", [0.45, 0.57, 0.28],
    [0, 0.22, 0], mat.shirt);
  box(joints.spine, "BenGreenCenterStripe", [0.105, 0.50, 0.016],
    [0, 0.22, 0.148], mat.green);

  // Block-built white "10" emblem, placed on the green stripe.
  const emblem = new THREE.Group();
  emblem.name = "Ben10ShirtEmblem";
  emblem.position.set(0, 0.18, 0.16);
  joints.spine.add(emblem);
  // The 1.
  box(emblem, "TenOneStem", [0.025, 0.105, 0.012],
    [-0.033, 0, 0], mat.white);
  box(emblem, "TenOneTop", [0.045, 0.022, 0.012],
    [-0.038, 0.043, 0], mat.white);
  // The 0 is a small rectangular outline.
  box(emblem, "TenZeroTop", [0.052, 0.018, 0.012],
    [0.027, 0.044, 0], mat.white);
  box(emblem, "TenZeroBottom", [0.052, 0.018, 0.012],
    [0.027, -0.044, 0], mat.white);
  box(emblem, "TenZeroLeft", [0.018, 0.088, 0.012],
    [0.001, 0, 0], mat.white);
  box(emblem, "TenZeroRight", [0.018, 0.088, 0.012],
    [0.053, 0, 0], mat.white);

  // Waist sits high enough to meet the shirt hem and overlaps the upper legs.
  box(joints.hip, "BenTrouserWaist", [0.37, 0.25, 0.25],
    [0, 0.20, 0], mat.pants);

  // A visible cuboid neck bridges the torso and the head.
  box(joints.neck, "BenNeck", [0.16, 0.22, 0.17],
    [0, 0.075, 0], mat.skin);

  // Featureless rectangular head. Hair is intentionally one simple cuboid.
  box(joints.head, "BenHead", [0.37, 0.42, 0.32],
    [0, 0.075, 0], mat.skin);
  box(joints.head, "BenSimpleHair", [0.395, 0.135, 0.345],
    [0, 0.305, -0.004], mat.hair);

  // Arms follow the existing shoulder, elbow and wrist joints.
  // Their cuboids are sized to meet at the pivots without exposed gaps.
  for (const side of ["left", "right"]) {
    const sign = side === "left" ? -1 : 1;
    const shoulder = joints[side + "Shoulder"];
    const elbow = joints[side + "Elbow"];
    const wrist = joints[side + "Wrist"];

    box(shoulder, side + "GreenSleeve", [0.34, 0.235, 0.27],
      [sign * 0.15, 0, 0], mat.green);
    box(elbow, side + "SkinForearm", [0.30, 0.16, 0.18],
      [sign * 0.135, -0.005, 0], mat.skin);
    box(wrist, side + "SkinHand", [0.14, 0.14, 0.17],
      [sign * 0.065, 0, 0], mat.skin);
  }

  // Straight, separated trouser legs. Each segment is centered on its bone.
  for (const side of ["left", "right"]) {
    const thigh = joints[side + "Thigh"];
    const knee = joints[side + "Knee"];
    const ankle = joints[side + "Ankle"];

    box(thigh, side + "UpperTrouser", [0.18, 0.45, 0.21],
      [0, -0.215, 0], mat.pants);
    box(knee, side + "LowerTrouser", [0.17, 0.44, 0.20],
      [0, -0.215, 0], mat.pantsDark);

    // Low-profile white trainers with dark soles and green heel/toe accents.
    box(ankle, side + "WhiteTrainer", [0.205, 0.15, 0.31],
      [0, -0.065, 0.085], mat.white);
    box(ankle, side + "TrainerSole", [0.21, 0.045, 0.315],
      [0, -0.145, 0.085], mat.sole);
    box(ankle, side + "TrainerGreenToe", [0.13, 0.025, 0.035],
      [0, -0.035, 0.235], mat.green);
  }

  // Cuboid Omnitrix: green wrist strap, pale outer casing and dark display.
  // It sits on the front/outside of Ben's left wrist, not as a loose white block.
  const watch = new THREE.Group();
  watch.name = "Omnitrix";
  watch.position.set(-0.005, 0.005, 0.085);
  joints.leftWrist.add(watch);
  box(watch, "OmnitrixGreenBand", [0.15, 0.17, 0.105],
    [0, 0, 0], mat.watchGreen);
  box(watch, "OmnitrixPaleCase", [0.145, 0.135, 0.035],
    [0, 0, 0.066], mat.white);
  box(watch, "OmnitrixDarkBezel", [0.112, 0.102, 0.014],
    [0, 0, 0.091], mat.watchDark);
  box(watch, "OmnitrixDisplay", [0.078, 0.072, 0.008],
    [0, 0, 0.103], mat.watchGlass);
  box(watch, "OmnitrixGreenCore", [0.026, 0.042, 0.008],
    [0, 0, 0.11], mat.watchGreen);

  return { group, rig, joints };
}
