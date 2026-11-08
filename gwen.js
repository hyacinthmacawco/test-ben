import * as THREE from "three";

export function createGwen({ createHumanRig }) {
  if (typeof createHumanRig !== "function") throw new TypeError("createGwen requires createHumanRig.");
  const rig = createHumanRig();
  const { group, joints } = rig;
  group.name = "GwenTennyson";
  group.traverse(o => { if (o.isMesh) o.visible = false; });

  const mat = {
    skin: new THREE.MeshStandardMaterial({ color: 0xe5b3a4, roughness: 0.9 }),
    shirt: new THREE.MeshStandardMaterial({ color: 0x8ec9e8, roughness: 0.92 }),
    shirtDark: new THREE.MeshStandardMaterial({ color: 0x4d83a8, roughness: 0.9 }),
    skirt: new THREE.MeshStandardMaterial({ color: 0x244c83, roughness: 0.92 }),
    skirtLine: new THREE.MeshStandardMaterial({ color: 0x91b7d3, roughness: 0.9 }),
    hair: new THREE.MeshStandardMaterial({ color: 0xd95b20, roughness: 0.95 }),
    hairLight: new THREE.MeshStandardMaterial({ color: 0xf0782b, roughness: 0.95 }),
    boot: new THREE.MeshStandardMaterial({ color: 0xdce7e9, roughness: 0.9 }),
    sole: new THREE.MeshStandardMaterial({ color: 0x31577a, roughness: 0.9 }),
    frame: new THREE.MeshStandardMaterial({ color: 0x173c67, roughness: 0.55, metalness: 0.12 }),
    lens: new THREE.MeshStandardMaterial({ color: 0x4e9db9, roughness: 0.35, metalness: 0.15 })
  };
  const box = (p, n, s, pos, m) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(...s), m);
    o.name = n; o.position.set(...pos); o.castShadow = true; o.receiveShadow = true; p.add(o); return o;
  };
  const cylinder = (p, n, r1, r2, h, pos, m, segments = 8) => {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, segments), m);
    o.name = n; o.position.set(...pos); o.castShadow = true; p.add(o); return o;
  };

  // Light-blue fitted top with darker collar and shoulder accents.
  box(joints.spine, "GwenBlueTop", [0.47, 0.65, 0.29], [0, 0.16, 0], mat.shirt);
  box(joints.spine, "GwenCollar", [0.22, 0.055, 0.30], [0, 0.475, 0], mat.shirtDark);
  box(joints.spine, "GwenChestEmblem", [0.19, 0.13, 0.012], [0, 0.25, 0.151], mat.shirtDark);
  box(joints.hip, "GwenSkirtWaist", [0.40, 0.13, 0.29], [0, 0.16, 0], mat.shirtDark);
  const skirt = box(joints.hip, "GwenBluePlaidSkirt", [0.54, 0.34, 0.34], [0, -0.045, 0], mat.skirt);
  skirt.scale.x = 1.04;
  // Fine horizontal and vertical plaid lines are geometry, not a noisy texture.
  for (let y = -0.17; y <= 0.16; y += 0.085) {
    box(joints.hip, "GwenSkirtPlaidH", [0.545, 0.009, 0.346], [0, -0.045 + y, 0], mat.skirtLine);
  }
  for (let x = -0.20; x <= 0.20; x += 0.10) {
    box(joints.hip, "GwenSkirtPlaidV", [0.009, 0.342, 0.348], [x, -0.045, 0], mat.skirtLine);
  }

  // Orange bob cut: crown plus long side locks and a layered fringe.
  box(joints.head, "GwenHead", [0.37, 0.42, 0.32], [0, 0.055, 0], mat.skin);
  box(joints.head, "GwenHairCap", [0.405, 0.19, 0.35], [0, 0.245, -0.005], mat.hair);
  box(joints.head, "GwenFringe", [0.37, 0.105, 0.035], [0, 0.205, 0.17], mat.hairLight);
  for (const side of ["left", "right"]) {
    const sign = side === "left" ? -1 : 1;
    const lock = box(joints.head, "GwenSideHair", [0.105, 0.48, 0.30], [sign * 0.18, -0.035, -0.005], mat.hair);
    lock.rotation.z = -sign * 0.08;
    box(joints.head, "GwenHairTip", [0.10, 0.12, 0.29], [sign * 0.18, -0.30, -0.005], mat.hairLight);
  }

  // Spectacles are the only facial detail: dark blue rims, blue-tinted lenses,
  // bridge and short temples. No eyes, nose or mouth are modelled.
  for (const sign of [-1, 1]) {
    box(joints.head, "GwenSpectacleLens", [0.145, 0.095, 0.018], [sign * 0.088, 0.085, 0.178], mat.lens);
    box(joints.head, "GwenSpectacleTop", [0.16, 0.014, 0.025], [sign * 0.088, 0.14, 0.18], mat.frame);
    box(joints.head, "GwenSpectacleBottom", [0.16, 0.014, 0.025], [sign * 0.088, 0.03, 0.18], mat.frame);
    box(joints.head, "GwenSpectacleOuter", [0.014, 0.11, 0.025], [sign * 0.166, 0.085, 0.18], mat.frame);
    box(joints.head, "GwenSpectacleInner", [0.014, 0.11, 0.025], [sign * 0.01, 0.085, 0.18], mat.frame);
    box(joints.head, "GwenSpectacleTemple", [0.12, 0.018, 0.018], [sign * 0.22, 0.08, 0.02], mat.frame);
  }
  box(joints.head, "GwenSpectacleBridge", [0.045, 0.016, 0.025], [0, 0.12, 0.18], mat.frame);

  for (const side of ["left", "right"]) {
    const sign = side === "left" ? -1 : 1;
    box(joints[side + "Shoulder"], "GwenShortSleeve", [0.36, 0.19, 0.27], [sign * 0.14, 0, 0], mat.shirt);
    box(joints[side + "Elbow"], "GwenForearm", [0.30, 0.14, 0.16], [sign * 0.13, 0, 0], mat.skin);
    box(joints[side + "Wrist"], "GwenHand", [0.15, 0.14, 0.16], [sign * 0.075, 0, 0], mat.skin);
    box(joints[side + "Thigh"], "GwenLeg", [0.19, 0.65, 0.20], [0, -0.10, 0], mat.skin);
    box(joints[side + "Knee"], "GwenLowerLeg", [0.16, 0.44, 0.18], [0, -0.21, 0], mat.skin);
    box(joints[side + "Ankle"], "GwenWhiteBoot", [0.20, 0.42, 0.25], [0, -0.17, 0.015], mat.boot);
    box(joints[side + "Ankle"], "GwenBootSole", [0.22, 0.045, 0.30], [0, -0.39, 0.07], mat.sole);
  }
  return { group, rig, joints };
}
