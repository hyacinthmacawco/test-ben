import * as THREE from "three";

export function createKevin({ createHumanRig }) {
  if (typeof createHumanRig !== "function") throw new TypeError("createKevin requires createHumanRig.");
  const rig = createHumanRig();
  const { group, joints } = rig;
  group.name = "KevinLevin";
  group.traverse(o => { if (o.isMesh) o.visible = false; });

  const mat = {
    skin: new THREE.MeshStandardMaterial({ color: 0xd0a18d, roughness: 0.92 }),
    hair: new THREE.MeshStandardMaterial({ color: 0x17151b, roughness: 0.95 }),
    shirt: new THREE.MeshStandardMaterial({ color: 0x10131a, roughness: 0.92 }),
    shirtBlue: new THREE.MeshStandardMaterial({ color: 0x263e56, roughness: 0.9 }),
    sleeve: new THREE.MeshStandardMaterial({ color: 0x77786e, roughness: 0.94 }),
    sleeveDark: new THREE.MeshStandardMaterial({ color: 0x45483f, roughness: 0.94 }),
    pants: new THREE.MeshStandardMaterial({ color: 0x17233b, roughness: 0.94 }),
    belt: new THREE.MeshStandardMaterial({ color: 0x303b42, roughness: 0.82 })
  };
  const box = (p, n, s, pos, m) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(...s), m);
    o.name = n; o.position.set(...pos); o.castShadow = true; o.receiveShadow = true; p.add(o); return o;
  };

  box(joints.spine, "KevinBlackShirt", [0.49, 0.73, 0.30], [0, 0.15, 0], mat.shirt);
  box(joints.spine, "KevinBlueStrapLeft", [0.075, 0.78, 0.035], [-0.17, 0.15, 0.17], mat.shirtBlue).rotation.z = -0.22;
  box(joints.spine, "KevinBlueStrapRight", [0.075, 0.78, 0.035], [0.17, 0.15, 0.17], mat.shirtBlue).rotation.z = 0.22;
  box(joints.spine, "KevinNeckBand", [0.30, 0.11, 0.30], [0, 0.49, 0], mat.sleeveDark);
  box(joints.hip, "KevinBelt", [0.42, 0.12, 0.28], [0, 0.12, 0], mat.belt);
  box(joints.hip, "KevinDarkJeans", [0.43, 0.20, 0.28], [0, -0.025, 0], mat.pants);

  box(joints.head, "KevinHead", [0.37, 0.43, 0.32], [0, 0.055, 0], mat.skin);
  // Long, swept-back black hair; no facial features.
  box(joints.head, "KevinHairTop", [0.41, 0.18, 0.37], [0, 0.255, -0.015], mat.hair);
  box(joints.head, "KevinHairBack", [0.37, 0.36, 0.12], [0, 0.01, -0.17], mat.hair);
  for (const sign of [-1, 1]) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.105, 0.34, 5), mat.hair);
    spike.name = "KevinSweptHairSpike";
    spike.position.set(sign * 0.18, 0.10, -0.20);
    spike.rotation.z = sign * 0.75;
    spike.rotation.x = -0.55;
    spike.castShadow = true;
    joints.head.add(spike);
    box(joints.head, "KevinSideHair", [0.10, 0.38, 0.22], [sign * 0.17, -0.02, -0.06], mat.hair);
  }

  for (const side of ["left", "right"]) {
    const sign = side === "left" ? -1 : 1;
    box(joints[side + "Shoulder"], "KevinGrayShoulderArmor", [0.39, 0.24, 0.30], [sign * 0.145, 0, 0], mat.sleeve);
    box(joints[side + "Shoulder"], "KevinShoulderBand", [0.37, 0.065, 0.31], [sign * 0.145, 0.075, 0], mat.sleeveDark);
    box(joints[side + "Elbow"], "KevinGrayForearm", [0.32, 0.17, 0.19], [sign * 0.13, 0, 0], mat.sleeve);
    box(joints[side + "Elbow"], "KevinForearmBand", [0.31, 0.055, 0.20], [sign * 0.13, -0.055, 0], mat.sleeveDark);
    box(joints[side + "Wrist"], "KevinHand", [0.15, 0.14, 0.16], [sign * 0.075, 0, 0], mat.skin);
    box(joints[side + "Thigh"], "KevinJeans", [0.21, 0.66, 0.22], [0, -0.10, 0], mat.pants);
    box(joints[side + "Knee"], "KevinLowerJeans", [0.18, 0.44, 0.20], [0, -0.21, 0], mat.pants);
    box(joints[side + "Ankle"], "KevinBoot", [0.21, 0.16, 0.31], [0, -0.08, 0.07], mat.shirt);
  }
  return { group, rig, joints };
}
