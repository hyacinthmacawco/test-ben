import * as THREE from "three";

export function createRook({ createHumanRig }) {
  if (typeof createHumanRig !== "function") throw new TypeError("createRook requires createHumanRig.");
  const rig = createHumanRig({ boneRadius: 0.05, jointRadius: 0.07 });
  const { group, joints } = rig;
  group.name = "RookBlonko";
  group.traverse(o => { if (o.isMesh) o.visible = false; });

  const mat = {
    skin: new THREE.MeshStandardMaterial({ color: 0x7183b6, roughness: 0.88 }),
    face: new THREE.MeshStandardMaterial({ color: 0xc3d5d9, roughness: 0.9 }),
    black: new THREE.MeshStandardMaterial({ color: 0x10121b, roughness: 0.92 }),
    armor: new THREE.MeshStandardMaterial({ color: 0x294b83, roughness: 0.78, metalness: 0.12 }),
    armorLight: new THREE.MeshStandardMaterial({ color: 0x8299b9, roughness: 0.78, metalness: 0.12 }),
    trim: new THREE.MeshStandardMaterial({ color: 0x141c30, roughness: 0.8 }),
    boot: new THREE.MeshStandardMaterial({ color: 0x263f70, roughness: 0.82 }),
    sole: new THREE.MeshStandardMaterial({ color: 0x0d1322, roughness: 0.9 })
  };
  const box = (p, n, s, pos, m) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(...s), m);
    o.name = n; o.position.set(...pos); o.castShadow = true; o.receiveShadow = true; p.add(o); return o;
  };

  // Broad black undersuit with blue chest and shoulder armour.
  const torso = box(joints.spine, "RookBlackUndersuit", [0.53, 0.75, 0.32], [0, 0.15, 0], mat.black);
  rig.fitToTorso(torso);
  box(joints.spine, "RookBlueChestPlate", [0.47, 0.43, 0.075], [0, 0.24, 0.19], mat.armor);
  box(joints.spine, "RookChestInset", [0.28, 0.20, 0.025], [0, 0.12, 0.235], mat.trim);
  box(joints.spine, "RookNeckArmour", [0.34, 0.13, 0.33], [0, 0.49, 0], mat.armorLight);
  box(joints.hip, "RookArmouredWaist", [0.45, 0.27, 0.31], [0, 0.02, 0], mat.black);
  box(joints.hip, "RookBeltFront", [0.34, 0.12, 0.035], [0, 0.06, 0.17], mat.armor);

  // Featureless pale-blue face and dark blue head crest/helmet.
  box(joints.head, "RookHead", [0.39, 0.46, 0.34], [0, 0.055, 0], mat.face);
  box(joints.head, "RookDarkCrown", [0.40, 0.19, 0.36], [0, 0.255, -0.005], mat.black);
  box(joints.head, "RookBlueCrest", [0.13, 0.22, 0.37], [0, 0.30, 0.02], mat.armor);
  for (const sign of [-1, 1]) {
    box(joints.head, "RookJawSide", [0.09, 0.24, 0.30], [sign * 0.15, -0.10, 0.015], mat.face);
  }

  for (const side of ["left", "right"]) {
    const sign = side === "left" ? -1 : 1;
    const shoulder = joints[side + "Shoulder"];
    const elbow = joints[side + "Elbow"];
    const wrist = joints[side + "Wrist"];
    box(shoulder, "RookLargeShoulderPad", [Math.abs(elbow.position.x) + 0.14, 0.29, 0.35],
      [elbow.position.x * 0.5, 0, 0], mat.armor);
    box(shoulder, "RookShoulderInset", [Math.abs(elbow.position.x) + 0.06, 0.20, 0.365],
      [elbow.position.x * 0.5, 0, 0.01], mat.armorLight);
    box(elbow, "RookBlackUpperForearm", [Math.abs(wrist.position.x) + 0.045, 0.18, 0.22],
      [wrist.position.x * 0.5, wrist.position.y * 0.5, 0], mat.black);
    box(elbow, "RookBlueForearmGuard", [Math.abs(wrist.position.x) + 0.06, 0.20, 0.24],
      [wrist.position.x * 0.5, wrist.position.y * 0.5 - 0.02, 0.045], mat.armorLight);
    box(joints[side + "Wrist"], "RookBlueGauntlet", [0.18, 0.19, 0.22], [sign * 0.08, 0, 0], mat.armor);
    box(joints[side + "Wrist"], "RookClawHand", [0.18, 0.16, 0.19], [sign * 0.08, -0.02, 0.04], mat.skin);
    box(joints[side + "Thigh"], "RookBlackLeg", [0.23, 0.64, 0.23], [0, -0.30, 0], mat.black);
    box(joints[side + "Thigh"], "RookHipSidePlate", [0.12, 0.27, 0.25], [sign * 0.10, -0.02, 0.025], mat.armorLight);
    box(joints[side + "Knee"], "RookLowerLeg", [0.19, 0.44, 0.20], [0, -0.21, 0], mat.black);
    box(joints[side + "Knee"], "RookShinGuard", [0.18, 0.35, 0.23], [0, -0.20, 0.055], mat.armor);
    box(joints[side + "Ankle"], "RookArmouredBoot", [0.23, 0.19, 0.34], [0, -0.09, 0.07], mat.boot);
    box(joints[side + "Ankle"], "RookBootSole", [0.24, 0.045, 0.35], [0, -0.19, 0.08], mat.sole);
  }
  // Compact back-mounted Proto-Tool silhouette, kept clear of the arms.
  const tool = box(joints.spine, "RookProtoToolPack", [0.23, 0.55, 0.16], [0.27, 0.18, -0.22], mat.trim);
  tool.rotation.z = -0.12;
  box(joints.spine, "RookProtoToolBluePanel", [0.13, 0.38, 0.025], [0.27, 0.19, -0.31], mat.armorLight);
  return { group, rig, joints };
}
